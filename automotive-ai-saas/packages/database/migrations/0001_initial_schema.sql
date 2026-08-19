-- Initial schema migration for automotive-ai-saas
-- Created: 2024-01-01

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo TEXT,
  settings TEXT NOT NULL DEFAULT '{"timezone":"UTC","currency":"USD","language":"es","features":{},"integrations":{}}',
  plan TEXT NOT NULL DEFAULT 'FREE' CHECK (plan IN ('FREE','STARTER','PRO','DEALER','ENTERPRISE')),
  billing_email TEXT,
  stripe_customer_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar TEXT,
  phone TEXT,
  password_hash TEXT,
  two_factor_enabled INTEGER NOT NULL DEFAULT 0,
  two_factor_secret TEXT,
  last_login_at TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0,
  email_verification_token TEXT,
  password_reset_token TEXT,
  password_reset_expires TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','PENDING','SUSPENDED','DELETED')),
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Organization members table
CREATE TABLE IF NOT EXISTS organization_members (
  user_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('OWNER','ADMIN','MANAGER','SALES','MARKETING','BUYER','INSTRUCTOR','STUDENT')),
  permissions TEXT NOT NULL DEFAULT '[]',
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  invited_by TEXT,
  PRIMARY KEY (user_id, organization_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES users(id)
);

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  vin TEXT,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  trim TEXT,
  year INTEGER NOT NULL,
  mileage INTEGER NOT NULL,
  price REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'DISCOVERED' CHECK (status IN ('DISCOVERED','ANALYZING','OPPORTUNITY','ACQUIRED','IN_INVENTORY','LISTED','RESERVED','SOLD','ARCHIVED')),
  source TEXT NOT NULL CHECK (source IN ('MANUAL','CAR_DEALS_SEARCH','COPART','AUTOTRADER','CARS_COM','KBB','CUSTOM_API','IMPORT','TRADE_IN')),
  source_listing_id TEXT,
  source_url TEXT,
  location TEXT NOT NULL,
  features TEXT NOT NULL DEFAULT '[]',
  photos TEXT NOT NULL DEFAULT '[]',
  documents TEXT NOT NULL DEFAULT '[]',
  price_history TEXT NOT NULL DEFAULT '[]',
  market_price REAL,
  estimated_margin REAL,
  deal_score INTEGER,
  risk_score TEXT CHECK (risk_score IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  confidence REAL,
  acquired_at TEXT,
  sold_at TEXT,
  sold_price REAL,
  listing_data TEXT NOT NULL DEFAULT '{}',
  ai_analysis TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS vehicles_org_idx ON vehicles(organization_id);
CREATE INDEX IF NOT EXISTS vehicles_status_idx ON vehicles(status);
CREATE INDEX IF NOT EXISTS vehicles_source_idx ON vehicles(source);
CREATE INDEX IF NOT EXISTS vehicles_make_model_idx ON vehicles(make, model);
CREATE UNIQUE INDEX IF NOT EXISTS vehicles_vin_idx ON vehicles(vin) WHERE vin IS NOT NULL;

-- Vehicle listings table
CREATE TABLE IF NOT EXISTS vehicle_listings (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  vehicle_id TEXT,
  source TEXT NOT NULL CHECK (source IN ('MANUAL','CAR_DEALS_SEARCH','COPART','AUTOTRADER','CARS_COM','KBB','CUSTOM_API','IMPORT','TRADE_IN')),
  source_listing_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  mileage INTEGER NOT NULL,
  location TEXT NOT NULL,
  seller TEXT NOT NULL,
  photos TEXT NOT NULL DEFAULT '[]',
  features TEXT NOT NULL DEFAULT '[]',
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','PRICE_CHANGED','MILEAGE_CHANGED','SELLER_CHANGED','REMOVED','SOLD','EXPIRED')),
  price_history TEXT NOT NULL DEFAULT '[]',
  raw_data TEXT NOT NULL DEFAULT '{}',
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS listings_org_idx ON vehicle_listings(organization_id);
CREATE INDEX IF NOT EXISTS listings_vehicle_idx ON vehicle_listings(vehicle_id);
CREATE UNIQUE INDEX IF NOT EXISTS listings_source_listing_idx ON vehicle_listings(source, source_listing_id);
CREATE INDEX IF NOT EXISTS listings_status_idx ON vehicle_listings(status);

-- Radar sources table
CREATE TABLE IF NOT EXISTS radar_sources (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('MANUAL','CAR_DEALS_SEARCH','COPART','AUTOTRADER','CARS_COM','KBB','CUSTOM_API','IMPORT','TRADE_IN')),
  adapter TEXT NOT NULL,
  config TEXT NOT NULL DEFAULT '{}',
  enabled INTEGER NOT NULL DEFAULT 1,
  health_status TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK (health_status IN ('HEALTHY','DEGRADED','DOWN','UNKNOWN')),
  last_sync_at TEXT,
  rate_limit TEXT NOT NULL DEFAULT '{"requestsPerMinute":60,"requestsPerHour":1000,"requestsPerDay":10000,"currentUsage":{"minute":0,"hour":0,"day":0},"resetAt":{"minute":"","hour":"","day":""}}',
  sync_schedule TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS radar_sources_org_idx ON radar_sources(organization_id);

-- Radar rules table
CREATE TABLE IF NOT EXISTS radar_rules (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  filters TEXT NOT NULL DEFAULT '{}',
  notifications TEXT NOT NULL DEFAULT '{"email":true,"push":true,"thresholdDealScore":80}',
  enabled INTEGER NOT NULL DEFAULT 1,
  last_run_at TEXT,
  next_run_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS radar_rules_org_idx ON radar_rules(organization_id);

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('RADAR','WEBSITE','WHATSAPP','INSTAGRAM','FACEBOOK','EMAIL','PHONE','WALK_IN','REFERRAL','CAMPAIGN','ACADEMY','MANUAL','IMPORT')),
  source_id TEXT,
  vehicle_id TEXT,
  campaign_id TEXT,
  conversation_id TEXT,
  assigned_to TEXT,
  status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW','CONTACTED','QUALIFIED','PROPOSAL','NEGOTIATION','WON','LOST','ARCHIVED')),
  stage TEXT NOT NULL DEFAULT 'LEAD' CHECK (stage IN ('LEAD','PROSPECT','QUALIFIED_LEAD','OPPORTUNITY','PROPOSAL_SENT','NEGOTIATING','CLOSED_WON','CLOSED_LOST')),
  score INTEGER NOT NULL DEFAULT 0,
  contact TEXT NOT NULL,
  vehicle_interest TEXT,
  qualification TEXT,
  activities TEXT NOT NULL DEFAULT '[]',
  tags TEXT NOT NULL DEFAULT '[]',
  metadata TEXT NOT NULL DEFAULT '{}',
  converted_at TEXT,
  lost_reason TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS leads_org_idx ON leads(organization_id);
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads(status);
CREATE INDEX IF NOT EXISTS leads_stage_idx ON leads(stage);
CREATE INDEX IF NOT EXISTS leads_assigned_idx ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS leads_vehicle_idx ON leads(vehicle_id);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  lead_id TEXT,
  contact_id TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('WHATSAPP','INSTAGRAM','EMAIL','CHAT','PHONE','IN_PERSON')),
  channel_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','PENDING','CLOSED','BOT','HUMAN','ESCALATED')),
  assigned_to TEXT,
  participants TEXT NOT NULL DEFAULT '[]',
  tags TEXT NOT NULL DEFAULT '[]',
  metadata TEXT NOT NULL DEFAULT '{}',
  closed_at TEXT,
  closed_by TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (closed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS conversations_org_idx ON conversations(organization_id);
CREATE INDEX IF NOT EXISTS conversations_lead_idx ON conversations(lead_id);
CREATE INDEX IF NOT EXISTS conversations_channel_idx ON conversations(channel, channel_id);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  from_participant_id TEXT NOT NULL,
  to_participant_ids TEXT NOT NULL DEFAULT '[]',
  type TEXT NOT NULL CHECK (type IN ('TEXT','IMAGE','VIDEO','AUDIO','DOCUMENT','LOCATION','CONTACT','TEMPLATE','INTERACTIVE','SYSTEM')),
  content TEXT NOT NULL,
  media TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('SENT','DELIVERED','READ','FAILED','PENDING')),
  direction TEXT NOT NULL CHECK (direction IN ('INBOUND','OUTBOUND')),
  external_id TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  ai_generated INTEGER NOT NULL DEFAULT 0,
  ai_confidence REAL,
  human_reviewed INTEGER NOT NULL DEFAULT 0,
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS messages_org_idx ON messages(organization_id);
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS messages_external_id_idx ON messages(external_id);

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('VEHICLE_LAUNCH','PRICE_DROP','SEASONAL','FOLLOW_UP','RE_ENGAGEMENT','EDUCATIONAL','BRAND_AWARENESS','CUSTOM')),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SCHEDULED','ACTIVE','PAUSED','COMPLETED','CANCELLED')),
  trigger TEXT NOT NULL,
  schedule TEXT,
  audience TEXT NOT NULL,
  content TEXT NOT NULL,
  channels TEXT NOT NULL DEFAULT '[]',
  metrics TEXT NOT NULL DEFAULT '{"sent":0,"delivered":0,"opened":0,"clicked":0,"replied":0,"converted":0,"unsubscribed":0,"bounced":0,"spamReported":0}',
  ab_test TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS campaigns_org_idx ON campaigns(organization_id);
