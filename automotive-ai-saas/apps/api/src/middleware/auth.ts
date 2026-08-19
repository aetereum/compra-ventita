import { createMiddleware } from 'hono/factory';
import { verify } from 'hono/jwt';
import { AuthService } from '@automotive-ai-saas/auth';

export interface Env {
  DB: D1Database;
  R2: R2Bucket;
  KV: KVNamespace;
  EVENT_QUEUE: Queue;
  VIDEO_QUEUE: Queue;
  EMAIL_QUEUE: Queue;
  AI: any;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  WHATSAPP_TOKEN: string;
  WHATSAPP_PHONE_NUMBER_ID: string;
  WHATSAPP_VERIFY_TOKEN: string;
  INSTAGRAM_APP_ID: string;
  INSTAGRAM_APP_SECRET: string;
  OPENAI_API_KEY: string;
  ANTHROPIC_API_KEY: string;
  NODE_ENV: string;
}

// Extend Hono's ContextVariableMap
declare module 'hono' {
  interface ContextVariableMap {
    userId: string;
    organizationId: string;
    userRole: string;
    userPermissions: string[];
    sessionId: string;
  }
}

// Auth middleware
export const authMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  const accessToken = authHeader?.replace('Bearer ', '') || c.req.cookie('access_token');
  
  if (!accessToken) {
    return c.json({ error: 'Unauthorized', message: 'No authentication token provided' }, 401);
  }
  
  try {
    // Verify JWT
    const payload = await verify(accessToken, c.env.JWT_SECRET);
    
    if (!payload || typeof payload !== 'object') {
      return c.json({ error: 'Unauthorized', message: 'Invalid token' }, 401);
    }
    
    // Check token type
    if (payload.type !== 'access') {
      return c.json({ error: 'Unauthorized', message: 'Invalid token type' }, 401);
    }
    
    // Validate session in DB (optional, for revocation check)
    // const authService = new AuthService(c.env);
    // const session = await authService.validateSession(payload.sessionId, c.env.DB);
    // if (!session) {
    //   return c.json({ error: 'Unauthorized', message: 'Session revoked' }, 401);
    // }
    
    // Set context variables
    c.set('userId', payload.userId as string);
    c.set('organizationId', payload.organizationId as string);
    c.set('userRole', payload.role as string);
    c.set('userPermissions', (payload.permissions as string[]) || []);
    c.set('sessionId', payload.sessionId as string);
    
    await next();
  } catch (error: any) {
    if (error.name === 'JwtTokenExpired') {
      return c.json({ error: 'Unauthorized', message: 'Token expired' }, 401);
    }
    if (error.name === 'JwtTokenInvalid') {
      return c.json({ error: 'Unauthorized', message: 'Invalid token' }, 401);
    }
    console.error('Auth middleware error:', error);
    return c.json({ error: 'Unauthorized', message: 'Authentication failed' }, 401);
  }
});

// Optional auth middleware (doesn't fail if no token)
export const optionalAuthMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  const accessToken = authHeader?.replace('Bearer ', '') || c.req.cookie('access_token');
  
  if (!accessToken) {
    await next();
    return;
  }
  
  try {
    const payload = await verify(accessToken, c.env.JWT_SECRET);
    
    if (payload && typeof payload === 'object' && payload.type === 'access') {
      c.set('userId', payload.userId as string);
      c.set('organizationId', payload.organizationId as string);
      c.set('userRole', payload.role as string);
      c.set('userPermissions', (payload.permissions as string[]) || []);
      c.set('sessionId', payload.sessionId as string);
    }
  } catch {
    // Ignore invalid tokens in optional auth
  }
  
  await next();
});

// Permission-based middleware
export const requirePermission = (permission: string) => {
  return createMiddleware<{ Bindings: Env }>(async (c, next) => {
    const permissions = c.get('userPermissions');
    const role = c.get('userRole');
    
    // Owner and Admin have all permissions
    if (['OWNER', 'ADMIN'].includes(role)) {
      await next();
      return;
    }
    
    // Check specific permission
    if (!permissions.includes(permission)) {
      return c.json({ 
        error: 'Forbidden', 
        message: `Requires permission: ${permission}` 
      }, 403);
    }
    
    await next();
  });
};

// Role-based middleware
export const requireRole = (...roles: string[]) => {
  return createMiddleware<{ Bindings: Env }>(async (c, next) => {
    const userRole = c.get('userRole');
    
    if (!roles.includes(userRole)) {
      return c.json({ 
        error: 'Forbidden', 
        message: `Requires one of roles: ${roles.join(', ')}` 
      }, 403);
    }
    
    await next();
  });
};

// Organization membership middleware
export const requireOrganizationAccess = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const organizationId = c.get('organizationId');
  const requestedOrgId = c.req.param('organizationId') || c.req.query('organizationId');
  
  if (requestedOrgId && requestedOrgId !== organizationId) {
    return c.json({ 
      error: 'Forbidden', 
      message: 'Access denied to this organization' 
    }, 403);
  }
  
  await next();
});

// Rate limiting key generator (per organization)
export const orgRateLimitKey = (c: any) => {
  const orgId = c.get('organizationId');
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
  return `ratelimit:${orgId}:${ip}`;
};