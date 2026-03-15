import { beforeEach, describe, expect, it, vi } from 'vitest';

type Rows = Array<Record<string, unknown>>;

const limitQueue: Rows[] = [];
const memberRowsQueue: Rows[] = [];
const countRowsQueue: Rows[] = [];

const enqueue = (queue: Rows[], rows: Rows): void => {
  queue.push(rows);
};

vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn((selection?: Record<string, unknown>) => {
      if (selection && 'value' in selection) {
        return {
          from: () => ({
            innerJoin: () => ({
              where: async () => countRowsQueue.shift() ?? [],
            }),
          }),
        };
      }

      if (selection && 'organizationId' in selection) {
        return {
          from: () => ({
            where: async () => memberRowsQueue.shift() ?? [],
          }),
        };
      }

      return {
        from: () => ({
          where: () => ({
            limit: async () => limitQueue.shift() ?? [],
          }),
        }),
      };
    }),
  },
}));

const { canViewOtherSubmissions } = await import('./permissions.js');

describe('canViewOtherSubmissions', () => {
  beforeEach(() => {
    limitQueue.length = 0;
    memberRowsQueue.length = 0;
    countRowsQueue.length = 0;
  });

  it('organizationヘッダーの大学が提出済みなら閲覧可能', async () => {
    enqueue(limitQueue, [{ isAdmin: false }]);
    enqueue(limitQueue, [{ sharingStatus: 'sharing' }]);
    enqueue(memberRowsQueue, [{ organizationId: 'org-1' }, { organizationId: 'org-2' }]);
    enqueue(countRowsQueue, [{ value: 1 }]);

    const result = await canViewOtherSubmissions('user-1', 'edition-1', 'org-1');

    expect(result).toBe(true);
  });

  it('別大学で提出済みでも、ヘッダー大学が未提出なら閲覧不可', async () => {
    enqueue(limitQueue, [{ isAdmin: false }]);
    enqueue(limitQueue, [{ sharingStatus: 'sharing' }]);
    enqueue(memberRowsQueue, [{ organizationId: 'org-1' }, { organizationId: 'org-2' }]);
    enqueue(countRowsQueue, [{ value: 0 }]);

    const result = await canViewOtherSubmissions('user-1', 'edition-1', 'org-2');

    expect(result).toBe(false);
  });

  it('ヘッダー未指定時は所属大学のいずれか提出済みで閲覧可能', async () => {
    enqueue(limitQueue, [{ isAdmin: false }]);
    enqueue(limitQueue, [{ sharingStatus: 'sharing' }]);
    enqueue(memberRowsQueue, [{ organizationId: 'org-1' }, { organizationId: 'org-2' }]);
    enqueue(countRowsQueue, [{ value: 0 }]);
    enqueue(countRowsQueue, [{ value: 1 }]);

    const result = await canViewOtherSubmissions('user-1', 'edition-1', null);

    expect(result).toBe(true);
  });
});
