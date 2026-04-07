import type { Context, MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { auth } from '../auth.js';
import type { SessionContext, UserContext } from '../types.js';
export type AppVariables = {
  currentUser: UserContext;
  session: SessionContext;
  organizationId: string | null;
};

export const getCurrentUser = (c: Context<{ Variables: AppVariables }>): UserContext => {
  return c.get('currentUser');
};

export const requireAuth: MiddlewareHandler<{
  Variables: AppVariables;
}> = async (c, next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session?.user?.id) {
    throw new HTTPException(401, {
      message: 'Unauthorized',
    });
  }

  c.set('session', session?.session);
  c.set('currentUser', session?.user);
  await next();
};
