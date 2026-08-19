import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { authMiddleware, requirePermission } from '../middleware/auth';
import { PaginatedResponse, Vehicle, VehicleListing, Lead, LeadStatus, Conversation, Campaign, VideoJob, Course, Enrollment } from '@automotive-ai-saas/types';

const api = new Hono<{ Bindings: Env }>();

// Apply auth middleware to all routes
api.use('*', authMiddleware);

// ===== VEHICLES =====

const vehicleSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  trim: z.string().optional(),
  price: z.number().positive(),
  cost: z.number().min(0).optional(),
  mileage: z.number().int().min(0).optional(),
  vin: z.string().length(17).optional(),
  fuelType: z.enum(['GASOLINE', 'DIESEL', 'HYBRID', 'PLUGIN_HYBRID', 'ELECTRIC']).optional(),
  transmission: z.enum(['AUTOMATIC', 'MANUAL', 'CVT', 'DUAL_CLUTCH']).optional(),
  bodyType: z.enum(['SEDAN', 'SUV', 'TRUCK', 'COUPE', 'CONVERTIBLE', 'HATCHBACK', 'WAGON', 'VAN', 'PICKUP']).optional(),
  exteriorColor: z.string().optional(),
  interiorColor: z.string().optional(),
  description: z.string().optional(),
  features: z.array(z.string()).optional(),
  images: z.array(z.object({ url: z.string().url(), isPrimary: z.boolean() })).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SOLD', 'RESERVED', 'DRAFT']).default('DRAFT'),
  isFeatured: z.boolean().default(false),
});

const vehicleQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  status: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  minYear: z.coerce.number().optional(),
  maxYear: z.coerce.number().optional(),
});

api.get('/vehicles', requirePermission('vehicles:read'), zValidator('query', vehicleQuerySchema), async (c) => {
  const { page, limit, search, status, make, model, minPrice, maxPrice, minYear, maxYear } = c.req.valid('query');
  const orgId = c.get('organizationId');
  
  // Build query with filters
  // This would use Drizzle ORM in real implementation
  const vehicles: Vehicle[] = []; // Replace with actual DB query
  const total = 0;
  
  const response: PaginatedResponse<Vehicle> = {
    data: vehicles,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
  
  return c.json(response);
});

api.post('/vehicles', requirePermission('vehicles:create'), zValidator('json', vehicleSchema), async (c) => {
  const data = c.req.valid('json');
  const orgId = c.get('organizationId');
  const userId = c.get('userId');
  
  // Create vehicle with orgId
  const vehicle: Vehicle = {
    ...data,
    id: crypto.randomUUID(),
    organizationId: orgId,
    createdBy: userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  // Save to DB
  
  return c.json(vehicle, 201);
});

api.get('/vehicles/:id', requirePermission('vehicles:read'), async (c) => {
  const id = c.req.param('id');
  const orgId = c.get('organizationId');
  
  // Fetch vehicle by id and orgId
  const vehicle: Vehicle | null = null; // Replace with actual DB query
  
  if (!vehicle) {
    return c.json({ error: 'Vehicle not found' }, 404);
  }
  
  return c.json(vehicle);
});

api.patch('/vehicles/:id', requirePermission('vehicles:update'), zValidator('json', vehicleSchema.partial()), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const orgId = c.get('organizationId');
  
  // Update vehicle
  const vehicle: Vehicle | null = null; // Replace with actual DB update
  
  if (!vehicle) {
    return c.json({ error: 'Vehicle not found' }, 404);
  }
  
  return c.json(vehicle);
});

api.delete('/vehicles/:id', requirePermission('vehicles:delete'), async (c) => {
  const id = c.req.param('id');
  const orgId = c.get('organizationId');
  
  // Soft delete vehicle
  
  return c.json({ success: true });
});

// Vehicle Listings (Radar)
api.get('/vehicles/listings', requirePermission('vehicles:read'), async (c) => {
  const orgId = c.get('organizationId');
  
  const listings: VehicleListing[] = []; // Replace with actual DB query
  
  return c.json({ data: listings, total: listings.length });
});

// ===== LEADS =====

const leadSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(10),
  source: z.enum(['WEBSITE', 'WHATSAPP', 'INSTAGRAM', 'FACEBOOK', 'REFERRAL', 'WALK_IN', 'PHONE', 'EMAIL', 'RADAR', 'OTHER']),
  status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']).default('NEW'),
  estimatedValue: z.number().min(0).optional(),
  score: z.number().int().min(0).max(100).default(0),
  notes: z.string().optional(),
  vehicleInterestId: z.string().uuid().optional(),
  assignedToId: z.string().uuid().optional(),
});

const leadQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  status: z.string().optional(),
  assignedTo: z.string().optional(),
});

api.get('/leads', requirePermission('leads:read'), zValidator('query', leadQuerySchema), async (c) => {
  const { page, limit, search, status, assignedTo } = c.req.valid('query');
  const orgId = c.get('organizationId');
  const userId = c.get('userId');
  const userRole = c.get('userRole');
  
  // If not admin/manager, filter by assignedTo
  const filterAssignedTo = ['OWNER', 'ADMIN', 'MANAGER'].includes(userRole) ? assignedTo : userId;
  
  const leads: Lead[] = []; // Replace with actual DB query
  const total = 0;
  
  const response: PaginatedResponse<Lead> = {
    data: leads,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
  
  return c.json(response);
});

api.post('/leads', requirePermission('leads:create'), zValidator('json', leadSchema), async (c) => {
  const data = c.req.valid('json');
  const orgId = c.get('organizationId');
  const userId = c.get('userId');
  
  const lead: Lead = {
    ...data,
    id: crypto.randomUUID(),
    organizationId: orgId,
    createdBy: userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
  };
  
  // Save to DB and publish event
  
  return c.json(lead, 201);
});

api.get('/leads/:id', requirePermission('leads:read'), async (c) => {
  const id = c.req.param('id');
  const orgId = c.get('organizationId');
  
  const lead: Lead | null = null; // Replace with actual DB query
  
  if (!lead) {
    return c.json({ error: 'Lead not found' }, 404);
  }
  
  return c.json(lead);
});

api.patch('/leads/:id', requirePermission('leads:update'), zValidator('json', leadSchema.partial()), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const orgId = c.get('organizationId');
  
  const lead: Lead | null = null; // Replace with actual DB update
  
  if (!lead) {
    return c.json({ error: 'Lead not found' }, 404);
  }
  
  // Validate status transition
  if (data.status && data.status !== lead.status) {
    const validTransitions: Record<LeadStatus, LeadStatus[]> = {
      NEW: ['CONTACTED', 'LOST'],
      CONTACTED: ['QUALIFIED', 'LOST'],
      QUALIFIED: ['PROPOSAL', 'LOST'],
      PROPOSAL: ['NEGOTIATION', 'LOST'],
      NEGOTIATION: ['WON', 'LOST'],
      WON: [],
      LOST: [],
    };
    
    if (!validTransitions[lead.status].includes(data.status)) {
      return c.json({ error: `Invalid status transition from ${lead.status} to ${data.status}` }, 400);
    }
  }
  
  return c.json(lead);
});

api.delete('/leads/:id', requirePermission('leads:delete'), async (c) => {
  const id = c.req.param('id');
  const orgId = c.get('organizationId');
  
  // Soft delete
  
  return c.json({ success: true });
});

// Lead conversation
api.get('/leads/:id/conversation', requirePermission('leads:read'), async (c) => {
  const id = c.req.param('id');
  const orgId = c.get('organizationId');
  
  const conversation: Conversation | null = null; // Replace with actual DB query
  
  return c.json(conversation);
});

api.get('/leads/:id/messages', requirePermission('leads:read'), async (c) => {
  const id = c.req.param('id');
  const orgId = c.get('organizationId');
  
  const messages: any[] = []; // Replace with actual DB query
  
  return c.json(messages);
});

api.post('/leads/:id/messages', requirePermission('leads:update'), async (c) => {
  const id = c.req.param('id');
  const orgId = c.get('organizationId');
  const body = await c.req.json();
  
  // Send message via Communications service
  
  return c.json({ success: true });
});

// ===== CONVERSATIONS =====

const conversationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  status: z.string().optional(),
  channel: z.string().optional(),
});

