import type { D1Database } from '@cloudflare/workers-types';
import { createDB, schema } from '@automotive/database';
import type { 
  UUID, 
  ISODateString, 
  Event, 
  EventHandler, 
  RetryPolicy,
  Vehicle,
  Lead,
  Conversation,
  Message,
  Campaign,
  VideoJob,
  Course
} from '@automotive/types';

export type EventType = 
  | 'vehicle.created'
  | 'vehicle.updated'
  | 'vehicle.deleted'
  | 'vehicle.status_changed'
  | 'listing.discovered'
  | 'listing.price_changed'
  | 'listing.mileage_changed'
  | 'listing.seller_changed'
  | 'listing.removed'
  | 'opportunity.detected'
  | 'lead.created'
  | 'lead.updated'
  | 'lead.status_changed'
  | 'lead.stage_changed'
  | 'lead.converted'
  | 'lead.lost'
  | 'conversation.created'
  | 'conversation.updated'
  | 'conversation.closed'
  | 'conversation.assigned'
  | 'conversation.escalated'
  | 'message.sent'
  | 'message.received'
  | 'message.read'
  | 'message.failed'
  | 'campaign.created'
  | 'campaign.started'
  | 'campaign.completed'
  | 'campaign.cancelled'
  | 'video.requested'
  | 'video.queued'
  | 'video.processing'
  | 'video.completed'
  | 'video.failed'
  | 'video.cancelled'
  | 'course.created'
  | 'course.published'
  | 'course.enrolled'
  | 'course.completed'
  | 'lesson.completed'
  | 'quiz.passed'
  | 'certificate.issued'
  | 'organization.created'
  | 'organization.updated'
  | 'member.invited'
  | 'member.joined'
  | 'member.updated'
  | 'member.removed'
  | 'sale.created'
  | 'sale.completed'
  | 'appointment.scheduled'
  | 'appointment.completed'
  | 'appointment.cancelled';

export interface TypedEvent<T = unknown> extends Event<T> {
  type: EventType;
}

export interface EventBusConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  deadLetterQueue: string;
}

const DEFAULT_CONFIG: EventBusConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  deadLetterQueue: 'events-dlq',
};

type HandlerMap = Map<EventType, EventHandler[]>;

export class EventBus {
  private db: ReturnType<typeof createDB>;
  private handlers: HandlerMap = new Map();
  private config: EventBusConfig;
  private processing = false;

  constructor(d1: D1Database, config?: Partial<EventBusConfig>) {
    this.db = createDB(d1);
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  subscribe<T = unknown>(eventType: EventType, handler: EventHandler<T>): () => void {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler as EventHandler);
    this.handlers.set(eventType, handlers);

    // Return unsubscribe function
    return () => {
      const current = this.handlers.get(eventType) || [];
      const index = current.indexOf(handler as EventHandler);
      if (index > -1) {
        current.splice(index, 1);
        this.handlers.set(eventType, current);
      }
    };
  }

  async publish<T = unknown>(event: Omit<TypedEvent<T>, 'id' | 'timestamp' | 'createdAt'>): Promise<UUID> {
    const id = crypto.randomUUID() as UUID;
    const timestamp = new Date().toISOString() as ISODateString;

    const fullEvent: TypedEvent<T> = {
      id,
      type: event.type,
      payload: event.payload,
      organizationId: event.organizationId,
      userId: event.userId,
      correlationId: event.correlationId,
      causationId: event.causationId,
      timestamp,
      metadata: event.metadata || {},
    };

    // Store event in database
    await this.db.insert(schema.events).values({
      id: fullEvent.id,
      type: fullEvent.type,
      payload: fullEvent.payload as Record<string, unknown>,
      organizationId: fullEvent.organizationId,
      userId: fullEvent.userId,
      correlationId: fullEvent.correlationId,
      causationId: fullEvent.causationId,
      timestamp: fullEvent.timestamp,
      metadata: fullEvent.metadata,
    });

    // Process handlers asynchronously
    this.processEvent(fullEvent).catch(console.error);

    return id;
  }

  private async processEvent<T>(event: TypedEvent<T>): Promise<void> {
    const handlers = this.handlers.get(event.type) || [];
    if (handlers.length === 0) return;

    await Promise.all(
      handlers.map(async (handler) => {
        try {
          await this.executeWithRetry(handler, event);
        } catch (error) {
          console.error(`Event handler failed for ${event.type}:`, error);
          await this.sendToDeadLetterQueue(event, error);
        }
      })
    );
  }

