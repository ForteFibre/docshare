import { AuthContext, type AuthContextValue } from '@/lib/auth-context';
import { render } from '@testing-library/react';
import type { PropsWithChildren, ReactElement } from 'react';

export const createAuthValue = (overrides: Partial<AuthContextValue> = {}): AuthContextValue => {
  return {
    authState: 'authenticated',
    user: {
      id: 'user-1',
      email: 'user@example.com',
      name: 'Test User',
      isAdmin: false,
    },
    organizations: [
      {
        id: 'org-1',
        name: 'Org 1',
        slug: 'org-1',
        role: 'owner',
      },
    ],
    activeOrganizationId: 'org-1',
    role: 'owner',
    refresh: async () => {},
    setActiveOrganizationId: () => {},
    ...overrides,
  };
};

export const renderWithAuth = (
  ui: ReactElement,
  authValueOverrides: Partial<AuthContextValue> = {},
): ReturnType<typeof render> => {
  const value = createAuthValue(authValueOverrides);

  return render(
    <AuthContext.Provider value={value as AuthContextValue}>{ui}</AuthContext.Provider>,
  );
};

export const Wrapper = ({ children, value }: PropsWithChildren<{ value: AuthContextValue }>) => (
  <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
);
