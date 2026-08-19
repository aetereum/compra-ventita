import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { D1Database } from '@cloudflare/workers-types';
import { createDB, schema } from '@automotive/database';
import type { 
  UUID, 
  ISODateString, 
  User, 
  Organization, 
  OrganizationMember, 
  OrganizationRole,
  PlanType,
  PlanLimits,
  PLAN_LIMITS,
  ApiResponse,
  PaginationParams,
  ListParams
} from '@automotive/types';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'super-secret-change-in-production');
const JWT_ISSUER = 'automotive-ai-saas';
const JWT_AUDIENCE = 'automotive-ai-saas-client';
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';
const SESSION_TTL_DAYS = 30;

export interface JWTPayload {
  sub: UUID;
  email: string;
  organizationId: UUID;
  role: OrganizationRole;
  permissions: string[];
  type: 'access' | 'refresh';
  sessionId: UUID;
}

export interface SessionData {
  id: UUID;
  userId: UUID;
  organizationId: UUID;
  token: string;
  refreshToken: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: ISODateString;
  createdAt: ISODateString;
}

export interface AuthContext {
  user: User;
  organization: Organization;
  membership: OrganizationMember;
  permissions: string[];
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  twoFactorCode: z.string().length(6).optional(),
  rememberMe: z.boolean().optional(),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).max(100),
  organizationName: z.string().min(2).max(100),
  organizationSlug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  plan: z.enum(['FREE', 'STARTER', 'PRO', 'DEALER', 'ENTERPRISE']).optional(),
});

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['OWNER', 'ADMIN', 'MANAGER', 'SALES', 'MARKETING', 'BUYER', 'INSTRUCTOR', 'STUDENT']),
  permissions: z.array(z.string()).optional(),
});

const updateMemberSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'MANAGER', 'SALES', 'MARKETING', 'BUYER', 'INSTRUCTOR', 'STUDENT']).optional(),
  permissions: z.array(z.string()).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

const requestPasswordResetSchema = z.object({
  email: z.string().email(),
});

export class AuthService {
  private db: ReturnType<typeof createDB>;

