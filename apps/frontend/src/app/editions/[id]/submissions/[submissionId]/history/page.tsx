'use client';

import { ErrorPanel } from '@/components/error-panel';
import { RequireAuth } from '@/components/require-auth';
import { createAppApi } from '@/lib/api';
import { ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { useEffect, useMemo, useState } from 'react';

type HistoryItem = {
  id: string;
  version: number;
  fileName: string | null;
  url: string | null;
  createdAt: string;
};

type Props = {
  params: Promise<{ id: string; submissionId: string }>;
};

export default function SubmissionHistoryPage({ params }: Props) {
  const { activeOrganizationId } = useAuth();
  const api = useMemo(() => createAppApi(() => activeOrganizationId), [activeOrganizationId]);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [histories, setHistories] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [downloadingHistoryId, setDownloadingHistoryId] = useState<string | null>(null);

  useEffect(() => {
    void params.then((value) => setSubmissionId(value.submissionId));
  }, [params]);

  useEffect(() => {
    if (!submissionId) {
      return;
    }

    void (async () => {
      try {
        setError(null);
        const response = await api.getSubmissionHistory(submissionId);
        setHistories(
          response.data
            .map((history) => ({
              id: history.id,
              version: history.version,
              fileName: history.fileName,
              url: history.url,
              createdAt: history.createdAt,
            }))
            .sort((a, b) => b.version - a.version),
        );
      } catch {
        setError('提出履歴の取得に失敗しました。');
      }
    })();
  }, [api, submissionId]);

  const downloadHistory = async (historyId: string) => {
    try {
      setDownloadingHistoryId(historyId);
      setError(null);
      const response = await api.getHistoryDownload(historyId);
      window.open(response.data.url, '_blank', 'noopener,noreferrer');
    } catch (errorValue) {
      if (errorValue instanceof ApiError) {
        setError(`履歴ファイルのダウンロードに失敗しました（${errorValue.message}）。`);
      } else {
        setError('履歴ファイルのダウンロードに失敗しました。');
      }
    } finally {
      setDownloadingHistoryId(null);
    }
  };

  return (
    <RequireAuth>
      <section>
        <h1>提出履歴</h1>
        <p>この画面では過去バージョンをダウンロードできます。</p>
        {error ? <ErrorPanel message={error} /> : null}
        <ul>
          {histories.map((history) => (
            <li key={history.id}>
              v{history.version} - {history.fileName ?? history.url ?? '提出データ'}
              {history.fileName ? (
                <button
                  type='button'
                  onClick={() => void downloadHistory(history.id)}
                  disabled={downloadingHistoryId === history.id}
                >
                  DL
                </button>
              ) : (
                <a href={history.url ?? '#'} target='_blank' rel='noreferrer'>
                  URLを開く
                </a>
              )}
            </li>
          ))}
        </ul>
      </section>
    </RequireAuth>
  );
}
