import { renderWithAuth } from '@/test/test-utils';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EditionSubmissionsPage from './page';

describe('/editions/:id/submissions', () => {
  it('403時のアクセス不可表示', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({ error: 'Forbidden' }),
      }),
    );

    renderWithAuth(<EditionSubmissionsPage params={Promise.resolve({ id: 'ed1' })} />);

    expect(
      await screen.findByText('この大会回の他校資料はまだ閲覧できません。'),
    ).toBeInTheDocument();
  });
});
