import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  competitionEditions,
  participations,
  submissions,
  submissionTemplates,
} from '../db/schema.js';
import { env } from '../lib/config.js';
import type { AppVariables } from '../middleware/auth.js';
import { getUserUniversityIds, isAdmin } from '../services/permissions.js';
import { buildVersionedSubmissionKey, presignUploadByKey } from '../services/storage.js';
import {
  isContentTypeConsistent,
  isSubmissionMutableStatus,
} from '../services/submission-validation.js';

const bodySchema = z.object({
  participationId: z.string().uuid(),
  templateId: z.string().uuid(),
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  fileSizeBytes: z.number().int().positive(),
});

const presignUploadResponseSchema = z.object({
  presignedUrl: z.string().url(),
  s3Key: z.string(),
  expiresIn: z.number().int(),
});

const uploadPresignRoute = createRoute({
  method: 'post',
  path: '/upload/presign',
  request: {
    body: {
      content: {
        'application/json': {
          schema: bodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: '提出アップロード署名URL発行',
      content: {
        'application/json': {
          schema: z.object({
            data: presignUploadResponseSchema.extend({
              templateMaxFileSizeMb: z.number().int(),
            }),
          }),
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
      description: '権限なし',
      content: {
        'application/json': {
          schema: z.object({ error: z.literal('Forbidden') }),
        },
      },
    },
    404: {
      description: '未検出',
      content: {
        'application/json': {
          schema: z.object({ error: z.string() }),
        },
      },
    },
    409: {
      description: '提出不可状態',
      content: {
        'application/json': {
          schema: z.object({
            error: z.literal('Submissions are not accepted in current sharing_status'),
          }),
        },
      },
    },
  },
});

export const uploadRoutes = new OpenAPIHono<{ Variables: AppVariables }>();

uploadRoutes.openapi(uploadPresignRoute, async (c) => {
  const user = c.get('currentUser');
  const body = bodySchema.safeParse(await c.req.json());

  if (!body.success) {
    return c.json({ error: body.error.flatten() }, 400);
  }

  const templateRows = await db
    .select({ template: submissionTemplates, edition: competitionEditions })
    .from(submissionTemplates)
    .innerJoin(competitionEditions, eq(competitionEditions.id, submissionTemplates.editionId))
    .where(eq(submissionTemplates.id, body.data.templateId))
    .limit(1);

  const templateContext = templateRows[0];
  if (!templateContext) {
    return c.json({ error: 'Template not found' }, 404);
  }

  const template = templateContext.template;

  if (template.acceptType !== 'file') {
    return c.json({ error: 'Template does not accept file upload' }, 400);
  }

  if (!isSubmissionMutableStatus(templateContext.edition.sharingStatus)) {
    return c.json(
      { error: 'Submissions are not accepted in current sharing_status' as const },
      409,
    );
  }

  const extension = body.data.fileName.split('.').pop()?.toLowerCase();
  if (
    template.allowedExtensions?.length &&
    (!extension || !template.allowedExtensions.includes(extension))
  ) {
    return c.json({ error: 'Disallowed file extension' }, 400);
  }

  if (!isContentTypeConsistent(body.data.fileName, body.data.contentType)) {
    return c.json({ error: 'contentType is inconsistent with file extension' }, 400);
  }

  if (body.data.fileSizeBytes > template.maxFileSizeMb * 1024 * 1024) {
    return c.json({ error: 'File exceeds template max size' }, 400);
  }

  const participationRows = await db
    .select({
      universityId: participations.universityId,
      editionId: participations.editionId,
    })
    .from(participations)
    .where(eq(participations.id, body.data.participationId))
    .limit(1);

  if (!participationRows[0]) {
    return c.json({ error: 'Participation not found' }, 404);
  }

  if (participationRows[0].editionId !== template.editionId) {
    return c.json({ error: 'Template and participation mismatch' }, 400);
  }

  if (!(await isAdmin(user.id))) {
    const organizationIds = await getUserUniversityIds(user.id);
    if (!participationRows[0] || !organizationIds.includes(participationRows[0].universityId)) {
      return c.json({ error: 'Forbidden' as const }, 403);
    }
  }

  const existingSubmission = await db
    .select({ version: submissions.version })
    .from(submissions)
    .where(
      and(
        eq(submissions.templateId, body.data.templateId),
        eq(submissions.participationId, body.data.participationId),
      ),
    )
    .limit(1);

  const nextVersion = (existingSubmission[0]?.version ?? 0) + 1;
  const key = buildVersionedSubmissionKey({
    editionId: template.editionId,
    participationId: body.data.participationId,
    templateId: body.data.templateId,
    version: nextVersion,
    fileName: body.data.fileName,
  });

  const result = await presignUploadByKey({
    bucket: env.S3_BUCKET_SUBMISSIONS,
    key,
    contentType: body.data.contentType,
    contentLength: body.data.fileSizeBytes,
  });

  return c.json(
    {
      data: {
        presignedUrl: result.presignedUrl,
        s3Key: result.s3Key,
        expiresIn: result.expiresIn,
        templateMaxFileSizeMb: template.maxFileSizeMb,
      },
    },
    200,
  );
});
