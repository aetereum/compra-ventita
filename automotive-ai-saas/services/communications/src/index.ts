import { createDB, schema } from '@automotive/database';
import { createEventBus } from '@automotive/events';
import { createCRMService } from '@automotive/crm';
import type { 
  UUID, 
  ISODateString, 
  Message,
  Conversation,
  ConversationChannel,
  ConversationStatus,
  MessageType,
  MessageDirection,
} from '@automotive/types';
import { and, eq, desc } from 'drizzle-orm';

interface Env {
  DB: D1Database;
  EVENT_QUEUE: Queue;
  WHATSAPP_ACCESS_TOKEN: string;
  WHATSAPP_PHONE_NUMBER_ID: string;
  WHATSAPP_VERIFY_TOKEN: string;
  META_APP_SECRET: string;
  INSTAGRAM_ACCESS_TOKEN: string;
}

export interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  verifyToken: string;
  businessAccountId: string;
}

export interface InstagramConfig {
  accessToken: string;
  businessAccountId: string;
}

export class CommunicationsService {
  private db: ReturnType<typeof createDB>;
  private eventBus: ReturnType<typeof createEventBus>;
  private crmService: ReturnType<typeof createCRMService>;
  private env: Env;
  private whatsappConfig: WhatsAppConfig;
  private instagramConfig: InstagramConfig;

  constructor(env: Env) {
    this.db = createDB(env.DB);
    this.eventBus = createEventBus(env.DB);
    this.crmService = createCRMService(env);
    this.env = env;
    this.whatsappConfig = {
      phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
      accessToken: env.WHATSAPP_ACCESS_TOKEN,
      verifyToken: env.WHATSAPP_VERIFY_TOKEN,
      businessAccountId: '',
    };
    this.instagramConfig = {
      accessToken: env.INSTAGRAM_ACCESS_TOKEN,
      businessAccountId: '',
    };
  }

  // WhatsApp Methods
  async sendWhatsAppMessage(to: string, message: { type: 'text' | 'image' | 'video' | 'document' | 'template'; content: any }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const url = `https://graph.facebook.com/v18.0/${this.whatsappConfig.phoneNumberId}/messages`;
      
      let payload: any = {
        messaging_product: 'whatsapp',
        to,
      };

      if (message.type === 'text') {
        payload.type = 'text';
        payload.text = { body: message.content };
      } else if (message.type === 'image') {
        payload.type = 'image';
        payload.image = { link: message.content.url, caption: message.content.caption };
      } else if (message.type === 'video') {
        payload.type = 'video';
        payload.video = { link: message.content.url, caption: message.content.caption };
      } else if (message.type === 'document') {
        payload.type = 'document';
        payload.document = { link: message.content.url, filename: message.content.filename };
      } else if (message.type === 'template') {
        payload.type = 'template';
        payload.template = message.content;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.whatsappConfig.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error?.message || 'Error enviando mensaje' };
      }

