import { renderWithAuth } from '@/test/test-utils';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppHeader } from './header';

describe('AppHeader RBAC', () => {
  it('adminで管理リンクが表示される', () => {
    renderWithAuth(<AppHeader />, { role: 'admin' });
    expect(screen.getByRole('link', { name: '管理' })).toBeInTheDocument();
  });

  it('ownerで管理リンクが表示されない', () => {
    renderWithAuth(<AppHeader />, { role: 'owner' });
    expect(screen.queryByRole('link', { name: '管理' })).not.toBeInTheDocument();
  });

  it('memberで管理リンクが表示されない', () => {
    renderWithAuth(<AppHeader />, { role: 'member' });
    expect(screen.queryByRole('link', { name: '管理' })).not.toBeInTheDocument();
  });
});
