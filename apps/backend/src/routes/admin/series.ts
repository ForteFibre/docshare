import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { competitionSeries } from '../../db/schema.js';
import type { AppVariables } from '../../middleware/auth.js';

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  externalLinks: z.array(z.object({ label: z.string(), url: z.string().url() })).optional(),
});

const seriesSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  externalLinks: z.array(z.object({ label: z.string(), url: z.string().url() })).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const createSeriesRoute = createRoute({
  method: 'post',
  path: '/series',
  request: {
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
      description: 'シリーズ作成',
      content: {
        'application/json': {
          schema: z.object({ data: seriesSchema }),
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

const updateSeriesRoute = createRoute({
  method: 'put',
  path: '/series/{id}',
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
      description: 'シリーズ更新',
      content: {
        'application/json': {
          schema: z.object({ data: seriesSchema }),
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

const deleteSeriesRoute = createRoute({
  method: 'delete',
  path: '/series/{id}',
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    204: {
      description: 'シリーズ削除',
    },
  },
});

export const adminSeriesRoutes = new OpenAPIHono<{ Variables: AppVariables }>();

adminSeriesRoutes.openapi(createSeriesRoute, async (c) => {
  const body = schema.safeParse(await c.req.json());
  if (!body.success) {
    return c.json({ error: body.error.flatten() }, 400);
  }

  const inserted = await db
    .insert(competitionSeries)
    .values({
      name: body.data.name,
      description: body.data.description,
      externalLinks: body.data.externalLinks,
    })
    .returning();

  return c.json({ data: inserted[0] }, 201);
});

adminSeriesRoutes.openapi(updateSeriesRoute, async (c) => {
  const body = schema.safeParse(await c.req.json());
  if (!body.success) {
    return c.json({ error: body.error.flatten() }, 400);
  }

  const updated = await db
    .update(competitionSeries)
    .set({
      name: body.data.name,
      description: body.data.description,
      externalLinks: body.data.externalLinks,
      updatedAt: new Date(),
    })
    .where(eq(competitionSeries.id, c.req.param('id')))
    .returning();

  if (!updated[0]) {
    return c.json({ error: 'Not found' as const }, 404);
  }

  return c.json({ data: updated[0] }, 200);
});

adminSeriesRoutes.openapi(deleteSeriesRoute, async (c) => {
  await db.delete(competitionSeries).where(eq(competitionSeries.id, c.req.param('id')));
  return c.body(null, 204);
});