  constructor(d1: D1Database) {
    this.db = createDB(d1);
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async generateTokens(payload: Omit<JWTPayload, 'type'>): Promise<{ accessToken: string; refreshToken: string }> {
    const [accessToken, refreshToken] = await Promise.all([
      new SignJWT({ ...payload, type: 'access' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setIssuer(JWT_ISSUER)
        .setAudience(JWT_AUDIENCE)
        .setExpirationTime(ACCESS_TOKEN_TTL)
        .sign(JWT_SECRET),
      new SignJWT({ ...payload, type: 'refresh' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setIssuer(JWT_ISSUER)
        .setAudience(JWT_AUDIENCE)
        .setExpirationTime(REFRESH_TOKEN_TTL)
        .sign(JWT_SECRET),
    ]);
    return { accessToken, refreshToken };
  }

  async verifyToken(token: string, type: 'access' | 'refresh' = 'access'): Promise<JWTPayload | null> {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET, {
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      });
      if (payload.type !== type) return null;
      return payload as unknown as JWTPayload;
    } catch {
      return null;
    }
  }

  async createSession(
    userId: UUID,
    organizationId: UUID,
    ipAddress?: string,
    userAgent?: string
  ): Promise<SessionData> {
    const sessionId = crypto.randomUUID() as UUID;
    const token = crypto.randomUUID() as UUID;
    const refreshToken = crypto.randomUUID() as UUID;
    const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString() as ISODateString;

    await this.db.insert(schema.sessions).values({
      id: sessionId,
      userId,
      organizationId,
      token,
      ipAddress,
      userAgent,
      expiresAt,
    });

    return {
      id: sessionId,
      userId,
      organizationId,
      token,
      refreshToken,
      ipAddress,
      userAgent,
      expiresAt,
      createdAt: new Date().toISOString() as ISODateString,
    };
  }

  async validateSession(token: string): Promise<SessionData | null> {
    const session = await this.db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.token, token))
      .get();

    if (!session) return null;
    if (new Date(session.expiresAt) < new Date()) {
      await this.deleteSession(token);
      return null;
    }
    return session as unknown as SessionData;
  }

  async deleteSession(token: string): Promise<void> {
    await this.db.delete(schema.sessions).where(eq(schema.sessions.token, token));
  }

  async deleteUserSessions(userId: UUID, organizationId?: UUID): Promise<void> {
    const conditions = [eq(schema.sessions.userId, userId)];
    if (organizationId) {
      conditions.push(eq(schema.sessions.organizationId, organizationId));
    }
    await this.db.delete(schema.sessions).where(and(...conditions));
  }

  async login(data: z.infer<typeof loginSchema>, ipAddress?: string, userAgent?: string): Promise<ApiResponse<{ user: User; organization: Organization; tokens: { accessToken: string; refreshToken: string } }>> {
    const parsed = loginSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos', details: parsed.error.flatten(), statusCode: 400 } };
    }

    const { email, password, twoFactorCode } = parsed.data;

    const user = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .get();

    if (!user || !user.passwordHash) {
      return { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Credenciales inválidas', statusCode: 401 } };
    }

    if (user.status !== 'ACTIVE') {
      return { success: false, error: { code: 'ACCOUNT_DISABLED', message: 'Cuenta deshabilitada', statusCode: 403 } };
    }

    const validPassword = await this.verifyPassword(password, user.passwordHash);
    if (!validPassword) {
      return { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Credenciales inválidas', statusCode: 401 } };
    }

    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        return { success: false, error: { code: '2FA_REQUIRED', message: 'Se requiere código 2FA', statusCode: 400 } };
      }
      // TODO: Verify 2FA code
    }

    // Get user's organizations
    const memberships = await this.db
      .select()
      .from(schema.organizationMembers)
      .where(eq(schema.organizationMembers.userId, user.id))
      .all();

    if (memberships.length === 0) {
      return { success: false, error: { code: 'NO_ORGANIZATION', message: 'Usuario sin organización', statusCode: 403 } };
    }

    // For now, use first organization (in real app, user would select)
    const membership = memberships[0];
    const organization = await this.db
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.id, membership.organizationId))
      .get();

    if (!organization) {
      return { success: false, error: { code: 'ORG_NOT_FOUND', message: 'Organización no encontrada', statusCode: 404 } };
    }

    // Update last login
    await this.db
      .update(schema.users)
      .set({ lastLoginAt: new Date().toISOString() as ISODateString })
      .where(eq(schema.users.id, user.id));

    const session = await this.createSession(user.id, organization.id, ipAddress, userAgent);
    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      organizationId: organization.id,
      role: membership.role,
      permissions: membership.permissions,
      sessionId: session.id,
    });

    return {
      success: true,
      data: {
        user: user as unknown as User,
        organization: organization as unknown as Organization,
        tokens: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken },
      },
    };
  }

  async register(data: z.infer<typeof registerSchema>): Promise<ApiResponse<{ user: User; organization: Organization; tokens: { accessToken: string; refreshToken: string } }>> {
    const parsed = registerSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos', details: parsed.error.flatten(), statusCode: 400 } };
    }

    const { email, password, name, organizationName, organizationSlug, plan = 'FREE' } = parsed.data;

    // Check if email exists
    const existingUser = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .get();

    if (existingUser) {
      return { success: false, error: { code: 'EMAIL_EXISTS', message: 'El email ya está registrado', statusCode: 409 } };
    }

    // Check if slug exists
    const existingOrg = await this.db
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.slug, organizationSlug))
      .get();

    if (existingOrg) {
      return { success: false, error: { code: 'SLUG_EXISTS', message: 'El slug ya está en uso', statusCode: 409 } };
    }

    const userId = crypto.randomUUID() as UUID;
    const orgId = crypto.randomUUID() as UUID;
    const passwordHash = await this.hashPassword(password);

    const now = new Date().toISOString() as ISODateString;

    await this.db.batch([
      this.db.insert(schema.users).values({
        id: userId,
        email,
        name,
        passwordHash,
        emailVerified: true,
        status: 'ACTIVE',
        metadata: {},
        createdAt: now,
        updatedAt: now,
      }),
      this.db.insert(schema.organizations).values({
        id: orgId,
        name: organizationName,
        slug: organizationSlug,
        settings: {
          timezone: 'America/Santiago',
          currency: 'CLP',
          language: 'es',
          features: {
            radar: true,
            aiChat: true,
            videoGeneration: plan !== 'FREE',
            academy: plan !== 'FREE',
            marketingAutomation: plan !== 'FREE',
            whatsapp: true,
            instagram: true,
            multiLocation: false,
          },
          integrations: {},
        },
        plan,
        planLimits: PLAN_LIMITS[plan],
        createdAt: now,
        updatedAt: now,
      }),
      this.db.insert(schema.organizationMembers).values({
        userId,
        organizationId: orgId,
        role: 'OWNER',
        permissions: ['*'],
        joinedAt: now,
      }),
    ]);

    const user = await this.db.select().from(schema.users).where(eq(schema.users.id, userId)).get();
    const organization = await this.db.select().from(schema.organizations).where(eq(schema.organizations.id, orgId)).get();
    const membership = await this.db.select().from(schema.organizationMembers).where(and(eq(schema.organizationMembers.userId, userId), eq(schema.organizationMembers.organizationId, orgId))).get();

    const session = await this.createSession(userId, orgId);
    const tokens = await this.generateTokens({
      sub: userId,
      email,
      organizationId: orgId,
      role: 'OWNER',
      permissions: ['*'],
      sessionId: session.id,
    });

    return {
      success: true,
      data: {
        user: user as unknown as User,
        organization: organization as unknown as Organization,
        tokens: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken },
      },
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<ApiResponse<{ accessToken: string }>> {
    const payload = await this.verifyToken(refreshToken, 'refresh');
    if (!payload) {
      return { success: false, error: { code: 'INVALID_TOKEN', message: 'Token de refresco inválido', statusCode: 401 } };
    }

    const session = await this.validateSession(payload.sessionId);
    if (!session) {
      return { success: false, error: { code: 'SESSION_EXPIRED', message: 'Sesión expirada', statusCode: 401 } };
    }

    const tokens = await this.generateTokens({
      sub: payload.sub,
      email: payload.email,
      organizationId: payload.organizationId,
      role: payload.role,
      permissions: payload.permissions,
      sessionId: payload.sessionId,
    });

    return { success: true, data: { accessToken: tokens.accessToken } };
  }

  async logout(token: string): Promise<ApiResponse<void>> {
    await this.deleteSession(token);
    return { success: true };
  }

  async getAuthContext(accessToken: string): Promise<AuthContext | null> {
    const payload = await this.verifyToken(accessToken);
    if (!payload) return null;

    const session = await this.validateSession(payload.sessionId);
    if (!session) return null;

    const [user, organization, membership] = await Promise.all([
      this.db.select().from(schema.users).where(eq(schema.users.id, payload.sub)).get(),
      this.db.select().from(schema.organizations).where(eq(schema.organizations.id, payload.organizationId)).get(),
      this.db.select().from(schema.organizationMembers).where(and(eq(schema.organizationMembers.userId, payload.sub), eq(schema.organizationMembers.organizationId, payload.organizationId))).get(),
    ]);

    if (!user || !organization || !membership) return null;
    if (user.status !== 'ACTIVE') return null;

    return {
      user: user as unknown as User,
      organization: organization as unknown as Organization,
      membership: membership as unknown as OrganizationMember,
      permissions: membership.permissions,
    };
  }

  async inviteMember(organizationId: UUID, inviterId: UUID, data: z.infer<typeof inviteMemberSchema>): Promise<ApiResponse<OrganizationMember>> {
    const parsed = inviteMemberSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos', details: parsed.error.flatten(), statusCode: 400 } };
    }

    // Check inviter permissions
    const inviterMembership = await this.db
      .select()
      .from(schema.organizationMembers)
      .where(and(eq(schema.organizationMembers.userId, inviterId), eq(schema.organizationMembers.organizationId, organizationId)))
      .get();

    if (!inviterMembership || !['OWNER', 'ADMIN'].includes(inviterMembership.role)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Sin permisos para invitar', statusCode: 403 } };
    }

    const { email, role, permissions = [] } = parsed.data;

    // Check if user exists
    let user = await this.db.select().from(schema.users).where(eq(schema.users.email, email)).get();

    if (!user) {
      // Create pending user
      const userId = crypto.randomUUID() as UUID;
      await this.db.insert(schema.users).values({
        id: userId,
        email,
        name: email.split('@')[0],
        status: 'PENDING',
        emailVerified: false,
        metadata: {},
        createdAt: new Date().toISOString() as ISODateString,
        updatedAt: new Date().toISOString() as ISODateString,
      });
      user = await this.db.select().from(schema.users).where(eq(schema.users.id, userId)).get();
    }

    // Check if already member
    const existingMember = await this.db
      .select()
      .from(schema.organizationMembers)
      .where(and(eq(schema.organizationMembers.userId, user!.id), eq(schema.organizationMembers.organizationId, organizationId)))
      .get();

    if (existingMember) {
      return { success: false, error: { code: 'ALREADY_MEMBER', message: 'El usuario ya es miembro', statusCode: 409 } };
    }

    const now = new Date().toISOString() as ISODateString;
    await this.db.insert(schema.organizationMembers).values({
      userId: user!.id,
      organizationId,
      role,
      permissions,
      joinedAt: now,
      invitedBy: inviterId,
    });

    const membership = await this.db
      .select()
      .from(schema.organizationMembers)
      .where(and(eq(schema.organizationMembers.userId, user!.id), eq(schema.organizationMembers.organizationId, organizationId)))
      .get();

    // TODO: Send invitation email

    return { success: true, data: membership as unknown as OrganizationMember };
  }

  async updateMember(organizationId: UUID, updaterId: UUID, targetUserId: UUID, data: z.infer<typeof updateMemberSchema>): Promise<ApiResponse<OrganizationMember>> {
    const parsed = updateMemberSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos', details: parsed.error.flatten(), statusCode: 400 } };
    }

    // Check updater permissions
    const updaterMembership = await this.db
      .select()
      .from(schema.organizationMembers)
      .where(and(eq(schema.organizationMembers.userId, updaterId), eq(schema.organizationMembers.organizationId, organizationId)))
      .get();

    if (!updaterMembership || !['OWNER', 'ADMIN'].includes(updaterMembership.role)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Sin permisos', statusCode: 403 } };
    }

    // Cannot modify owner
    const targetMembership = await this.db
      .select()
      .from(schema.organizationMembers)
      .where(and(eq(schema.organizationMembers.userId, targetUserId), eq(schema.organizationMembers.organizationId, organizationId)))
      .get();

    if (!targetMembership) {
      return { success: false, error: { code: 'MEMBER_NOT_FOUND', message: 'Miembro no encontrado', statusCode: 404 } };
    }

    if (targetMembership.role === 'OWNER' && targetUserId !== updaterId) {
      return { success: false, error: { code: 'CANNOT_MODIFY_OWNER', message: 'No se puede modificar al propietario', statusCode: 403 } };
    }

    const updates: Partial<typeof schema.organizationMembers.$inferInsert> = {};
    if (parsed.data.role) updates.role = parsed.data.role;
    if (parsed.data.permissions) updates.permissions = parsed.data.permissions;
    updates.updatedAt = new Date().toISOString() as ISODateString;

    await this.db
      .update(schema.organizationMembers)
      .set(updates)
      .where(and(eq(schema.organizationMembers.userId, targetUserId), eq(schema.organizationMembers.organizationId, organizationId)));

    const updated = await this.db
      .select()
      .from(schema.organizationMembers)
      .where(and(eq(schema.organizationMembers.userId, targetUserId), eq(schema.organizationMembers.organizationId, organizationId)))
      .get();

    return { success: true, data: updated as unknown as OrganizationMember };
  }

  async removeMember(organizationId: UUID, removerId: UUID, targetUserId: UUID): Promise<ApiResponse<void>> {
    const removerMembership = await this.db
      .select()
      .from(schema.organizationMembers)
      .where(and(eq(schema.organizationMembers.userId, removerId), eq(schema.organizationMembers.organizationId, organizationId)))
      .get();

    if (!removerMembership || !['OWNER', 'ADMIN'].includes(removerMembership.role)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Sin permisos', statusCode: 403 } };
    }

    const targetMembership = await this.db
      .select()
      .from(schema.organizationMembers)
      .where(and(eq(schema.organizationMembers.userId, targetUserId), eq(schema.organizationMembers.organizationId, organizationId)))
      .get();

    if (!targetMembership) {
      return { success: false, error: { code: 'MEMBER_NOT_FOUND', message: 'Miembro no encontrado', statusCode: 404 } };
    }

    if (targetMembership.role === 'OWNER' && targetUserId !== removerId) {
      return { success: false, error: { code: 'CANNOT_REMOVE_OWNER', message: 'No se puede remover al propietario', statusCode: 403 } };
    }

    await this.db
      .delete(schema.organizationMembers)
      .where(and(eq(schema.organizationMembers.userId, targetUserId), eq(schema.organizationMembers.organizationId, organizationId)));

    await this.deleteUserSessions(targetUserId, organizationId);

    return { success: true };
  }

  async changePassword(userId: UUID, data: z.infer<typeof changePasswordSchema>): Promise<ApiResponse<void>> {
    const parsed = changePasswordSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos', details: parsed.error.flatten(), statusCode: 400 } };
    }

    const user = await this.db.select().from(schema.users).where(eq(schema.users.id, userId)).get();
    if (!user || !user.passwordHash) {
      return { success: false, error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado', statusCode: 404 } };
    }

    const validPassword = await this.verifyPassword(parsed.data.currentPassword, user.passwordHash);
    if (!validPassword) {
      return { success: false, error: { code: 'INVALID_PASSWORD', message: 'Contraseña actual incorrecta', statusCode: 401 } };
    }

    const newHash = await this.hashPassword(parsed.data.newPassword);
    await this.db
      .update(schema.users)
      .set({ passwordHash: newHash, updatedAt: new Date().toISOString() as ISODateString })
      .where(eq(schema.users.id, userId));

    // Invalidate all sessions
    await this.deleteUserSessions(userId);

    return { success: true };
  }

  async requestPasswordReset(data: z.infer<typeof requestPasswordResetSchema>): Promise<ApiResponse<void>> {
    const parsed = requestPasswordResetSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos', details: parsed.error.flatten(), statusCode: 400 } };
    }

    const user = await this.db.select().from(schema.users).where(eq(schema.users.email, parsed.data.email)).get();
    // Always return success to prevent email enumeration
    if (!user) return { success: true };

    const token = crypto.randomUUID() as UUID;
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString() as ISODateString; // 1 hour

    await this.db
      .update(schema.users)
      .set({ passwordResetToken: token, passwordResetExpires: expires, updatedAt: new Date().toISOString() as ISODateString })
      .where(eq(schema.users.id, user.id));

    // TODO: Send reset email with token

    return { success: true };
  }

  async resetPassword(data: z.infer<typeof resetPasswordSchema>): Promise<ApiResponse<void>> {
    const parsed = resetPasswordSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos', details: parsed.error.flatten(), statusCode: 400 } };
    }

    const user = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.passwordResetToken, parsed.data.token))
      .get();

    if (!user || !user.passwordResetExpires || new Date(user.passwordResetExpires) < new Date()) {
      return { success: false, error: { code: 'INVALID_TOKEN', message: 'Token inválido o expirado', statusCode: 400 } };
    }

    const newHash = await this.hashPassword(parsed.data.password);
    await this.db
      .update(schema.users)
      .set({ 
        passwordHash: newHash, 
        passwordResetToken: null, 
        passwordResetExpires: null,
        updatedAt: new Date().toISOString() as ISODateString 
      })
      .where(eq(schema.users.id, user.id));

    await this.deleteUserSessions(user.id);

    return { success: true };
  }

  async verifyEmail(token: string): Promise<ApiResponse<void>> {
    const user = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.emailVerificationToken, token))
      .get();

    if (!user) {
      return { success: false, error: { code: 'INVALID_TOKEN', message: 'Token inválido', statusCode: 400 } };
    }

    await this.db
      .update(schema.users)
      .set({ emailVerified: true, emailVerificationToken: null, updatedAt: new Date().toISOString() as ISODateString })
      .where(eq(schema.users.id, user.id));

    return { success: true };
  }

  async getUserOrganizations(userId: UUID): Promise<ApiResponse<Array<{ organization: Organization; role: OrganizationRole; permissions: string[] }>>> {
    const memberships = await this.db
      .select()
      .from(schema.organizationMembers)
      .where(eq(schema.organizationMembers.userId, userId))
      .all();

    const results = await Promise.all(
      memberships.map(async (m) => {
        const org = await this.db.select().from(schema.organizations).where(eq(schema.organizations.id, m.organizationId)).get();
        return { organization: org as unknown as Organization, role: m.role, permissions: m.permissions };
      })
    );

    return { success: true, data: results.filter(r => r.organization) as any };
  }

  async checkPermission(context: AuthContext, permission: string): Promise<boolean> {
    if (context.permissions.includes('*')) return true;
    if (context.permissions.includes(permission)) return true;
    // Check role-based permissions
    const rolePermissions = ROLE_PERMISSIONS[context.membership.role] || [];
    return rolePermissions.includes(permission);
  }

  async requirePermission(context: AuthContext | null, permission: string): Promise<AuthContext> {
    if (!context) {
      throw new Error('UNAUTHORIZED');
    }
    const hasPermission = await this.checkPermission(context, permission);
    if (!hasPermission) {
      throw new Error('FORBIDDEN');
    }
    return context;
  }
}