CREATE INDEX IF NOT EXISTS campaigns_status_idx ON campaigns(status);

-- Video jobs table
CREATE TABLE IF NOT EXISTS video_jobs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  vehicle_id TEXT,
  campaign_id TEXT,
  type TEXT NOT NULL CHECK (type IN ('VEHICLE_SHOWCASE','WALKAROUND','FEATURE_HIGHLIGHT','COMPARISON','TESTIMONIAL','EDUCATIONAL','SOCIAL_MEDIA_REEL','ADS','CUSTOM')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','QUEUED','PROCESSING','RENDERING','UPLOADING','COMPLETED','FAILED','CANCELLED')),
  priority INTEGER NOT NULL DEFAULT 0,
  input TEXT NOT NULL,
  output TEXT,
  progress INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  started_at TEXT,
  completed_at TEXT,
  worker_id TEXT,
  gpu_type TEXT,
  estimated_duration INTEGER,
  actual_duration INTEGER,
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS video_jobs_org_idx ON video_jobs(organization_id);
CREATE INDEX IF NOT EXISTS video_jobs_status_idx ON video_jobs(status);
CREATE INDEX IF NOT EXISTS video_jobs_vehicle_idx ON video_jobs(vehicle_id);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  short_description TEXT,
  thumbnail_url TEXT,
  instructor_id TEXT NOT NULL,
  category TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('BEGINNER','INTERMEDIATE','ADVANCED','EXPERT')),
  language TEXT NOT NULL DEFAULT 'es',
  price REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED','PRIVATE')),
  modules TEXT NOT NULL DEFAULT '[]',
  requirements TEXT,
  learning_outcomes TEXT,
  target_audience TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  enrolled_count INTEGER NOT NULL DEFAULT 0,
  rating REAL NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  tags TEXT NOT NULL DEFAULT '[]',
  certificate_template TEXT,
  settings TEXT NOT NULL DEFAULT '{}',
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (instructor_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS courses_org_idx ON courses(organization_id);
CREATE INDEX IF NOT EXISTS courses_instructor_idx ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS courses_status_idx ON courses(status);

-- Enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','COMPLETED','EXPIRED','CANCELLED','REFUNDED')),
  progress REAL NOT NULL DEFAULT 0,
  current_module_id TEXT,
  current_lesson_id TEXT,
  completed_modules TEXT NOT NULL DEFAULT '[]',
  completed_lessons TEXT NOT NULL DEFAULT '[]',
  quiz_scores TEXT NOT NULL DEFAULT '[]',
  started_at TEXT NOT NULL,
  completed_at TEXT,
  certificate_id TEXT,
  last_access_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS enrollments_org_idx ON enrollments(organization_id);
CREATE INDEX IF NOT EXISTS enrollments_user_idx ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS enrollments_course_idx ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS enrollments_status_idx ON enrollments(status);

-- Certificates table
CREATE TABLE IF NOT EXISTS certificates (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  enrollment_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  certificate_number TEXT NOT NULL UNIQUE,
  issued_at TEXT NOT NULL,
  expires_at TEXT,
  verification_url TEXT NOT NULL,
  pdf_url TEXT,
  blockchain_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS certificates_org_idx ON certificates(organization_id);
CREATE INDEX IF NOT EXISTS certificates_user_idx ON certificates(user_id);
CREATE INDEX IF NOT EXISTS certificates_course_idx ON certificates(course_id);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  user_id TEXT,
  correlation_id TEXT,
  causation_id TEXT,
  timestamp TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS events_org_idx ON events(organization_id);
CREATE INDEX IF NOT EXISTS events_type_idx ON events(type);
CREATE INDEX IF NOT EXISTS events_timestamp_idx ON events(timestamp);
CREATE INDEX IF NOT EXISTS events_correlation_idx ON events(correlation_id);

-- Webhook events table
CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  source TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  headers TEXT NOT NULL,
  signature TEXT,
  verified INTEGER NOT NULL DEFAULT 0,
  processed INTEGER NOT NULL DEFAULT 0,
  processed_at TEXT,
  error TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  next_retry_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS webhook_events_org_idx ON webhook_events(organization_id);
CREATE INDEX IF NOT EXISTS webhook_events_source_idx ON webhook_events(source);
CREATE INDEX IF NOT EXISTS webhook_events_processed_idx ON webhook_events(processed);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  user_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  old_value TEXT,
  new_value TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS audit_logs_org_idx ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS audit_logs_user_idx ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_resource_idx ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs(action);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs(created_at);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('INFO','SUCCESS','WARNING','ERROR','LEAD_NEW','LEAD_QUALIFIED','APPOINTMENT_SCHEDULED','APPOINTMENT_REMINDER','VEHICLE_OPPORTUNITY','PRICE_ALERT','CAMPAIGN_COMPLETED','VIDEO_READY','COURSE_ENROLLED','COURSE_COMPLETED','CERTIFICATE_EARNED','BILLING_ISSUE','SYSTEM_ALERT')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW','NORMAL','HIGH','URGENT')),
  read INTEGER NOT NULL DEFAULT 0,
  read_at TEXT,
  action_url TEXT,
  action_label TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  channels TEXT NOT NULL DEFAULT '["IN_APP"]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS notifications_org_idx ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(read);
CREATE INDEX IF NOT EXISTS notifications_created_idx ON notifications(created_at);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  is_public INTEGER NOT NULL DEFAULT 0,
  validation TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  UNIQUE (organization_id, key)
);

CREATE INDEX IF NOT EXISTS settings_org_idx ON settings(organization_id);

-- File uploads table
CREATE TABLE IF NOT EXISTS file_uploads (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  storage_path TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS file_uploads_org_idx ON file_uploads(organization_id);
CREATE INDEX IF NOT EXISTS file_uploads_entity_idx ON file_uploads(entity_type, entity_id);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_org_idx ON sessions(organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS sessions_token_idx ON sessions(token);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions(expires_at);

-- API keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  permissions TEXT NOT NULL DEFAULT '[]',
  last_used_at TEXT,
  expires_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS api_keys_org_idx ON api_keys(organization_id);
CREATE INDEX IF NOT EXISTS api_keys_prefix_idx ON api_keys(key_prefix);