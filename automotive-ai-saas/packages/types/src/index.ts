export type UUID = string & { readonly brand: unique symbol };
export type ISODateString = string & { readonly brand: unique symbol };

export function uuid(): UUID {
  return crypto.randomUUID() as UUID;
}

export function nowISO(): ISODateString {
  return new Date().toISOString() as ISODateString;
}

export interface BaseEntity {
  id: UUID;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  organizationId: UUID;
}

export interface SoftDelete {
  deletedAt?: ISODateString;
}

export type OrganizationRole = 
  | 'OWNER'
  | 'ADMIN'
  | 'MANAGER'
  | 'SALES'
  | 'MARKETING'
  | 'BUYER'
  | 'INSTRUCTOR'
  | 'STUDENT';

export interface OrganizationMember {
  userId: UUID;
  organizationId: UUID;
  role: OrganizationRole;
  permissions: string[];
  joinedAt: ISODateString;
  invitedBy?: UUID;
}

export interface Organization extends BaseEntity {
  name: string;
  slug: string;
  logo?: string;
  settings: OrganizationSettings;
  plan: PlanType;
  planLimits: PlanLimits;
  billingEmail?: string;
  stripeCustomerId?: string;
}

export interface OrganizationSettings {
  timezone: string;
  currency: string;
  language: string;
  features: FeatureFlags;
  integrations: IntegrationSettings;
}

export interface FeatureFlags {
  radar: boolean;
  aiChat: boolean;
  videoGeneration: boolean;
  academy: boolean;
  marketingAutomation: boolean;
  whatsapp: boolean;
  instagram: boolean;
  multiLocation: boolean;
}

export interface IntegrationSettings {
  whatsapp?: {
    phoneNumberId: string;
    businessAccountId: string;
    accessToken: string;
  };
  instagram?: {
    businessAccountId: string;
    accessToken: string;
  };
  stripe?: {
    publishableKey: string;
    secretKey: string;
    webhookSecret: string;
  };
  openai?: {
    apiKey: string;
  };
  anthropic?: {
    apiKey: string;
  };
}

export type PlanType = 'FREE' | 'STARTER' | 'PRO' | 'DEALER' | 'ENTERPRISE';

export interface PlanLimits {
  maxVehicles: number;
  maxUsers: number;
  maxSources: number;
  maxLeads: number;
  maxMessages: number;
  maxVideoMinutes: number;
  maxAIRequests: number;
  maxStorageGB: number;
  maxCourses: number;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  FREE: {
    maxVehicles: 50,
    maxUsers: 2,
    maxSources: 1,
    maxLeads: 100,
    maxMessages: 500,
    maxVideoMinutes: 0,
    maxAIRequests: 100,
    maxStorageGB: 1,
    maxCourses: 0,
  },
  STARTER: {
    maxVehicles: 200,
    maxUsers: 5,
    maxSources: 3,
    maxLeads: 1000,
    maxMessages: 5000,
    maxVideoMinutes: 30,
    maxAIRequests: 1000,
    maxStorageGB: 5,
    maxCourses: 3,
  },
  PRO: {
    maxVehicles: 1000,
    maxUsers: 20,
    maxSources: 10,
    maxLeads: 10000,
    maxMessages: 50000,
    maxVideoMinutes: 120,
    maxAIRequests: 10000,
    maxStorageGB: 20,
    maxCourses: 10,
  },
  DEALER: {
    maxVehicles: 5000,
    maxUsers: 50,
    maxSources: 25,
    maxLeads: 50000,
    maxMessages: 200000,
    maxVideoMinutes: 600,
    maxAIRequests: 50000,
    maxStorageGB: 100,
    maxCourses: 50,
  },
  ENTERPRISE: {
    maxVehicles: -1,
    maxUsers: -1,
    maxSources: -1,
    maxLeads: -1,
    maxMessages: -1,
    maxVideoMinutes: -1,
    maxAIRequests: -1,
    maxStorageGB: -1,
    maxCourses: -1,
  },
};

export interface User extends BaseEntity {
  email: string;
  name: string;
  avatar?: string;
  phone?: string;
  passwordHash?: string;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  lastLoginAt?: ISODateString;
  emailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: ISODateString;
  status: UserStatus;
  metadata: Record<string, unknown>;
}

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED' | 'DELETED';

