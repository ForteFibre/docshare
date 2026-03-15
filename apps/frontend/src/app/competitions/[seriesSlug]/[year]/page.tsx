'use client';

import { ErrorPanel } from '@/components/error-panel';
import { createAppApi } from '@/lib/api';
import { ApiError } from '@/lib/api-client';
import { toSeriesSlug } from '@/lib/slug';
import type { CompetitionEdition, CompetitionSeries } from '@/lib/types';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Props = {
  params: Promise<{ seriesSlug: string; year: string }>;
};

export default function CompetitionDetailPage({ params }: Props) {
  const [series, setSeries] = useState<CompetitionSeries[]>([]);
  const [editions, setEditions] = useState<CompetitionEdition[]>([]);
  const [resolvedParams, setResolvedParams] = useState<{ seriesSlug: string; year: string } | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const api = useMemo(() => createAppApi(() => null), []);

  useEffect(() => {
    void params.then((value) => {
      setResolvedParams(value);
    });
  }, [params]);

  const load = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
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

  if (!resolvedParams || isLoading) {
    return <p>読み込み中...</p>;
  }

  if (error) {
    return <ErrorPanel message={error} onRetry={() => void load()} />;
  }

  const matchedSeries = series.find(
    (item) => toSeriesSlug(item.name) === resolvedParams.seriesSlug,
  );
  const yearValue = Number.parseInt(resolvedParams.year, 10);
  const matchedEdition = editions.find(
    (item) => item.seriesId === matchedSeries?.id && item.year === yearValue,
  );

  if (!matchedSeries || !matchedEdition) {
    return <p>大会が見つかりません。</p>;
  }

  return (
    <section>
      <h1>{matchedEdition.name}</h1>
      <p>{matchedEdition.description ?? '説明は未登録です。'}</p>
      <h2>ルール資料</h2>
      <ul>
        {matchedEdition.ruleDocuments?.map((documentItem) => (
          <li key={documentItem.s3_key}>{documentItem.label}</li>
        )) ?? <li>資料なし</li>}
      </ul>
      <h2>外部リンク</h2>
      <ul>
        {matchedEdition.externalLinks?.map((link) => (
          <li key={link.url}>
            <a href={link.url} target='_blank' rel='noreferrer'>
              {link.label}
            </a>
          </li>
        )) ?? <li>リンクなし</li>}
      </ul>
    </section>
  );
}
