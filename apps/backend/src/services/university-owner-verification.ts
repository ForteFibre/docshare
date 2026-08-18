import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { and, desc, eq, gt } from 'drizzle-orm';
import { db } from '../db/index.js';
import { universityOwnerVerifications } from '../db/schema.js';

const CODE_LENGTH = 6;
export const VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000;
export const VERIFICATION_INITIAL_ATTEMPTS = 3;
export const VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;
export const VERIFICATION_RESEND_HOURLY_LIMIT = 5;
const VERIFICATION_RESEND_WINDOW_MS = 60 * 60 * 1000;

export const generateVerificationCode = (): string => {
  const value = randomInt(0, 10 ** CODE_LENGTH);
  return value.toString().padStart(CODE_LENGTH, '0');
};

export const hashVerificationCode = (code: string): string =>
  createHash('sha256').update(code).digest('hex');

export type RateLimitResult =
  | { ok: true }
  | { ok: false; reason: 'cooldown'; retryAfterMs: number }
  | { ok: false; reason: 'hourly'; retryAfterMs: number };

export const checkResendRateLimit = async (requestId: string): Promise<RateLimitResult> => {
  const now = new Date();
  const windowStart = new Date(now.getTime() - VERIFICATION_RESEND_WINDOW_MS);
  const recentRows = await db
    .select({ createdAt: universityOwnerVerifications.createdAt })
    .from(universityOwnerVerifications)
    .where(
      and(
        eq(universityOwnerVerifications.requestId, requestId),
        gt(universityOwnerVerifications.createdAt, windowStart),
      ),
    )
    .orderBy(desc(universityOwnerVerifications.createdAt));

  if (recentRows.length >= VERIFICATION_RESEND_HOURLY_LIMIT) {
    const oldestInWindow = recentRows[recentRows.length - 1].createdAt;
    const retryAfterMs = Math.max(
      0,
      oldestInWindow.getTime() + VERIFICATION_RESEND_WINDOW_MS - now.getTime(),
    );
    return { ok: false, reason: 'hourly', retryAfterMs };
  }

  const latest = recentRows[0];
  if (latest) {
    const elapsed = now.getTime() - latest.createdAt.getTime();
    if (elapsed < VERIFICATION_RESEND_COOLDOWN_MS) {
      return {
        ok: false,
        reason: 'cooldown',
        retryAfterMs: VERIFICATION_RESEND_COOLDOWN_MS - elapsed,
      };
    }
  }

  return { ok: true };
};

export const issueVerificationCode = async ({
  requestId,
  organizationId,
  targetUserId,
}: {
  requestId: string;
  organizationId: string;
  targetUserId: string;
}): Promise<{ code: string; verificationId: string; expiresAt: Date }> => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + VERIFICATION_CODE_TTL_MS);
  const code = generateVerificationCode();
  const codeHash = hashVerificationCode(code);

  await db
    .update(universityOwnerVerifications)
    .set({ status: 'invalidated', updatedAt: now })
    .where(
      and(
        eq(universityOwnerVerifications.requestId, requestId),
        eq(universityOwnerVerifications.status, 'active'),
      ),
    );

  const inserted = await db
    .insert(universityOwnerVerifications)
    .values({
      requestId,
      organizationId,
      targetUserId,
      codeHash,
      attemptsRemaining: VERIFICATION_INITIAL_ATTEMPTS,
      expiresAt,
    })
    .returning({ id: universityOwnerVerifications.id });

  return { code, verificationId: inserted[0].id, expiresAt };
};

export type VerifyCodeResult =
  | { ok: true; organizationId: string; targetUserId: string }
  | { ok: false; reason: 'no_active' }
  | { ok: false; reason: 'expired' }
  | { ok: false; reason: 'mismatch'; attemptsRemaining: number }
  | { ok: false; reason: 'attempts_exhausted' };

export const verifyCode = async ({
  requestId,
  code,
}: {
  requestId: string;
  code: string;
}): Promise<VerifyCodeResult> => {
  const now = new Date();
  const rows = await db
    .select()
    .from(universityOwnerVerifications)
    .where(
      and(
        eq(universityOwnerVerifications.requestId, requestId),
        eq(universityOwnerVerifications.status, 'active'),
      ),
    )
    .orderBy(desc(universityOwnerVerifications.createdAt))
    .limit(1);

  const active = rows[0];
  if (!active) {
    return { ok: false, reason: 'no_active' };
  }

  if (active.expiresAt.getTime() <= now.getTime()) {
    await db
      .update(universityOwnerVerifications)
      .set({ status: 'expired', updatedAt: now })
      .where(eq(universityOwnerVerifications.id, active.id));
    return { ok: false, reason: 'expired' };
  }

  const expected = Buffer.from(active.codeHash, 'hex');
  const actual = createHash('sha256').update(code).digest();
  const matches = expected.length === actual.length && timingSafeEqual(expected, actual);

  if (matches) {
    await db
      .update(universityOwnerVerifications)
      .set({ status: 'consumed', consumedAt: now, updatedAt: now })
      .where(eq(universityOwnerVerifications.id, active.id));
    return {
      ok: true,
      organizationId: active.organizationId,
      targetUserId: active.targetUserId,
    };
  }

  const remaining = active.attemptsRemaining - 1;
  if (remaining <= 0) {
    await db
      .update(universityOwnerVerifications)
      .set({ status: 'invalidated', attemptsRemaining: 0, updatedAt: now })
      .where(eq(universityOwnerVerifications.id, active.id));
    return { ok: false, reason: 'attempts_exhausted' };
  }

  await db
    .update(universityOwnerVerifications)
    .set({ attemptsRemaining: remaining, updatedAt: now })
    .where(eq(universityOwnerVerifications.id, active.id));
  return { ok: false, reason: 'mismatch', attemptsRemaining: remaining };
};

export type ActiveVerificationSummary = {
  attemptsRemaining: number;
  expiresAt: Date;
  createdAt: Date;
};

export const getActiveVerification = async (
  requestId: string,
): Promise<ActiveVerificationSummary | null> => {
  const rows = await db
    .select({
      attemptsRemaining: universityOwnerVerifications.attemptsRemaining,
      expiresAt: universityOwnerVerifications.expiresAt,
      createdAt: universityOwnerVerifications.createdAt,
    })
    .from(universityOwnerVerifications)
    .where(
      and(
        eq(universityOwnerVerifications.requestId, requestId),
        eq(universityOwnerVerifications.status, 'active'),
      ),
    )
    .orderBy(desc(universityOwnerVerifications.createdAt))
    .limit(1);

  return rows[0] ?? null;
};
