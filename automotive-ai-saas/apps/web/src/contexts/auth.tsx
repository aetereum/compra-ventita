'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { User, Organization, OrganizationMember } from '@automotive/types';

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  membership: OrganizationMember | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  organizationName: string;
  organizationSlug: string;
  plan?: 'FREE' | 'STARTER' | 'PRO' | 'DEALER' | 'ENTERPRISE';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [membership, setMembership] = useState<OrganizationMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUser(data.data.user);
          setOrganization(data.data.organization);
          setMembership(data.data.membership);
        } else {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      } else {
        await refreshToken();
      }
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshToken = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return;

    try {
      const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          localStorage.setItem('accessToken', data.data.accessToken);
          await checkAuth();
        }
      } else {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  };

  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error?.message || 'Error al iniciar sesión');
    }

    localStorage.setItem('accessToken', data.data.tokens.accessToken);
    localStorage.setItem('refreshToken', data.data.tokens.refreshToken);
    
    setUser(data.data.user);
    setOrganization(data.data.organization);
    // membership would be in the response
  };

  const register = async (data: RegisterData) => {
    const response = await fetch(`${API_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error?.message || 'Error al registrarse');
    }

    localStorage.setItem('accessToken', result.data.tokens.accessToken);
    localStorage.setItem('refreshToken', result.data.tokens.refreshToken);
    
    setUser(result.data.user);
    setOrganization(result.data.organization);
  };

  const logout = async () => {
    const token = localStorage.getItem('accessToken');
    
    if (token) {
      try {
        await fetch(`${API_URL}/api/v1/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {}
    }

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    setOrganization(null);
    setMembership(null);
    router.push('/login');
  };

  const hasPermission = (permission: string) => {
    if (!membership) return false;
    if (membership.permissions.includes('*')) return true;
    return membership.permissions.includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        membership,
        isLoading,
        login,
        register,
        logout,
        refreshToken,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}