export interface Vehicle extends BaseEntity, SoftDelete {
  vin?: string;
  make: string;
  model: string;
  trim?: string;
  year: number;
  mileage: number;
  price: number;
  currency: string;
  status: VehicleStatus;
  source: VehicleSource;
  sourceListingId?: string;
  sourceUrl?: string;
  location: VehicleLocation;
  features: VehicleFeature[];
  photos: VehiclePhoto[];
  documents: VehicleDocument[];
  priceHistory: VehiclePriceHistory[];
  marketPrice?: number;
  estimatedMargin?: number;
  dealScore?: number;
  riskScore?: RiskLevel;
  confidence?: number;
  acquiredAt?: ISODateString;
  soldAt?: ISODateString;
  soldPrice?: number;
  listingData: Record<string, unknown>;
  aiAnalysis?: VehicleAIAnalysis;
}

export type VehicleStatus = 
  | 'DISCOVERED'
  | 'ANALYZING'
  | 'OPPORTUNITY'
  | 'ACQUIRED'
  | 'IN_INVENTORY'
  | 'LISTED'
  | 'RESERVED'
  | 'SOLD'
  | 'ARCHIVED';

export type VehicleSource = 
  | 'MANUAL'
  | 'CAR_DEALS_SEARCH'
  | 'COPART'
  | 'AUTOTRADER'
  | 'CARS_COM'
  | 'KBB'
  | 'CUSTOM_API'
  | 'IMPORT'
  | 'TRADE_IN';

