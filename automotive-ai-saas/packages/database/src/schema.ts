import { sql } from 'drizzle-orm';
import { 
  integer, 
  text, 
  real, 
  sqliteTable, 
  uniqueIndex, 
  index,
  primaryKey
} from 'drizzle-orm/sqlite-core';

export const organizations = sqliteTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  logo: text('logo'),
  settings: text('settings', { mode: 'json' }).notNull().$type<{
    timezone: string;
    currency: string;
    language: string;
    features: Record<string, boolean>;
    integrations: Record<string, unknown>;
  }>(),
  plan: text('plan', { enum: ['FREE', 'STARTER', 'PRO', 'DEALER', 'ENTERPRISE'] }).notNull().default('FREE'),
  billingEmail: text('billing_email'),
  stripeCustomerId: text('stripe_customer_id'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  avatar: text('avatar'),
  phone: text('phone'),
  passwordHash: text('password_hash'),
  twoFactorEnabled: integer('two_factor_enabled', { mode: 'boolean' }).notNull().default(false),
  twoFactorSecret: text('two_factor_secret'),
  lastLoginAt: text('last_login_at'),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  emailVerificationToken: text('email_verification_token'),
  passwordResetToken: text('password_reset_token'),
  passwordResetExpires: text('password_reset_expires'),
  status: text('status', { enum: ['ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED', 'DELETED'] }).notNull().default('ACTIVE'),
  metadata: text('metadata', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const organizationMembers = sqliteTable('organization_members', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['OWNER', 'ADMIN', 'MANAGER', 'SALES', 'MARKETING', 'BUYER', 'INSTRUCTOR', 'STUDENT'] }).notNull(),
  permissions: text('permissions', { mode: 'json' }).notNull().$type<string[]>(),
  joinedAt: text('joined_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  invitedBy: text('invited_by').references(() => users.id),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.organizationId] }),
}));

export const vehicles = sqliteTable('vehicles', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  vin: text('vin'),
  make: text('make').notNull(),
  model: text('model').notNull(),
  trim: text('trim'),
  year: integer('year').notNull(),
  mileage: integer('mileage').notNull(),
  price: real('price').notNull(),
  currency: text('currency').notNull().default('USD'),
  status: text('status', { 
    enum: ['DISCOVERED', 'ANALYZING', 'OPPORTUNITY', 'ACQUIRED', 'IN_INVENTORY', 'LISTED', 'RESERVED', 'SOLD', 'ARCHIVED'] 
  }).notNull().default('DISCOVERED'),
  source: text('source', { 
    enum: ['MANUAL', 'CAR_DEALS_SEARCH', 'COPART', 'AUTOTRADER', 'CARS_COM', 'KBB', 'CUSTOM_API', 'IMPORT', 'TRADE_IN'] 
  }).notNull(),
  sourceListingId: text('source_listing_id'),
  sourceUrl: text('source_url'),
  location: text('location', { mode: 'json' }).notNull().$type<{
    country: string;
    state: string;
    city: string;
    zipCode?: string;
    address?: string;
    coordinates?: { lat: number; lng: number };
  }>(),
  features: text('features', { mode: 'json' }).notNull().$type<Array<{ category: string; name: string; value?: string | number | boolean }>>(),
  photos: text('photos', { mode: 'json' }).notNull().$type<Array<{
    id: string;
    url: string;
    thumbnailUrl?: string;
    isPrimary: boolean;
    order: number;
    alt?: string;
    uploadedAt: string;
  }>>(),
  documents: text('documents', { mode: 'json' }).notNull().$type<Array<{
    id: string;
    name: string;
    type: string;
    url: string;
    uploadedAt: string;
    verified: boolean;
  }>>(),
  priceHistory: text('price_history', { mode: 'json' }).notNull().$type<Array<{
    price: number;
    date: string;
    source: string;
    reason?: string;
  }>>(),
  marketPrice: real('market_price'),
  estimatedMargin: real('estimated_margin'),
  dealScore: integer('deal_score'),
  riskScore: text('risk_score', { enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] }),
  confidence: real('confidence'),
  acquiredAt: text('acquired_at'),
  soldAt: text('sold_at'),
  soldPrice: real('sold_price'),
  listingData: text('listing_data', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
  aiAnalysis: text('ai_analysis', { mode: 'json' }).$type<{
    marketPrice: number;
    estimatedMargin: number;
    dealScore: number;
    riskScore: string;
    confidence: number;
    reasoning: string;
    comparables: Array<{
      vin?: string;
      make: string;
      model: string;
      year: number;
      mileage: number;
      price: number;
      source: string;
      distance?: number;
      similarity: number;
    }>;
    analyzedAt: string;
  }>(),
  deletedAt: text('deleted_at'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  orgIdx: index('vehicles_org_idx').on(table.organizationId),
  statusIdx: index('vehicles_status_idx').on(table.status),
  sourceIdx: index('vehicles_source_idx').on(table.source),
  makeModelIdx: index('vehicles_make_model_idx').on(table.make, table.model),
  vinIdx: uniqueIndex('vehicles_vin_idx').on(table.vin),
}));

