'use client';

import { ErrorPanel } from '@/components/error-panel';
import { RequireAuth } from '@/components/require-auth';
import { createAppApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { CompetitionEdition } from '@/lib/types';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

export default function AdminEditionsPage() {
  const { activeOrganizationId } = useAuth();
  const api = useMemo(() => createAppApi(() => activeOrganizationId), [activeOrganizationId]);
  const [rows, setRows] = useState<CompetitionEdition[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const response = await api.listEditions();
        setRows(response.data);
      } catch {
        setError('大会回の取得に失敗しました。');
      }
    })();
  }, [api]);

  return (
    <RequireAuth allow={['admin']}>
      <section>
        <h1>大会回管理</h1>
        {error ? <ErrorPanel message={error} /> : null}
        <ul>
          {rows.map((row) => (
            <li key={row.id}>
              {row.name} ({row.sharingStatus})
              <button
                type='button'
                onClick={() => void api.adminSetEditionStatus(row.id, 'sharing')}
              >
                sharingに変更
              </button>
              <Link href={`/admin/editions/${row.id}/participations`}>出場登録</Link>
              {' | '}
              <Link href={`/admin/editions/${row.id}/templates`}>テンプレート</Link>
            </li>
          ))}
        </ul>
      </section>
    </RequireAuth>
  );
}
