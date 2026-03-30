import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { submissionTemplates } from '../../db/schema.js';
import type { AppVariables } from '../../middleware/auth.js';

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  acceptType: z.enum(['file', 'url']),
  allowedExtensions: z.array(z.string()).optional(),
  urlPattern: z.string().optional(),
  maxFileSizeMb: z.number().int().positive().default(100),
  isRequired: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

const templateSchema = z.object({
  id: z.string().uuid(),
  editionId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  acceptType: z.enum(['file', 'url']),
  allowedExtensions: z.array(z.string()).nullable(),
  urlPattern: z.string().nullable(),
  maxFileSizeMb: z.number().int(),
  isRequired: z.boolean(),
  sortOrder: z.number().int(),
  createdAt: z.any(),
  updatedAt: z.any(),
});

const createTemplateRoute = createRoute({
  method: 'post',
  path: '/editions/{id}/templates',
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        'application/json': {
          schema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'テンプレート作成',
      content: {
        'application/json': {
          schema: z.object({ data: templateSchema }),
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

const updateTemplateRoute = createRoute({
  method: 'put',
  path: '/templates/{id}',
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        'application/json': {
          schema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'テンプレート更新',
      content: {
        'application/json': {
          schema: z.object({ data: templateSchema }),
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
    404: {
      description: '未検出',
      content: {
        'application/json': {
          schema: z.object({ error: z.literal('Not found') }),
        },
      },
    },
  },
});

const deleteTemplateRoute = createRoute({
  method: 'delete',
  path: '/templates/{id}',
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    204: {
      description: 'テンプレート削除',
    },
  },
});

const copyTemplateRoute = createRoute({
  method: 'post',
  path: '/editions/{id}/templates/copy-from/{sourceEditionId}',
  request: {
    params: z.object({
      id: z.string().uuid(),
      sourceEditionId: z.string().uuid(),
    }),
  },
  responses: {
    201: {
      description: 'テンプレート複製',
      content: {
        'application/json': {
          schema: z.object({ data: z.array(templateSchema) }),
        },
      },
    },
  },
});

export const adminTemplateRoutes = new OpenAPIHono<{ Variables: AppVariables }>();

adminTemplateRoutes.openapi(createTemplateRoute, async (c) => {
  const editionId = c.req.param('id');
  const body = schema.safeParse(await c.req.json());
  if (!body.success) {
    return c.json({ error: body.error.flatten() }, 400);
  }

  const inserted = await db
    .insert(submissionTemplates)
    .values({
      editionId,
      name: body.data.name,
      description: body.data.description,
      acceptType: body.data.acceptType,
      allowedExtensions: body.data.allowedExtensions,
      urlPattern: body.data.urlPattern,
      maxFileSizeMb: body.data.maxFileSizeMb,
      isRequired: body.data.isRequired,
      sortOrder: body.data.sortOrder,
    })
    .returning();

  return c.json({ data: inserted[0] }, 201);
});

adminTemplateRoutes.openapi(updateTemplateRoute, async (c) => {
  const body = schema.safeParse(await c.req.json());
  if (!body.success) {
    return c.json({ error: body.error.flatten() }, 400);
  }

  const updated = await db
    .update(submissionTemplates)
    .set({
      name: body.data.name,
      description: body.data.description,
      acceptType: body.data.acceptType,
      allowedExtensions: body.data.allowedExtensions,
      urlPattern: body.data.urlPattern,
      maxFileSizeMb: body.data.maxFileSizeMb,
      isRequired: body.data.isRequired,
      sortOrder: body.data.sortOrder,
    })
    .where(eq(submissionTemplates.id, c.req.param('id')))
    .returning();

  if (!updated[0]) {
    return c.json({ error: 'Not found' as const }, 404);
  }

  return c.json({ data: updated[0] }, 200);
});

adminTemplateRoutes.openapi(deleteTemplateRoute, async (c) => {
  await db.delete(submissionTemplates).where(eq(submissionTemplates.id, c.req.param('id')));
  return c.body(null, 204);
});

adminTemplateRoutes.openapi(copyTemplateRoute, async (c) => {
  const editionId = c.req.param('id');
  const sourceEditionId = c.req.param('sourceEditionId');

  const source = await db
    .select()
    .from(submissionTemplates)
    .where(eq(submissionTemplates.editionId, sourceEditionId));

  if (source.length === 0) {
    return c.json({ data: [] }, 201);
  }

  const values = source.map((template) => ({
    editionId,
    name: template.name,
    description: template.description,
    acceptType: template.acceptType,
    allowedExtensions: template.allowedExtensions,
    urlPattern: template.urlPattern,
    maxFileSizeMb: template.maxFileSizeMb,
    isRequired: template.isRequired,
    sortOrder: template.sortOrder,
  }));

  const inserted = await db.insert(submissionTemplates).values(values).returning();
  return c.json({ data: inserted }, 201);
});
