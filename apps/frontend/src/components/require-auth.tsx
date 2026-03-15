'use client';

import { useAuth } from '@/lib/auth-context';
import type { PropsWithChildren } from 'react';

type Props = PropsWithChildren<{
  allow?: Array<'admin' | 'owner' | 'member'>;
}>;

export const RequireAuth = ({ allow = ['admin', 'owner', 'member'], children }: Props) => {
  const { authState, role } = useAuth();

  if (authState === 'loading') {
    return <p>読み込み中...</p>;
  }

  if (authState !== 'authenticated') {
    return <p>この画面はログインが必要です。</p>;
  }

  if (!role || !allow.includes(role)) {
    return <p>この画面へのアクセス権限がありません。</p>;
  }

  return <>{children}</>;
};
