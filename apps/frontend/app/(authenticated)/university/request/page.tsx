'use client';

import Link from 'next/link';
import { DateTimeDisplay } from '@/components/common/DateTimeDisplay';
import { EmptyState } from '@/components/common/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useUniversityRequestsSection } from '@/features/requests/hooks';
import { REQUEST_STATUS_LABELS } from '@/lib/utils/status';

export default function UniversityRequestPage() {
  const { data, isLoading, form, createMutation, validators } = useUniversityRequestsSection();

  return (
    <div className='space-y-6 max-w-3xl'>
      <div className='space-y-2'>
        <h1 className='text-2xl font-bold'>大学追加依頼</h1>
        <p className='text-sm text-muted-foreground'>
          所属大学がまだ登録されていない場合は、ここから管理者に追加を依頼できます。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>依頼フォーム</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
            className='space-y-4'
          >
            <form.Field name='universityName' validators={{ onChange: validators.universityName }}>
              {(field) => (
                <div className='space-y-1'>
                  <label htmlFor={field.name} className='text-sm font-medium'>
                    大学名
                  </label>
                  <Input
                    id={field.name}
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
              name='representativeEmail'
              validators={{ onChange: validators.representativeEmail }}
            >
              {(field) => (
                <div className='space-y-1'>
                  <label htmlFor={field.name} className='text-sm font-medium'>
                    代表メールアドレス
                  </label>
                  <Input
                    id={field.name}
                    type='email'
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
            <form.Field name='message' validators={{ onChange: validators.message }}>
              {(field) => (
                <div className='space-y-1'>
                  <label htmlFor={field.name} className='text-sm font-medium'>
                    メッセージ
                  </label>
                  <Textarea
                    id={field.name}
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
            <div className='flex justify-end gap-2'>
              <Button type='button' variant='outline' render={<Link href='/dashboard' />}>
                ダッシュボードへ戻る
              </Button>
              <Button type='submit' disabled={createMutation.isPending}>
                依頼を送信
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <section className='space-y-3'>
        <h2 className='text-lg font-semibold'>自分の大学追加依頼</h2>
        {isLoading ? (
          <Card>
            <CardContent className='py-6 text-sm text-muted-foreground'>
              読み込み中です...
            </CardContent>
          </Card>
        ) : data.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState title='まだ依頼はありません' />
            </CardContent>
          </Card>
        ) : (
          data.map((request) => (
            <Card key={request.id}>
              <CardContent className='py-4 space-y-2'>
                <div className='flex items-center justify-between gap-3'>
                  <div className='font-medium'>{request.universityName}</div>
                  <Badge variant={request.status === 'rejected' ? 'destructive' : 'secondary'}>
                    {REQUEST_STATUS_LABELS[request.status] ?? request.status}
                  </Badge>
                </div>
                {request.status === 'approved' && request.approvedOrganizationName ? (
                  <p className='text-xs text-muted-foreground'>
                    {request.approvalMode === 'attach' ? '既存大学へ追加' : '新規作成'}:{' '}
                    {request.approvedOrganizationName}
                  </p>
                ) : null}
                <p className='text-sm text-muted-foreground'>{request.representativeEmail}</p>
                <p className='text-sm'>{request.message}</p>
                <p className='text-xs text-muted-foreground'>
                  申請日時: <DateTimeDisplay value={request.createdAt} />
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
