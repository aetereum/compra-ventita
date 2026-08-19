import { createDB, schema } from '@automotive/database';
import { createEventBus } from '@automotive/events';
import type { 
  UUID, 
  ISODateString, 
  Lead,
  LeadStatus,
  LeadStage,
  Conversation,
  Message,
  ActivityType,
  ContactMethod,
} from '@automotive/types';
import { and, eq, desc, sql, count } from 'drizzle-orm';

interface Env {
  DB: D1Database;
  EVENT_QUEUE: Queue;
}

const STAGE_ORDER: LeadStage[] = [
  'LEAD',
  'PROSPECT', 
  'QUALIFIED_LEAD',
  'OPPORTUNITY',
  'PROPOSAL_SENT',
  'NEGOTIATING',
  'CLOSED_WON',
  'CLOSED_LOST'
];

const STATUS_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  NEW: ['CONTACTED', 'QUALIFIED', 'LOST', 'ARCHIVED'],
  CONTACTED: ['QUALIFIED', 'PROPOSAL', 'LOST', 'ARCHIVED'],
  QUALIFIED: ['PROPOSAL', 'NEGOTIATION', 'LOST', 'ARCHIVED'],
  PROPOSAL: ['NEGOTIATION', 'WON', 'LOST', 'ARCHIVED'],
  NEGOTIATION: ['WON', 'LOST', 'ARCHIVED'],
  WON: ['ARCHIVED'],
  LOST: ['ARCHIVED'],
  ARCHIVED: [],
};

export class CRMService {
  private db: ReturnType<typeof createDB>;
  private eventBus: ReturnType<typeof createEventBus>;
  private env: Env;

  constructor(env: Env) {
    this.db = createDB(env.DB);
    this.eventBus = createEventBus(env.DB);
    this.env = env;
  }

  // Lead Management
  async createLead(data: Partial<Lead>, organizationId: UUID, userId?: UUID): Promise<Lead> {
    const leadId = crypto.randomUUID() as UUID;
    const now = new Date().toISOString() as ISODateString;

    const lead: Lead = {
      id: leadId,
      organizationId,
      source: data.source || 'MANUAL',
      sourceId: data.sourceId,
      vehicleId: data.vehicleId,
      campaignId: data.campaignId,
      conversationId: data.conversationId,
      assignedTo: data.assignedTo,
      status: 'NEW',
      stage: 'LEAD',
      score: data.score || 0,
      contact: data.contact!,
      vehicleInterest: data.vehicleInterest,
      qualification: data.qualification,
      activities: [],
      tags: data.tags || [],
      metadata: data.metadata || {},
      createdAt: now,
      updatedAt: now,
    };

    await this.db.insert(schema.leads).values(lead as any);
    await this.addActivity(leadId, 'CREATED', 'Lead creado', userId);
    await this.eventBus.publish({
      type: 'lead.created',
      payload: lead,
      organizationId,
      userId,
    });

    return lead;
  }

  async getLead(leadId: UUID, organizationId: UUID): Promise<Lead | null> {
    return this.db
      .select()
      .from(schema.leads)
      .where(and(eq(schema.leads.id, leadId), eq(schema.leads.organizationId, organizationId)))
      .get() as any;
  }

