import { Hono } from 'hono';
import { Stripe } from 'stripe';
import { createBillingService } from '@automotive-ai-saas/billing';
import { createCommunicationsService } from '@automotive-ai-saas/communications';
import { EventPublisher } from '@automotive-ai-saas/events';

const webhooks = new Hono<{ Bindings: Env }>();

// Initialize services
const getStripe = (c: any) => new Stripe(c.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-01-01',
});

const getBillingService = (c: any) => createBillingService({
  db: c.env.DB,
  stripe: getStripe(c),
  webhookSecret: c.env.STRIPE_WEBHOOK_SECRET,
});

const getCommunicationsService = (c: any) => createCommunicationsService({
  db: c.env.DB,
  whatsappToken: c.env.WHATSAPP_TOKEN,
  whatsappPhoneNumberId: c.env.WHATSAPP_PHONE_NUMBER_ID,
  instagramAppId: c.env.INSTAGRAM_APP_ID,
  instagramAppSecret: c.env.INSTAGRAM_APP_SECRET,
});

const getEventPublisher = (c: any) => new EventPublisher(c.env.EVENT_QUEUE);

// ===== STRIPE WEBHOOKS =====

webhooks.post('/stripe', async (c) => {
  const body = await c.req.text();
  const signature = c.req.header('stripe-signature');
  
  if (!signature) {
    return c.json({ error: 'Missing stripe-signature header' }, 400);
  }
  
  const billingService = getBillingService(c);
  
  try {
    await billingService.handleWebhook(body, signature);
    return c.json({ received: true });
  } catch (error: any) {
    console.error('Stripe webhook error:', error);
    return c.json({ error: 'Webhook handling failed' }, 400);
  }
});

// ===== WHATSAPP WEBHOOKS =====

// Verify webhook (GET)
webhooks.get('/whatsapp', (c) => {
  const mode = c.req.query('hub.mode');
  const token = c.req.query('hub.verify_token');
  const challenge = c.req.query('hub.challenge');
  
  const verifyToken = c.env.WHATSAPP_VERIFY_TOKEN;
  
  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WhatsApp webhook verified');
    return c.text(challenge || '');
  }
  
  return c.json({ error: 'Verification failed' }, 403);
});

// Receive messages (POST)
webhooks.post('/whatsapp', async (c) => {
  const body = await c.req.json();
  const communicationsService = getCommunicationsService(c);
  const eventPublisher = getEventPublisher(c);
  
  try {
    // Process incoming WhatsApp message
    await communicationsService.processIncomingWhatsAppMessage(body);
    
    // Publish event for other services
    await eventPublisher.publish({
      type: 'message.received',
      payload: { channel: 'WHATSAPP', data: body },
      organizationId: '', // Would be extracted from message context
      timestamp: new Date().toISOString(),
    });
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error('WhatsApp webhook error:', error);
    return c.json({ error: 'Processing failed' }, 500);
  }
});

// ===== INSTAGRAM WEBHOOKS =====

webhooks.get('/instagram', (c) => {
  const mode = c.req.query('hub.mode');
  const token = c.req.query('hub.verify_token');
  const challenge = c.req.query('hub.challenge');
  
  const verifyToken = c.env.INSTAGRAM_VERIFY_TOKEN || c.env.WHATSAPP_VERIFY_TOKEN;
  
  if (mode === 'subscribe' && token === verifyToken) {
    return c.text(challenge || '');
  }
  
  return c.json({ error: 'Verification failed' }, 403);
});

webhooks.post('/instagram', async (c) => {
  const body = await c.req.json();
  const communicationsService = getCommunicationsService(c);
  const eventPublisher = getEventPublisher(c);
  
  try {
    await communicationsService.processIncomingInstagramMessage(body);
    
    await eventPublisher.publish({
      type: 'message.received',
      payload: { channel: 'INSTAGRAM', data: body },
      organizationId: '',
      timestamp: new Date().toISOString(),
    });
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Instagram webhook error:', error);
    return c.json({ error: 'Processing failed' }, 500);
  }
});

// ===== EMAIL WEBHOOKS (SendGrid, Mailgun, etc.) =====

webhooks.post('/email', async (c) => {
  const body = await c.req.json();
  const eventPublisher = getEventPublisher(c);
  
  try {
    // Process email events (bounce, complaint, delivery, open, click)
    await eventPublisher.publish({
      type: 'email.event',
      payload: body,
      organizationId: '', // Extract from email context
      timestamp: new Date().toISOString(),
    });
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Email webhook error:', error);
    return c.json({ error: 'Processing failed' }, 500);
  }
});

// ===== GENERIC WEBHOOK ENDPOINT =====

webhooks.post('/generic', async (c) => {
  const body = await c.req.json();
  const eventPublisher = getEventPublisher(c);
  const source = c.req.header('X-Webhook-Source') || 'unknown';
  
  try {
    await eventPublisher.publish({
      type: 'webhook.received',
      payload: { source, data: body },
      organizationId: '', // Would need to be determined
      timestamp: new Date().toISOString(),
    });
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Generic webhook error:', error);
    return c.json({ error: 'Processing failed' }, 500);
  }
});

export default webhooks;