export interface VehicleLocation {
  country: string;
  state: string;
  city: string;
  zipCode?: string;
  address?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface VehicleFeature {
  category: string;
  name: string;
  value?: string | number | boolean;
}

export interface VehiclePhoto {
  id: UUID;
  url: string;
  thumbnailUrl?: string;
  isPrimary: boolean;
  order: number;
  alt?: string;
  uploadedAt: ISODateString;
}

export interface VehicleDocument {
  id: UUID;
  name: string;
  type: DocumentType;
  url: string;
  uploadedAt: ISODateString;
  verified: boolean;
}

export type DocumentType = 
  | 'TITLE'
  | 'REGISTRATION'
  | 'INSPECTION'
  | 'SERVICE_RECORD'
  | 'WARRANTY'
  | 'FINANCE'
  | 'OTHER';

export interface VehiclePriceHistory {
  price: number;
  date: ISODateString;
  source: string;
  reason?: string;
}

export interface VehicleAIAnalysis {
  marketPrice: number;
  estimatedMargin: number;
  dealScore: number;
  riskScore: RiskLevel;
  confidence: number;
  reasoning: string;
  comparables: ComparableVehicle[];
  analyzedAt: ISODateString;
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ComparableVehicle {
  vin?: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  price: number;
  source: string;
  distance?: number;
  similarity: number;
}

export interface VehicleListing extends BaseEntity, SoftDelete {
  vehicleId: UUID;
  source: VehicleSource;
  sourceListingId: string;
  url: string;
  title: string;
  description?: string;
  price: number;
  currency: string;
  mileage: number;
  location: VehicleLocation;
  seller: SellerInfo;
  photos: string[];
  features: VehicleFeature[];
  firstSeenAt: ISODateString;
  lastSeenAt: ISODateString;
  status: ListingStatus;
  priceHistory: VehiclePriceHistory[];
  rawData: Record<string, unknown>;
}

export type ListingStatus = 
  | 'ACTIVE'
  | 'PRICE_CHANGED'
  | 'MILEAGE_CHANGED'
  | 'SELLER_CHANGED'
  | 'REMOVED'
  | 'SOLD'
  | 'EXPIRED';

export interface SellerInfo {
  name: string;
  type: SellerType;
  phone?: string;
  email?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  verified: boolean;
}

export type SellerType = 'DEALER' | 'PRIVATE' | 'AUCTION' | 'UNKNOWN';

export interface RadarSource extends BaseEntity {
  name: string;
  type: VehicleSource;
  adapter: string;
  config: Record<string, unknown>;
  enabled: boolean;
  healthStatus: HealthStatus;
  lastSyncAt?: ISODateString;
  rateLimit: RateLimitInfo;
  syncSchedule?: string;
}

export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'DOWN' | 'UNKNOWN';

export interface RateLimitInfo {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  currentUsage: {
    minute: number;
    hour: number;
    day: number;
  };
  resetAt: {
    minute: ISODateString;
    hour: ISODateString;
    day: ISODateString;
  };
}

export interface RadarRule extends BaseEntity {
  name: string;
  description?: string;
  filters: RadarFilters;
  notifications: NotificationConfig;
  enabled: boolean;
  lastRunAt?: ISODateString;
  nextRunAt?: ISODateString;
}

export interface RadarFilters {
  makes?: string[];
  models?: string[];
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  mileageMin?: number;
  mileageMax?: number;
  locations?: VehicleLocation[];
  fuels?: string[];
  transmissions?: string[];
  minMargin?: number;
  minDealScore?: number;
  sources?: VehicleSource[];
  excludeSources?: VehicleSource[];
}

export interface NotificationConfig {
  email: boolean;
  push: boolean;
  webhook?: string;
  slack?: string;
  thresholdDealScore: number;
}

export interface Lead extends BaseEntity, SoftDelete {
  source: LeadSource;
  sourceId?: string;
  vehicleId?: UUID;
  campaignId?: UUID;
  conversationId?: UUID;
  assignedTo?: UUID;
  status: LeadStatus;
  stage: LeadStage;
  score: number;
  contact: ContactInfo;
  vehicleInterest?: VehicleInterest;
  qualification?: LeadQualification;
  activities: LeadActivity[];
  tags: string[];
  metadata: Record<string, unknown>;
  convertedAt?: ISODateString;
  lostReason?: string;
}

export type LeadSource = 
  | 'RADAR'
  | 'WEBSITE'
  | 'WHATSAPP'
  | 'INSTAGRAM'
  | 'FACEBOOK'
  | 'EMAIL'
  | 'PHONE'
  | 'WALK_IN'
  | 'REFERRAL'
  | 'CAMPAIGN'
  | 'ACADEMY'
  | 'MANUAL'
  | 'IMPORT';

export type LeadStatus = 
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'PROPOSAL'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST'
  | 'ARCHIVED';

export type LeadStage = 
  | 'LEAD'
  | 'PROSPECT'
  | 'QUALIFIED_LEAD'
  | 'OPPORTUNITY'
  | 'PROPOSAL_SENT'
  | 'NEGOTIATING'
  | 'CLOSED_WON'
  | 'CLOSED_LOST';

export interface ContactInfo {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: VehicleLocation;
  preferredContact: ContactMethod;
  bestTimeToContact?: string;
  notes?: string;
}

export type ContactMethod = 'WHATSAPP' | 'EMAIL' | 'PHONE' | 'IN_PERSON' | 'ANY';

export interface VehicleInterest {
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
}

export interface LeadQualification {
  budget?: { min: number; max: number };
  timeline?: string;
  decisionMakers?: string[];
  financingPreApproved?: boolean;
  tradeIn?: boolean;
  tradeInVehicle?: Partial<Vehicle>;
  urgency: UrgencyLevel;
  notes?: string;
  qualifiedBy?: UUID;
  qualifiedAt?: ISODateString;
}

export type UrgencyLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'IMMEDIATE';

export interface LeadActivity {
  id: UUID;
  type: ActivityType;
  description: string;
  performedBy: UUID;
  performedAt: ISODateString;
  metadata?: Record<string, unknown>;
  relatedEntityType?: string;
  relatedEntityId?: UUID;
}

export type ActivityType = 
  | 'CREATED'
  | 'CONTACTED'
  | 'NOTE_ADDED'
  | 'STATUS_CHANGED'
  | 'STAGE_CHANGED'
  | 'ASSIGNED'
  | 'VEHICLE_INTEREST_UPDATED'
  | 'APPOINTMENT_SCHEDULED'
  | 'APPOINTMENT_COMPLETED'
  | 'PROPOSAL_SENT'
  | 'PROPOSAL_VIEWED'
  | 'NEGOTIATION_STARTED'
  | 'WON'
  | 'LOST'
  | 'EMAIL_SENT'
  | 'EMAIL_OPENED'
  | 'EMAIL_CLICKED'
  | 'MESSAGE_SENT'
  | 'MESSAGE_RECEIVED'
  | 'CALL_MADE'
  | 'CALL_RECEIVED'
  | 'TASK_CREATED'
  | 'TASK_COMPLETED';

export interface Conversation extends BaseEntity, SoftDelete {
  leadId?: UUID;
  contactId?: UUID;
  channel: ConversationChannel;
  channelId: string;
  status: ConversationStatus;
  assignedTo?: UUID;
  participants: ConversationParticipant[];
  messages: Message[];
  tags: string[];
  metadata: Record<string, unknown>;
  closedAt?: ISODateString;
  closedBy?: UUID;
}

export type ConversationChannel = 'WHATSAPP' | 'INSTAGRAM' | 'EMAIL' | 'CHAT' | 'PHONE' | 'IN_PERSON';

export type ConversationStatus = 'OPEN' | 'PENDING' | 'CLOSED' | 'BOT' | 'HUMAN' | 'ESCALATED';

export interface ConversationParticipant {
  id: UUID;
  name: string;
  role: 'CUSTOMER' | 'AGENT' | 'BOT' | 'MANAGER';
  avatar?: string;
  metadata?: Record<string, unknown>;
}

export interface Message extends BaseEntity {
  conversationId: UUID;
  fromParticipantId: UUID;
  toParticipantIds: UUID[];
  type: MessageType;
  content: string;
  media?: MessageMedia[];
  status: MessageStatus;
  direction: MessageDirection;
  externalId?: string;
  metadata: Record<string, unknown>;
  aiGenerated: boolean;
  aiConfidence?: number;
  humanReviewed: boolean;
  reviewedBy?: UUID;
  reviewedAt?: ISODateString;
}

export type MessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'LOCATION' | 'CONTACT' | 'TEMPLATE' | 'INTERACTIVE' | 'SYSTEM';

export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'PENDING';

export type MessageDirection = 'INBOUND' | 'OUTBOUND';

export interface MessageMedia {
  type: 'image' | 'video' | 'audio' | 'document';
  url: string;
  thumbnailUrl?: string;
  filename?: string;
  size?: number;
  mimeType?: string;
  duration?: number;
}

export interface Campaign extends BaseEntity, SoftDelete {
  name: string;
  description?: string;
  type: CampaignType;
  status: CampaignStatus;
  trigger: CampaignTrigger;
  schedule?: CampaignSchedule;
  audience: CampaignAudience;
  content: CampaignContent;
  channels: CampaignChannel[];
  metrics: CampaignMetrics;
  abTest?: ABTestConfig;
  tags: string[];
}

export type CampaignType = 
  | 'VEHICLE_LAUNCH'
  | 'PRICE_DROP'
  | 'SEASONAL'
  | 'FOLLOW_UP'
  | 'RE_ENGAGEMENT'
  | 'EDUCATIONAL'
  | 'BRAND_AWARENESS'
  | 'CUSTOM';

export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export interface CampaignTrigger {
  type: TriggerType;
  config: Record<string, unknown>;
}

export type TriggerType = 
  | 'VEHICLE_CREATED'
  | 'PRICE_CHANGED'
  | 'LEAD_CREATED'
  | 'LEAD_STAGE_CHANGED'
  | 'APPOINTMENT_SCHEDULED'
  | 'SCHEDULE'
  | 'MANUAL'
  | 'API';

export interface CampaignSchedule {
  startAt: ISODateString;
  endAt?: ISODateString;
  timezone: string;
  recurrence?: RecurrenceRule;
  sendAt?: string;
  sendDays?: number[];
}

export interface RecurrenceRule {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval: number;
  byDay?: number[];
  byMonthDay?: number[];
  byMonth?: number[];
  count?: number;
  until?: ISODateString;
}

export interface CampaignAudience {
  segments: AudienceSegment[];
  excludeSegments?: AudienceSegment[];
  maxRecipients?: number;
}

export interface AudienceSegment {
  name: string;
  filters: Record<string, unknown>;
  estimatedSize: number;
}

export interface CampaignContent {
  subject?: string;
  preheader?: string;
  html?: string;
  text?: string;
  whatsappTemplate?: string;
  instagramCaption?: string;
  facebookPost?: string;
  videoScript?: string;
  cta?: CallToAction;
  variables: Record<string, string>;
}

export interface CallToAction {
  text: string;
  url: string;
  type: 'LINK' | 'BUTTON' | 'QUICK_REPLY';
}

export type CampaignChannel = 'EMAIL' | 'WHATSAPP' | 'INSTAGRAM' | 'FACEBOOK' | 'SMS' | 'PUSH';

export interface CampaignMetrics {
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
}

export interface ABTestConfig {
  enabled: boolean;
  variants: ABVariant[];
  winnerCriteria: 'OPEN_RATE' | 'CLICK_RATE' | 'CONVERSION_RATE' | 'REVENUE';
  testSize: number;
  confidenceLevel: number;
}

export interface ABVariant {
  id: string;
  name: string;
  content: CampaignContent;
  weight: number;
  metrics?: CampaignMetrics;
}

export interface VideoJob extends BaseEntity, SoftDelete {
  vehicleId?: UUID;
  campaignId?: UUID;
  type: VideoType;
  status: VideoJobStatus;
  priority: number;
  input: VideoInput;
  output?: VideoOutput;
  progress: number;
  error?: string;
  startedAt?: ISODateString;
  completedAt?: ISODateString;
  workerId?: string;
  gpuType?: string;
  estimatedDuration?: number;
  actualDuration?: number;
}

export type VideoType = 
  | 'VEHICLE_SHOWCASE'
  | 'WALKAROUND'
  | 'FEATURE_HIGHLIGHT'
  | 'COMPARISON'
  | 'TESTIMONIAL'
  | 'EDUCATIONAL'
  | 'SOCIAL_MEDIA_REEL'
  | 'ADS'
  | 'CUSTOM';

export type VideoJobStatus = 
  | 'PENDING'
  | 'QUEUED'
  | 'PROCESSING'
  | 'RENDERING'
  | 'UPLOADING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface VideoInput {
  script: string;
  images: string[];
  videoClips?: string[];
  music?: string;
  voiceover?: VoiceoverConfig;
  template?: string;
  aspectRatio: AspectRatio;
  duration?: number;
  style?: VideoStyle;
  branding?: BrandingConfig;
}

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '4:5';

export interface VoiceoverConfig {
  text: string;
  voice: string;
  language: string;
  speed: number;
  pitch: number;
}

export interface VideoStyle {
  theme: string;
  transitions: string[];
  effects: string[];
  colorGrade?: string;
  textStyle?: TextStyle;
}

export interface TextStyle {
  font: string;
  color: string;
  size: number;
  position: 'top' | 'bottom' | 'center' | 'lower_third';
  animation?: string;
}

export interface BrandingConfig {
  logoUrl?: string;
  logoPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  watermark?: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
}

export interface VideoOutput {
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
}

export interface Course extends BaseEntity, SoftDelete {
  title: string;
  description: string;
  shortDescription?: string;
  thumbnailUrl?: string;
  instructorId: UUID;
  category: string;
  level: CourseLevel;
  language: string;
  price: number;
  currency: string;
  status: CourseStatus;
  modules: CourseModule[];
  requirements?: string[];
  learningOutcomes?: string[];
  targetAudience?: string;
  durationMinutes: number;
  enrolledCount: number;
  rating: number;
  reviewCount: number;
  tags: string[];
  certificateTemplate?: string;
  settings: CourseSettings;
}

export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'PRIVATE';

export interface CourseModule extends BaseEntity {
  courseId: UUID;
  title: string;
  description?: string;
  order: number;
  lessons: Lesson[];
  durationMinutes: number;
  isPublished: boolean;
  unlockCondition?: UnlockCondition;
}

export interface Lesson extends BaseEntity {
  moduleId: UUID;
  title: string;
  description?: string;
  order: number;
  type: LessonType;
  content: LessonContent;
  durationMinutes: number;
  isFree: boolean;
  isPublished: boolean;
  resources: LessonResource[];
  quiz?: Quiz;
  unlockCondition?: UnlockCondition;
  saasIntegration?: SaasIntegration;
}

export type LessonType = 'VIDEO' | 'TEXT' | 'QUIZ' | 'ASSIGNMENT' | 'LIVE' | 'SCORM' | 'EXTERNAL';

export interface LessonContent {
  videoUrl?: string;
  videoDuration?: number;
  textContent?: string;
  slidesUrl?: string;
  externalUrl?: string;
  scormPackage?: string;
}

export interface LessonResource {
  id: UUID;
  title: string;
  type: 'PDF' | 'DOC' | 'XLS' | 'ZIP' | 'LINK' | 'VIDEO' | 'IMAGE';
  url: string;
  size?: number;
  downloadable: boolean;
}

export interface Quiz {
  id: UUID;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  passingScore: number;
  timeLimitMinutes?: number;
  maxAttempts: number;
  shuffleQuestions: boolean;
  showCorrectAnswers: boolean;
}

export interface QuizQuestion {
  id: UUID;
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY';
  question: string;
  options?: QuizOption[];
  correctAnswer?: string | string[];
  explanation?: string;
  points: number;
  order: number;
}

export interface QuizOption {
  id: UUID;
  text: string;
  isCorrect: boolean;
}

export interface UnlockCondition {
  type: 'COMPLETE_PREVIOUS' | 'PASS_QUIZ' | 'DATE' | 'MANUAL' | 'PURCHASE';
  value?: unknown;
}

export interface SaasIntegration {
  type: 'RADAR' | 'VEHICLE_SEARCH' | 'CRM' | 'CALCULATOR' | 'SIMULATOR';
  config: Record<string, unknown>;
  actionLabel: string;
}

export interface Enrollment extends BaseEntity {
  userId: UUID;
  courseId: UUID;
  status: EnrollmentStatus;
  progress: number;
  currentModuleId?: UUID;
  currentLessonId?: UUID;
  completedModules: UUID[];
  completedLessons: UUID[];
  quizScores: QuizScore[];
  startedAt: ISODateString;
  completedAt?: ISODateString;
  certificateId?: UUID;
  lastAccessAt: ISODateString;
}

export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED';

export interface QuizScore {
  quizId: UUID;
  score: number;
  maxScore: number;
  passed: boolean;
  attempt: number;
  completedAt: ISODateString;
  answers: QuizAnswer[];
}

export interface QuizAnswer {
  questionId: UUID;
  answer: string | string[];
  isCorrect: boolean;
  points: number;
}

export interface Certificate extends BaseEntity {
  enrollmentId: UUID;
  userId: UUID;
  courseId: UUID;
  templateId: string;
  certificateNumber: string;
  issuedAt: ISODateString;
  expiresAt?: ISODateString;
  verificationUrl: string;
  pdfUrl?: string;
  blockchainHash?: string;
}

export interface Event<T = unknown> {
  id: UUID;
  type: string;
  payload: T;
  organizationId: UUID;
  userId?: UUID;
  correlationId?: UUID;
  causationId?: UUID;
  timestamp: ISODateString;
  metadata: Record<string, unknown>;
}

export interface EventHandler<T = unknown> {
  eventType: string;
  handler: (event: Event<T>) => Promise<void>;
  retryPolicy?: RetryPolicy;
}

export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: string[];
}

