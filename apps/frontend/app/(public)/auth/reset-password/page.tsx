'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useResetPasswordForm } from '@/features/public/auth/reset-password/hooks';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPageContent />
    </Suspense>
  );
}

function ResetPasswordPageContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const linkError = searchParams.get('error');
  const [completed, setCompleted] = useState(false);
  const { form, error, validators } = useResetPasswordForm(token, () => {
    setCompleted(true);
  });

  if (completed) {
    return (
      <div className='container mx-auto px-4 py-16 flex justify-center'>
        <Card className='w-full max-w-md'>
          <CardHeader>
            <CardTitle>パスワードを再設定しました</CardTitle>
            <CardDescription>新しいパスワードでログインできます</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className='w-full' render={<Link href='/auth/login' />}>
              ログインへ
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='container mx-auto px-4 py-16 flex justify-center'>
      <Card className='w-full max-w-md'>
        <CardHeader>
          <CardTitle>新しいパスワード</CardTitle>
          <CardDescription>アカウントに設定する新しいパスワードを入力してください</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
            className='space-y-4'
          >
            <form.Field name='password' validators={{ onChange: validators.password }}>
              {(field) => (
                <div className='space-y-1'>
                  <label htmlFor={field.name} className='text-sm font-medium'>
                    パスワード
                  </label>
                  <Input
                    id={field.name}
                    type='password'
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
            <form.Field
              name='confirmPassword'
              validators={{
                onChangeListenTo: ['password'],
                onChange: ({ value, fieldApi }) => {
                  return validators.confirmPassword({
                    value,
                    password: fieldApi.form.getFieldValue('password'),
                  });
                },
              }}
            >
              {(field) => (
                <div className='space-y-1'>
                  <label htmlFor={field.name} className='text-sm font-medium'>
                    パスワード（確認）
                  </label>
                  <Input
                    id={field.name}
                    type='password'
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
            {linkError && <p className='text-sm text-destructive'>再設定リンクが無効です</p>}
            {error && <p className='text-sm text-destructive'>{error}</p>}
            <Button type='submit' className='w-full' disabled={form.state.isSubmitting || !token}>
              {form.state.isSubmitting ? '再設定中...' : 'パスワードを再設定'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