  private async executeWithRetry<T>(handler: EventHandler<T>, event: TypedEvent<T>): Promise<void> {
    const retryPolicy = handler.retryPolicy || {
      maxAttempts: this.config.maxRetries,
      baseDelayMs: this.config.baseDelayMs,
      maxDelayMs: this.config.maxDelayMs,
      backoffMultiplier: this.config.backoffMultiplier,
    };

    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < retryPolicy.maxAttempts) {
      try {
        await handler.handler(event);
        return; // Success
      } catch (error) {
        lastError = error as Error;
        attempt++;

        if (attempt >= retryPolicy.maxAttempts) break;

        // Check if error is retryable
        if (retryPolicy.retryableErrors && retryPolicy.retryableErrors.length > 0) {
          const isRetryable = retryPolicy.retryableErrors.some(e => 
            error instanceof Error && error.message.includes(e)
          );
          if (!isRetryable) break;
        }

        // Exponential backoff
        const delay = Math.min(
          retryPolicy.baseDelayMs * Math.pow(retryPolicy.backoffMultiplier, attempt - 1),
          retryPolicy.maxDelayMs
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  private async sendToDeadLetterQueue<T>(event: TypedEvent<T>, error: Error): Promise<void> {
    await this.db.insert(schema.events).values({
      id: crypto.randomUUID() as UUID,
      type: `dead_letter.${event.type}`,
      payload: {
        originalEvent: event,
        error: error.message,
        stack: error.stack,
      } as Record<string, unknown>,
      organizationId: event.organizationId,
      userId: event.userId,
      correlationId: event.correlationId,
      causationId: event.causationId,
      timestamp: new Date().toISOString() as ISODateString,
      metadata: { deadLetter: true },
    });
  }

  async replayEvents(
    organizationId: UUID,
    eventTypes: EventType[],
    fromTimestamp: ISODateString,
    toTimestamp?: ISODateString
  ): Promise<number> {
    let query = this.db
      .select()
      .from(schema.events)
      .where(
        and(
          eq(schema.events.organizationId, organizationId),
          eq(schema.events.type, eventTypes[0]), // Simplified - would need IN clause
        )
      );

    // Note: This is simplified. Real implementation would use proper IN clause
    const events = await query.all();

    let processed = 0;
    for (const event of events) {
      const typedEvent = event as unknown as TypedEvent;
      await this.processEvent(typedEvent);
      processed++;
    }

    return processed;
  }

  async getEventHistory(
    organizationId: UUID,
    params: { eventType?: EventType; limit?: number; offset?: number }
  ): Promise<TypedEvent[]> {
    let query = this.db
      .select()
      .from(schema.events)
      .where(eq(schema.events.organizationId, organizationId))
      .orderBy(schema.events.timestamp, 'desc')
      .limit(params.limit || 100)
      .offset(params.offset || 0);

    if (params.eventType) {
      query = query.where(eq(schema.events.type, params.eventType));
    }

    return query.all() as unknown as TypedEvent[];
  }
}

// Convenience functions for common events
export const EventPublishers = {
  vehicle: {
    created: (bus: EventBus, vehicle: Vehicle, userId?: UUID) => 
      bus.publish({
        type: 'vehicle.created',
        payload: vehicle,
        organizationId: vehicle.organizationId,
        userId,
        metadata: { source: vehicle.source },
      }),

    updated: (bus: EventBus, vehicle: Vehicle, changes: Partial<Vehicle>, userId?: UUID) =>
      bus.publish({
        type: 'vehicle.updated',
        payload: { vehicle, changes },
        organizationId: vehicle.organizationId,
        userId,
      }),

    statusChanged: (bus: EventBus, vehicle: Vehicle, oldStatus: string, newStatus: string, userId?: UUID) =>
      bus.publish({
        type: 'vehicle.status_changed',
        payload: { vehicleId: vehicle.id, oldStatus, newStatus },
        organizationId: vehicle.organizationId,
        userId,
      }),

    opportunityDetected: (bus: EventBus, vehicle: Vehicle, dealScore: number, userId?: UUID) =>
      bus.publish({
        type: 'opportunity.detected',
        payload: { vehicleId: vehicle.id, dealScore, marketPrice: vehicle.marketPrice, estimatedMargin: vehicle.estimatedMargin },
        organizationId: vehicle.organizationId,
        userId,
      }),
  },

  listing: {
    discovered: (bus: EventBus, listing: any, userId?: UUID) =>
      bus.publish({
        type: 'listing.discovered',
        payload: listing,
        organizationId: listing.organizationId,
        userId,
      }),

    priceChanged: (bus: EventBus, listing: any, oldPrice: number, newPrice: number, userId?: UUID) =>
      bus.publish({
        type: 'listing.price_changed',
        payload: { listingId: listing.id, oldPrice, newPrice },
        organizationId: listing.organizationId,
        userId,
      }),
  },

  lead: {
    created: (bus: EventBus, lead: Lead, userId?: UUID) =>
      bus.publish({
        type: 'lead.created',
        payload: lead,
        organizationId: lead.organizationId,
        userId,
      }),

    statusChanged: (bus: EventBus, lead: Lead, oldStatus: string, newStatus: string, userId?: UUID) =>
      bus.publish({
        type: 'lead.status_changed',
        payload: { leadId: lead.id, oldStatus, newStatus },
        organizationId: lead.organizationId,
        userId,
      }),

    converted: (bus: EventBus, lead: Lead, saleId: UUID, userId?: UUID) =>
      bus.publish({
        type: 'lead.converted',
        payload: { leadId: lead.id, saleId },
        organizationId: lead.organizationId,
        userId,
      }),
  },

  conversation: {
    created: (bus: EventBus, conversation: Conversation, userId?: UUID) =>
      bus.publish({
        type: 'conversation.created',
        payload: conversation,
        organizationId: conversation.organizationId,
        userId,
      }),

    messageReceived: (bus: EventBus, message: Message, userId?: UUID) =>
      bus.publish({
        type: 'message.received',
        payload: message,
        organizationId: message.organizationId,
        userId,
      }),

    escalated: (bus: EventBus, conversation: Conversation, reason: string, userId?: UUID) =>
      bus.publish({
        type: 'conversation.escalated',
        payload: { conversationId: conversation.id, reason },
        organizationId: conversation.organizationId,
        userId,
      }),
  },

  campaign: {
    created: (bus: EventBus, campaign: Campaign, userId?: UUID) =>
      bus.publish({
        type: 'campaign.created',
        payload: campaign,
        organizationId: campaign.organizationId,
        userId,
      }),

    started: (bus: EventBus, campaign: Campaign, userId?: UUID) =>
      bus.publish({
        type: 'campaign.started',
        payload: { campaignId: campaign.id },
        organizationId: campaign.organizationId,
        userId,
      }),
  },

  video: {
    requested: (bus: EventBus, job: VideoJob, userId?: UUID) =>
      bus.publish({
        type: 'video.requested',
        payload: job,
        organizationId: job.organizationId,
        userId,
      }),

    completed: (bus: EventBus, job: VideoJob, userId?: UUID) =>
      bus.publish({
        type: 'video.completed',
        payload: job,
        organizationId: job.organizationId,
        userId,
      }),
  },

  course: {
    enrolled: (bus: EventBus, enrollment: any, userId?: UUID) =>
      bus.publish({
        type: 'course.enrolled',
        payload: enrollment,
        organizationId: enrollment.organizationId,
        userId,
      }),

    completed: (bus: EventBus, enrollment: any, certificateId: UUID, userId?: UUID) =>
      bus.publish({
        type: 'course.completed',
        payload: { enrollmentId: enrollment.id, certificateId },
        organizationId: enrollment.organizationId,
        userId,
      }),
  },

  appointment: {
    scheduled: (bus: EventBus, appointment: any, userId?: UUID) =>
      bus.publish({
        type: 'appointment.scheduled',
        payload: appointment,
        organizationId: appointment.organizationId,
        userId,
      }),

    completed: (bus: EventBus, appointment: any, userId?: UUID) =>
      bus.publish({
        type: 'appointment.completed',
        payload: appointment,
        organizationId: appointment.organizationId,
        userId,
      }),
  },

  organization: {
    created: (bus: EventBus, organization: any, userId?: UUID) =>
      bus.publish({
        type: 'organization.created',
        payload: organization,
        organizationId: organization.id,
        userId,
      }),
  },

  member: {
    invited: (bus: EventBus, organizationId: UUID, email: string, role: string, invitedBy: UUID) =>
      bus.publish({
        type: 'member.invited',
        payload: { organizationId, email, role, invitedBy },
        organizationId,
        userId: invitedBy,
      }),

    joined: (bus: EventBus, organizationId: UUID, userId: UUID, role: string) =>
      bus.publish({
        type: 'member.joined',
        payload: { organizationId, userId, role },
        organizationId,
        userId,
      }),
  },

  sale: {
    created: (bus: EventBus, sale: any, userId?: UUID) =>
      bus.publish({
        type: 'sale.created',
        payload: sale,
        organizationId: sale.organizationId,
        userId,
      }),
  },
};

import { and, eq } from 'drizzle-orm';

export function createEventBus(d1: D1Database, config?: Partial<EventBusConfig>): EventBus {
  return new EventBus(d1, config);
}