export interface AIProvider {
  name: string;
  type: AIProviderType;
  models: AIModel[];
  config: Record<string, unknown>;
  enabled: boolean;
  priority: number;
  rateLimits: RateLimitInfo;
}

export type AIProviderType = 'OPENAI' | 'ANTHROPIC' | 'GOOGLE' | 'LOCAL' | 'AZURE' | 'BEDROCK' | 'CUSTOM';

export interface AIModel {
  id: string;
  name: string;
  type: AIModelType;
  contextWindow: number;
  maxOutputTokens: number;
  capabilities: AIModelCapability[];
  costPer1kInputTokens: number;
  costPer1kOutputTokens: number;
  supportsStreaming: boolean;
  supportsFunctions: boolean;
  supportsVision: boolean;
}

export type AIModelType = 'CHAT' | 'COMPLETION' | 'EMBEDDING' | 'VISION' | 'AUDIO' | 'VIDEO';

export type AIModelCapability = 
  | 'CHAT'
  | 'FUNCTION_CALLING'
  | 'VISION'
  | 'AUDIO_INPUT'
  | 'AUDIO_OUTPUT'
  | 'VIDEO_INPUT'
  | 'VIDEO_OUTPUT'
  | 'REASONING'
  | 'CODE_INTERPRETATION'
  | 'WEB_SEARCH'
  | 'FILE_ANALYSIS';