export const vehicleListings = sqliteTable('vehicle_listings', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  vehicleId: text('vehicle_id').references(() => vehicles.id, { onDelete: 'set null' }),
  source: text('source', { 
    enum: ['MANUAL', 'CAR_DEALS_SEARCH', 'COPART', 'AUTOTRADER', 'CARS_COM', 'KBB', 'CUSTOM_API', 'IMPORT', 'TRADE_IN'] 
  }).notNull(),
  sourceListingId: text('source_listing_id').notNull(),
  url: text('url').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  price: real('price').notNull(),
  currency: text('currency').notNull().default('USD'),
  mileage: integer('mileage').notNull(),
  location: text('location', { mode: 'json' }).notNull().$type<{
    country: string;
    state: string;
    city: string;
    zipCode?: string;
    address?: string;
    coordinates?: { lat: number; lng: number };
  }>(),
  seller: text('seller', { mode: 'json' }).notNull().$type<{
    name: string;
    type: 'DEALER' | 'PRIVATE' | 'AUCTION' | 'UNKNOWN';
    phone?: string;
    email?: string;
    website?: string;
    rating?: number;
    reviewCount?: number;
    verified: boolean;
  }>(),
  photos: text('photos', { mode: 'json' }).notNull().$type<string[]>(),
  features: text('features', { mode: 'json' }).notNull().$type<Array<{ category: string; name: string; value?: string | number | boolean }>>(),
  firstSeenAt: text('first_seen_at').notNull(),
  lastSeenAt: text('last_seen_at').notNull(),
  status: text('status', { 
    enum: ['ACTIVE', 'PRICE_CHANGED', 'MILEAGE_CHANGED', 'SELLER_CHANGED', 'REMOVED', 'SOLD', 'EXPIRED'] 
  }).notNull().default('ACTIVE'),
  priceHistory: text('price_history', { mode: 'json' }).notNull().$type<Array<{
    price: number;
    date: string;
    source: string;
    reason?: string;
  }>>(),
  rawData: text('raw_data', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
  deletedAt: text('deleted_at'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  orgIdx: index('listings_org_idx').on(table.organizationId),
  vehicleIdx: index('listings_vehicle_idx').on(table.vehicleId),
  sourceListingIdx: uniqueIndex('listings_source_listing_idx').on(table.source, table.sourceListingId),
  statusIdx: index('listings_status_idx').on(table.status),
}));

