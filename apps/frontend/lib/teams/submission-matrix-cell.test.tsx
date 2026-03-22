import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SubmissionMatrixCell, type SubmissionMatrixCellData } from './submission-matrix-cell';

const buildCell = (overrides: Partial<SubmissionMatrixCellData>): SubmissionMatrixCellData => {
  return {
    submitted: true,
    viewable: true,
    denyReason: null,
    submission: {
      id: 'sub-1',
      fileName: 'proposal.pdf',
      url: null,
      version: 1,
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    ...overrides,
  };
};

describe('SubmissionMatrixCell', () => {
  afterEach(() => {
    cleanup();
  });

  it('未提出の場合はダッシュを表示する', () => {
    render(<SubmissionMatrixCell cell={buildCell({ submitted: false, submission: null })} />);

    expect(screen.getByText('—')).toBeTruthy();
    expect(screen.queryByText('ダウンロード')).toBeNull();
  });

  it('提出済みかつ閲覧可能な場合は提出情報を表示する', () => {
    const onDownload = vi.fn();

    render(
      <SubmissionMatrixCell
        cell={buildCell({
          viewable: true,
          submission: {
            id: 'sub-2',
            fileName: 'robot-design.pdf',
            url: null,
            version: 3,
            updatedAt: '2026-02-02T10:00:00.000Z',
          },
        })}
        onDownload={onDownload}
      />,
    );

    expect(screen.getByText('robot-design.pdf')).toBeTruthy();
    const downloadButton = screen.getByRole('button', { name: 'ダウンロード' });
    expect(downloadButton).toBeTruthy();

    downloadButton.click();
    expect(onDownload).toHaveBeenCalledWith('sub-2');
  });

  it('提出済みだが閲覧不可の場合は理由を表示する', () => {
    render(
      <SubmissionMatrixCell
        cell={buildCell({
          viewable: false,
          denyReason: 'context_required',
          submission: {
            id: 'sub-3',
            fileName: 'confidential.pdf',
            url: null,
            version: 1,
            updatedAt: '2026-03-03T00:00:00.000Z',
          },
        })}
      />,
    );

    expect(screen.getByText('閲覧不可')).toBeTruthy();
    expect(screen.getByText('資料種別または所属大学を指定して閲覧してください')).toBeTruthy();
  });

  it('閲覧不可理由がキーボード操作で到達可能', async () => {
    const user = userEvent.setup();

    render(
      <SubmissionMatrixCell
        cell={buildCell({
          viewable: false,
          denyReason: 'access_denied',
          submission: {
            id: 'sub-4',
            fileName: 'locked.pdf',
            url: null,
            version: 1,
            updatedAt: '2026-03-10T00:00:00.000Z',
          },
        })}
      />,
    );

    const reasonElement = screen.getByRole('button', { name: '閲覧不可理由' });
    await user.tab();

    expect(document.activeElement).toBe(reasonElement);
  });
});
