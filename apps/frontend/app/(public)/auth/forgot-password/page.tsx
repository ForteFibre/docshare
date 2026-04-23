'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useForgotPasswordForm } from '@/features/public/auth/forgot-password/hooks';

export default function ForgotPasswordPage() {
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const { form, error, validators } = useForgotPasswordForm((email) => {
    setSentEmail(email);
  });

  if (sentEmail) {
    return (
      <div className='container mx-auto px-4 py-16 flex justify-center'>
        <Card className='w-full max-w-md'>
          <CardHeader>
            <CardTitle>再設定メールを送信しました</CardTitle>
            <CardDescription>{sentEmail} に再設定リンクを送信しました</CardDescription>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-muted-foreground'>
              メール内のリンクから新しいパスワードを設定してください。
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='container mx-auto px-4 py-16 flex justify-center'>
      <Card className='w-full max-w-md'>
        <CardHeader>
          <CardTitle>パスワード再設定</CardTitle>
          <CardDescription>登録済みのメールアドレスへ再設定リンクを送信します</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
            className='space-y-4'
          >
            <form.Field name='email' validators={{ onChange: validators.email }}>
              {(field) => (
                <div className='space-y-1'>
                  <label htmlFor={field.name} className='text-sm font-medium'>
                    メールアドレス
                  </label>
                  <Input
                    id={field.name}
                    type='email'
                    placeholder='you@example.com'
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {field.state.meta.errors[0] && (
                    <p className='text-sm text-destructive'>{field.state.meta.errors[0].message}</p>
                  )}
                </div>
              )}
            </form.Field>
            {error && <p className='text-sm text-destructive'>{error}</p>}
            <Button type='submit' className='w-full' disabled={form.state.isSubmitting}>
              {form.state.isSubmitting ? '送信中...' : '再設定メールを送信'}
            </Button>
          </form>
          <p className='text-sm text-center text-muted-foreground mt-4'>
            <Link href='/auth/login' className='text-primary hover:underline'>
              ログインへ戻る
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