export const radarSources = sqliteTable('radar_sources', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type', { 
    enum: ['MANUAL', 'CAR_DEALS_SEARCH', 'COPART', 'AUTOTRADER', 'CARS_COM', 'KBB', 'CUSTOM_API', 'IMPORT', 'TRADE_IN'] 
  }).notNull(),
  adapter: text('adapter').notNull(),
  config: text('config', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  healthStatus: text('health_status', { enum: ['HEALTHY', 'DEGRADED', 'DOWN', 'UNKNOWN'] }).notNull().default('UNKNOWN'),
  lastSyncAt: text('last_sync_at'),
  rateLimit: text('rate_limit', { mode: 'json' }).notNull().$type<{
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
    currentUsage: { minute: number; hour: number; day: number };
    resetAt: { minute: string; hour: string; day: string };
  }>(),
  syncSchedule: text('sync_schedule'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  orgIdx: index('radar_sources_org_idx').on(table.organizationId),
}));

export const radarRules = sqliteTable('radar_rules', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  filters: text('filters', { mode: 'json' }).notNull().$type<{
    makes?: string[];
    models?: string[];
    yearMin?: number;
    yearMax?: number;
    priceMin?: number;
    priceMax?: number;
    mileageMin?: number;
    mileageMax?: number;
    locations?: Array<{ country: string; state: string; city: string }>;
    fuels?: string[];
    transmissions?: string[];
    minMargin?: number;
    minDealScore?: number;
    sources?: string[];
    excludeSources?: string[];
  }>(),
  notifications: text('notifications', { mode: 'json' }).notNull().$type<{
    email: boolean;
    push: boolean;
    webhook?: string;
    slack?: string;
    thresholdDealScore: number;
  }>(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  lastRunAt: text('last_run_at'),
  nextRunAt: text('next_run_at'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  orgIdx: index('radar_rules_org_idx').on(table.organizationId),
}));

export const leads = sqliteTable('leads', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  source: text('source', { 
    enum: ['RADAR', 'WEBSITE', 'WHATSAPP', 'INSTAGRAM', 'FACEBOOK', 'EMAIL', 'PHONE', 'WALK_IN', 'REFERRAL', 'CAMPAIGN', 'ACADEMY', 'MANUAL', 'IMPORT'] 
  }).notNull(),
  sourceId: text('source_id'),
  vehicleId: text('vehicle_id').references(() => vehicles.id, { onDelete: 'set null' }),
  campaignId: text('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
  conversationId: text('conversation_id').references(() => conversations.id, { onDelete: 'set null' }),
  assignedTo: text('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  status: text('status', { 
    enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST', 'ARCHIVED'] 
  }).notNull().default('NEW'),
  stage: text('stage', { 
    enum: ['LEAD', 'PROSPECT', 'QUALIFIED_LEAD', 'OPPORTUNITY', 'PROPOSAL_SENT', 'NEGOTIATING', 'CLOSED_WON', 'CLOSED_LOST'] 
  }).notNull().default('LEAD'),
  score: integer('score').notNull().default(0),
  contact: text('contact', { mode: 'json' }).notNull().$type<{
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    address?: { country: string; state: string; city: string; zipCode?: string; address?: string; coordinates?: { lat: number; lng: number } };
    preferredContact: 'WHATSAPP' | 'EMAIL' | 'PHONE' | 'IN_PERSON' | 'ANY';
    bestTimeToContact?: string;
    notes?: string;
  }>(),
  vehicleInterest: text('vehicle_interest', { mode: 'json' }).$type<{
    make?: string;
    model?: string;
    yearMin?: number;
    yearMax?: number;
    priceMax?: number;
    mileageMax?: number;
    fuelType?: string;
    transmission?: string;
    bodyType?: string;
    mustHaveFeatures?: string[];
    niceToHaveFeatures?: string[];
  }>(),
  qualification: text('qualification', { mode: 'json' }).$type<{
    budget?: { min: number; max: number };
    timeline?: string;
    decisionMakers?: string[];
    financingPreApproved?: boolean;
    tradeIn?: boolean;
    tradeInVehicle?: Partial<{
      vin?: string;
      make: string;
      model: string;
      trim?: string;
      year: number;
      mileage: number;
      price: number;
      currency: string;
    }>;
    urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'IMMEDIATE';
    notes?: string;
    qualifiedBy?: string;
    qualifiedAt?: string;
  }>(),
  activities: text('activities', { mode: 'json' }).notNull().$type<Array<{
    id: string;
    type: string;
    description: string;
    performedBy: string;
    performedAt: string;
    metadata?: Record<string, unknown>;
    relatedEntityType?: string;
    relatedEntityId?: string;
  }>>(),
  tags: text('tags', { mode: 'json' }).notNull().$type<string[]>().default([]),
  metadata: text('metadata', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
  convertedAt: text('converted_at'),
  lostReason: text('lost_reason'),
  deletedAt: text('deleted_at'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  orgIdx: index('leads_org_idx').on(table.organizationId),
  statusIdx: index('leads_status_idx').on(table.status),
  stageIdx: index('leads_stage_idx').on(table.stage),
  assignedIdx: index('leads_assigned_idx').on(table.assignedTo),
  vehicleIdx: index('leads_vehicle_idx').on(table.vehicleId),
}));

