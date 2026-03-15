'use client';

import { ErrorPanel } from '@/components/error-panel';
import { createApiClient } from '@/lib/api-client';
import { useEffect, useMemo, useState } from 'react';

const FALLBACK_API_URL = 'http://localhost:8787';

type Props = {
  params: Promise<{ invitationId: string }>;
};

export default function InvitePage({ params }: Props) {
  const client = useMemo(
    () =>
      createApiClient({
        baseUrl: process.env.NEXT_PUBLIC_API_ORIGIN ?? FALLBACK_API_URL,
        getOrganizationId: () => null,
      }),
    [],
  );
  const [invitationId, setInvitationId] = useState<string | null>(null);
  const [state, setState] = useState<
    'idle' | 'processing' | 'success' | 'expired' | 'invalid' | 'error'
  >('idle');

  useEffect(() => {
    void params.then((value) => setInvitationId(value.invitationId));
  }, [params]);

  const accept = async () => {
    if (!invitationId) {
      return;
    }

    setState('processing');
    try {
      await client.post('/api/auth/organization/accept-invitation', {
        invitationId,
      });
      setState('success');
    } catch (errorValue) {
      if (errorValue instanceof Error) {
        if (errorValue.message.includes('expired')) {
          setState('expired');
          return;
        }
        if (errorValue.message.includes('invalid') || errorValue.message.includes('not found')) {
          setState('invalid');
          return;
        }
      }
      setState('error');
    }
  };

  if (!invitationId) {
    return <p>招待情報を確認中...</p>;
  }

  return (
    <section>
      <h1>招待承認</h1>
      {state === 'success' ? <p>招待を承認しました。</p> : null}
      {state === 'expired' ? <ErrorPanel message='この招待は期限切れです。' /> : null}
      {state === 'invalid' ? <ErrorPanel message='招待IDが不正です。' /> : null}
      {state === 'error' ? <ErrorPanel message='招待承認に失敗しました。' /> : null}
      {state !== 'success' ? (
        <button type='button' onClick={() => void accept()}>
          {state === 'processing' ? '処理中...' : '招待を承認する'}
        </button>
      ) : null}
    </section>
  );
}
