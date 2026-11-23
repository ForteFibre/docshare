FROM ghcr.io/pnpm/pnpm:12.23.0 AS pnpm

FROM node:26-slim AS base

WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# Node.js 25 以降は corepack が同梱されないため、公式 pnpm イメージからバイナリをコピーする
COPY --from=pnpm /opt/pnpm /opt/pnpm
RUN for bin in pnpm pn pnpx pnx; do ln -s "/opt/pnpm/$bin" "/usr/local/bin/$bin"; done

FROM base AS builder
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter backend build

FROM base AS runner
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN pnpm install --frozen-lockfile --prod --no-optional --filter-prod backend...
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/src/db/migrations ./apps/backend/dist/db/migrations

EXPOSE 8787
CMD ["node", "apps/backend/dist/index.js"]
