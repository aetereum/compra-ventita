import { createDB, schema } from '@automotive/database';
import { createEventBus } from '@automotive/events';
import type { 
  UUID, 
  ISODateString, 
  Campaign,
  CampaignType,
  CampaignStatus,
  CampaignTrigger,
  CampaignChannel,
  Vehicle,
  Lead,
} from '@automotive/types';
import { and, eq, desc, sql, count } from 'drizzle-orm';

interface Env {
  DB: D1Database;
  EVENT_QUEUE: Queue;
  EMAIL_QUEUE: Queue;
  AI: Ai;
}

export class MarketingService {
  private db: ReturnType<typeof createDB>;
  private eventBus: ReturnType<typeof createEventBus>;
  private env: Env;

  constructor(env: Env) {
    this.db = createDB(env.DB);
    this.eventBus = createEventBus(env.DB);
    this.env = env;
  }

  // Campaign Management
  async createCampaign(data: Partial<Campaign>, organizationId: UUID, userId?: UUID): Promise<Campaign> {
    const campaignId = crypto.randomUUID() as UUID;
    const now = new Date().toISOString() as ISODateString;

    const campaign: Campaign = {
      id: campaignId,
      organizationId,
      name: data.name!,
      description: data.description,
      type: data.type || 'CUSTOM',
      status: 'DRAFT',
      trigger: data.trigger || { type: 'MANUAL', config: {} },
      schedule: data.schedule,
      audience: data.audience || { segments: [], maxRecipients: 1000 },
      content: data.content || { variables: {} },
      channels: data.channels || ['EMAIL'],
      metrics: { sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0, converted: 0, unsubscribed: 0, bounced: 0, spamReported: 0 },
      abTest: data.abTest,
      tags: data.tags || [],
      createdAt: now,
      updatedAt: now,
    };

    await this.db.insert(schema.campaigns).values(campaign as any);
    await this.eventBus.publish({
      type: 'campaign.created',
      payload: campaign,
      organizationId,
      userId,
    });

    return campaign;
  }

  async getCampaign(campaignId: UUID, organizationId: UUID): Promise<Campaign | null> {
    return this.db
      .select()
      .from(schema.campaigns)
      .where(and(eq(schema.campaigns.id, campaignId), eq(schema.campaigns.organizationId, organizationId)))
      .get() as any;
  }