api.get('/conversations', requirePermission('conversations:read'), zValidator('query', conversationQuerySchema), async (c) => {
  const { page, limit, search, status, channel } = c.req.valid('query');
  const orgId = c.get('organizationId');
  
  const conversations: Conversation[] = []; // Replace with actual DB query
  const total = 0;
  
  const response: PaginatedResponse<Conversation> = {
    data: conversations,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
  
  return c.json(response);
});

api.get('/conversations/:id', requirePermission('conversations:read'), async (c) => {
  const id = c.req.param('id');
  const orgId = c.get('organizationId');
  
  const conversation: Conversation | null = null; // Replace with actual DB query
  
  if (!conversation) {
    return c.json({ error: 'Conversation not found' }, 404);
  }
  
  return c.json(conversation);
});

api.patch('/conversations/:id', requirePermission('conversations:update'), async (c) => {
  const id = c.req.param('id');
  const orgId = c.get('organizationId');
  const body = await c.req.json();
  
  // Update conversation (status, assignee, etc.)
  
  return c.json({ success: true });
});

api.post('/conversations/:id/messages', requirePermission('conversations:update'), async (c) => {
  const id = c.req.param('id');
  const orgId = c.get('organizationId');
  const body = await c.req.json();
  
  // Send message via Communications service
  
  return c.json({ success: true });
});

// ===== CAMPAIGNS =====

const campaignSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['VEHICLE_PROMOTION', 'BRAND_AWARENESS', 'LEAD_GENERATION', 'RETARGETING', 'EVENT_PROMOTION', 'SEASONAL_OFFER']),
  channels: z.array(z.enum(['EMAIL', 'WHATSAPP', 'INSTAGRAM', 'SMS', 'PUSH'])).min(1),
  status: z.enum(['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']).default('DRAFT'),
  subject: z.string().optional(),
  content: z.string().optional(),
  thumbnailUrl: z.string().url().optional(),
  scheduledAt: z.string().datetime().optional(),
  targetAudience: z.record(z.any()).optional(),
  abTestConfig: z.record(z.any()).optional(),
});

api.get('/campaigns', requirePermission('campaigns:read'), async (c) => {
  const orgId = c.get('organizationId');
  
  const campaigns: Campaign[] = []; // Replace with actual DB query
  
  return c.json({ data: campaigns, total: campaigns.length });
});

api.post('/campaigns', requirePermission('campaigns:create'), zValidator('json', campaignSchema), async (c) => {
  const data = c.req.valid('json');
  const orgId = c.get('organizationId');
  const userId = c.get('userId');
  
  const campaign: Campaign = {
    ...data,
    id: crypto.randomUUID(),
    organizationId: orgId,
    createdBy: userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  // Save to DB
  
  return c.json(campaign, 201);
});

api.get('/campaigns/:id', requirePermission('campaigns:read'), async (c) => {
  const id = c.req.param('id');
  const orgId = c.get('organizationId');
  
  const campaign: Campaign | null = null; // Replace with actual DB query
  
  if (!campaign) {
    return c.json({ error: 'Campaign not found' }, 404);
  }
  
  return c.json(campaign);
});

api.patch('/campaigns/:id', requirePermission('campaigns:update'), zValidator('json', campaignSchema.partial()), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const orgId = c.get('organizationId');
  
  const campaign: Campaign | null = null; // Replace with actual DB update
  
  if (!campaign) {
    return c.json({ error: 'Campaign not found' }, 404);
  }
  
  return c.json(campaign);
});

api.post('/campaigns/:id/send', requirePermission('campaigns:update'), async (c) => {
  const id = c.req.param('id');
  const orgId = c.get('organizationId');
  
  // Queue campaign for sending
  
  return c.json({ success: true, message: 'Campaign queued for sending' });
});

// ===== VIDEOS =====

const videoJobSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  template: z.enum(['showcase', 'reel', 'walkaround']),
  vehicleId: z.string().uuid(),
  config: z.record(z.any()).optional(),
  priority: z.number().int().min(1).max(1000).default(100),
});

const videoJobQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  status: z.string().optional(),
  template: z.string().optional(),
});

