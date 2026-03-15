'use client';

import { ErrorPanel } from '@/components/error-panel';
import { RequireAuth } from '@/components/require-auth';
import { createAppApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Member = {
  id: string;
  userId: string;
  role: 'owner' | 'member';
  name: string;
  email: string;
};

export default function UniversitySettingsPage() {
  const { activeOrganizationId, role } = useAuth();
  const api = useMemo(() => createAppApi(() => activeOrganizationId), [activeOrganizationId]);
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await api.listMembers();
      setMembers(response.data);
      setError(null);
    } catch {
      setError('メンバー情報を取得できませんでした。');
    }
  }, [api]);

  useEffect(() => {
    if (role === 'admin' || role === 'owner') {
      void load();
    }
  }, [load, role]);

  const invite = async () => {
    try {
      await api.createInvite(inviteEmail, 'member');
      setInviteEmail('');
      await load();
    } catch {
      setError('招待作成に失敗しました。');
    }
  };

  return (
    <RequireAuth allow={['admin', 'owner']}>
      <section>
        <h1>大学設定</h1>
        {error ? <ErrorPanel message={error} onRetry={() => void load()} /> : null}
        <h2>メンバー一覧</h2>
        <ul>
          {members.map((member) => (
            <li key={member.id}>
              {member.name} ({member.role})
              <button
                type='button'
                onClick={() =>
                  void api.updateMemberRole(member.id, member.role === 'owner' ? 'member' : 'owner')
                }
              >
                ロール切替
              </button>
              <button type='button' onClick={() => void api.removeMember(member.id)}>
                削除
              </button>
            </li>
          ))}
        </ul>

        <h2>招待</h2>
        <input
          aria-label='invite-email'
          value={inviteEmail}
          onChange={(event) => setInviteEmail(event.currentTarget.value)}
        />
        <button type='button' onClick={() => void invite()}>
          招待送信
        </button>
      </section>
    </RequireAuth>
  );
}