  async listCampaigns(organizationId: UUID, params: { page?: number; limit?: number; status?: CampaignStatus; type?: CampaignType }): Promise<{ data: Campaign[]; meta: any }> {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const offset = (page - 1) * limit;

    let query = this.db
      .select()
      .from(schema.campaigns)
      .where(and(
        eq(schema.campaigns.organizationId, organizationId),
        eq(schema.campaigns.deletedAt, null)
      ));

    if (params.status) query = query.where(eq(schema.campaigns.status, params.status));
    if (params.type) query = query.where(eq(schema.campaigns.type, params.type));

    const [campaigns, totalResult] = await Promise.all([
      query.orderBy(desc(schema.campaigns.createdAt)).limit(limit).offset(offset).all(),
      this.db.select({ count: count() }).from(schema.campaigns).where(
        and(eq(schema.campaigns.organizationId, organizationId), eq(schema.campaigns.deletedAt, null))
      ).get(),
    ]);

    const total = totalResult?.count || 0;
    return {
      data: campaigns as any[],
      meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page < Math.ceil(total / limit), hasPrev: page > 1 },
    };
  }

  async updateCampaign(campaignId: UUID, organizationId: UUID, updates: Partial<Campaign>, userId?: UUID): Promise<Campaign | null> {
    const existing = await this.getCampaign(campaignId, organizationId);
    if (!existing) return null;

    const updateData = { ...updates, updatedAt: new Date().toISOString() };
    await this.db.update(schema.campaigns).set(updateData).where(eq(schema.campaigns.id, campaignId));

    const updated = await this.getCampaign(campaignId, organizationId);

    if (updates.status === 'ACTIVE' && existing.status !== 'ACTIVE') {
      await this.eventBus.publish({
        type: 'campaign.started',
        payload: { campaignId },
        organizationId,
        userId,
      });
      // Start campaign execution
      await this.executeCampaign(campaignId, organizationId);
    }

    if (updates.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
      await this.eventBus.publish({
        type: 'campaign.completed',
        payload: { campaignId },
        organizationId,
        userId,
      });
    }

    return updated;
  }

  async deleteCampaign(campaignId: UUID, organizationId: UUID): Promise<boolean> {
    const campaign = await this.getCampaign(campaignId, organizationId);
    if (!campaign) return false;

    await this.db.update(schema.campaigns).set({ deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).where(eq(schema.campaigns.id, campaignId));
    return true;
  }

  // Campaign Execution
  async executeCampaign(campaignId: UUID, organizationId: UUID): Promise<void> {
    const campaign = await this.getCampaign(campaignId, organizationId);
    if (!campaign || campaign.status !== 'ACTIVE') return;

    // Get recipients based on audience segments
    const recipients = await this.getRecipients(campaign, organizationId);
    
    // Send to each channel
    for (const channel of campaign.channels) {
      await this.sendToChannel(campaign, recipients, channel, organizationId);
    }

    // Update status to completed if no schedule
    if (!campaign.schedule) {
      await this.db.update(schema.campaigns).set({ status: 'COMPLETED', updatedAt: new Date().toISOString() }).where(eq(schema.campaigns.id, campaignId));
      await this.eventBus.publish({
        type: 'campaign.completed',
        payload: { campaignId },
        organizationId,
      });
    }
  }

  private async getRecipients(campaign: Campaign, organizationId: UUID): Promise<Lead[]> {
    const segments = campaign.audience.segments;
    const allLeads: Lead[] = [];

    for (const segment of segments) {
      let query = this.db
        .select()
        .from(schema.leads)
        .where(and(
          eq(schema.leads.organizationId, organizationId),
          eq(schema.leads.deletedAt, null)
        ));

      // Apply segment filters
      const filters = segment.filters;
      if (filters.status) query = query.where(eq(schema.leads.status, filters.status));
      if (filters.stage) query = query.where(eq(schema.leads.stage, filters.stage));
      if (filters.source) query = query.where(eq(schema.leads.source, filters.source));
      if (filters.vehicleInterest) {
        // Would need JSON query for vehicleInterest
      }

      const leads = await query.limit(campaign.audience.maxRecipients || 1000).all();
      allLeads.push(...leads as any[]);
    }

    // Deduplicate
    const uniqueLeads = new Map(allLeads.map(l => [l.id, l]));
    return Array.from(uniqueLeads.values());
  }

  private async sendToChannel(campaign: Campaign, recipients: Lead[], channel: CampaignChannel, organizationId: UUID): Promise<void> {
    const content = campaign.content;
    
    for (const lead of recipients) {
      try {
        let success = false;

        switch (channel) {
          case 'EMAIL':
            success = await this.sendEmail(campaign, lead, organizationId);
            break;
          case 'WHATSAPP':
            success = await this.sendWhatsApp(campaign, lead, organizationId);
            break;
          case 'INSTAGRAM':
            success = await this.sendInstagram(campaign, lead, organizationId);
            break;
          case 'SMS':
            success = await this.sendSMS(campaign, lead, organizationId);
            break;
        }

        if (success) {
          await this.db.update(schema.campaigns).set({
            metrics: {
              ...campaign.metrics,
              sent: campaign.metrics.sent + 1,
            },
          }).where(eq(schema.campaigns.id, campaign.id));
        }
      } catch (error) {
        console.error(`Error sending ${channel} to lead ${lead.id}:`, error);
      }
    }
  }

  private async sendEmail(campaign: Campaign, lead: Lead, organizationId: UUID): Promise<boolean> {
    // Queue email for sending
    await this.env.EMAIL_QUEUE.send({
      type: 'send_email',
      payload: {
        to: lead.contact.email,
        subject: this.renderTemplate(content?.subject || '', lead),
        html: this.renderTemplate(content?.html || '', lead),
        text: this.renderTemplate(content?.text || '', lead),
        campaignId: campaign.id,
        leadId: lead.id,
        organizationId,
      },
    });
    return true;
  }

  private async sendWhatsApp(campaign: Campaign, lead: Lead, organizationId: UUID): Promise<boolean> {
    if (!lead.contact.whatsapp && !lead.contact.phone) return false;

    const phone = lead.contact.whatsapp || lead.contact.phone;
    
    await this.env.EVENT_QUEUE.send({
      type: 'send_whatsapp',
      payload: {
        to: phone,
        templateName: content?.whatsappTemplate || 'vehicle_promotion',
        variables: this.renderTemplateVariables(content?.variables || {}, lead),
        campaignId: campaign.id,
        leadId: lead.id,
        organizationId,
      },
    });
    return true;
  }

  private async sendInstagram(campaign: Campaign, lead: Lead, organizationId: UUID): Promise<boolean> {
    // Would need Instagram user ID
    // For now, queue for later
    await this.env.EVENT_QUEUE.send({
      type: 'send_instagram',
      payload: {
        userId: lead.contact.whatsapp, // Would need Instagram ID
        caption: this.renderTemplate(content?.instagramCaption || '', lead),
        campaignId: campaign.id,
        leadId: lead.id,
        organizationId,
      },
    });
    return true;
  }

  private async sendSMS(campaign: Campaign, lead: Lead, organizationId: UUID): Promise<boolean> {
    if (!lead.contact.phone) return false;
    
    // Queue SMS
    await this.env.EVENT_QUEUE.send({
      type: 'send_sms',
      payload: {
        to: lead.contact.phone,
        message: this.renderTemplate(content?.text || '', lead),
        campaignId: campaign.id,
        leadId: lead.id,
        organizationId,
      },
    });
    return true;
  }

  // AI Content Generation
  async generateCampaignContent(vehicle: Vehicle, campaignType: CampaignType): Promise<Campaign['content']> {
    const prompt = this.buildContentPrompt(vehicle, campaignType);
    
    const response = await this.env.AI.run('@cf/meta/llama-3-8b-instruct', {
      messages: [
        { role: 'system', content: 'Eres un experto en marketing automotriz. Genera contenido persuasivo para campañas de vehículos.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 1500,
    });

    // Parse AI response and structure as campaign content
    // This is simplified - real implementation would parse structured output
    return {
      subject: `🚗 ${vehicle.make} ${vehicle.model} ${vehicle.year} - Oportunidad única`,
      whatsappTemplate: `Hola {{nombre}}, ¡Tenemos el ${vehicle.make} ${vehicle.model} que buscabas! 🎉`,
      instagramCaption: `¡Llegó el ${vehicle.make} ${vehicle.model} ${vehicle.year}! 🔥\n\n${vehicle.price.toLocaleString()} ${vehicle.currency}\n${vehicle.mileage.toLocaleString()} km\n\n#${vehicle.make} #${vehicle.model} #Automotriz`,
      facebookPost: `Nuevo en inventario: ${vehicle.make} ${vehicle.model} ${vehicle.year}. ¡Gran oportunidad!`,
      videoScript: `Presentamos el ${vehicle.make} ${vehicle.model} ${vehicle.year}. Con ${vehicle.mileage.toLocaleString()} km y un precio increíble de ${vehicle.price.toLocaleString()} ${vehicle.currency}.`,
      cta: { text: 'Ver detalles', url: `/vehicles/${vehicle.id}`, type: 'BUTTON' },
      variables: { nombre: '{{contact.firstName}}', vehiculo: `${vehicle.make} ${vehicle.model}`, precio: vehicle.price.toLocaleString() },
    };
  }

  private buildContentPrompt(vehicle: Vehicle, campaignType: CampaignType): string {
    const typePrompts: Record<CampaignType, string> = {
      VEHICLE_LAUNCH: 'Lanzamiento de nuevo vehículo en inventario',
      PRICE_DROP: 'Reducción de precio',
      SEASONAL: 'Campaña estacional',
      FOLLOW_UP: 'Seguimiento a lead interesado',
      RE_ENGAGEMENT: 'Reactivación de leads fríos',
      EDUCATIONAL: 'Contenido educativo sobre el vehículo',
      BRAND_AWARENESS: 'Conciencia de marca',
      CUSTOM: 'Campaña personalizada',
    };

    return `
${typePrompts[campaignType]}

Vehículo:
- Marca: ${vehicle.make}
- Modelo: ${vehicle.model}
- Año: ${vehicle.year}
- Kilometraje: ${vehicle.mileage.toLocaleString()} km
- Precio: ${vehicle.price.toLocaleString()} ${vehicle.currency}
- Ubicación: ${vehicle.location.city}, ${vehicle.location.state}
- Características: ${vehicle.features.map(f => f.name).join(', ')}

Genera:
1. Asunto de email (máx 50 chars)
2. Template WhatsApp (con variables {{nombre}})
3. Caption Instagram (con hashtags)
4. Post Facebook
5. Guión de video (30-60 segundos)
6. Call-to-action
7. Variables para personalización

Tono: Profesional, entusiasta, orientado a conversión.
Idioma: Español.
    `.trim();
  }

  private renderTemplate(template: string, lead: Lead): string {
    return template
      .replace(/{{contact\.firstName}}/g, lead.contact.firstName)
      .replace(/{{contact\.lastName}}/g, lead.contact.lastName)
      .replace(/{{contact\.email}}/g, lead.contact.email || '')
      .replace(/{{vehicle\.make}}/g, lead.vehicleInterest?.make || '')
      .replace(/{{vehicle\.model}}/g, lead.vehicleInterest?.model || '')
      .replace(/{{vehicle\.price}}/g, lead.vehicleInterest?.priceMax?.toLocaleString() || '');
  }

  private renderTemplateVariables(variables: Record<string, string>, lead: Lead): Record<string, string> {
    const rendered: Record<string, string> = {};
    for (const [key, value] of Object.entries(variables)) {
      rendered[key] = this.renderTemplate(value, lead);
    }
    return rendered;
  }

  // A/B Testing
  async createABTest(campaignId: UUID, organizationId: UUID, variants: Campaign['abTest']['variants']): Promise<void> {
    const campaign = await this.getCampaign(campaignId, organizationId);
    if (!campaign) return;

    await this.db.update(schema.campaigns).set({
      abTest: {
        enabled: true,
        variants,
        winnerCriteria: 'CONVERSION_RATE',
        testSize: 0.2,
        confidenceLevel: 0.95,
      },
      updatedAt: new Date().toISOString(),
    }).where(eq(schema.campaigns.id, campaignId));
  }

  async evaluateABTest(campaignId: UUID, organizationId: UUID): Promise<{ winner: string; confidence: number } | null> {
    const campaign = await this.getCampaign(campaignId, organizationId);
    if (!campaign?.abTest?.enabled) return null;

    // Simplified evaluation - real implementation would use statistical significance
    const variants = campaign.abTest.variants;
    if (!variants || variants.length < 2) return null;

    let bestVariant = variants[0];
    let bestRate = 0;

    for (const variant of variants) {
      if (variant.metrics) {
        const rate = variant.metrics.converted / Math.max(variant.metrics.sent, 1);
        if (rate > bestRate) {
          bestRate = rate;
          bestVariant = variant;
        }
      }
    }

    return { winner: bestVariant.id, confidence: 0.95 };
  }

  // Social Media Publishing
  async publishToSocial(
    organizationId: UUID,
    content: { text: string; imageUrls?: string[]; videoUrl?: string },
    channels: CampaignChannel[]
  ): Promise<{ success: boolean; results: Record<string, { success: boolean; postId?: string; error?: string }> }> {
    const results: Record<string, any> = {};

    for (const channel of channels) {
      try {
        if (channel === 'INSTAGRAM' || channel === 'FACEBOOK') {
          // Would use Meta Graph API
          results[channel] = { success: true, postId: 'mock_' + crypto.randomUUID() };
        } else if (channel === 'WHATSAPP') {
          // Would send to broadcast list
          results[channel] = { success: true, postId: 'mock_' + crypto.randomUUID() };
        }
      } catch (error) {
        results[channel] = { success: false, error: String(error) };
      }
    }

    return { success: Object.values(results).every(r => r.success), results };
  }

  // Analytics
  async getCampaignAnalytics(organizationId: UUID, campaignId?: UUID): Promise<any> {
    let query = this.db
      .select()
      .from(schema.campaigns)
      .where(and(eq(schema.campaigns.organizationId, organizationId), eq(schema.campaigns.deletedAt, null)));

    if (campaignId) query = query.where(eq(schema.campaigns.id, campaignId));

    const campaigns = await query.all();

    return {
      totalCampaigns: campaigns.length,
      totalSent: campaigns.reduce((sum, c) => sum + (c.metrics as any)?.sent, 0),
      totalOpened: campaigns.reduce((sum, c) => sum + (c.metrics as any)?.opened, 0),
      totalClicked: campaigns.reduce((sum, c) => sum + (c.metrics as any)?.clicked, 0),
      totalConverted: campaigns.reduce((sum, c) => sum + (c.metrics as any)?.converted, 0),
      avgOpenRate: campaigns.length > 0 
        ? campaigns.reduce((sum, c) => sum + ((c.metrics as any)?.opened / Math.max((c.metrics as any)?.sent, 1)), 0) / campaigns.length 
        : 0,
      avgClickRate: campaigns.length > 0
        ? campaigns.reduce((sum, c) => sum + ((c.metrics as any)?.clicked / Math.max((c.metrics as any)?.delivered, 1)), 0) / campaigns.length
        : 0,
      avgConversionRate: campaigns.length > 0
        ? campaigns.reduce((sum, c) => sum + ((c.metrics as any)?.converted / Math.max((c.metrics as any)?.sent, 1)), 0) / campaigns.length
        : 0,
      byChannel: this.aggregateByChannel(campaigns),
      byType: this.aggregateByType(campaigns),
    };
  }

  private aggregateByChannel(campaigns: any[]): Record<string, any> {
    const byChannel: Record<string, { sent: number; opened: number; clicked: number; converted: number }> = {};
    
    for (const campaign of campaigns) {
      for (const channel of campaign.channels) {
        if (!byChannel[channel]) byChannel[channel] = { sent: 0, opened: 0, clicked: 0, converted: 0 };
        byChannel[channel].sent += (campaign.metrics as any)?.sent || 0;
        byChannel[channel].opened += (campaign.metrics as any)?.opened || 0;
        byChannel[channel].clicked += (campaign.metrics as any)?.clicked || 0;
        byChannel[channel].converted += (campaign.metrics as any)?.converted || 0;
      }
    }

    return byChannel;
  }

  private aggregateByType(campaigns: any[]): Record<string, any> {
    const byType: Record<string, { count: number; sent: number; converted: number }> = {};
    
    for (const campaign of campaigns) {
      if (!byType[campaign.type]) byType[campaign.type] = { count: 0, sent: 0, converted: 0 };
      byType[campaign.type].count++;
      byType[campaign.type].sent += (campaign.metrics as any)?.sent || 0;
      byType[campaign.type].converted += (campaign.metrics as any)?.converted || 0;
    }

    return byType;
  }
}

export function createMarketingService(env: Env): MarketingService {
  return new MarketingService(env);
}