import { createDB, schema } from '@automotive/database';
import { createEventBus } from '@automotive/events';
import Stripe from 'stripe';
import type { 
  UUID, 
  ISODateString, 
  PlanType, 
  PlanLimits, 
  PLAN_LIMITS,
  Organization,
} from '@automotive/types';
import { and, eq } from 'drizzle-orm';

interface Env {
  DB: D1Database;
  EVENT_QUEUE: Queue;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PUBLISHABLE_KEY: string;
}

const STRIPE_PRICE_IDS: Record<PlanType, string> = {
  FREE: '',
  STARTER: 'price_starter_monthly',
  PRO: 'price_pro_monthly',
  DEALER: 'price_dealer_monthly',
  ENTERPRISE: 'price_enterprise_monthly',
};

export class BillingService {
  private db: ReturnType<typeof createDB>;
  private eventBus: ReturnType<typeof createEventBus>;
  private stripe: Stripe;
  private env: Env;

  constructor(env: Env) {
    this.db = createDB(env.DB);
    this.eventBus = createEventBus(env.DB);
    this.stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
    this.env = env;
  }

  // Plan Management
  getPlanLimits(plan: PlanType): PlanLimits {
    return PLAN_LIMITS[plan];
  }

  async getCurrentPlan(organizationId: UUID): Promise<{ plan: PlanType; limits: PlanLimits }> {
    const org = await this.db.select().from(schema.organizations).where(eq(schema.organizations.id, organizationId)).get();
    return { plan: org?.plan || 'FREE', limits: PLAN_LIMITS[org?.plan || 'FREE'] };
  }

  async checkLimit(organizationId: UUID, limitType: keyof PlanLimits): Promise<{ allowed: boolean; current: number; limit: number }> {
    const { plan, limits } = await this.getCurrentPlan(organizationId);
    const limit = limits[limitType];
    
    if (limit === -1) return { allowed: true, current: 0, limit: -1 };

    let current = 0;
    switch (limitType) {
      case 'maxVehicles':
        const vehicles = await this.db.select({ count: count() }).from(schema.vehicles).where(and(eq(schema.vehicles.organizationId, organizationId), eq(schema.vehicles.deletedAt, null))).get();
        current = vehicles?.count || 0;
        break;
      case 'maxUsers':
        const users = await this.db.select({ count: count() }).from(schema.organizationMembers).where(eq(schema.organizationMembers.organizationId, organizationId)).get();
        current = users?.count || 0;
        break;
      case 'maxLeads':
        const leads = await this.db.select({ count: count() }).from(schema.leads).where(and(eq(schema.leads.organizationId, organizationId), eq(schema.leads.deletedAt, null))).get();
        current = leads?.count || 0;
        break;
      case 'maxMessages':
        const messages = await this.db.select({ count: count() }).from(schema.messages).where(eq(schema.messages.organizationId, organizationId)).get();
        current = messages?.count || 0;
        break;
      case 'maxVideoMinutes':
        // Would calculate from video jobs
        current = 0;
        break;
      case 'maxAIRequests':
        // Would track from AI usage
        current = 0;
        break;
      case 'maxStorageGB':
        // Would calculate from R2 usage
        current = 0;
        break;
      case 'maxCourses':
        const courses = await this.db.select({ count: count() }).from(schema.courses).where(and(eq(schema.courses.organizationId, organizationId), eq(schema.courses.deletedAt, null))).get();
        current = courses?.count || 0;
        break;
    }

    return { allowed: current < limit, current, limit };
  }

  async enforceLimit(organizationId: UUID, limitType: keyof PlanLimits): Promise<void> {
    const { allowed, current, limit } = await this.checkLimit(organizationId, limitType);
    if (!allowed) {
      throw new Error(`Límite excedido: ${limitType} (${current}/${limit}). Actualiza tu plan.`);
    }
  }