export interface AIRequest {
  id: UUID;
  organizationId: UUID;
  userId?: UUID;
  provider: string;
  model: string;
  messages: AIMessage[];
  tools?: AITool[];
  toolChoice?: 'auto' | 'none' | 'required';
  temperature?: number;
  maxTokens?: number;
  stream: boolean;
  metadata: Record<string, unknown>;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | AIMessageContent[];
  name?: string;
  toolCalls?: AIToolCall[];
  toolCallId?: string;
}

export interface AIMessageContent {
  type: 'text' | 'image_url' | 'file';
  text?: string;
  imageUrl?: { url: string; detail?: 'low' | 'high' | 'auto' };
  file?: { filename: string; fileData: string; mimeType: string };
}

export interface AITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface AIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface AIResponse {
  id: UUID;
  requestId: UUID;
  model: string;
  choices: AIChoice[];
  usage: AIUsage;
  createdAt: ISODateString;
}

export interface AIChoice {
  index: number;
  message: AIMessage;
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error';
}

export interface AIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
}

export interface HermesAction {
  id: UUID;
  type: HermesActionType;
  payload: Record<string, unknown>;
  requiresApproval: boolean;
  approvedBy?: UUID;
  approvedAt?: ISODateString;
  executedAt?: ISODateString;
  result?: unknown;
  error?: string;
  status: ActionStatus;
}

