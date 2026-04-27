'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { useState } from 'react';
import { type UniversityOption, UniversitySelect } from '@/components/admin/UniversitySelect';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DataTable } from '@/components/common/DataTable';
import { DateTimeDisplay } from '@/components/common/DateTimeDisplay';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  type ApproveUniversityRequestInput,
  type ParticipationRequest,
  type UniversityRequest,
  useAdminRequestsPage,
} from '@/features/requests/hooks';
import { cn } from '@/lib/utils';
import { REQUEST_STATUS_LABELS } from '@/lib/utils/status';

function RequestStatusBadge({ status }: { status: string }) {
  const variant =
    status === 'approved' ? 'default' : status === 'rejected' ? 'destructive' : 'secondary';
  return <Badge variant={variant}>{REQUEST_STATUS_LABELS[status] ?? status}</Badge>;
}

function UniversityRequestOutcome({ request }: { request: UniversityRequest }) {
  if (request.status !== 'approved' || !request.approvedOrganizationName) {
    return null;
  }

  const modeLabel = request.approvalMode === 'attach' ? '既存大学へ追加' : '新規作成';

  return (
    <div className='text-xs text-muted-foreground'>
      {modeLabel}: {request.approvedOrganizationName}
    </div>
  );
}

function ApproveUniversityRequestDialog({
  request,
  isPending,
  onConfirm,
}: {
  request: UniversityRequest;
  isPending: boolean;
  onConfirm: (input: ApproveUniversityRequestInput) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'attach'>('create');
  const [organizationId, setOrganizationId] = useState('');
  const [selectedUniversity, setSelectedUniversity] = useState<UniversityOption | null>(null);
  const [adminNote, setAdminNote] = useState('');

  const reset = () => {
    setMode('create');
    setOrganizationId('');
    setSelectedUniversity(null);
    setAdminNote('');
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      reset();
    }
  };

  const canSubmit = mode === 'create' || organizationId.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button type='button' variant='default' size='sm' onClick={() => setOpen(true)}>
        承認
      </Button>
      <DialogContent className='max-w-lg'>
        <DialogHeader>
          <DialogTitle>大学追加依頼を承認しますか？</DialogTitle>
          <DialogDescription>
            承認方法を選んで、{request.representativeEmail} への owner 招待を作成します。
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='space-y-2'>
            <div className='text-sm font-medium'>対象申請</div>
            <div className='rounded-md border bg-muted/30 p-3 text-sm'>
              <div className='font-medium'>{request.universityName}</div>
              <div className='text-muted-foreground'>{request.representativeEmail}</div>
            </div>
          </div>

          <div className='space-y-2'>
            <div className='text-sm font-medium'>承認方法</div>
            <div className='grid gap-2'>
              <label
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm',
                  mode === 'create' && 'border-primary bg-primary/5',
                )}
              >
                <input
                  type='radio'
                  name='approval-mode'
                  value='create'
                  checked={mode === 'create'}
                  onChange={() => setMode('create')}
                  className='mt-0.5'
                />
                <span>
                  <span className='block font-medium'>新規大学を作成</span>
                  <span className='text-muted-foreground'>
                    {request.universityName} を新しく作成して owner 招待を送ります。
                  </span>
                </span>
              </label>

              <label
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm',
                  mode === 'attach' && 'border-primary bg-primary/5',
                )}
              >
                <input
                  type='radio'
                  name='approval-mode'
                  value='attach'
                  checked={mode === 'attach'}
                  onChange={() => setMode('attach')}
                  className='mt-0.5'
                />
                <span>
                  <span className='block font-medium'>既存大学へ追加</span>
                  <span className='text-muted-foreground'>
                    大学を新規作成せず、既存大学に owner 招待を送ります。
                  </span>
                </span>
              </label>
            </div>
          </div>

          {mode === 'attach' ? (
            <div className='space-y-2'>
              <Label htmlFor='approved-organization'>承認先の大学</Label>
              <div id='approved-organization'>
                <UniversitySelect
                  value={organizationId}
                  onValueChange={(id, university) => {
                    setOrganizationId(id);
                    setSelectedUniversity(university);
                  }}
                  placeholder='大学を選択...'
                />
              </div>
              {selectedUniversity ? (
                <div className='text-xs text-muted-foreground'>
                  承認先: {selectedUniversity.name}
                </div>
              ) : (
                <div className='text-xs text-muted-foreground'>既存大学の選択が必要です。</div>
              )}
            </div>
          ) : null}

          <div className='space-y-2'>
            <Label htmlFor='admin-note'>管理メモ</Label>
            <Textarea
              id='admin-note'
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder='必要があれば記録を残します'
            />
          </div>
        </div>

        <DialogFooter>
          <Button type='button' variant='outline' onClick={() => handleOpenChange(false)}>
            キャンセル
          </Button>
          <Button
            type='button'
            disabled={isPending || !canSubmit}
            onClick={() => {
              onConfirm({
                id: request.id,
                mode,
                organizationId: mode === 'attach' ? organizationId : undefined,
                adminNote: adminNote || undefined,
              });
              handleOpenChange(false);
            }}
          >
            承認
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminRequestsPage() {
  const {
    universityRequests,
    universityPagination,
    setUniversityPage,
    setUniversityPageSize,
    participationRequests,
    participationPagination,
    setParticipationPage,
    setParticipationPageSize,
    isLoading,
    approveUniversityMutation,
    rejectUniversityMutation,
    approveParticipationMutation,
    rejectParticipationMutation,
  } = useAdminRequestsPage();

  const universityColumns: ColumnDef<UniversityRequest>[] = [
    {
      header: '依頼内容',
      cell: ({ row }) => (
        <div className='space-y-1'>
          <div className='font-medium'>{row.original.universityName}</div>
          <div className='text-sm text-muted-foreground'>{row.original.representativeEmail}</div>
          <div className='text-sm'>{row.original.message}</div>
          <UniversityRequestOutcome request={row.original} />
        </div>
      ),
    },
    {
      header: '申請者',
      cell: ({ row }) => (
        <div className='text-sm'>
          <div>{row.original.requestedBy.name}</div>
          <div className='text-muted-foreground'>{row.original.requestedBy.email}</div>
        </div>
      ),
    },
    {
      header: '状態',
      cell: ({ row }) => <RequestStatusBadge status={row.original.status} />,
    },
    {
      header: '申請日時',
      cell: ({ row }) => <DateTimeDisplay value={row.original.createdAt} />,
    },
    {
      header: '',
      id: 'actions',
      cell: ({ row }) =>
        row.original.status === 'pending' ? (
          <div className='flex gap-2'>
            <ApproveUniversityRequestDialog
              request={row.original}
              isPending={approveUniversityMutation.isPending}
              onConfirm={(input) => approveUniversityMutation.mutate(input)}
            />
            <ConfirmDialog
              trigger={
                <Button type='button' variant='destructive' size='sm'>
                  却下
                </Button>
              }
              title='大学追加依頼を却下しますか？'
              description='この申請は却下済みとして保存されます。'
              confirmLabel='却下'
              onConfirm={() => rejectUniversityMutation.mutate(row.original.id)}
              destructive
            />
          </div>
        ) : (
          <span className='text-sm text-muted-foreground'>処理済み</span>
        ),
    },
  ];

  const participationColumns: ColumnDef<ParticipationRequest>[] = [
    {
      header: '対象',
      cell: ({ row }) => (
        <div className='space-y-1'>
          <div className='font-medium'>{`${row.original.edition.year}年 ${row.original.edition.name}`}</div>
          {row.original.teamName ? (
            <div className='text-sm text-muted-foreground'>{row.original.university.name}</div>
          ) : null}
          <div className='text-sm'>
            {row.original.teamName ?? row.original.university.name ?? '(チーム名なし)'}
          </div>
        </div>
      ),
    },
    {
      header: 'メッセージ',
      cell: ({ row }) => <div className='text-sm'>{row.original.message}</div>,
    },
    {
      header: '状態',
      cell: ({ row }) => <RequestStatusBadge status={row.original.status} />,
    },
    {
      header: '申請者',
      cell: ({ row }) => (
        <div className='text-sm'>
          <div>{row.original.requestedBy.name}</div>
          <div className='text-muted-foreground'>{row.original.requestedBy.email}</div>
        </div>
      ),
    },
    {
      header: '',
      id: 'actions',
      cell: ({ row }) =>
        row.original.status === 'pending' ? (
          <div className='flex gap-2'>
            <ConfirmDialog
              trigger={
                <Button type='button' variant='default' size='sm'>
                  承認
                </Button>
              }
              title='出場追加依頼を承認しますか？'
              description='承認するとこの大会回の出場登録が作成されます。'
              confirmLabel='承認'
              onConfirm={() => approveParticipationMutation.mutate(row.original)}
            />
            <ConfirmDialog
              trigger={
                <Button type='button' variant='destructive' size='sm'>
                  却下
                </Button>
              }
              title='出場追加依頼を却下しますか？'
              description='この申請は却下済みとして保存されます。'
              confirmLabel='却下'
              onConfirm={() => rejectParticipationMutation.mutate(row.original.id)}
              destructive
            />
          </div>
        ) : (
          <span className='text-sm text-muted-foreground'>処理済み</span>
        ),
    },
  ];

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-bold'>申請管理</h1>
        <p className='text-sm text-muted-foreground mt-1'>
          大学追加依頼と出場追加依頼を審査します。
        </p>
      </div>

      <Tabs defaultValue='university' className='space-y-4'>
        <TabsList>
          <TabsTrigger value='university'>大学追加依頼</TabsTrigger>
          <TabsTrigger value='participation'>出場追加依頼</TabsTrigger>
        </TabsList>

        <TabsContent value='university'>
          <DataTable
            columns={universityColumns}
            data={[...universityRequests].sort(
              (a, b) => Number(a.status !== 'pending') - Number(b.status !== 'pending'),
            )}
            isLoading={isLoading}
            pagination={universityPagination}
            onPageChange={setUniversityPage}
            onPageSizeChange={setUniversityPageSize}
          />
        </TabsContent>

        <TabsContent value='participation'>
          <DataTable
            columns={participationColumns}
            data={[...participationRequests].sort(
              (a, b) => Number(a.status !== 'pending') - Number(b.status !== 'pending'),
            )}
            isLoading={isLoading}
            pagination={participationPagination}
            onPageChange={setParticipationPage}
            onPageSizeChange={setParticipationPageSize}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