  // Stripe Integration
  async createStripeCustomer(organizationId: UUID, email: string, name: string): Promise<string> {
    const customer = await this.stripe.customers.create({
      email,
      name,
      metadata: { organizationId },
    });

    await this.db.update(schema.organizations).set({ stripeCustomerId: customer.id }).where(eq(schema.organizations.id, organizationId));
    return customer.id;
  }

  async getOrCreateStripeCustomer(organizationId: UUID): Promise<string> {
    const org = await this.db.select().from(schema.organizations).where(eq(schema.organizations.id, organizationId)).get();
    
    if (org?.stripeCustomerId) return org.stripeCustomerId;

    return this.createStripeCustomer(organizationId, org?.billingEmail || '', org?.name || '');
  }

  async createCheckoutSession(
    organizationId: UUID, 
    plan: PlanType, 
    successUrl: string, 
    cancelUrl: string
  ): Promise<{ sessionId: string; url: string }> {
    const customerId = await this.getOrCreateStripeCustomer(organizationId);
    const priceId = STRIPE_PRICE_IDS[plan];

    if (!priceId) {
      throw new Error('Plan no tiene precio configurado');
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { organizationId, plan },
      subscription_data: {
        metadata: { organizationId, plan },
      },
    });

    return { sessionId: session.id, url: session.url! };
  }

  async createBillingPortalSession(organizationId: UUID, returnUrl: string): Promise<string> {
    const customerId = await this.getOrCreateStripeCustomer(organizationId);

    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session.url;
  }

  async handleWebhook(payload: Buffer, signature: string): Promise<void> {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, this.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      throw new Error(`Webhook signature verification failed: ${err}`);
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const organizationId = session.metadata?.organizationId;
    const plan = session.metadata?.plan as PlanType;

    if (organizationId && plan) {
      await this.db.update(schema.organizations)
        .set({ plan, planLimits: PLAN_LIMITS[plan], updatedAt: new Date().toISOString() })
        .where(eq(schema.organizations.id, organizationId));
    }
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const organizationId = subscription.metadata?.organizationId;
    const plan = subscription.metadata?.plan as PlanType;

    if (organizationId && plan) {
      const status = subscription.status;
      const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();

      await this.db.update(schema.organizations)
        .set({ 
          plan: status === 'active' ? plan : 'FREE',
          planLimits: status === 'active' ? PLAN_LIMITS[plan] : PLAN_LIMITS.FREE,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.organizations.id, organizationId));
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const organizationId = subscription.metadata?.organizationId;

    if (organizationId) {
      await this.db.update(schema.organizations)
        .set({ plan: 'FREE', planLimits: PLAN_LIMITS.FREE, updatedAt: new Date().toISOString() })
        .where(eq(schema.organizations.id, organizationId));
    }
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    // Log successful payment
    console.log('Payment succeeded for invoice:', invoice.id);
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const organizationId = (invoice as any).subscription_details?.metadata?.organizationId || 
                           (invoice as any).metadata?.organizationId;

    if (organizationId) {
      // Notify organization of failed payment
      await this.db.insert(schema.notifications).values({
        id: crypto.randomUUID() as UUID,
        organizationId,
        userId: '' as UUID, // Would target owners/admins
        type: 'BILLING_ISSUE',
        title: 'Pago fallido',
        message: 'No se pudo procesar el pago de tu suscripción. Por favor actualiza tu método de pago.',
        priority: 'HIGH',
        channels: ['IN_APP', 'EMAIL'],
        metadata: { invoiceId: invoice.id },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // Usage tracking
  async recordUsage(organizationId: UUID, metric: string, quantity: number): Promise<void> {
    // In production, would store in usage table for metered billing
    console.log(`Usage recorded: ${metric}=${quantity} for org ${organizationId}`);
  }

  async getUsage(organizationId: UUID, period: 'current_month' | 'last_month'): Promise<Record<string, number>> {
    // Would query usage records
    return {};
  }

  // Plan upgrades/downgrades
  async changePlan(organizationId: UUID, newPlan: PlanType, userId: UUID): Promise<Organization | null> {
    const current = await this.getCurrentPlan(organizationId);
    
    if (current.plan === newPlan) {
      throw new Error('Ya estás en este plan');
    }

    const org = await this.db.select().from(schema.organizations).where(eq(schema.organizations.id, organizationId)).get();
    if (!org) throw new Error('Organización no encontrada');

    const customerId = await this.getOrCreateStripeCustomer(organizationId);
    const subscriptions = await this.stripe.subscriptions.list({ customer: customerId, status: 'active', limit: 1 });

    if (subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0];
      const priceId = STRIPE_PRICE_IDS[newPlan];

      if (!priceId) throw new Error('Plan no disponible');

      await this.stripe.subscriptions.update(subscription.id, {
        items: [{ id: subscription.items.data[0].id, price: priceId }],
        proration_behavior: 'create_prorations',
        metadata: { organizationId, plan: newPlan },
      });
    } else {
      // No active subscription, just update plan (for FREE or manual)
      await this.db.update(schema.organizations)
        .set({ plan: newPlan, planLimits: PLAN_LIMITS[newPlan], updatedAt: new Date().toISOString() })
        .where(eq(schema.organizations.id, organizationId));
    }

    return this.db.select().from(schema.organizations).where(eq(schema.organizations.id, organizationId)).get() as any;
  }

  async cancelSubscription(organizationId: UUID): Promise<void> {
    const org = await this.db.select().from(schema.organizations).where(eq(schema.organizations.id, organizationId)).get();
    if (!org?.stripeCustomerId) return;

    const subscriptions = await this.stripe.subscriptions.list({ customer: org.stripeCustomerId, status: 'active', limit: 1 });
    
    for (const sub of subscriptions.data) {
      await this.stripe.subscriptions.cancel(sub.id);
    }
  }

  // Invoicing
  async getInvoices(organizationId: UUID, limit = 10): Promise<Stripe.Invoice[]> {
    const org = await this.db.select().from(schema.organizations).where(eq(schema.organizations.id, organizationId)).get();
    if (!org?.stripeCustomerId) return [];

    const invoices = await this.stripe.invoices.list({ customer: org.stripeCustomerId, limit });
    return invoices.data;
  }

  async getUpcomingInvoice(organizationId: UUID): Promise<Stripe.Invoice | null> {
    const org = await this.db.select().from(schema.organizations).where(eq(schema.organizations.id, organizationId)).get();
    if (!org?.stripeCustomerId) return null;

    try {
      const invoice = await this.stripe.invoices.retrieveUpcoming({ customer: org.stripeCustomerId });
      return invoice;
    } catch {
      return null;
    }
  }

  // Payment methods
  async listPaymentMethods(organizationId: UUID): Promise<Stripe.PaymentMethod[]> {
    const org = await this.db.select().from(schema.organizations).where(eq(schema.organizations.id, organizationId)).get();
    if (!org?.stripeCustomerId) return [];

    const methods = await this.stripe.paymentMethods.list({ customer: org.stripeCustomerId, type: 'card' });
    return methods.data;
  }

  async attachPaymentMethod(organizationId: UUID, paymentMethodId: string): Promise<void> {
    const org = await this.db.select().from(schema.organizations).where(eq(schema.organizations.id, organizationId)).get();
    if (!org?.stripeCustomerId) throw new Error('No Stripe customer');

    await this.stripe.paymentMethods.attach(paymentMethodId, { customer: org.stripeCustomerId });
    
    // Set as default
    await this.stripe.customers.update(org.stripeCustomerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });
  }

  // Webhook endpoint for API
  async handleStripeWebhook(request: Request): Promise<Response> {
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature') || '';

    try {
      await this.handleWebhook(Buffer.from(payload), signature);
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    } catch (error) {
      console.error('Webhook error:', error);
      return new Response(JSON.stringify({ error: String(error) }), { status: 400 });
    }
  }
}

import { count } from 'drizzle-orm';

export function createBillingService(env: Env): BillingService {
  return new BillingService(env);
}