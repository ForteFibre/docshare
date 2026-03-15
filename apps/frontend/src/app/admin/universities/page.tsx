'use client';

import { RequireAuth } from '@/components/require-auth';
import { createAppApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useEffect, useMemo, useState } from 'react';

export default function AdminUniversitiesPage() {
  const { activeOrganizationId } = useAuth();
  const api = useMemo(() => createAppApi(() => activeOrganizationId), [activeOrganizationId]);
  const [rows, setRows] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  useEffect(() => {
    void (async () => {
      const response = await api.adminListUniversities();
      setRows(response.data);
    })();
  }, [api]);

  return (
    <RequireAuth allow={['admin']}>
      <section>
        <h1>大学管理</h1>
        <input
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
          placeholder='大学名'
        />
        <input
          value={slug}
          onChange={(event) => setSlug(event.currentTarget.value)}
          placeholder='slug'
        />
        <button
          type='button'
          onClick={() => {
            void api.adminCreateUniversity({ name, slug });
          }}
        >
          大学作成
        </button>
        <ul>
          {rows.map((row) => (
            <li key={row.id}>
              {row.name} ({row.slug})
            </li>
          ))}
        </ul>
      </section>
    </RequireAuth>
  );
}
