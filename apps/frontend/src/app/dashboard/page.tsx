'use client';

import { ErrorPanel } from '@/components/error-panel';
import { RequireAuth } from '@/components/require-auth';
import { createAppApi } from '@/lib/api';
import { ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import type { CompetitionEdition, Submission } from '@/lib/types';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

export default function DashboardPage() {
  const { activeOrganizationId } = useAuth();
  const api = useMemo(() => createAppApi(() => activeOrganizationId), [activeOrganizationId]);
  const [editions, setEditions] = useState<CompetitionEdition[]>([]);
  const [recent, setRecent] = useState<Submission[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const editionsResponse = await api.listEditions();
      setEditions(editionsResponse.data);

      const settled = await Promise.allSettled(
        editionsResponse.data.map((edition) => api.getMySubmissions(edition.id)),
      );
      const recentItems = settled
        .flatMap((result) => (result.status === 'fulfilled' ? result.value.data : []))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 5);
      setRecent(recentItems);
    } catch (errorValue) {
      const message = errorValue instanceof ApiError ? errorValue.message : '取得に失敗しました';
      setError(message);
    }
  }, [api]);

  useEffect(() => {
    if (!activeOrganizationId) {
      return;
    }
    void load();
  }, [activeOrganizationId, load]);

  return (
    <RequireAuth>
      <section>
        <h1>ダッシュボード</h1>
        {!activeOrganizationId ? <p>ヘッダーから大学を選択してください。</p> : null}
        {error ? <ErrorPanel message={error} onRetry={() => void load()} /> : null}
        <h2>大会一覧</h2>
        <ul>
          {editions.map((edition) => (
            <li key={edition.id}>
              <Link href={`/editions/${edition.id}/submit`}>{edition.name}</Link>
            </li>
          ))}
        </ul>
        <h2>最近の更新</h2>
        <ul>
          {recent.map((submission) => (
            <li key={submission.id}>{submission.fileName ?? submission.url ?? '提出データ'}</li>
          ))}
        </ul>
      </section>
    </RequireAuth>
  );
}