api.get('/videos/jobs', requirePermission('videos:read'), zValidator('query', videoJobQuerySchema), async (c) => {
  const { page, limit, search, status, template } = c.req.valid('query');
  const orgId = c.get('organizationId');
  
  const jobs: VideoJob[] = []; // Replace with actual DB query
  const total = 0;
  
  const response: PaginatedResponse<VideoJob> = {
    data: jobs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
  
  return c.json(response);
});

api.post('/videos/jobs', requirePermission('videos:create'), zValidator('json', videoJobSchema), async (c) => {
  const data = c.req.valid('json');
  const orgId = c.get('organizationId');
  const userId = c.get('userId');
  
  const job: VideoJob = {
    ...data,
    id: crypto.randomUUID(),
    organizationId: orgId,
    createdBy: userId,
    status: 'PENDING',
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  // Save to DB and queue for processing
  
  return c.json(job, 201);
});

api.get('/videos/jobs/:id', requirePermission('videos:read'), async (c) => {
  const id = c.req.param('id');
  const orgId = c.get('organizationId');
  
  const job: VideoJob | null = null; // Replace with actual DB query
  
  if (!job) {
    return c.json({ error: 'Video job not found' }, 404);
  }
  
  return c.json(job);
});

api.post('/videos/jobs/:id/retry', requirePermission('videos:update'), async (c) => {
  const id = c.req.param('id');
  const orgId = c.get('organizationId');
  
  // Re-queue failed job
  
  return c.json({ success: true, message: 'Job queued for retry' });
});

// ===== ACADEMY =====

const courseSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  shortDescription: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).default('BEGINNER'),
  thumbnailUrl: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  prerequisites: z.array(z.string()).optional(),
  learningObjectives: z.array(z.string()).optional(),
  targetAudience: z.string().optional(),
  estimatedHours: z.number().min(0).default(0),
  price: z.number().min(0).default(0),
  currency: z.string().default('USD'),
  isFeatured: z.boolean().default(false),
  certificateTemplateId: z.string().optional(),
  modules: z.array(z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    order: z.number().int().min(0),
    unlockCondition: z.object({
      type: z.enum(['NONE', 'PREVIOUS_MODULE_COMPLETED', 'MIN_SCORE', 'DATE']),
      minScore: z.number().optional(),
      availableFrom: z.string().datetime().optional(),
    }).default({ type: 'NONE' }),
    lessons: z.array(z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      type: z.enum(['VIDEO', 'TEXT', 'QUIZ', 'ASSIGNMENT', 'LIVE', 'SCORM']),
      content: z.string().optional(),
      order: z.number().int().min(0),
      durationMinutes: z.number().int().min(0).default(0),
      isPreview: z.boolean().default(false),
      resources: z.array(z.string()).optional(),
      quizConfig: z.record(z.any()).optional(),
    })).optional(),
  })).optional(),
});

api.get('/courses', requirePermission('courses:read'), async (c) => {
  const orgId = c.get('organizationId');
  
  const courses: Course[] = []; // Replace with actual DB query
  
  return c.json({ data: courses, total: courses.length });
});

