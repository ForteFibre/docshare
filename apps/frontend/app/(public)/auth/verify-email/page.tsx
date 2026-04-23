'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailPageContent />
    </Suspense>
  );
}

function VerifyEmailPageContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <div className='container mx-auto px-4 py-16 flex justify-center'>
      <Card className='w-full max-w-md'>
        <CardHeader>
          <CardTitle>{error ? '確認リンクが無効です' : 'メールアドレスを確認しました'}</CardTitle>
          <CardDescription>
            {error
              ? 'リンクの有効期限が切れているか、すでに使用されています'
              : 'DocShare にログインできるようになりました'}
          </CardDescription>
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
