'use client';

import { ErrorPanel } from '@/components/error-panel';
import { createAppApi } from '@/lib/api';
import { ApiError } from '@/lib/api-client';
import { toSeriesSlug } from '@/lib/slug';
import type { CompetitionEdition, CompetitionSeries } from '@/lib/types';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

export default function CompetitionsPage() {
  const [series, setSeries] = useState<CompetitionSeries[]>([]);
  const [editions, setEditions] = useState<CompetitionEdition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const api = useMemo(() => createAppApi(() => null), []);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [seriesResponse, editionResponse] = await Promise.all([
        api.listSeries(),
        api.listEditions(),
      ]);
      setSeries(seriesResponse.data);
      setEditions(editionResponse.data);
    } catch (errorValue) {
      const message = errorValue instanceof ApiError ? errorValue.message : '取得に失敗しました';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  if (isLoading) {
    return <p>読み込み中...</p>;
  }

  if (error) {
    return <ErrorPanel message={error} onRetry={() => void load()} />;
  }

  return (
    <section>
      <h1>大会シリーズ一覧</h1>
      <ul>
        {series.map((seriesItem) => {
          const matchedEditions = editions.filter((edition) => edition.seriesId === seriesItem.id);
          return (
            <li key={seriesItem.id}>
              <h2>{seriesItem.name}</h2>
              {matchedEditions.length === 0 ? (
                <p>開催回なし</p>
              ) : (
                <ul>
                  {matchedEditions.map((edition) => (
                    <li key={edition.id}>
                      <Link href={`/competitions/${toSeriesSlug(seriesItem.name)}/${edition.year}`}>
                        {edition.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
