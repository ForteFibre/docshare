'use client';

import { ErrorPanel } from '@/components/error-panel';
import { RequireAuth } from '@/components/require-auth';
import { createAppApi } from '@/lib/api';
import { ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type Props = {
  params: Promise<{ id: string }>;
};

export default function EditionSubmissionsPage({ params }: Props) {
  const { activeOrganizationId } = useAuth();
  const api = useMemo(() => createAppApi(() => activeOrganizationId), [activeOrganizationId]);
  const [editionId, setEditionId] = useState<string | null>(null);
  const [rows, setRows] = useState<
    Array<{
      submission: { id: string; fileName: string | null; version: number };
      participation: { id: string; teamName: string | null };
    }>
  >([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void params.then((value) => setEditionId(value.id));
  }, [params]);

  useEffect(() => {
    if (!editionId) {
      return;
    }

    void (async () => {
      try {
        const response = await api.listEditionSubmissions(editionId);
        setRows(response.data);
      } catch (errorValue) {
        if (errorValue instanceof ApiError && errorValue.status === 403) {
          setError('この大会回の他校資料はまだ閲覧できません。');
          return;
        }
        setError('資料一覧の取得に失敗しました。');
      }
    })();
  }, [api, editionId]);

  return (
    <RequireAuth>
      <section>
        <h1>資料一覧</h1>
        <p>各チーム名を開くと、最新版DLと履歴（過去版DL）を確認できます。</p>
        {error ? <ErrorPanel message={error} /> : null}
        <ul>
          {rows.map((row) => (
            <li key={row.submission.id}>
              <Link href={`/editions/${editionId}/teams/${row.participation.id}`}>
                {row.participation.teamName ?? 'チーム名未設定'}
              </Link>
              {' - '}
              {row.submission.fileName ?? 'URL提出'} (v{row.submission.version})
            </li>
          ))}
        </ul>
      </section>
    </RequireAuth>
  );
}
