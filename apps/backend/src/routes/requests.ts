import { randomUUID } from 'node:crypto';
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  competitionEditions,
  members,
  organizations,
  participationRequests,
  universityCreationRequests,
  users,
} from '../db/schema.js';
import type { AppVariables } from '../middleware/auth.js';
import { emailService } from '../services/email/index.js';
import { getUserUniversityIds } from '../services/permissions.js';
import {
  checkResendRateLimit,
  getActiveVerification,
  issueVerificationCode,
  VERIFICATION_CODE_TTL_MS,
  VERIFICATION_INITIAL_ATTEMPTS,
  verifyCode,
} from '../services/university-owner-verification.js';

const requestStatusSchema = z.enum(['pending', 'approved', 'rejected']);

const requesterSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

const reviewerSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
  })
  .nullable();

const approvalModeSchema = z.enum(['create', 'attach']);

const universityRequestSchema = z.object({
  id: z.string().uuid(),
  universityName: z.string(),
  representativeEmail: z.string().email(),
  message: z.string(),
  status: requestStatusSchema,
  requestedBy: requesterSchema,
  reviewedBy: reviewerSchema,
  reviewedAt: z.date().nullable(),
  approvalMode: approvalModeSchema.nullable(),
  approvedOrganizationId: z.string().nullable(),
  approvedOrganizationName: z.string().nullable(),
  createdInvitationId: z.string().nullable(),
  verifiedAt: z.date().nullable(),
  adminNote: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const participationRequestSchema = z.object({
  id: z.string().uuid(),
  edition: z.object({
    id: z.string().uuid(),
    name: z.string(),
    year: z.number().int(),
  }),
  university: z.object({
    id: z.string(),
    name: z.string(),
  }),
  teamName: z.string().nullable(),
  message: z.string(),
  status: requestStatusSchema,
  requestedBy: requesterSchema,
  reviewedBy: reviewerSchema,
  reviewedAt: z.date().nullable(),
  createdParticipationId: z.string().uuid().nullable(),
  adminNote: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const createUniversityRequestSchema = z.object({
  universityName: z.string().min(1),
  representativeEmail: z.string().email(),
  message: z.string().min(1),
});

const createParticipationRequestSchema = z.object({
  teamName: z.string().optional(),
  message: z.string().min(1),
});

const orgHeaderSchema = z.object({
  'x-organization-id': z.string(),
});

const listUniversityRequestsRoute = createRoute({
  method: 'get',
  path: '/university-requests',
  responses: {
    200: {
      description: '自分の大学追加依頼一覧',
      content: {
        'application/json': {
          schema: z.object({ data: z.array(universityRequestSchema) }),
        },
      },
    },
  },
});

const createUniversityRequestRoute = createRoute({
  method: 'post',
  path: '/university-requests',
  request: {
    body: {
      content: {
        'application/json': {
          schema: createUniversityRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: '大学追加依頼作成',
      content: {
        'application/json': {
          schema: z.object({ data: universityRequestSchema }),
        },
      },
    },
    400: {
      description: '不正入力',
      content: {
        'application/json': {
          schema: z.object({ error: z.any() }),
        },
      },
    },
  },
});

const verificationStatusSchema = z.object({
  requestId: z.string().uuid(),
  active: z.boolean(),
  attemptsRemaining: z.number().int().nullable(),
  expiresAt: z.date().nullable(),
  createdAt: z.date().nullable(),
  verifiedAt: z.date().nullable(),
});

const verifyUniversityRequestSchema = z.object({
  code: z
    .string()
    .length(6)
    .regex(/^\d{6}$/, '6桁の数字を入力してください'),
});

const getVerificationStatusRoute = createRoute({
  method: 'get',
  path: '/university-requests/{id}/verification',
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: '所属確認コード状態',
      content: {
        'application/json': {
          schema: z.object({ data: verificationStatusSchema }),
        },
      },
    },
    403: {
      description: '申請者本人のみ利用可能',
      content: {
        'application/json': {
          schema: z.object({ error: z.literal('Forbidden') }),
        },
      },
    },
    404: {
      description: '対象未検出',
      content: {
        'application/json': {
          schema: z.object({ error: z.literal('Not found') }),
        },
      },
    },
    409: {
      description: '未承認',
      content: {
        'application/json': {
          schema: z.object({ error: z.literal('Not approved') }),
        },
      },
    },
  },
});

const verifyUniversityRequestRoute = createRoute({
  method: 'post',
  path: '/university-requests/{id}/verify',
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        'application/json': {
          schema: verifyUniversityRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: '所属確認完了',
      content: {
        'application/json': {
          schema: z.object({ data: universityRequestSchema }),
        },
      },
    },
    400: {
      description: '不正入力',
      content: {
        'application/json': {
          schema: z.object({ error: z.any() }),
        },
      },
    },
    403: {
      description: '申請者本人のみ利用可能',
      content: {
        'application/json': {
          schema: z.object({ error: z.literal('Forbidden') }),
        },
      },
    },
    404: {
      description: '対象未検出',
      content: {
        'application/json': {
          schema: z.object({ error: z.literal('Not found') }),
        },
      },
    },
    409: {
      description: '状態が処理不可',
      content: {
        'application/json': {
          schema: z.object({
            error: z.union([
              z.literal('Not approved'),
              z.literal('Already verified'),
              z.literal('No active code'),
            ]),
          }),
        },
      },
    },
    410: {
      description: 'コード期限切れ',
      content: {
        'application/json': {
          schema: z.object({ error: z.literal('Code expired') }),
        },
      },
    },
    422: {
      description: 'コード不一致',
      content: {
        'application/json': {
          schema: z.object({
            error: z.union([z.literal('Code mismatch'), z.literal('Attempts exhausted')]),
            attemptsRemaining: z.number().int().optional(),
          }),
        },
      },
    },
  },
});

const resendUniversityRequestCodeRoute = createRoute({
  method: 'post',
  path: '/university-requests/{id}/resend-code',
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: '確認コード再送',
      content: {
        'application/json': {
          schema: z.object({ data: verificationStatusSchema }),
        },
      },
    },
    403: {
      description: '申請者本人のみ利用可能',
      content: {
        'application/json': {
          schema: z.object({ error: z.literal('Forbidden') }),
        },
      },
    },
    404: {
      description: '対象未検出',
      content: {
        'application/json': {
          schema: z.object({ error: z.literal('Not found') }),
        },
      },
    },
    409: {
      description: '状態が処理不可',
      content: {
        'application/json': {
          schema: z.object({
            error: z.union([z.literal('Not approved'), z.literal('Already verified')]),
          }),
        },
      },
    },
    429: {
      description: '再送制限',
      content: {
        'application/json': {
          schema: z.object({
            error: z.union([z.literal('Cooldown'), z.literal('Hourly limit')]),
            retryAfterMs: z.number().int(),
          }),
        },
      },
    },
  },
});

const listParticipationRequestsRoute = createRoute({
  method: 'get',
  path: '/participation-requests',
  request: {
    headers: orgHeaderSchema.partial(),
  },
  responses: {
    200: {
      description: '自分の出場追加依頼一覧',
      content: {
        'application/json': {
          schema: z.object({ data: z.array(participationRequestSchema) }),
        },
      },
    },
  },
});

const createParticipationRequestRoute = createRoute({
  method: 'post',
  path: '/editions/{id}/participation-requests',
  request: {
    params: z.object({ id: z.string().uuid() }),
    headers: orgHeaderSchema,
    body: {
      content: {
        'application/json': {
          schema: createParticipationRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: '出場追加依頼作成',
      content: {
        'application/json': {
          schema: z.object({ data: participationRequestSchema }),
        },
      },
    },
    400: {
      description: '不正入力または組織指定不足',
      content: {
        'application/json': {
          schema: z.object({
            error: z.union([z.any(), z.literal('x-organization-id is required')]),
          }),
        },
      },
    },
    403: {
      description: '組織コンテキスト不正',
      content: {
        'application/json': {
          schema: z.object({ error: z.literal('Invalid organization context') }),
        },
      },
    },
    404: {
      description: '大会未検出',
      content: {
        'application/json': {
          schema: z.object({ error: z.literal('Not found') }),
        },
      },
    },
  },
});

export const requestRoutes = new OpenAPIHono<{ Variables: AppVariables }>();

requestRoutes.openapi(listUniversityRequestsRoute, async (c) => {
  const user = c.get('currentUser');
  const rows = await db
    .select({
      id: universityCreationRequests.id,
      universityName: universityCreationRequests.universityName,
      representativeEmail: universityCreationRequests.representativeEmail,
      message: universityCreationRequests.message,
      status: universityCreationRequests.status,
      requestedById: users.id,
      requestedByName: users.name,
      requestedByEmail: users.email,
      reviewedAt: universityCreationRequests.reviewedAt,
      approvalMode: universityCreationRequests.approvalMode,
      approvedOrganizationId: universityCreationRequests.approvedOrganizationId,
      approvedOrganizationName: organizations.name,
      createdInvitationId: universityCreationRequests.createdInvitationId,
      verifiedAt: universityCreationRequests.verifiedAt,
      adminNote: universityCreationRequests.adminNote,
      createdAt: universityCreationRequests.createdAt,
      updatedAt: universityCreationRequests.updatedAt,
    })
    .from(universityCreationRequests)
    .innerJoin(users, eq(users.id, universityCreationRequests.requestedByUserId))
    .leftJoin(
      organizations,
      eq(organizations.id, universityCreationRequests.approvedOrganizationId),
    )
    .where(eq(universityCreationRequests.requestedByUserId, user.id))
    .orderBy(desc(universityCreationRequests.createdAt));

  return c.json(
    {
      data: rows.map((row) => ({
        id: row.id,
        universityName: row.universityName,
        representativeEmail: row.representativeEmail,
        message: row.message,
        status: row.status,
        requestedBy: {
          id: row.requestedById,
          name: row.requestedByName,
          email: row.requestedByEmail,
        },
        reviewedBy: null,
        reviewedAt: row.reviewedAt,
        approvalMode: row.approvalMode,
        approvedOrganizationId: row.approvedOrganizationId,
        approvedOrganizationName: row.approvedOrganizationName,
        createdInvitationId: row.createdInvitationId,
        verifiedAt: row.verifiedAt,
        adminNote: row.adminNote,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
    },
    200,
  );
});

requestRoutes.openapi(createUniversityRequestRoute, async (c) => {
  const user = c.get('currentUser');
  const body = createUniversityRequestSchema.safeParse(await c.req.json());
  if (!body.success) {
    return c.json({ error: body.error.flatten() }, 400);
  }

  const inserted = await db
    .insert(universityCreationRequests)
    .values({
      requestedByUserId: user.id,
      universityName: body.data.universityName,
      representativeEmail: body.data.representativeEmail,
      message: body.data.message,
    })
    .returning();

  const request = inserted[0];
  return c.json(
    {
      data: {
        id: request.id,
        universityName: request.universityName,
        representativeEmail: request.representativeEmail,
        message: request.message,
        status: request.status,
        requestedBy: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        reviewedBy: null,
        reviewedAt: request.reviewedAt,
        approvalMode: request.approvalMode,
        approvedOrganizationId: request.approvedOrganizationId,
        approvedOrganizationName: null,
        createdInvitationId: request.createdInvitationId,
        verifiedAt: request.verifiedAt,
        adminNote: request.adminNote,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
      },
    },
    201,
  );
});

const loadRequestForUser = async (
  requestId: string,
  userId: string,
): Promise<
  | { ok: true; request: typeof universityCreationRequests.$inferSelect }
  | { ok: false; status: 403 | 404 }
> => {
  const rows = await db
    .select()
    .from(universityCreationRequests)
    .where(eq(universityCreationRequests.id, requestId))
    .limit(1);
  const request = rows[0];
  if (!request) {
    return { ok: false, status: 404 };
  }
  if (request.requestedByUserId !== userId) {
    return { ok: false, status: 403 };
  }
  return { ok: true, request };
};

const getUniversityRequestDetailForUser = async (requestId: string, userId: string) => {
  const rows = await db
    .select({
      id: universityCreationRequests.id,
      universityName: universityCreationRequests.universityName,
      representativeEmail: universityCreationRequests.representativeEmail,
      message: universityCreationRequests.message,
      status: universityCreationRequests.status,
      requestedById: users.id,
      requestedByName: users.name,
      requestedByEmail: users.email,
      reviewedAt: universityCreationRequests.reviewedAt,
      approvalMode: universityCreationRequests.approvalMode,
      approvedOrganizationId: universityCreationRequests.approvedOrganizationId,
      approvedOrganizationName: organizations.name,
      createdInvitationId: universityCreationRequests.createdInvitationId,
      verifiedAt: universityCreationRequests.verifiedAt,
      adminNote: universityCreationRequests.adminNote,
      createdAt: universityCreationRequests.createdAt,
      updatedAt: universityCreationRequests.updatedAt,
    })
    .from(universityCreationRequests)
    .innerJoin(users, eq(users.id, universityCreationRequests.requestedByUserId))
    .leftJoin(
      organizations,
      eq(organizations.id, universityCreationRequests.approvedOrganizationId),
    )
    .where(
      and(
        eq(universityCreationRequests.id, requestId),
        eq(universityCreationRequests.requestedByUserId, userId),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    universityName: row.universityName,
    representativeEmail: row.representativeEmail,
    message: row.message,
    status: row.status,
    requestedBy: {
      id: row.requestedById,
      name: row.requestedByName,
      email: row.requestedByEmail,
    },
    reviewedBy: null,
    reviewedAt: row.reviewedAt,
    approvalMode: row.approvalMode,
    approvedOrganizationId: row.approvedOrganizationId,
    approvedOrganizationName: row.approvedOrganizationName,
    createdInvitationId: row.createdInvitationId,
    verifiedAt: row.verifiedAt,
    adminNote: row.adminNote,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
};

requestRoutes.openapi(getVerificationStatusRoute, async (c) => {
  const user = c.get('currentUser');
  const requestId = c.req.param('id');
  const loaded = await loadRequestForUser(requestId, user.id);
  if (!loaded.ok) {
    return loaded.status === 403
      ? c.json({ error: 'Forbidden' as const }, 403)
      : c.json({ error: 'Not found' as const }, 404);
  }
  const { request } = loaded;
  if (request.status !== 'approved') {
    return c.json({ error: 'Not approved' as const }, 409);
  }

  const active = await getActiveVerification(requestId);
  return c.json(
    {
      data: {
        requestId,
        active: active !== null,
        attemptsRemaining: active?.attemptsRemaining ?? null,
        expiresAt: active?.expiresAt ?? null,
        createdAt: active?.createdAt ?? null,
        verifiedAt: request.verifiedAt,
      },
    },
    200,
  );
});

requestRoutes.openapi(verifyUniversityRequestRoute, async (c) => {
  const user = c.get('currentUser');
  const requestId = c.req.param('id');
  const body = verifyUniversityRequestSchema.safeParse(await c.req.json());
  if (!body.success) {
    return c.json({ error: body.error.flatten() }, 400);
  }

  const loaded = await loadRequestForUser(requestId, user.id);
  if (!loaded.ok) {
    return loaded.status === 403
      ? c.json({ error: 'Forbidden' as const }, 403)
      : c.json({ error: 'Not found' as const }, 404);
  }
  const { request } = loaded;
  if (request.status !== 'approved' || !request.approvedOrganizationId) {
    return c.json({ error: 'Not approved' as const }, 409);
  }
  if (request.verifiedAt) {
    return c.json({ error: 'Already verified' as const }, 409);
  }

  const result = await verifyCode({ requestId, code: body.data.code });
  if (!result.ok) {
    switch (result.reason) {
      case 'no_active':
        return c.json({ error: 'No active code' as const }, 409);
      case 'expired':
        return c.json({ error: 'Code expired' as const }, 410);
      case 'mismatch':
        return c.json(
          { error: 'Code mismatch' as const, attemptsRemaining: result.attemptsRemaining },
          422,
        );
      case 'attempts_exhausted':
        return c.json({ error: 'Attempts exhausted' as const }, 422);
    }
  }

  const existingMemberRows = await db
    .select({ id: members.id })
    .from(members)
    .where(
      and(
        eq(members.organizationId, result.organizationId),
        eq(members.userId, result.targetUserId),
      ),
    )
    .limit(1);

  if (!existingMemberRows[0]) {
    await db.insert(members).values({
      id: randomUUID(),
      organizationId: result.organizationId,
      userId: result.targetUserId,
      role: 'owner',
    });
  }

  await db
    .update(universityCreationRequests)
    .set({ verifiedAt: new Date(), updatedAt: new Date() })
    .where(eq(universityCreationRequests.id, requestId));

  const detail = await getUniversityRequestDetailForUser(requestId, user.id);
  if (!detail) {
    return c.json({ error: 'Not found' as const }, 404);
  }
  return c.json({ data: detail }, 200);
});

requestRoutes.openapi(resendUniversityRequestCodeRoute, async (c) => {
  const user = c.get('currentUser');
  const requestId = c.req.param('id');
  const loaded = await loadRequestForUser(requestId, user.id);
  if (!loaded.ok) {
    return loaded.status === 403
      ? c.json({ error: 'Forbidden' as const }, 403)
      : c.json({ error: 'Not found' as const }, 404);
  }
  const { request } = loaded;
  if (request.status !== 'approved' || !request.approvedOrganizationId) {
    return c.json({ error: 'Not approved' as const }, 409);
  }
  if (request.verifiedAt) {
    return c.json({ error: 'Already verified' as const }, 409);
  }

  const rateCheck = await checkResendRateLimit(requestId);
  if (!rateCheck.ok) {
    return c.json(
      {
        error: rateCheck.reason === 'cooldown' ? ('Cooldown' as const) : ('Hourly limit' as const),
        retryAfterMs: rateCheck.retryAfterMs,
      },
      429,
    );
  }

  const organizationName = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, request.approvedOrganizationId))
    .limit(1);

  const { code } = await issueVerificationCode({
    requestId,
    organizationId: request.approvedOrganizationId,
    targetUserId: user.id,
  });

  await emailService.sendEmail({
    to: request.representativeEmail,
    template: 'university-owner-verification-code',
    payload: {
      universityName: organizationName[0]?.name ?? request.universityName,
      code,
      requestedByEmail: user.email,
      expiresInMinutes: Math.floor(VERIFICATION_CODE_TTL_MS / 60_000),
    },
  });

  const active = await getActiveVerification(requestId);
  return c.json(
    {
      data: {
        requestId,
        active: active !== null,
        attemptsRemaining: active?.attemptsRemaining ?? VERIFICATION_INITIAL_ATTEMPTS,
        expiresAt: active?.expiresAt ?? null,
        createdAt: active?.createdAt ?? null,
        verifiedAt: request.verifiedAt,
      },
    },
    200,
  );
});

requestRoutes.openapi(listParticipationRequestsRoute, async (c) => {
  const user = c.get('currentUser');
  const organizationId = c.get('organizationId');
  const rows = await db
    .select({
      id: participationRequests.id,
      editionId: competitionEditions.id,
      editionName: competitionEditions.name,
      editionYear: competitionEditions.year,
      universityId: organizations.id,
      universityName: organizations.name,
      teamName: participationRequests.teamName,
      message: participationRequests.message,
      status: participationRequests.status,
      requestedById: users.id,
      requestedByName: users.name,
      requestedByEmail: users.email,
      reviewedAt: participationRequests.reviewedAt,
      createdParticipationId: participationRequests.createdParticipationId,
      adminNote: participationRequests.adminNote,
      createdAt: participationRequests.createdAt,
      updatedAt: participationRequests.updatedAt,
    })
    .from(participationRequests)
    .innerJoin(users, eq(users.id, participationRequests.requestedByUserId))
    .innerJoin(competitionEditions, eq(competitionEditions.id, participationRequests.editionId))
    .innerJoin(organizations, eq(organizations.id, participationRequests.universityId))
    .where(
      organizationId
        ? and(
            eq(participationRequests.requestedByUserId, user.id),
            eq(participationRequests.universityId, organizationId),
          )
        : eq(participationRequests.requestedByUserId, user.id),
    )
    .orderBy(desc(participationRequests.createdAt));

  return c.json(
    {
      data: rows.map((row) => ({
        id: row.id,
        edition: {
          id: row.editionId,
          name: row.editionName,
          year: row.editionYear,
        },
        university: {
          id: row.universityId,
          name: row.universityName,
        },
        teamName: row.teamName,
        message: row.message,
        status: row.status,
        requestedBy: {
          id: row.requestedById,
          name: row.requestedByName,
          email: row.requestedByEmail,
        },
        reviewedBy: null,
        reviewedAt: row.reviewedAt,
        createdParticipationId: row.createdParticipationId,
        adminNote: row.adminNote,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
    },
    200,
  );
});

requestRoutes.openapi(createParticipationRequestRoute, async (c) => {
  const user = c.get('currentUser');
  const editionId = c.req.param('id');
  const organizationId = c.get('organizationId');
  if (!organizationId) {
    return c.json({ error: 'x-organization-id is required' as const }, 400);
  }

  const body = createParticipationRequestSchema.safeParse(await c.req.json());
  if (!body.success) {
    return c.json({ error: body.error.flatten() }, 400);
  }

  const universityIds = await getUserUniversityIds(user.id);
  if (!universityIds.includes(organizationId)) {
    return c.json({ error: 'Invalid organization context' as const }, 403);
  }

  const editionRows = await db
    .select({
      id: competitionEditions.id,
      name: competitionEditions.name,
      year: competitionEditions.year,
    })
    .from(competitionEditions)
    .where(eq(competitionEditions.id, editionId))
    .limit(1);
  const edition = editionRows[0];
  if (!edition) {
    return c.json({ error: 'Not found' as const }, 404);
  }

  const orgRows = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  const inserted = await db
    .insert(participationRequests)
    .values({
      editionId,
      universityId: organizationId,
      requestedByUserId: user.id,
      teamName: body.data.teamName,
      message: body.data.message,
    })
    .returning();

  const request = inserted[0];
  return c.json(
    {
      data: {
        id: request.id,
        edition: {
          id: edition.id,
          name: edition.name,
          year: edition.year,
        },
        university: {
          id: orgRows[0]?.id ?? organizationId,
          name: orgRows[0]?.name ?? organizationId,
        },
        teamName: request.teamName,
        message: request.message,
        status: request.status,
        requestedBy: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        reviewedBy: null,
        reviewedAt: request.reviewedAt,
        createdParticipationId: request.createdParticipationId,
        adminNote: request.adminNote,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
      },
    },
    201,
  );
});