      return { success: true, messageId: result.messages?.[0]?.id };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async sendWhatsAppTemplate(to: string, templateName: string, language: string = 'es', components?: any[]): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendWhatsAppMessage(to, {
      type: 'template',
      content: {
        name: templateName,
        language: { code: language },
        components: components || [],
      },
    });
  }

  async processWhatsAppWebhook(payload: any): Promise<void> {
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;
    const contacts = value?.contacts;
    const statuses = value?.statuses;

    // Process incoming messages
    if (messages) {
      for (const msg of messages) {
        await this.handleIncomingWhatsAppMessage(msg, contacts?.[0], value.metadata?.phone_number_id);
      }
    }

    // Process status updates
    if (statuses) {
      for (const status of statuses) {
        await this.handleWhatsAppStatusUpdate(status);
      }
    }
  }

  private async handleIncomingWhatsAppMessage(msg: any, contact: any, phoneNumberId: string): Promise<void> {
    const from = msg.from;
    const msgId = msg.id;
    const timestamp = new Date(parseInt(msg.timestamp) * 1000).toISOString();
    const type = msg.type;

    // Find or create conversation
    let conversation = await this.crmService.getConversationByChannel('WHATSAPP', from, '' as UUID);
    
    if (!conversation) {
      // Try to find by lead phone number
      // For now, create new conversation
      conversation = await this.crmService.createConversation({
        channel: 'WHATSAPP',
        channelId: from,
        participants: [
          { id: crypto.randomUUID() as UUID, name: contact?.profile?.name || from, role: 'CUSTOMER', avatar: undefined },
          { id: 'hermes' as UUID, name: 'Hermes AI', role: 'BOT', avatar: undefined },
        ],
        organizationId: '' as UUID, // Would need to determine from phone number
      });
    }

    // Create message based on type
    let content = '';
    let messageType: MessageType = 'TEXT';
    let media: Message['media'] = undefined;

    switch (type) {
      case 'text':
        content = msg.text.body;
        break;
      case 'image':
        content = msg.image.caption || 'Imagen recibida';
        messageType = 'IMAGE';
        media = [{ type: 'image', url: await this.getWhatsAppMediaUrl(msg.image.id), mimeType: msg.image.mime_type }];
        break;
      case 'video':
        content = msg.video.caption || 'Video recibido';
        messageType = 'VIDEO';
        media = [{ type: 'video', url: await this.getWhatsAppMediaUrl(msg.video.id), mimeType: msg.video.mime_type }];
        break;
      case 'audio':
        content = 'Audio recibido';
        messageType = 'AUDIO';
        media = [{ type: 'audio', url: await this.getWhatsAppMediaUrl(msg.audio.id), mimeType: msg.audio.mime_type }];
        break;
      case 'document':
        content = msg.document.caption || msg.document.filename || 'Documento recibido';
        messageType = 'DOCUMENT';
        media = [{ type: 'document', url: await this.getWhatsAppMediaUrl(msg.document.id), filename: msg.document.filename, mimeType: msg.document.mime_type }];
        break;
      case 'location':
        content = `Ubicación: ${msg.location.latitude}, ${msg.location.longitude}`;
        messageType = 'LOCATION';
        break;
      case 'contacts':
        content = 'Contacto compartido';
        messageType = 'CONTACT';
        break;
      case 'interactive':
        if (msg.interactive.type === 'button_reply') {
          content = msg.interactive.button_reply.title;
        } else if (msg.interactive.type === 'list_reply') {
          content = msg.interactive.list_reply.title;
        }
        messageType = 'INTERACTIVE';
        break;
    }

    // Save message
    const message = await this.crmService.addMessage({
      conversationId: conversation.id,
      organizationId: conversation.organizationId,
      fromParticipantId: conversation.participants.find(p => p.role === 'CUSTOMER')?.id || '' as UUID,
      toParticipantIds: ['hermes' as UUID],
      type: messageType,
      content,
      media,
      direction: 'INBOUND',
      externalId: msgId,
      aiGenerated: false,
    });

    // If conversation has lead, update lead activity
    if (conversation.leadId) {
      await this.crmService.addActivity(
        conversation.leadId,
        'MESSAGE_RECEIVED',
        `Mensaje recibido por ${type}: ${content.substring(0, 100)}`,
        conversation.participants.find(p => p.role === 'CUSTOMER')?.id
      );
    }

    // Process with Hermes AI if bot mode
    if (conversation.status === 'BOT' || conversation.status === 'OPEN') {
      // Queue for AI processing
      await this.env.EVENT_QUEUE.send({
        type: 'process_message',
        payload: {
          conversationId: conversation.id,
          messageId: message.id,
          organizationId: conversation.organizationId,
        },
      });
    }
  }

  private async handleWhatsAppStatusUpdate(status: any): Promise<void> {
    const msgId = status.id;
    const msgStatus = status.status; // sent, delivered, read, failed
    const timestamp = new Date(parseInt(status.timestamp) * 1000).toISOString();

    // Find message by external ID
    const message = await this.db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.externalId, msgId))
      .get();

    if (message) {
      const statusMap: Record<string, Message['status']> = {
        sent: 'SENT',
        delivered: 'DELIVERED',
        read: 'READ',
        failed: 'FAILED',
      };

      await this.db
        .update(schema.messages)
        .set({ status: statusMap[msgStatus] || 'SENT', updatedAt: timestamp })
        .where(eq(schema.messages.id, message.id));
    }
  }

  private async getWhatsAppMediaUrl(mediaId: string): Promise<string> {
    const response = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, {
      headers: { 'Authorization': `Bearer ${this.whatsappConfig.accessToken}` },
    });
    const data = await response.json();
    return data.url;
  }

  // Instagram Methods
  async sendInstagramMessage(to: string, message: { text?: string; imageUrl?: string; videoUrl?: string }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const url = `https://graph.facebook.com/v18.0/me/messages`;
      
      let payload: any = {
        recipient: { id: to },
        messaging_type: 'RESPONSE',
      };

      if (message.text) {
        payload.message = { text: message.text };
      } else if (message.imageUrl) {
        payload.message = { attachment: { type: 'image', payload: { url: message.imageUrl } } };
      } else if (message.videoUrl) {
        payload.message = { attachment: { type: 'video', payload: { url: message.videoUrl } } };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.instagramConfig.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error?.message || 'Error enviando mensaje' };
      }

      return { success: true, messageId: result.message_id };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async processInstagramWebhook(payload: any): Promise<void> {
    // Similar to WhatsApp but for Instagram messaging
    // Implementation would follow same pattern
  }

  // Unified messaging
  async sendMessage(
    conversationId: UUID, 
    organizationId: UUID, 
    content: string, 
    channel: ConversationChannel,
    media?: Message['media']
  ): Promise<Message | null> {
    const conversation = await this.crmService.getConversation(conversationId, organizationId);
    if (!conversation) return null;

    let success = false;
    let externalId: string | undefined;

    if (channel === 'WHATSAPP') {
      const customerParticipant = conversation.participants.find(p => p.role === 'CUSTOMER');
      if (customerParticipant) {
        const result = await this.sendWhatsAppMessage(customerParticipant.id, { type: 'text', content });
        success = result.success;
        externalId = result.messageId;
      }
    } else if (channel === 'INSTAGRAM') {
      const customerParticipant = conversation.participants.find(p => p.role === 'CUSTOMER');
      if (customerParticipant) {
        const result = await this.sendInstagramMessage(customerParticipant.id, { text: content });
        success = result.success;
        externalId = result.messageId;
      }
    }

    if (!success) return null;

    // Save outbound message
    const message = await this.crmService.addMessage({
      conversationId,
      organizationId,
      fromParticipantId: 'hermes' as UUID,
      toParticipantIds: conversation.participants.filter(p => p.role === 'CUSTOMER').map(p => p.id),
      type: media ? (media[0].type === 'image' ? 'IMAGE' : 'VIDEO') : 'TEXT',
      content,
      media,
      direction: 'OUTBOUND',
      externalId,
      aiGenerated: true,
    });

    return message;
  }

  // Conversation management
  async setConversationStatus(conversationId: UUID, organizationId: UUID, status: ConversationStatus, userId?: UUID): Promise<Conversation | null> {
    const conversation = await this.crmService.getConversation(conversationId, organizationId);
    if (!conversation) return null;

    const oldStatus = conversation.status;
    await this.db.update(schema.conversations).set({ status, updatedAt: new Date().toISOString() }).where(eq(schema.conversations.id, conversationId));

    if (oldStatus !== status) {
      await this.eventBus.publish({
        type: 'conversation.updated',
        payload: { conversationId, oldStatus, newStatus: status },
        organizationId,
        userId,
      });

      if (status === 'ESCALATED') {
        await this.eventBus.publish({
          type: 'conversation.escalated',
          payload: { conversationId, reason: 'Escalado manualmente' },
          organizationId,
          userId,
        });
      }
    }

    return this.crmService.getConversation(conversationId, organizationId);
  }

  async assignConversation(conversationId: UUID, organizationId: UUID, assigneeId: UUID, assignedBy: UUID): Promise<Conversation | null> {
    await this.db.update(schema.conversations).set({ assignedTo: assigneeId, updatedAt: new Date().toISOString() }).where(eq(schema.conversations.id, conversationId));
    
    await this.eventBus.publish({
      type: 'conversation.assigned',
      payload: { conversationId, assigneeId },
      organizationId,
      userId: assignedBy,
    });

    return this.crmService.getConversation(conversationId, organizationId);
  }

  // Broadcast messaging
  async sendBroadcast(
    organizationId: UUID,
    recipients: UUID[],
    content: string,
    channel: ConversationChannel,
    templateName?: string
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const recipientId of recipients) {
      // Find conversation with recipient
      const conversations = await this.db
        .select()
        .from(schema.conversations)
        .where(and(
          eq(schema.conversations.organizationId, organizationId),
          eq(schema.conversations.channel, channel),
          sql`${schema.conversations.participants} @> '[{"id": "${recipientId}"}]'`
        ))
        .all();

      for (const conv of conversations) {
        const result = await this.sendMessage(conv.id, organizationId, content, channel);
        if (result) sent++;
        else failed++;
      }
    }

    return { sent, failed };
  }

  // Webhook verification
  verifyWhatsAppWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.whatsappConfig.verifyToken) {
      return challenge;
    }
    return null;
  }
}

export function createCommunicationsService(env: Env): CommunicationsService {
  return new CommunicationsService(env);
}