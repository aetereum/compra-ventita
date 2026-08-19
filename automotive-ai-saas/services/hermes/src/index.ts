import { createDB, schema } from '@automotive/database';
import { createEventBus } from '@automotive/events';
import type { 
  UUID, 
  ISODateString, 
  HermesAction, 
  HermesActionType, 
  ActionStatus,
  AIRequest,
  AIResponse,
  AIMessage,
  AITool,
  Vehicle,
  Lead,
  Conversation,
  Message,
  Campaign,
  VideoJob,
} from '@automotive/types';
import { and, eq, desc } from 'drizzle-orm';

interface Env {
  DB: D1Database;
  AI: Ai;
  OPENAI_API_KEY: string;
  ANTHROPIC_API_KEY: string;
  EVENT_QUEUE: Queue;
  VIDEO_QUEUE: Queue;
}

interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class HermesOrchestrator {
  private db: ReturnType<typeof createDB>;
  private eventBus: ReturnType<typeof createEventBus>;
  private env: Env;

  constructor(env: Env) {
    this.db = createDB(env.DB);
    this.eventBus = createEventBus(env.DB);
    this.env = env;
  }

  async processMessage(
    conversationId: UUID,
    message: string,
    organizationId: UUID,
    userId?: UUID
  ): Promise<{ response: string; actions: HermesAction[] }> {
    // Get conversation context
    const conversation = await this.getConversationContext(conversationId, organizationId);
    
    // Build system prompt
    const systemPrompt = this.buildSystemPrompt(conversation);
    
    // Prepare messages for AI
    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversation.recentMessages.map(m => ({
        role: m.direction === 'INBOUND' ? 'user' : 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    // Get available tools
    const tools = this.getAvailableTools();

    // Call AI with tools
    const aiResponse = await this.callAI(messages, tools);
    
    // Execute any tool calls
    const actions: HermesAction[] = [];
    if (aiResponse.choices[0].message.toolCalls) {
      for (const toolCall of aiResponse.choices[0].message.toolCalls) {
        const action = await this.executeTool(toolCall, organizationId, userId);
        actions.push(action);
      }
    }

    // If AI wants to respond, include that
    const response = aiResponse.choices[0].message.content || '';

    return { response, actions };
  }

  private buildSystemPrompt(conversation: any): string {
    return `Eres Hermes, el asistente de IA central de una plataforma automotriz.
Tu rol es ayudar a los usuarios a gestionar su negocio automotriz: inventario, leads, marketing, videos, academia.

CONTEXTO ACTUAL:
- Organización: ${conversation.organization?.name}
- Conversación: ${conversation.id}
- Canal: ${conversation.channel}
- Lead asociado: ${conversation.leadId || 'Ninguno'}

HERRAMIENTAS DISPONIBLES:
- search_vehicles: Buscar vehículos en inventario
- analyze_vehicle: Analizar oportunidad de un vehículo
- create_lead: Crear nuevo lead
- update_lead: Actualizar lead existente
- send_message: Enviar mensaje por WhatsApp/Email
- schedule_appointment: Agendar cita
- create_campaign: Crear campaña de marketing
- generate_video: Generar video promocional
- publish_social: Publicar en redes sociales
- calculate_financing: Calcular financiamiento
- request_human: Solicitar intervención humana

REGLAS:
1. NUNCA ejecutes acciones peligrosas sin confirmación
2. SIEMPRE verifica el contexto antes de actuar
3. Prioriza la seguridad y privacidad de los datos
4. Mantén el contexto de la conversación
5. Si no estás seguro, pide confirmación al humano`;
  }

  private getAvailableTools(): AITool[] {
    return [
      {
        type: 'function',
        function: {
          name: 'search_vehicles',
          description: 'Buscar vehículos en el inventario con filtros',
          parameters: {
            type: 'object',
            properties: {
              make: { type: 'string' },
              model: { type: 'string' },
              yearMin: { type: 'number' },
              yearMax: { type: 'number' },
              priceMin: { type: 'number' },
              priceMax: { type: 'number' },
              mileageMax: { type: 'number' },
              status: { type: 'string', enum: ['DISCOVERED', 'ANALYZING', 'OPPORTUNITY', 'ACQUIRED', 'IN_INVENTORY', 'LISTED', 'RESERVED', 'SOLD'] },
              limit: { type: 'number', default: 10 },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'analyze_vehicle',
          description: 'Analizar un vehículo para calcular score de oportunidad',
          parameters: {
            type: 'object',
            properties: {
              vehicleId: { type: 'string' },
            },
            required: ['vehicleId'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'create_lead',
          description: 'Crear un nuevo lead',
          parameters: {
            type: 'object',
            properties: {
              source: { type: 'string' },
              contact: {
                type: 'object',
                properties: {
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  email: { type: 'string' },
                  phone: { type: 'string' },
                  whatsapp: { type: 'string' },
                  preferredContact: { type: 'string', enum: ['WHATSAPP', 'EMAIL', 'PHONE', 'IN_PERSON'] },
                },
                required: ['firstName', 'lastName'],
              },
              vehicleId: { type: 'string' },
              vehicleInterest: { type: 'object' },
            },
            required: ['source', 'contact'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'update_lead',
          description: 'Actualizar un lead existente',
          parameters: {
            type: 'object',
            properties: {
              leadId: { type: 'string' },
              status: { type: 'string' },
              stage: { type: 'string' },
              assignedTo: { type: 'string' },
              notes: { type: 'string' },
            },
            required: ['leadId'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'send_message',
          description: 'Enviar mensaje por WhatsApp u otro canal',
          parameters: {
            type: 'object',
            properties: {
              conversationId: { type: 'string' },
              content: { type: 'string' },
              channel: { type: 'string', enum: ['WHATSAPP', 'EMAIL', 'INSTAGRAM'] },
            },
            required: ['conversationId', 'content', 'channel'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'schedule_appointment',
          description: 'Agendar una cita con un lead',
          parameters: {
            type: 'object',
            properties: {
              leadId: { type: 'string' },
              dateTime: { type: 'string' },
              type: { type: 'string', enum: ['TEST_DRIVE', 'INSPECTION', 'NEGOTIATION', 'DELIVERY'] },
              notes: { type: 'string' },
            },
            required: ['leadId', 'dateTime', 'type'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'create_campaign',
          description: 'Crear una campaña de marketing',
          parameters: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              type: { type: 'string' },
              trigger: { type: 'object' },
              audience: { type: 'object' },
              content: { type: 'object' },
              channels: { type: 'array', items: { type: 'string' } },
            },
            required: ['name', 'type'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'generate_video',
          description: 'Generar un video promocional para un vehículo',
          parameters: {
            type: 'object',
            properties: {
              vehicleId: { type: 'string' },
              type: { type: 'string', enum: ['VEHICLE_SHOWCASE', 'WALKAROUND', 'FEATURE_HIGHLIGHT', 'SOCIAL_MEDIA_REEL'] },
              script: { type: 'string' },
              images: { type: 'array', items: { type: 'string' } },
              aspectRatio: { type: 'string', enum: ['16:9', '9:16', '1:1'] },
            },
            required: ['vehicleId', 'type', 'images'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'calculate_financing',
          description: 'Calcular opciones de financiamiento',
          parameters: {
            type: 'object',
            properties: {
              vehiclePrice: { type: 'number' },
              downPayment: { type: 'number' },
              termMonths: { type: 'number' },
              interestRate: { type: 'number' },
            },
            required: ['vehiclePrice'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'request_human',
          description: 'Solicitar intervención de un agente humano',
          parameters: {
            type: 'object',
            properties: {
              reason: { type: 'string' },
              urgency: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
              context: { type: 'object' },
            },
            required: ['reason', 'urgency'],
          },
        },
      },
    ];
  }

  private async callAI(messages: AIMessage[], tools: AITool[]): Promise<AIResponse> {
    // Use Cloudflare Workers AI or external provider
    const response = await this.env.AI.run('@cf/meta/llama-3-8b-instruct', {
      messages: messages.map(m => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      })),
      tools: tools.map(t => ({
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters,
      })),
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 2000,
    });

    return response as unknown as AIResponse;
  }

  private async executeTool(toolCall: any, organizationId: UUID, userId?: UUID): Promise<HermesAction> {
    const actionId = crypto.randomUUID() as UUID;
    const action: HermesAction = {
      id: actionId,
      type: toolCall.function.name as HermesActionType,
      payload: JSON.parse(toolCall.function.arguments),
      requiresApproval: this.requiresApproval(toolCall.function.name),
      status: 'PENDING',
    };

    // Check if approval needed
    if (action.requiresApproval) {
      action.status = 'PENDING';
      // Store for approval workflow
      return action;
    }

    // Execute immediately
    action.status = 'EXECUTING';
    try {
      const result = await this.executeToolLogic(action.type, action.payload, organizationId, userId);
      action.result = result;
      action.status = 'COMPLETED';
      action.executedAt = new Date().toISOString() as ISODateString;
    } catch (error) {
      action.error = error instanceof Error ? error.message : 'Error desconocido';
      action.status = 'FAILED';
    }

    return action;
  }

  private requiresApproval(actionType: string): boolean {
    const dangerousActions: HermesActionType[] = [
      'CREATE_CAMPAIGN',
      'GENERATE_VIDEO',
      'PUBLISH_SOCIAL',
      'CALCULATE_FINANCING',
      'GENERATE_CONTRACT',
    ];
    return dangerousActions.includes(actionType as HermesActionType);
  }

  private async executeToolLogic(
    type: HermesActionType,
    payload: any,
    organizationId: UUID,
    userId?: UUID
  ): Promise<ToolResult> {
    switch (type) {
      case 'SEARCH_VEHICLES':
        return this.searchVehicles(payload, organizationId);
      case 'ANALYZE_VEHICLE':
        return this.analyzeVehicle(payload, organizationId);
      case 'CREATE_LEAD':
        return this.createLead(payload, organizationId, userId);
      case 'UPDATE_LEAD':
        return this.updateLead(payload, organizationId);
      case 'SEND_MESSAGE':
        return this.sendMessage(payload, organizationId);
      case 'SCHEDULE_APPOINTMENT':
        return this.scheduleAppointment(payload, organizationId);
      case 'CREATE_CAMPAIGN':
        return this.createCampaign(payload, organizationId, userId);
      case 'GENERATE_VIDEO':
        return this.generateVideo(payload, organizationId, userId);
      case 'CALCULATE_FINANCING':
        return this.calculateFinancing(payload);
      case 'REQUEST_HUMAN':
        return this.requestHuman(payload, organizationId, userId);
      default:
        return { success: false, error: `Herramienta no implementada: ${type}` };
    }
  }

  private async searchVehicles(filters: any, organizationId: UUID): Promise<ToolResult> {
    let query = this.db
      .select()
      .from(schema.vehicles)
      .where(and(
        eq(schema.vehicles.organizationId, organizationId),
        eq(schema.vehicles.deletedAt, null)
      ));

    if (filters.make) query = query.where(eq(schema.vehicles.make, filters.make));
    if (filters.model) query = query.where(eq(schema.vehicles.model, filters.model));
    if (filters.yearMin) query = query.where(sql`${schema.vehicles.year} >= ${filters.yearMin}`);
    if (filters.yearMax) query = query.where(sql`${schema.vehicles.year} <= ${filters.yearMax}`);
    if (filters.priceMin) query = query.where(sql`${schema.vehicles.price} >= ${filters.priceMin}`);
    if (filters.priceMax) query = query.where(sql`${schema.vehicles.price} <= ${filters.priceMax}`);
    if (filters.mileageMax) query = query.where(sql`${schema.vehicles.mileage} <= ${filters.mileageMax}`);
    if (filters.status) query = query.where(eq(schema.vehicles.status, filters.status));

    const vehicles = await query
      .orderBy(desc(schema.vehicles.createdAt))
      .limit(filters.limit || 10)
      .all();

    return { success: true, data: vehicles };
  }

  private async analyzeVehicle(payload: { vehicleId: UUID }, organizationId: UUID): Promise<ToolResult> {
    const vehicle = await this.db
      .select()
      .from(schema.vehicles)
      .where(and(eq(schema.vehicles.id, payload.vehicleId), eq(schema.vehicles.organizationId, organizationId)))
      .get();

    if (!vehicle) {
      return { success: false, error: 'Vehículo no encontrado' };
    }

    // Simple analysis - in production would call AI service
    const marketPrice = vehicle.price * 1.15; // Simplified
    const estimatedMargin = marketPrice - vehicle.price;
    const dealScore = Math.min(100, Math.max(0, Math.round((estimatedMargin / vehicle.price) * 100 * 5)));
    
    const analysis = {
      marketPrice,
      estimatedMargin,
      dealScore,
      riskScore: dealScore > 80 ? 'LOW' : dealScore > 60 ? 'MEDIUM' : 'HIGH',
      confidence: 0.85,
      reasoning: `Análisis basado en precio de mercado estimado ${marketPrice.toLocaleString()} vs precio actual ${vehicle.price.toLocaleString()}`,
      comparables: [],
      analyzedAt: new Date().toISOString(),
    };

    // Update vehicle with analysis
    await this.db
      .update(schema.vehicles)
      .set({ 
        marketPrice, 
        estimatedMargin, 
        dealScore, 
        riskScore: analysis.riskScore, 
        confidence: analysis.confidence,
        aiAnalysis: analysis,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.vehicles.id, payload.vehicleId));

    return { success: true, data: analysis };
  }

  private async createLead(payload: any, organizationId: UUID, userId?: UUID): Promise<ToolResult> {
    const leadId = crypto.randomUUID() as UUID;
    const now = new Date().toISOString() as ISODateString;

    const lead = {
      id: leadId,
      organizationId,
      source: payload.source,
      contact: payload.contact,
      vehicleId: payload.vehicleId,
      vehicleInterest: payload.vehicleInterest,
      status: 'NEW' as const,
      stage: 'LEAD' as const,
      score: 50,
      activities: [],
      tags: [],
      metadata: {},
      createdAt: now,
      updatedAt: now,
    };

    await this.db.insert(schema.leads).values(lead as any);
    return { success: true, data: lead };
  }

  private async updateLead(payload: any, organizationId: UUID): Promise<ToolResult> {
    const updates = { ...payload, updatedAt: new Date().toISOString() };
    delete updates.leadId;
    
    await this.db
      .update(schema.leads)
      .set(updates)
      .where(and(eq(schema.leads.id, payload.leadId), eq(schema.leads.organizationId, organizationId)));

    const updated = await this.db
      .select()
      .from(schema.leads)
      .where(eq(schema.leads.id, payload.leadId))
      .get();

    return { success: true, data: updated };
  }

  private async sendMessage(payload: any, organizationId: UUID): Promise<ToolResult> {
    // This would integrate with the communications service
    // For now, just log the intent
    console.log('Sending message:', payload);
    
    const messageId = crypto.randomUUID() as UUID;
    const now = new Date().toISOString() as ISODateString;

    const message = {
      id: messageId,
      organizationId,
      conversationId: payload.conversationId,
      fromParticipantId: 'hermes',
      toParticipantIds: [], // Would be determined from conversation
      type: 'TEXT' as const,
      content: payload.content,
      status: 'SENT' as const,
      direction: 'OUTBOUND' as const,
      aiGenerated: true,
      humanReviewed: false,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.insert(schema.messages).values(message as any);
    return { success: true, data: message };
  }

  private async scheduleAppointment(payload: any, organizationId: UUID): Promise<ToolResult> {
    // Create appointment - simplified
    const appointmentId = crypto.randomUUID() as UUID;
    return { success: true, data: { id: appointmentId, ...payload } };
  }

  private async createCampaign(payload: any, organizationId: UUID, userId?: UUID): Promise<ToolResult> {
    const campaignId = crypto.randomUUID() as UUID;
    const now = new Date().toISOString() as ISODateString;

    const campaign = {
      id: campaignId,
      organizationId,
      ...payload,
      metrics: { sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0, converted: 0, unsubscribed: 0, bounced: 0, spamReported: 0 },
      tags: [],
      createdAt: now,
      updatedAt: now,
    };

    await this.db.insert(schema.campaigns).values(campaign as any);
    return { success: true, data: campaign };
  }

  private async generateVideo(payload: any, organizationId: UUID, userId?: UUID): Promise<ToolResult> {
    const jobId = crypto.randomUUID() as UUID;
    const now = new Date().toISOString() as ISODateString;

    const job = {
      id: jobId,
      organizationId,
      vehicleId: payload.vehicleId,
      type: payload.type,
      status: 'PENDING' as const,
      priority: 0,
      input: {
        script: payload.script || `Video promocional para ${payload.vehicleId}`,
        images: payload.images,
        aspectRatio: payload.aspectRatio || '16:9',
      },
      progress: 0,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.insert(schema.videoJobs).values(job as any);
    
    // Queue for processing
    await this.env.VIDEO_QUEUE.send({ jobId, organizationId, type: 'process_video' });

    return { success: true, data: job };
  }

  private async calculateFinancing(payload: any): Promise<ToolResult> {
    const { vehiclePrice, downPayment = 0, termMonths = 60, interestRate = 0.12 } = payload;
    
    const principal = vehiclePrice - downPayment;
    const monthlyRate = interestRate / 12;
    const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
    const totalInterest = monthlyPayment * termMonths - principal;
    const totalCost = vehiclePrice + totalInterest;

    return {
      success: true,
      data: {
        vehiclePrice,
        downPayment,
        principal,
        termMonths,
        interestRate,
        monthlyPayment: Math.round(monthlyPayment * 100) / 100,
        totalInterest: Math.round(totalInterest * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
      },
    };
  }

  private async requestHuman(payload: any, organizationId: UUID, userId?: UUID): Promise<ToolResult> {
    // Create notification for human agents
    const notificationId = crypto.randomUUID() as UUID;
    await this.db.insert(schema.notifications).values({
      id: notificationId,
      organizationId,
      userId: userId || '' as UUID, // Would target specific role
      type: 'SYSTEM_ALERT',
      title: 'Intervención humana requerida',
      message: payload.reason,
      priority: payload.urgency,
      channels: ['IN_APP', 'EMAIL'],
      metadata: { context: payload.context },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return { success: true, data: { notificationId, message: 'Solicitud enviada a agentes humanos' } };
  }

  private async getConversationContext(conversationId: UUID, organizationId: UUID) {
    const conversation = await this.db
      .select()
      .from(schema.conversations)
      .where(and(eq(schema.conversations.id, conversationId), eq(schema.conversations.organizationId, organizationId)))
      .get();

    const recentMessages = await this.db
      .select()
      .from(schema.messages)
      .where(and(eq(schema.messages.conversationId, conversationId), eq(schema.messages.organizationId, organizationId)))
      .orderBy(desc(schema.messages.createdAt))
      .limit(10)
      .all();

    const organization = await this.db
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.id, organizationId))
      .get();

    let lead = null;
    if (conversation?.leadId) {
      lead = await this.db
        .select()
        .from(schema.leads)
        .where(eq(schema.leads.id, conversation.leadId))
        .get();
    }

    return {
      conversation,
      recentMessages: recentMessages.reverse(),
      organization,
      lead,
    };
  }

  // Process queued actions that were approved
  async processApprovedActions(): Promise<void> {
    // This would be called by a scheduled worker
    // to process actions that were approved by humans
  }
}

export function createHermesOrchestrator(env: Env): HermesOrchestrator {
  return new HermesOrchestrator(env);
}

// Export types for use in other services
export type { ToolResult };