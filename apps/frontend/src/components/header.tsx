'use client';

import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { OrganizationSelector } from './organization-selector';

export const AppHeader = () => {
  const { authState, role } = useAuth();

  return (
    <header>
      <nav>
        <Link href='/'>トップ</Link> | <Link href='/competitions'>大会一覧</Link>
        {authState === 'authenticated' ? (
          <>
            {' '}
            | <Link href='/dashboard'>ダッシュボード</Link> |{' '}
            <Link href='/university/settings'>大学設定</Link> |{' '}
            <Link href='/account/settings'>アカウント設定</Link>
            {role === 'admin' ? (
              <>
                {' '}
                | <Link href='/admin'>管理</Link>
              </>
            ) : null}{' '}
            | <OrganizationSelector />
          </>
        ) : (
          <>
            {' '}
            | <Link href='/auth/login'>ログイン</Link> | <Link href='/auth/register'>新規登録</Link>
          </>
        )}
      </nav>
    </header>
  );
};
