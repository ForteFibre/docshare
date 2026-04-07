import { and, eq } from 'drizzle-orm';
import type { MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { db } from '../db/index.js';
import { members } from '../db/schema.js';
import type { AppVariables } from './auth.js';

export const resolveOrganization: MiddlewareHandler<{
  Variables: AppVariables;
}> = async (c, next) => {
  const headerOrganizationId = c.req.header('x-organization-id') ?? null;
  const sessionOrganizationId = c.get('session')?.activeOrganizationId ?? null;

  // Compatibility layer: reject mismatched header while preferring session active organization.
  if (
    headerOrganizationId &&
    sessionOrganizationId &&
    headerOrganizationId !== sessionOrganizationId
  ) {
    throw new HTTPException(403, {
      message: 'Organization header does not match active session organization',
    });
  }

  const organizationId = sessionOrganizationId ?? headerOrganizationId;

  const user = c.get('currentUser');
  const rows = await db
    .select({ id: members.id })
    .from(members)
    .where(
      organizationId
        ? and(eq(members.userId, user.id), eq(members.organizationId, organizationId))
        : eq(members.userId, user.id),
    )
    .limit(1);

  if (rows.length === 0 && !user.isAdmin) {
    throw new HTTPException(403, {
      message: 'User does not belong to the organization',
    });
  }

  c.set('organizationId', organizationId);
  await next();
};