  async updateLead(leadId: UUID, organizationId: UUID, updates: Partial<Lead>, userId?: UUID): Promise<Lead | null> {
    const existing = await this.getLead(leadId, organizationId);
    if (!existing) return null;

    // Validate status transition
    if (updates.status && updates.status !== existing.status) {
      const allowed = STATUS_TRANSITIONS[existing.status] || [];
      if (!allowed.includes(updates.status)) {
        throw new Error(`Transición de estado no permitida: ${existing.status} -> ${updates.status}`);
      }
    }

    // Validate stage transition
    if (updates.stage && updates.stage !== existing.stage) {
      const currentIndex = STAGE_ORDER.indexOf(existing.stage);
      const newIndex = STAGE_ORDER.indexOf(updates.stage);
      if (newIndex < currentIndex) {
        throw new Error(`No se puede retroceder en el pipeline: ${existing.stage} -> ${updates.stage}`);
      }
    }

    const updateData = { ...updates, updatedAt: new Date().toISOString() };
    await this.db.update(schema.leads).set(updateData).where(eq(schema.leads.id, leadId));

    const updated = await this.getLead(leadId, organizationId);

    // Log activities
    if (updates.status && updates.status !== existing.status) {
      await this.addActivity(leadId, 'STATUS_CHANGED', `Estado cambiado: ${existing.status} -> ${updates.status}`, userId);
      await this.eventBus.publish({
        type: 'lead.status_changed',
        payload: { leadId, oldStatus: existing.status, newStatus: updates.status },
        organizationId,
        userId,
      });
    }

    if (updates.stage && updates.stage !== existing.stage) {
      await this.addActivity(leadId, 'STAGE_CHANGED', `Etapa cambiada: ${existing.stage} -> ${updates.stage}`, userId);
      await this.eventBus.publish({
        type: 'lead.stage_changed',
        payload: { leadId, oldStage: existing.stage, newStage: updates.stage },
        organizationId,
        userId,
      });
    }

    if (updates.status === 'WON' && existing.status !== 'WON') {
      await this.addActivity(leadId, 'WON', 'Lead ganado', userId);
      await this.eventBus.publish({
        type: 'lead.converted',
        payload: { leadId, saleId: crypto.randomUUID() as UUID },
        organizationId,
        userId,
      });
    }

    if (updates.status === 'LOST' && existing.status !== 'LOST') {
      await this.addActivity(leadId, 'LOST', `Lead perdido: ${updates.lostReason || 'Sin razón'}`, userId);
      await this.eventBus.publish({
        type: 'lead.lost',
        payload: { leadId, reason: updates.lostReason },
        organizationId,
        userId,
      });
    }

    return updated;
  }

