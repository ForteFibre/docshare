import { renderWithAuth } from '@/test/test-utils';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RequireAuth } from './require-auth';

describe('RequireAuth', () => {
  it('未認証時はガード表示する', () => {
    renderWithAuth(
      <RequireAuth>
        <p>protected</p>
      </RequireAuth>,
      { authState: 'unauthenticated', user: null, role: null },
    );

    expect(screen.getByText('この画面はログインが必要です。')).toBeInTheDocument();
  });

  it('許可ロール時は内容を表示する', () => {
    renderWithAuth(
      <RequireAuth allow={['admin']}>
        <p>protected</p>
      </RequireAuth>,
      { role: 'admin' },
    );

    expect(screen.getByText('protected')).toBeInTheDocument();
  });
});