const ROLE_PERMISSIONS: Record<OrganizationRole, string[]> = {
  OWNER: ['*'],
  ADMIN: [
    'organization:read',
    'organization:write',
    'organization:delete',
    'users:read',
    'users:write',
    'users:delete',
    'vehicles:read',
    'vehicles:write',
    'vehicles:delete',
    'leads:read',
    'leads:write',
    'leads:delete',
    'conversations:read',
    'conversations:write',
    'campaigns:read',
    'campaigns:write',
    'campaigns:delete',
    'videos:read',
    'videos:write',
    'videos:delete',
    'courses:read',
    'courses:write',
    'courses:delete',
    'analytics:read',
    'settings:read',
    'settings:write',
    'billing:read',
    'billing:write',
  ],
  MANAGER: [
    'organization:read',
    'users:read',
    'vehicles:read',
    'vehicles:write',
    'leads:read',
    'leads:write',
    'conversations:read',
    'conversations:write',
    'campaigns:read',
    'campaigns:write',
    'videos:read',
    'videos:write',
    'courses:read',
    'analytics:read',
    'settings:read',
  ],
  SALES: [
    'vehicles:read',
    'leads:read',
    'leads:write',
    'conversations:read',
    'conversations:write',
    'campaigns:read',
  ],
  MARKETING: [
    'vehicles:read',
    'leads:read',
    'campaigns:read',
    'campaigns:write',
    'videos:read',
    'videos:write',
    'analytics:read',
  ],
  BUYER: [
    'vehicles:read',
    'leads:read',
    'conversations:read',
    'conversations:write',
  ],
  INSTRUCTOR: [
    'courses:read',
    'courses:write',
    'analytics:read',
  ],
  STUDENT: [
    'courses:read',
  ],
};

import { eq, and } from 'drizzle-orm';

export function createAuthService(d1: D1Database): AuthService {
  return new AuthService(d1);
}