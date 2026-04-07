'use client';

import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authClient } from '@/lib/auth/client';
import { invalidateOrganizationSwitchQueries } from '@/lib/query/invalidation';
import { type AuthOrganization, useAuth } from './AuthContext';

interface OrgContextValue {
  organizationId: string | null;
  setOrganizationId: (id: string) => Promise<boolean>;
  isSwitchingOrganization: boolean;
  currentOrg: AuthOrganization | null;
}

const OrgContext = createContext<OrgContextValue>({
  organizationId: null,
  setOrganizationId: async () => false,
  isSwitchingOrganization: false,
  currentOrg: null,
});

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { organizations, activeOrganizationId } = useAuth();
  const queryClient = useQueryClient();
  const [organizationId, setOrganizationIdState] = useState<string | null>(null);
  const [isSwitchingOrganization, setIsSwitchingOrganization] = useState(false);

  // Session active organization is the source of truth.
  useEffect(() => {
    if (organizations.length === 0) {
      setOrganizationIdState(null);
      return;
    }

    if (activeOrganizationId && organizations.some((org) => org.id === activeOrganizationId)) {
      setOrganizationIdState(activeOrganizationId);
      return;
    }

    setOrganizationIdState(null);
  }, [organizations, activeOrganizationId]);

  const setOrganizationId = useCallback(
    async (id: string): Promise<boolean> => {
      if (!organizations.some((org) => org.id === id)) {
        return false;
      }

      if (id === activeOrganizationId) {
        return true;
      }

      const prev = organizationId;
      setIsSwitchingOrganization(true);
      try {
        const result = await authClient.organization.setActive({ organizationId: id });

        if (result.error) {
          return false;
        }

        setOrganizationIdState(id);
        await invalidateOrganizationSwitchQueries(queryClient, prev, id);
        return true;
      } catch {
        return false;
      } finally {
        setIsSwitchingOrganization(false);
      }
    },
    [activeOrganizationId, organizationId, organizations, queryClient],
  );

  const currentOrg = useMemo(
    () => organizations.find((o) => o.id === organizationId) ?? null,
    [organizations, organizationId],
  );

  const value = useMemo(
    () => ({ organizationId, setOrganizationId, isSwitchingOrganization, currentOrg }),
    [organizationId, setOrganizationId, isSwitchingOrganization, currentOrg],
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrganization() {
  return useContext(OrgContext);
}
