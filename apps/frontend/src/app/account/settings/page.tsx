'use client';

import { RequireAuth } from '@/components/require-auth';
import { useAuth } from '@/lib/auth-context';

export default function AccountSettingsPage() {
  const { user } = useAuth();

  return (
    <RequireAuth>
      <section>
        <h1>アカウント設定</h1>
        <p>名前: {user?.name}</p>
        <p>メール: {user?.email}</p>
        <p>パスワード変更は認証設定画面から行ってください。</p>
      </section>
    </RequireAuth>
  );
}
