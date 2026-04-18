FROM node:22-slim AS base

WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

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

EXPOSE 8787
CMD ["node", "apps/backend/dist/index.js"]