export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  leadId: text('lead_id').references(() => leads.id, { onDelete: 'set null' }),
  contactId: text('contact_id'),
  channel: text('channel', { enum: ['WHATSAPP', 'INSTAGRAM', 'EMAIL', 'CHAT', 'PHONE', 'IN_PERSON'] }).notNull(),
  channelId: text('channel_id').notNull(),
  status: text('status', { enum: ['OPEN', 'PENDING', 'CLOSED', 'BOT', 'HUMAN', 'ESCALATED'] }).notNull().default('OPEN'),
  assignedTo: text('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  participants: text('participants', { mode: 'json' }).notNull().$type<Array<{
    id: string;
    name: string;
    role: 'CUSTOMER' | 'AGENT' | 'BOT' | 'MANAGER';
    avatar?: string;
    metadata?: Record<string, unknown>;
  }>>(),
  tags: text('tags', { mode: 'json' }).notNull().$type<string[]>().default([]),
  metadata: text('metadata', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
  closedAt: text('closed_at'),
  closedBy: text('closed_by').references(() => users.id),
  deletedAt: text('deleted_at'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  orgIdx: index('conversations_org_idx').on(table.organizationId),
  leadIdx: index('conversations_lead_idx').on(table.leadId),
  channelIdx: index('conversations_channel_idx').on(table.channel, table.channelId),
}));

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  fromParticipantId: text('from_participant_id').notNull(),
  toParticipantIds: text('to_participant_ids', { mode: 'json' }).notNull().$type<string[]>(),
  type: text('type', { enum: ['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'LOCATION', 'CONTACT', 'TEMPLATE', 'INTERACTIVE', 'SYSTEM'] }).notNull(),
  content: text('content').notNull(),
  media: text('media', { mode: 'json' }).$type<Array<{
    type: 'image' | 'video' | 'audio' | 'document';
    url: string;
    thumbnailUrl?: string;
    filename?: string;
    size?: number;
    mimeType?: string;
    duration?: number;
  }>>(),
  status: text('status', { enum: ['SENT', 'DELIVERED', 'READ', 'FAILED', 'PENDING'] }).notNull().default('PENDING'),
  direction: text('direction', { enum: ['INBOUND', 'OUTBOUND'] }).notNull(),
  externalId: text('external_id'),
  metadata: text('metadata', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
  aiGenerated: integer('ai_generated', { mode: 'boolean' }).notNull().default(false),
  aiConfidence: real('ai_confidence'),
  humanReviewed: integer('human_reviewed', { mode: 'boolean' }).notNull().default(false),
  reviewedBy: text('reviewed_by').references(() => users.id),
  reviewedAt: text('reviewed_at'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  orgIdx: index('messages_org_idx').on(table.organizationId),
  conversationIdx: index('messages_conversation_idx').on(table.conversationId),
  externalIdIdx: index('messages_external_id_idx').on(table.externalId),
}));

export const campaigns = sqliteTable('campaigns', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type', { 
    enum: ['VEHICLE_LAUNCH', 'PRICE_DROP', 'SEASONAL', 'FOLLOW_UP', 'RE_ENGAGEMENT', 'EDUCATIONAL', 'BRAND_AWARENESS', 'CUSTOM'] 
  }).notNull(),
  status: text('status', { enum: ['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'] }).notNull().default('DRAFT'),
  trigger: text('trigger', { mode: 'json' }).notNull().$type<{
    type: 'VEHICLE_CREATED' | 'PRICE_CHANGED' | 'LEAD_CREATED' | 'LEAD_STAGE_CHANGED' | 'APPOINTMENT_SCHEDULED' | 'SCHEDULE' | 'MANUAL' | 'API';
    config: Record<string, unknown>;
  }>(),
  schedule: text('schedule', { mode: 'json' }).$type<{
    startAt: string;
    endAt?: string;
    timezone: string;
    recurrence?: {
      frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
      interval: number;
      byDay?: number[];
      byMonthDay?: number[];
      byMonth?: number[];
      count?: number;
      until?: string;
    };
    sendAt?: string;
    sendDays?: number[];
  }>(),
  audience: text('audience', { mode: 'json' }).notNull().$type<{
    segments: Array<{ name: string; filters: Record<string, unknown>; estimatedSize: number }>;
    excludeSegments?: Array<{ name: string; filters: Record<string, unknown>; estimatedSize: number }>;
    maxRecipients?: number;
  }>(),
  content: text('content', { mode: 'json' }).notNull().$type<{
    subject?: string;
    preheader?: string;
    html?: string;
    text?: string;
    whatsappTemplate?: string;
    instagramCaption?: string;
    facebookPost?: string;
    videoScript?: string;
    cta?: { text: string; url: string; type: 'LINK' | 'BUTTON' | 'QUICK_REPLY' };
    variables: Record<string, string>;
  }>(),
  channels: text('channels', { mode: 'json' }).notNull().$type<Array<'EMAIL' | 'WHATSAPP' | 'INSTAGRAM' | 'FACEBOOK' | 'SMS' | 'PUSH'>>(),
  metrics: text('metrics', { mode: 'json' }).notNull().$type<{
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    replied: number;
    converted: number;
    unsubscribed: number;
    bounced: number;
    spamReported: number;
    revenue?: number;
    roi?: number;
  }>().default({ sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0, converted: 0, unsubscribed: 0, bounced: 0, spamReported: 0 }),
  abTest: text('ab_test', { mode: 'json' }).$type<{
    enabled: boolean;
    variants: Array<{ id: string; name: string; content: Record<string, unknown>; weight: number; metrics?: Record<string, unknown> }>;
    winnerCriteria: 'OPEN_RATE' | 'CLICK_RATE' | 'CONVERSION_RATE' | 'REVENUE';
    testSize: number;
    confidenceLevel: number;
  }>(),
  tags: text('tags', { mode: 'json' }).notNull().$type<string[]>().default([]),
  deletedAt: text('deleted_at'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  orgIdx: index('campaigns_org_idx').on(table.organizationId),
  statusIdx: index('campaigns_status_idx').on(table.status),
}));