api.post('/courses', requirePermission('courses:create'), zValidator('json', courseSchema), async (c) => {
  const data = c.req.valid('json');
  const orgId = c.get('organizationId');
  const userId = c.get('userId');
  
  const course: Course = {
    ...data,
    id: crypto.randomUUID(),
    organizationId: orgId,
    createdBy: userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  // Save to DB
  
  return c.json(course, 201);
});

api.get('/courses/:id', requirePermission('courses:read'), async (c) => {
  const id = c.req.param('id');
  const orgId = c.get('organizationId');
  
  const course: Course | null = null; // Replace with actual DB query
  
  if (!course) {
    return c.json({ error: 'Course not found' }, 404);
  }
  
  return c.json(course);
});

api.post('/courses/:id/enroll', requirePermission('courses:read'), async (c) => {
  const id = c.req.param('id');
  const orgId = c.get('organizationId');
  const userId = c.get('userId');
  
  const enrollment: Enrollment = {
    id: crypto.randomUUID(),
    courseId: id,
    userId,
    organizationId: orgId,
    status: 'ACTIVE',
    progress: 0,
    enrolledAt: new Date().toISOString(),
  };
  
  // Save to DB
  
  return c.json(enrollment, 201);
});

api.get('/enrollments', requirePermission('courses:read'), async (c) => {
  const orgId = c.get('organizationId');
  const userId = c.get('userId');
  const userRole = c.get('userRole');
  
  // Filter by user if not admin/instructor
  const filterUserId = ['OWNER', 'ADMIN', 'MANAGER', 'INSTRUCTOR'].includes(userRole) ? undefined : userId;
  
  const enrollments: Enrollment[] = []; // Replace with actual DB query
  
  return c.json({ data: enrollments, total: enrollments.length });
});

api.post('/enrollments/:id/progress', requirePermission('courses:read'), async (c) => {
  const id = c.req.param('id');
  const orgId = c.get('organizationId');
  const userId = c.get('userId');
  const body = await c.req.json();
  
  // Update progress, lesson completion
  
  return c.json({ success: true });
});

api.post('/enrollments/:id/certificate', requirePermission('courses:read'), async (c) => {
  const id = c.req.param('id');
  const orgId = c.get('organizationId');
  
  // Generate certificate
  
  return c.json({ success: true, certificateId: crypto.randomUUID() });
});

// ===== RADAR =====

api.get('/radar/sources', requirePermission('radar:read'), async (c) => {
  const orgId = c.get('organizationId');
  
  const sources: any[] = []; // Replace with actual DB query
  
  return c.json(sources);
});

api.post('/radar/sources', requirePermission('radar:update'), async (c) => {
  const orgId = c.get('organizationId');
  const userId = c.get('userId');
  const body = await c.req.json();
  
  const source = {
    ...body,
    id: crypto.randomUUID(),
    organizationId: orgId,
    createdBy: userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  return c.json(source, 201);
});

api.patch('/radar/sources/:id', requirePermission('radar:update'), async (c) => {
  const id = c.req.param('id');
  const orgId = c.get('organizationId');
  const body = await c.req.json();
  
  return c.json({ success: true });
});

api.delete('/radar/sources/:id', requirePermission('radar:update'), async (c) => {
  const id = c.req.param('id');
  const orgId = c.get('organizationId');
  
  return c.json({ success: true });
});

api.get('/radar/rules', requirePermission('radar:read'), async (c) => {
  const orgId = c.get('organizationId');
  
  const rules: any[] = []; // Replace with actual DB query
  
  return c.json(rules);
});

api.post('/radar/rules', requirePermission('radar:update'), async (c) => {
  const orgId = c.get('organizationId');
  const userId = c.get('userId');
  const body = await c.req.json();
  
  const rule = {
    ...body,
    id: crypto.randomUUID(),
    organizationId: orgId,
    createdBy: userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  return c.json(rule, 201);
});

api.post('/radar/run', requirePermission('radar:update'), async (c) => {
  const orgId = c.get('organizationId');
  
  // Trigger radar sync via queue
  
  return c.json({ success: true, message: 'Radar sync queued' });
});

api.get('/radar/opportunities', requirePermission('radar:read'), async (c) => {
  const orgId = c.get('organizationId');
  
  const opportunities: any[] = []; // Replace with actual DB query
  
  return c.json({ data: opportunities, total: opportunities.length });
});

// ===== DASHBOARD STATS =====

api.get('/dashboard/stats', requirePermission('dashboard:read'), async (c) => {
  const orgId = c.get('organizationId');
  
  const stats = {
    vehicles: { total: 0, active: 0, sold: 0, listed: 0 },
    leads: { total: 0, new: 0, qualified: 0, won: 0, lost: 0, pipelineValue: 0 },
    conversations: { total: 0, open: 0, pending: 0, unread: 0 },
    campaigns: { total: 0, active: 0, sent: 0, openRate: 0, clickRate: 0 },
    videos: { total: 0, completed: 0, processing: 0, failed: 0 },
    academy: { courses: 0, students: 0, activeEnrollments: 0, completions: 0 },
    radar: { sources: 0, rules: 0, opportunitiesToday: 0, listingsFound: 0 },
  };
  
  return c.json(stats);
});

export default api;