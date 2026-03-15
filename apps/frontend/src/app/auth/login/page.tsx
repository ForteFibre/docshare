'use client';

import { ErrorPanel } from '@/components/error-panel';
import { createApiClient } from '@/lib/api-client';
import { type FormEvent, useMemo, useState } from 'react';

const FALLBACK_API_URL = 'http://localhost:8787';

const isEmail = (value: string): boolean => /.+@.+\..+/.test(value);

export default function LoginPage() {
  const client = useMemo(
    () =>
      createApiClient({
        baseUrl: process.env.NEXT_PUBLIC_API_ORIGIN ?? FALLBACK_API_URL,
        getOrganizationId: () => null,
      }),
    [],
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const validate = (): string | null => {
    if (!email || !password) {
      return 'メールアドレスとパスワードは必須です。';
    }
    if (!isEmail(email)) {
      return 'メールアドレス形式が不正です。';
    }
    return null;
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await client.post('/api/auth/sign-in/email', {
        email,
        password,
      });
      setSuccess('ログインしました。');
    } catch {
      setError('ログインに失敗しました。');
    }
  };

  return (
    <section>
      <h1>ログイン</h1>
      {error ? <ErrorPanel message={error} /> : null}
      {success ? <p>{success}</p> : null}
      <form onSubmit={onSubmit} noValidate>
        <label>
          メールアドレス
          <input value={email} onChange={(event) => setEmail(event.currentTarget.value)} />
        </label>
        <label>
          パスワード
          <input
            type='password'
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
          />
        </label>
        <button type='submit'>ログイン</button>
      </form>
    </section>
  );
}
