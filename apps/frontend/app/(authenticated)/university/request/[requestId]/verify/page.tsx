'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useUniversityVerification } from '@/features/requests/hooks';

const formatRemaining = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export default function UniversityVerifyPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = use(params);
  const router = useRouter();
  const { status, isLoading, error, verifyMutation, resendMutation } =
    useUniversityVerification(requestId);
  const [code, setCode] = useState('');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (status?.verifiedAt) {
      const timeout = setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [status?.verifiedAt, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      return;
    }
    try {
      await verifyMutation.mutateAsync(code);
      setCode('');
    } catch {
      // toast surfaced from hook
    }
  };

  const handleResend = async () => {
    try {
      await resendMutation.mutateAsync();
    } catch {
      // toast surfaced from hook
    }
  };

  if (isLoading) {
    return (
      <div className='container mx-auto px-4 py-16 flex justify-center'>
        <Card className='w-full max-w-md'>
          <CardContent className='py-8 text-center text-muted-foreground'>
            読み込み中...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className='container mx-auto px-4 py-16 flex justify-center'>
        <Card className='w-full max-w-md'>
          <CardHeader>
            <CardTitle>確認できません</CardTitle>
            <CardDescription>
              この所属確認は表示できません。申請一覧から状態を確認してください。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant='outline' render={<Link href='/university/request' />}>
              申請一覧へ戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const verified = Boolean(status?.verifiedAt);
  const activeExpiresAt = status?.expiresAt ? new Date(status.expiresAt) : null;
  const expiresInMs = activeExpiresAt ? activeExpiresAt.getTime() - now : 0;
  const isExpired = !!activeExpiresAt && expiresInMs <= 0;
  const attemptsRemaining = status?.attemptsRemaining ?? 0;
  const canSubmit = !verified && !isExpired && status?.active === true && attemptsRemaining > 0;

  return (
    <div className='container mx-auto px-4 py-16 flex justify-center'>
      <Card className='w-full max-w-md'>
        <CardHeader>
          <CardTitle>大学所属の確認</CardTitle>
          <CardDescription>
            大学代表アドレスに送信された 6 桁の確認コードを入力してください。
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {verified ? (
            <p className='text-sm text-emerald-600'>
              確認が完了しました。ダッシュボードに移動します...
            </p>
          ) : (
            <>
              <form onSubmit={handleSubmit} className='space-y-3'>
                <Input
                  inputMode='numeric'
                  pattern='\d{6}'
                  autoComplete='one-time-code'
                  maxLength={6}
                  placeholder='000000'
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  className='text-center text-2xl tracking-[0.5em] font-mono'
                  disabled={!canSubmit || verifyMutation.isPending}
                />
                <div className='flex flex-col gap-1 text-xs text-muted-foreground'>
                  {status?.active && activeExpiresAt ? (
                    isExpired ? (
                      <span className='text-destructive'>
                        コードの有効期限が切れました。再送してください。
                      </span>
                    ) : (
                      <span>有効期限まで {formatRemaining(expiresInMs)}</span>
                    )
                  ) : (
                    <span>有効な確認コードがありません。再送してください。</span>
                  )}
                  {status?.active ? <span>残り試行回数: {attemptsRemaining}</span> : null}
                </div>
                <Button
                  type='submit'
                  className='w-full'
                  disabled={!canSubmit || code.length !== 6 || verifyMutation.isPending}
                >
                  {verifyMutation.isPending ? '確認中...' : '確認する'}
                </Button>
              </form>
              <div className='flex flex-col gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={handleResend}
                  disabled={resendMutation.isPending}
                >
                  {resendMutation.isPending ? '再送中...' : 'コードを再送する'}
                </Button>
                <Button type='button' variant='ghost' render={<Link href='/university/request' />}>
                  申請一覧へ戻る
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