export type HermesActionType = 
  | 'SEARCH_VEHICLES'
  | 'ANALYZE_VEHICLE'
  | 'CREATE_LEAD'
  | 'UPDATE_LEAD'
  | 'SEND_MESSAGE'
  | 'SCHEDULE_APPOINTMENT'
  | 'CREATE_CAMPAIGN'
  | 'GENERATE_VIDEO'
  | 'PUBLISH_SOCIAL'
  | 'ENROLL_STUDENT'
  | 'CALCULATE_FINANCING'
  | 'GENERATE_CONTRACT'
  | 'REQUEST_HUMAN'
  | 'LOG_ACTIVITY'
  | 'UPDATE_VEHICLE'
  | 'SYNC_RADAR'
  | 'TRIGGER_WORKFLOW';

export type ActionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTING' | 'COMPLETED' | 'FAILED';

export interface WebhookEvent extends BaseEntity {
  source: string;
  eventType: string;
  payload: Record<string, unknown>;
  headers: Record<string, string>;
  signature?: string;
  verified: boolean;
  processed: boolean;
  processedAt?: ISODateString;
  error?: string;
  retryCount: number;
  nextRetryAt?: ISODateString;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  statusCode: number;
}

export interface ResponseMeta {
  requestId: UUID;
  timestamp: ISODateString;
  version: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  filters?: Record<string, unknown>;
  dateFrom?: ISODateString;
  dateTo?: ISODateString;
}