export const videoJobs = sqliteTable('video_jobs', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  vehicleId: text('vehicle_id').references(() => vehicles.id, { onDelete: 'set null' }),
  campaignId: text('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
  type: text('type', { 
    enum: ['VEHICLE_SHOWCASE', 'WALKAROUND', 'FEATURE_HIGHLIGHT', 'COMPARISON', 'TESTIMONIAL', 'EDUCATIONAL', 'SOCIAL_MEDIA_REEL', 'ADS', 'CUSTOM'] 
  }).notNull(),
  status: text('status', { 
    enum: ['PENDING', 'QUEUED', 'PROCESSING', 'RENDERING', 'UPLOADING', 'COMPLETED', 'FAILED', 'CANCELLED'] 
  }).notNull().default('PENDING'),
  priority: integer('priority').notNull().default(0),
  input: text('input', { mode: 'json' }).notNull().$type<{
    script: string;
    images: string[];
    videoClips?: string[];
    music?: string;
    voiceover?: { text: string; voice: string; language: string; speed: number; pitch: number };
    template?: string;
    aspectRatio: '16:9' | '9:16' | '1:1' | '4:3' | '4:5';
    duration?: number;
    style?: { theme: string; transitions: string[]; effects: string[]; colorGrade?: string; textStyle?: { font: string; color: string; size: number; position: 'top' | 'bottom' | 'center' | 'lower_third'; animation?: string } };
    branding?: { logoUrl?: string; logoPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'; watermark?: string; colors: { primary: string; secondary: string; accent: string }; fonts: { heading: string; body: string } };
  }>(),
  output: text('output', { mode: 'json' }).$type<{
    url: string;
    thumbnailUrl?: string;
    duration: number;
    size: number;
    format: string;
    resolution: string;
    bitrate: number;
    codec: string;
    storagePath: string;
    cdnUrl?: string;
  }>(),
  progress: integer('progress').notNull().default(0),
  error: text('error'),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
  workerId: text('worker_id'),
  gpuType: text('gpu_type'),
  estimatedDuration: integer('estimated_duration'),
  actualDuration: integer('actual_duration'),
  deletedAt: text('deleted_at'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  orgIdx: index('video_jobs_org_idx').on(table.organizationId),
  statusIdx: index('video_jobs_status_idx').on(table.status),
  vehicleIdx: index('video_jobs_vehicle_idx').on(table.vehicleId),
}));

export const courses = sqliteTable('courses', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  shortDescription: text('short_description'),
  thumbnailUrl: text('thumbnail_url'),
  instructorId: text('instructor_id').notNull().references(() => users.id),
  category: text('category').notNull(),
  level: text('level', { enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] }).notNull(),
  language: text('language').notNull().default('es'),
  price: real('price').notNull().default(0),
  currency: text('currency').notNull().default('USD'),
  status: text('status', { enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED', 'PRIVATE'] }).notNull().default('DRAFT'),
  modules: text('modules', { mode: 'json' }).notNull().$type<Array<{
    id: string;
    courseId: string;
    title: string;
    description?: string;
    order: number;
    lessons: Array<{
      id: string;
      moduleId: string;
      title: string;
      description?: string;
      order: number;
      type: 'VIDEO' | 'TEXT' | 'QUIZ' | 'ASSIGNMENT' | 'LIVE' | 'SCORM' | 'EXTERNAL';
      content: {
        videoUrl?: string;
        videoDuration?: number;
        textContent?: string;
        slidesUrl?: string;
        externalUrl?: string;
        scormPackage?: string;
      };
      durationMinutes: number;
      isFree: boolean;
      isPublished: boolean;
      resources: Array<{ id: string; title: string; type: 'PDF' | 'DOC' | 'XLS' | 'ZIP' | 'LINK' | 'VIDEO' | 'IMAGE'; url: string; size?: number; downloadable: boolean }>;
      quiz?: {
        id: string;
        title: string;
        description?: string;
        questions: Array<{
          id: string;
          type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY';
          question: string;
          options?: Array<{ id: string; text: string; isCorrect: boolean }>;
          correctAnswer?: string | string[];
          explanation?: string;
          points: number;
          order: number;
        }>;
        passingScore: number;
        timeLimitMinutes?: number;
        maxAttempts: number;
        shuffleQuestions: boolean;
        showCorrectAnswers: boolean;
      };
      unlockCondition?: { type: 'COMPLETE_PREVIOUS' | 'PASS_QUIZ' | 'DATE' | 'MANUAL' | 'PURCHASE'; value?: unknown };
      saasIntegration?: { type: 'RADAR' | 'VEHICLE_SEARCH' | 'CRM' | 'CALCULATOR' | 'SIMULATOR'; config: Record<string, unknown>; actionLabel: string };
    }>;
    durationMinutes: number;
    isPublished: boolean;
    unlockCondition?: { type: 'COMPLETE_PREVIOUS' | 'PASS_QUIZ' | 'DATE' | 'MANUAL' | 'PURCHASE'; value?: unknown };
  }>>(),
  requirements: text('requirements', { mode: 'json' }).$type<string[]>(),
  learningOutcomes: text('learning_outcomes', { mode: 'json' }).$type<string[]>(),
  targetAudience: text('target_audience'),
  durationMinutes: integer('duration_minutes').notNull().default(0),
  enrolledCount: integer('enrolled_count').notNull().default(0),
  rating: real('rating').notNull().default(0),
  reviewCount: integer('review_count').notNull().default(0),
  tags: text('tags', { mode: 'json' }).notNull().$type<string[]>().default([]),
  certificateTemplate: text('certificate_template'),
  settings: text('settings', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
  deletedAt: text('deleted_at'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  orgIdx: index('courses_org_idx').on(table.organizationId),
  instructorIdx: index('courses_instructor_idx').on(table.instructorId),
  statusIdx: index('courses_status_idx').on(table.status),
}));

export const enrollments = sqliteTable('enrollments', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED', 'REFUNDED'] }).notNull().default('ACTIVE'),
  progress: real('progress').notNull().default(0),
  currentModuleId: text('current_module_id'),
  currentLessonId: text('current_lesson_id'),
  completedModules: text('completed_modules', { mode: 'json' }).notNull().$type<string[]>().default([]),
  completedLessons: text('completed_lessons', { mode: 'json' }).notNull().$type<string[]>().default([]),
  quizScores: text('quiz_scores', { mode: 'json' }).notNull().$type<Array<{
    quizId: string;
    score: number;
    maxScore: number;
    passed: boolean;
    attempt: number;
    completedAt: string;
    answers: Array<{ questionId: string; answer: string | string[]; isCorrect: boolean; points: number }>;
  }>>(),
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
  certificateId: text('certificate_id'),
  lastAccessAt: text('last_access_at').notNull(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  orgIdx: index('enrollments_org_idx').on(table.organizationId),
  userIdx: index('enrollments_user_idx').on(table.userId),
  courseIdx: index('enrollments_course_idx').on(table.courseId),
  statusIdx: index('enrollments_status_idx').on(table.status),
}));

export const certificates = sqliteTable('certificates', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  enrollmentId: text('enrollment_id').notNull().references(() => enrollments.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  templateId: text('template_id').notNull(),
  certificateNumber: text('certificate_number').notNull().unique(),
  issuedAt: text('issued_at').notNull(),
  expiresAt: text('expires_at'),
  verificationUrl: text('verification_url').notNull(),
  pdfUrl: text('pdf_url'),
  blockchainHash: text('blockchain_hash'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  orgIdx: index('certificates_org_idx').on(table.organizationId),
  userIdx: index('certificates_user_idx').on(table.userId),
  courseIdx: index('certificates_course_idx').on(table.courseId),
}));

export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  payload: text('payload', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  correlationId: text('correlation_id'),
  causationId: text('causation_id'),
  timestamp: text('timestamp').notNull(),
  metadata: text('metadata', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  orgIdx: index('events_org_idx').on(table.organizationId),
  typeIdx: index('events_type_idx').on(table.type),
  timestampIdx: index('events_timestamp_idx').on(table.timestamp),
  correlationIdx: index('events_correlation_idx').on(table.correlationId),
}));

