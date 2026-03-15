'use client';

import {
  type PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { createApiClient } from './api-client';
import type { ApiResponse, MeResponse } from './types';

type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

export type AuthContextValue = {
  authState: AuthState;
  user: MeResponse['user'] | null;
  organizations: MeResponse['organizations'];
  activeOrganizationId: string | null;
  role: 'admin' | 'owner' | 'member' | null;
  refresh: () => Promise<void>;
  setActiveOrganizationId: (organizationId: string | null) => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

const FALLBACK_API_URL = 'http://localhost:8787/api';

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [user, setUser] = useState<MeResponse['user'] | null>(null);
  const [organizations, setOrganizations] = useState<MeResponse['organizations']>([]);
  const [activeOrganizationId, setActiveOrganizationIdState] = useState<string | null>(null);

  const setActiveOrganizationId = useCallback((organizationId: string | null) => {
    setActiveOrganizationIdState(organizationId);
  }, []);

  const apiClient = useMemo(() => {
    return createApiClient({
      baseUrl: process.env.NEXT_PUBLIC_API_URL ?? FALLBACK_API_URL,
      getOrganizationId: () => activeOrganizationId,
    });
  }, [activeOrganizationId]);

  const refresh = useCallback(async () => {
    try {
      const response = await apiClient.get<ApiResponse<MeResponse>>('/me');
      setUser(response.data.user);
      setOrganizations(response.data.organizations);
      setActiveOrganizationIdState(response.data.activeOrganizationId);
      setAuthState('authenticated');
    } catch {
      setUser(null);
      setOrganizations([]);
      setActiveOrganizationIdState(null);
      setAuthState('unauthenticated');
    }
  }, [apiClient]);

  const role: 'admin' | 'owner' | 'member' | null = useMemo(() => {
    if (!user) {
      return null;
    }
    if (user.isAdmin) {
      return 'admin';
    }
    const activeMembership = organizations.find((org) => org.id === activeOrganizationId);
    return activeMembership?.role ?? 'member';
  }, [activeOrganizationId, organizations, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      authState,
      user,
      organizations,
      activeOrganizationId,
      role,
      refresh,
      setActiveOrganizationId,
    }),
    [activeOrganizationId, authState, organizations, refresh, role, setActiveOrganizationId, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
};