export type ListParams = PaginationParams & FilterParams;

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  version: string;
  uptime: number;
  checks: ServiceCheck[];
  timestamp: ISODateString;
}

export interface ServiceCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message?: string;
  durationMs: number;
  metadata?: Record<string, unknown>;
}

export interface MetricData {
  name: string;
  value: number;
  unit: string;
  tags: Record<string, string>;
  timestamp: ISODateString;
}

export interface AuditLog extends BaseEntity {
  organizationId: UUID;
  userId?: UUID;
  action: string;
  resourceType: string;
  resourceId?: UUID;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  metadata: Record<string, unknown>;
}

export interface FileUpload extends BaseEntity {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  storagePath: string;
  uploadedBy: UUID;
  entityType?: string;
  entityId?: UUID;
  tags: string[];
  metadata: Record<string, unknown>;
}

export interface Notification extends BaseEntity {
  userId: UUID;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  read: boolean;
  readAt?: ISODateString;
  actionUrl?: string;
  actionLabel?: string;
  metadata: Record<string, unknown>;
  channels: NotificationChannel[];
}

export type NotificationType = 
  | 'INFO'
  | 'SUCCESS'
  | 'WARNING'
  | 'ERROR'
  | 'LEAD_NEW'
  | 'LEAD_QUALIFIED'
  | 'APPOINTMENT_SCHEDULED'
  | 'APPOINTMENT_REMINDER'
  | 'VEHICLE_OPPORTUNITY'
  | 'PRICE_ALERT'
  | 'CAMPAIGN_COMPLETED'
  | 'VIDEO_READY'
  | 'COURSE_ENROLLED'
  | 'COURSE_COMPLETED'
  | 'CERTIFICATE_EARNED'
  | 'BILLING_ISSUE'
  | 'SYSTEM_ALERT';

export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'PUSH' | 'SMS' | 'WHATSAPP';

export interface Settings extends BaseEntity {
  key: string;
  value: unknown;
  category: string;
  description?: string;
  isPublic: boolean;
  validation?: ValidationRule;
}

export interface ValidationRule {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  enum?: unknown[];
  customValidator?: string;
}