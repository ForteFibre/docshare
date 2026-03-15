'use client';

import { RequireAuth } from '@/components/require-auth';
import Link from 'next/link';

export default function AdminDashboardPage() {
  return (
    <RequireAuth allow={['admin']}>
      <section>
        <h1>管理ダッシュボード</h1>
        <ul>
          <li>
            <Link href='/admin/series'>大会シリーズ管理</Link>
          </li>
          <li>
            <Link href='/admin/editions'>大会回管理</Link>
          </li>
          <li>
            <Link href='/admin/universities'>大学管理</Link>
          </li>
        </ul>
      </section>
    </RequireAuth>
  );
}