  async listLeads(organizationId: UUID, params: { 
    page?: number; 
    limit?: number; 
    status?: LeadStatus; 
    stage?: LeadStage;
    assignedTo?: UUID;
    search?: string;
  }): Promise<{ data: Lead[]; meta: any }> {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const offset = (page - 1) * limit;

    let query = this.db
      .select()
      .from(schema.leads)
      .where(and(
        eq(schema.leads.organizationId, organizationId),
        eq(schema.leads.deletedAt, null)
      ));

    if (params.status) query = query.where(eq(schema.leads.status, params.status));
    if (params.stage) query = query.where(eq(schema.leads.stage, params.stage));
    if (params.assignedTo) query = query.where(eq(schema.leads.assignedTo, params.assignedTo));
    if (params.search) {
      query = query.where(
        sql`${schema.leads.contact} LIKE ${'%' + params.search + '%'}`
      );
    }

    const [leads, totalResult] = await Promise.all([
      query.orderBy(desc(schema.leads.createdAt)).limit(limit).offset(offset).all(),
      this.db.select({ count: count() }).from(schema.leads).where(
        and(eq(schema.leads.organizationId, organizationId), eq(schema.leads.deletedAt, null))
      ).get(),
    ]);

    const total = totalResult?.count || 0;
    return {
      data: leads as any[],
      meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page < Math.ceil(total / limit), hasPrev: page > 1 },
    };
  }

  async deleteLead(leadId: UUID, organizationId: UUID, userId?: UUID): Promise<boolean> {
    const lead = await this.getLead(leadId, organizationId);
    if (!lead) return false;

    await this.db.update(schema.leads).set({ deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).where(eq(schema.leads.id, leadId));
    await this.addActivity(leadId, 'NOTE_ADDED', 'Lead archivado', userId);
    return true;
  }

  // Lead Scoring
  async calculateLeadScore(leadId: UUID, organizationId: UUID): Promise<number> {
    const lead = await this.getLead(leadId, organizationId);
    if (!lead) return 0;

    let score = 0;

    // Base score from source
    const sourceScores: Record<string, number> = {
      RADAR: 30,
      WEBSITE: 20,
      WHATSAPP: 25,
      INSTAGRAM: 15,
      FACEBOOK: 15,
      EMAIL: 10,
      PHONE: 20,
      WALK_IN: 35,
      REFERRAL: 40,
      CAMPAIGN: 25,
      ACADEMY: 15,
      MANUAL: 10,
      IMPORT: 5,
    };
    score += sourceScores[lead.source] || 10;

    // Vehicle interest match
    if (lead.vehicleId) {
      const vehicle = await this.db.select().from(schema.vehicles).where(eq(schema.vehicles.id, lead.vehicleId)).get();
      if (vehicle) {
        if (lead.vehicleInterest?.make && vehicle.make === lead.vehicleInterest.make) score += 10;
        if (lead.vehicleInterest?.model && vehicle.model === lead.vehicleInterest.model) score += 10;
        if (lead.vehicleInterest?.priceMax && vehicle.price <= lead.vehicleInterest.priceMax) score += 15;
        if (lead.vehicleInterest?.mileageMax && vehicle.mileage <= lead.vehicleInterest.mileageMax) score += 5;
      }
    }

    // Qualification data
    if (lead.qualification) {
      if (lead.qualification.budget) score += 10;
      if (lead.qualification.financingPreApproved) score += 20;
      if (lead.qualification.tradeIn) score += 10;
      const urgencyScores: Record<string, number> = { LOW: 0, MEDIUM: 10, HIGH: 20, IMMEDIATE: 30 };
      score += urgencyScores[lead.qualification.urgency] || 0;
    }

    // Engagement (activities)
    const activityCount = lead.activities?.length || 0;
    score += Math.min(activityCount * 2, 20);

    // Conversation engagement
    if (lead.conversationId) {
      const messages = await this.db
        .select()
        .from(schema.messages)
        .where(and(eq(schema.messages.conversationId, lead.conversationId), eq(schema.messages.direction, 'INBOUND')))
        .all();
      score += Math.min(messages.length * 3, 15);
    }

    // Cap at 100
    return Math.min(100, score);
  }

  async recalculateAllScores(organizationId: UUID): Promise<void> {
    const leads = await this.db
      .select()
      .from(schema.leads)
      .where(and(eq(schema.leads.organizationId, organizationId), eq(schema.leads.deletedAt, null)))
      .all();

    for (const lead of leads) {
      const score = await this.calculateLeadScore(lead.id, organizationId);
      await this.db.update(schema.leads).set({ score, updatedAt: new Date().toISOString() }).where(eq(schema.leads.id, lead.id));
    }
  }

  // Activities
  async addActivity(
    leadId: UUID, 
    type: ActivityType, 
    description: string, 
    performedBy?: UUID,
    metadata?: Record<string, unknown>,
    relatedEntityType?: string,
    relatedEntityId?: UUID
  ): Promise<void> {
    const activity = {
      id: crypto.randomUUID() as UUID,
      type,
      description,
      performedBy: performedBy || '' as UUID,
      performedAt: new Date().toISOString() as ISODateString,
      metadata,
      relatedEntityType,
      relatedEntityId,
    };

    await this.db
      .update(schema.leads)
      .set({
        activities: sql`jsonb_set(${schema.leads.activities}, '{0}', ${JSON.stringify([activity, ...(await this.getActivities(leadId)).slice(0, 99)]))}`,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.leads.id, leadId));
  }

  private async getActivities(leadId: UUID): Promise<any[]> {
    const lead = await this.db.select({ activities: schema.leads.activities }).from(schema.leads).where(eq(schema.leads.id, leadId)).get();
    return lead?.activities || [];
  }

  // Pipeline Management
  async getPipelineStats(organizationId: UUID): Promise<Record<LeadStage, { count: number; value: number }>> {
    const leads = await this.db
      .select()
      .from(schema.leads)
      .where(and(eq(schema.leads.organizationId, organizationId), eq(schema.leads.deletedAt, null)))
      .all();

    const stats: Record<LeadStage, { count: number; value: number }> = {} as any;
    
    for (const stage of STAGE_ORDER) {
      const stageLeads = leads.filter(l => l.stage === stage);
      stats[stage] = {
        count: stageLeads.length,
        value: stageLeads.reduce((sum, l) => sum + (l.vehicleId ? 1 : 0), 0), // Simplified value
      };
    }

    return stats;
  }

  async getConversionRates(organizationId: UUID): Promise<Record<string, number>> {
    const leads = await this.db
      .select()
      .from(schema.leads)
      .where(and(eq(schema.leads.organizationId, organizationId), eq(schema.leads.deletedAt, null)))
      .all();

    const total = leads.length;
    if (total === 0) return {};

    const won = leads.filter(l => l.status === 'WON').length;
    const lost = leads.filter(l => l.status === 'LOST').length;
    const contacted = leads.filter(l => l.status !== 'NEW').length;
    const qualified = leads.filter(l => ['QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON'].includes(l.status)).length;

    return {
      'lead_to_contact': total > 0 ? contacted / total : 0,
      'contact_to_qualified': contacted > 0 ? qualified / contacted : 0,
      'qualified_to_won': qualified > 0 ? won / qualified : 0,
      'overall_win_rate': total > 0 ? won / total : 0,
      'loss_rate': total > 0 ? lost / total : 0,
    };
  }

  // Conversation Management
  async createConversation(data: {
    leadId?: UUID;
    channel: Conversation['channel'];
    channelId: string;
    participants: Conversation['participants'];
    organizationId: UUID;
    userId?: UUID;
  }): Promise<Conversation> {
    const conversationId = crypto.randomUUID() as UUID;
    const now = new Date().toISOString() as ISODateString;

    const conversation: Conversation = {
      id: conversationId,
      organizationId: data.organizationId,
      leadId: data.leadId,
      channel: data.channel,
      channelId: data.channelId,
      status: 'OPEN',
      participants: data.participants,
      tags: [],
      metadata: {},
      createdAt: now,
      updatedAt: now,
    };

    await this.db.insert(schema.conversations).values(conversation as any);
    await this.eventBus.publish({
      type: 'conversation.created',
      payload: conversation,
      organizationId: data.organizationId,
      userId: data.userId,
    });

    return conversation;
  }

  async getConversation(conversationId: UUID, organizationId: UUID): Promise<Conversation | null> {
    return this.db
      .select()
      .from(schema.conversations)
      .where(and(eq(schema.conversations.id, conversationId), eq(schema.conversations.organizationId, organizationId)))
      .get() as any;
  }

  async getConversationByChannel(channel: string, channelId: string, organizationId: UUID): Promise<Conversation | null> {
    return this.db
      .select()
      .from(schema.conversations)
      .where(and(
        eq(schema.conversations.channel, channel as any),
        eq(schema.conversations.channelId, channelId),
        eq(schema.conversations.organizationId, organizationId),
        eq(schema.conversations.deletedAt, null)
      ))
      .get() as any;
  }

  async addMessage(data: {
    conversationId: UUID;
    organizationId: UUID;
    fromParticipantId: UUID;
    toParticipantIds: UUID[];
    type: Message['type'];
    content: string;
    media?: Message['media'];
    direction: Message['direction'];
    externalId?: string;
    aiGenerated?: boolean;
    aiConfidence?: number;
    userId?: UUID;
  }): Promise<Message> {
    const messageId = crypto.randomUUID() as UUID;
    const now = new Date().toISOString() as ISODateString;

    const message: Message = {
      id: messageId,
      organizationId: data.organizationId,
      conversationId: data.conversationId,
      fromParticipantId: data.fromParticipantId,
      toParticipantIds: data.toParticipantIds,
      type: data.type,
      content: data.content,
      media: data.media,
      status: 'PENDING',
      direction: data.direction,
      externalId: data.externalId,
      metadata: {},
      aiGenerated: data.aiGenerated || false,
      aiConfidence: data.aiConfidence,
      humanReviewed: !data.aiGenerated,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.insert(schema.messages).values(message as any);

    // Update conversation
    await this.db.update(schema.conversations).set({ updatedAt: now }).where(eq(schema.conversations.id, data.conversationId));

    if (data.direction === 'INBOUND') {
      await this.eventBus.publish({
        type: 'message.received',
        payload: message,
        organizationId: data.organizationId,
        userId: data.userId,
      });
    }

    return message;
  }

  async getMessages(conversationId: UUID, organizationId: UUID, limit = 50, offset = 0): Promise<Message[]> {
    return this.db
      .select()
      .from(schema.messages)
      .where(and(eq(schema.messages.conversationId, conversationId), eq(schema.messages.organizationId, organizationId)))
      .orderBy(desc(schema.messages.createdAt))
      .limit(limit)
      .offset(offset)
      .all() as any;
  }

  async markMessagesRead(conversationId: UUID, organizationId: UUID, messageIds: UUID[]): Promise<void> {
    await this.db
      .update(schema.messages)
      .set({ status: 'READ', updatedAt: new Date().toISOString() })
      .where(and(
        eq(schema.messages.conversationId, conversationId),
        eq(schema.messages.organizationId, organizationId),
        sql`${schema.messages.id} IN (${messageIds.map(() => '?').join(',')})`
      ));
  }

  // Assignment
  async assignLead(leadId: UUID, organizationId: UUID, assigneeId: UUID, assignedBy: UUID): Promise<Lead | null> {
    const lead = await this.updateLead(leadId, organizationId, { assignedTo: assigneeId }, assignedBy);
    if (lead) {
      await this.addActivity(leadId, 'ASSIGNED', `Asignado a usuario ${assigneeId}`, assignedBy);
      // Notify assignee
      await this.db.insert(schema.notifications).values({
        id: crypto.randomUUID() as UUID,
        organizationId,
        userId: assigneeId,
        type: 'LEAD_NEW',
        title: 'Nuevo lead asignado',
        message: `Se te ha asignado el lead ${lead.contact.firstName} ${lead.contact.lastName}`,
        priority: 'NORMAL',
        channels: ['IN_APP', 'EMAIL'],
        actionUrl: `/leads/${leadId}`,
        actionLabel: 'Ver lead',
        metadata: { leadId },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    return lead;
  }

  async autoAssignLead(leadId: UUID, organizationId: UUID): Promise<Lead | null> {
    // Round-robin assignment to available sales users
    const salesUsers = await this.db
      .select()
      .from(schema.organizationMembers)
      .where(and(
        eq(schema.organizationMembers.organizationId, organizationId),
        sql`${schema.organizationMembers.role} IN ('SALES', 'MANAGER')`
      ))
      .all();

    if (salesUsers.length === 0) return null;

    // Get current assignment counts
    const assignments = await this.db
      .select({ assignedTo: schema.leads.assignedTo, count: count() })
      .from(schema.leads)
      .where(and(
        eq(schema.leads.organizationId, organizationId),
        eq(schema.leads.deletedAt, null),
        sql`${schema.leads.assignedTo} IS NOT NULL`
      ))
      .groupBy(schema.leads.assignedTo)
      .all();

    const counts = new Map(assignments.map(a => [a.assignedTo, a.count]));
    
    // Find user with least assignments
    let minCount = Infinity;
    let selectedUser = salesUsers[0].userId;
    
    for (const user of salesUsers) {
      const count = counts.get(user.userId) || 0;
      if (count < minCount) {
        minCount = count;
        selectedUser = user.userId;
      }
    }

    return this.assignLead(leadId, organizationId, selectedUser, 'system' as UUID);
  }

  // Communication preferences
  async getPreferredContactMethod(leadId: UUID, organizationId: UUID): Promise<ContactMethod> {
    const lead = await this.getLead(leadId, organizationId);
    return lead?.contact?.preferredContact || 'ANY';
  }

  async updateContactPreference(leadId: UUID, organizationId: UUID, method: ContactMethod, userId?: UUID): Promise<Lead | null> {
    return this.updateLead(leadId, organizationId, { 
      contact: { ...(await this.getLead(leadId, organizationId))!.contact, preferredContact: method } 
    }, userId);
  }
}

export function createCRMService(env: Env): CRMService {
  return new CRMService(env);
}