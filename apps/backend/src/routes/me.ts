import { OpenAPIHono } from '@hono/zod-openapi';
import { asc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { members, organizations } from '../db/schema.js';
import type { AppVariables } from '../middleware/auth.js';

export const meRoutes = new OpenAPIHono<{ Variables: AppVariables }>();

meRoutes.get('/me', async (c) => {
  const user = c.get('currentUser');
  const sessionActiveOrganizationId = c.get('sessionActiveOrganizationId');

  const organizationRows = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      role: members.role,
    })
    .from(members)
    .innerJoin(organizations, eq(organizations.id, members.organizationId))
    .where(eq(members.userId, user.id))
    .orderBy(asc(organizations.name));

  return c.json({
    data: {
      user,
      organizations: organizationRows,
      activeOrganizationId: c.get('organizationId') ?? sessionActiveOrganizationId ?? null,
    },
  });
});
