import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { rateLimiter } from 'hono-rate-limiter';
import { kvStore } from '@hono/kv-store';
import { bindKV } from '@hono/kv-binding';

const app = new Hono<{ Bindings: Env }>();

// Security headers
app.use('*', secureHeaders({
  contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss: https:; frame-ancestors 'none';",
  crossOriginEmbedderPolicy: 'require-corp',
  crossOriginOpenerPolicy: 'same-origin',
  crossOriginResourcePolicy: 'same-origin',
  originAgentCluster: '?1',
  referrerPolicy: 'strict-origin-when-cross-origin',
  xContentTypeOptions: 'nosniff',
  xDnsPrefetchControl: 'off',
  xDownloadOptions: 'noopen',
  xFrameOptions: 'DENY',
  xPermittedCrossDomainPolicies: 'none',
  xXssProtection: '1; mode=block',
}));

// CORS
app.use('*', cors({
  origin: (origin, c) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'https://app.automotive-ai.com',
      'https://staging.automotive-ai.com',
    ];
    if (allowedOrigins.includes(origin)) return origin;
    return allowedOrigins[0];
  },
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Organization-ID'],
  exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400,
  credentials: true,
}));

// Request logging
app.use('*', logger((str, ...args) => {
  console.log(`[${new Date().toISOString()}] ${str}`, ...args);
}));

// Rate limiting (per IP)
app.use('/api/*', rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  limit: 100, // 100 requests per minute
  keyGenerator: (c) => c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown',
  handler: (c) => c.json({ error: 'Too Many Requests', message: 'Rate limit exceeded' }, 429),
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
}));

// Stricter rate limiting for auth endpoints
app.use('/auth/*', rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // 10 requests per 15 minutes
  keyGenerator: (c) => c.req.header('cf-connecting-ip') || 'unknown',
  handler: (c) => c.json({ error: 'Too Many Requests', message: 'Too many auth attempts, try again later' }, 429),
}));

// Health check (no auth, no rate limit)
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: c.env.NODE_ENV,
  });
});

// Metrics endpoint (internal)
app.get('/metrics', async (c) => {
  // In production, use Cloudflare Workers Metrics API
  return c.json({
    requests_total: 0,
    requests_per_second: 0,
    error_rate: 0,
    avg_response_time_ms: 0,
    cpu_usage_percent: 0,
    memory_usage_mb: 0,
  });
});

// API routes (require auth)
app.route('/api', require('./routes/api').default);

// Auth routes
app.route('/auth', require('./routes/auth').default);

// Webhooks
app.route('/webhooks', require('./routes/webhooks').default);

// 404 handler
app.notFound((c) => c.json({ error: 'Not Found' }, 404));

// Error handler
app.onError((err, c) => {
  console.error(`[ERROR] ${err.message}`, err.stack);
  return c.json({ error: 'Internal Server Error' }, 500);
});

export default app;