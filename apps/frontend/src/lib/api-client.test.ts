import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient } from './api-client';

describe('createApiClient', () => {
  it('organization指定時のみ X-Organization-Id を付与する', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = createApiClient({
      baseUrl: 'http://localhost:8787/api',
      getOrganizationId: () => 'org-1',
    });

    await client.get('/series');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8787/api/series',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Organization-Id': 'org-1' }),
      }),
    );

    fetchMock.mockClear();
    const noOrgClient = createApiClient({
      baseUrl: 'http://localhost:8787/api',
      getOrganizationId: () => null,
    });
    await noOrgClient.get('/series');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8787/api/series',
      expect.objectContaining({
        headers: {},
      }),
    );
  });

  it('4xx/5xxを共通エラー型に正規化する', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({ error: 'Forbidden' }),
      }),
    );

    const client = createApiClient({
      baseUrl: 'http://localhost:8787/api',
      getOrganizationId: () => null,
    });

    await expect(client.get('/editions')).rejects.toBeInstanceOf(ApiError);
    await expect(client.get('/editions')).rejects.toMatchObject({
      status: 403,
      code: 'Forbidden',
      message: 'Forbidden',
    });
  });

  it("credentials: 'include' で通信する", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = createApiClient({
      baseUrl: 'http://localhost:8787/api',
      getOrganizationId: () => null,
    });
    await client.get('/series');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8787/api/series',
      expect.objectContaining({ credentials: 'include' }),
    );
  });
});