export const webhookEvents = sqliteTable('webhook_events', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  source: text('source').notNull(),
  eventType: text('event_type').notNull(),
  payload: text('payload', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
  headers: text('headers', { mode: 'json' }).notNull().$type<Record<string, string>>(),
  signature: text('signature'),
  verified: integer('verified', { mode: 'boolean' }).notNull().default(false),
  processed: integer('processed', { mode: 'boolean' }).notNull().default(false),
  processedAt: text('processed_at'),
  error: text('error'),
  retryCount: integer('retry_count').notNull().default(0),
  nextRetryAt: text('next_retry_at'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  orgIdx: index('webhook_events_org_idx').on(table.organizationId),
  sourceIdx: index('webhook_events_source_idx').on(table.source),
  processedIdx: index('webhook_events_processed_idx').on(table.processed),
}));

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id'),
  oldValue: text('old_value', { mode: 'json' }).$type<Record<string, unknown>>(),
  newValue: text('new_value', { mode: 'json' }).$type<Record<string, unknown>>(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  metadata: text('metadata', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  orgIdx: index('audit_logs_org_idx').on(table.organizationId),
  userIdx: index('audit_logs_user_idx').on(table.userId),
  resourceIdx: index('audit_logs_resource_idx').on(table.resourceType, table.resourceId),
  actionIdx: index('audit_logs_action_idx').on(table.action),
  createdIdx: index('audit_logs_created_idx').on(table.createdAt),
}));

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type', { 
    enum: ['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'LEAD_NEW', 'LEAD_QUALIFIED', 'APPOINTMENT_SCHEDULED', 'APPOINTMENT_REMINDER', 'VEHICLE_OPPORTUNITY', 'PRICE_ALERT', 'CAMPAIGN_COMPLETED', 'VIDEO_READY', 'COURSE_ENROLLED', 'COURSE_COMPLETED', 'CERTIFICATE_EARNED', 'BILLING_ISSUE', 'SYSTEM_ALERT'] 
  }).notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  priority: text('priority', { enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'] }).notNull().default('NORMAL'),
  read: integer('read', { mode: 'boolean' }).notNull().default(false),
  readAt: text('read_at'),
  actionUrl: text('action_url'),
  actionLabel: text('action_label'),
  metadata: text('metadata', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
  channels: text('channels', { mode: 'json' }).notNull().$type<Array<'IN_APP' | 'EMAIL' | 'PUSH' | 'SMS' | 'WHATSAPP'>>(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  orgIdx: index('notifications_org_idx').on(table.organizationId),
  userIdx: index('notifications_user_idx').on(table.userId),
  readIdx: index('notifications_read_idx').on(table.read),
  createdIdx: index('notifications_created_idx').on(table.createdAt),
}));

export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  value: text('value', { mode: 'json' }).notNull().$type<unknown>(),
  category: text('category').notNull(),
  description: text('description'),
  isPublic: integer('is_public', { mode: 'boolean' }).notNull().default(false),
  validation: text('validation', { mode: 'json' }).$type<{
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
    enum?: unknown[];
    customValidator?: string;
  }>(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  orgIdx: index('settings_org_idx').on(table.organizationId),
  keyIdx: uniqueIndex('settings_key_idx').on(table.organizationId, table.key),
}));

