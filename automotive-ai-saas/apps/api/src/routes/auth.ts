import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createAuthService, AuthService } from '@automotive-ai-saas/auth';
import { setCookie, deleteCookie } from 'hono/cookie';

const auth = new Hono<{ Bindings: Env }>();

// Initialize auth service
const getAuthService = (c: any): AuthService => {
  return createAuthService({
    db: c.env.DB,
    jwtSecret: c.env.JWT_SECRET,
    jwtRefreshSecret: c.env.JWT_REFRESH_SECRET,
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
  });
};

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  remember: z.boolean().default(false),
});

const registerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  organizationName: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

const verifyEmailSchema = z.object({
  token: z.string(),
});

// POST /auth/login
auth.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password, remember } = c.req.valid('json');
  const authService = getAuthService(c);
  
  try {
    const result = await authService.login(email, password, c.env.DB);
    
    // Set cookies
    const cookieOptions: any = {
      httpOnly: true,
      secure: c.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    };
    
    if (remember) {
      cookieOptions.maxAge = 60 * 60 * 24 * 30; // 30 days
    }
    
    setCookie(c, 'access_token', result.accessToken, cookieOptions);
    setCookie(c, 'refresh_token', result.refreshToken, {
      ...cookieOptions,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    
    return c.json({
      user: result.user,
      organization: result.organization,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// POST /auth/register
auth.post('/register', zValidator('json', registerSchema), async (c) => {
  const { firstName, lastName, email, password, organizationName } = c.req.valid('json');
  const authService = getAuthService(c);
  
  try {
    const result = await authService.register({
      firstName,
      lastName,
      email,
      password,
      organizationName,
    }, c.env.DB);
    
    // Set cookies
    const cookieOptions = {
      httpOnly: true,
      secure: c.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    };
    
    setCookie(c, 'access_token', result.accessToken, cookieOptions);
    setCookie(c, 'refresh_token', result.refreshToken, cookieOptions);
    
    return c.json({
      user: result.user,
      organization: result.organization,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// POST /auth/refresh
auth.post('/refresh', zValidator('json', refreshSchema), async (c) => {
  const { refreshToken } = c.req.valid('json');
  const authService = getAuthService(c);
  
  try {
    const result = await authService.refresh(refreshToken, c.env.DB);
    
    const cookieOptions = {
      httpOnly: true,
      secure: c.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    };
    
    setCookie(c, 'access_token', result.accessToken, cookieOptions);
    setCookie(c, 'refresh_token', result.refreshToken, cookieOptions);
    
    return c.json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// POST /auth/logout
auth.post('/logout', async (c) => {
  const refreshToken = c.req.header('Authorization')?.replace('Bearer ', '') || 
                       c.req.cookie('refresh_token');
  
  if (refreshToken) {
    const authService = getAuthService(c);
    await authService.logout(refreshToken, c.env.DB);
  }
  
  deleteCookie(c, 'access_token', { path: '/' });
  deleteCookie(c, 'refresh_token', { path: '/' });
  
  return c.json({ success: true });
});

// POST /auth/forgot-password
auth.post('/forgot-password', zValidator('json', forgotPasswordSchema), async (c) => {
  const { email } = c.req.valid('json');
  const authService = getAuthService(c);
  
  try {
    await authService.requestPasswordReset(email, c.env.DB);
    return c.json({ success: true, message: 'If the email exists, a reset link has been sent' });
  } catch (error: any) {
    // Don't reveal if email exists
    return c.json({ success: true, message: 'If the email exists, a reset link has been sent' });
  }
});

// POST /auth/reset-password
auth.post('/reset-password', zValidator('json', resetPasswordSchema), async (c) => {
  const { token, password } = c.req.valid('json');
  const authService = getAuthService(c);
  
  try {
    await authService.resetPassword(token, password, c.env.DB);
    return c.json({ success: true, message: 'Password has been reset' });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// POST /auth/verify-email
auth.post('/verify-email', zValidator('json', verifyEmailSchema), async (c) => {
  const { token } = c.req.valid('json');
  const authService = getAuthService(c);
  
  try {
    await authService.verifyEmail(token, c.env.DB);
    return c.json({ success: true, message: 'Email verified successfully' });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// GET /auth/me
auth.get('/me', async (c) => {
  const authHeader = c.req.header('Authorization');
  const accessToken = authHeader?.replace('Bearer ', '') || c.req.cookie('access_token');
  
  if (!accessToken) {
    return c.json({ error: 'Not authenticated' }, 401);
  }
  
  const authService = getAuthService(c);
  
  try {
    const result = await authService.validateAccessToken(accessToken, c.env.DB);
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// POST /auth/change-password
auth.post('/change-password', async (c) => {
  const authHeader = c.req.header('Authorization');
  const accessToken = authHeader?.replace('Bearer ', '') || c.req.cookie('access_token');
  
  if (!accessToken) {
    return c.json({ error: 'Not authenticated' }, 401);
  }
  
  const authService = getAuthService(c);
  const body = await c.req.json();
  const { currentPassword, newPassword } = body;
  
  try {
    const user = await authService.validateAccessToken(accessToken, c.env.DB);
    await authService.changePassword(user.user.id, currentPassword, newPassword, c.env.DB);
    return c.json({ success: true, message: 'Password changed successfully' });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

export default auth;