export const fileUploads = sqliteTable('file_uploads', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  url: text('url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  storagePath: text('storage_path').notNull(),
  uploadedBy: text('uploaded_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  tags: text('tags', { mode: 'json' }).notNull().$type<string[]>().default([]),
  metadata: text('metadata', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  orgIdx: index('file_uploads_org_idx').on(table.organizationId),
  entityIdx: index('file_uploads_entity_idx').on(table.entityType, table.entityId),
}));

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userIdx: index('sessions_user_idx').on(table.userId),
  orgIdx: index('sessions_org_idx').on(table.organizationId),
  tokenIdx: uniqueIndex('sessions_token_idx').on(table.token),
  expiresIdx: index('sessions_expires_idx').on(table.expiresAt),
}));

export const apiKeys = sqliteTable('api_keys', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  keyHash: text('key_hash').notNull(),
  keyPrefix: text('key_prefix').notNull(),
  permissions: text('permissions', { mode: 'json' }).notNull().$type<string[]>(),
  lastUsedAt: text('last_used_at'),
  expiresAt: text('expires_at'),
  revokedAt: text('revoked_at'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  orgIdx: index('api_keys_org_idx').on(table.organizationId),
  prefixIdx: index('api_keys_prefix_idx').on(table.keyPrefix),
}));