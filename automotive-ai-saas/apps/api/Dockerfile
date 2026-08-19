# Automotive AI SaaS - Dockerfile for API (Cloudflare Workers compatible)
# For local development with Miniflare

FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
COPY packages/types ./packages/types
COPY packages/database ./packages/database
COPY packages/auth ./packages/auth
COPY packages/events ./packages/events
COPY packages/ai ./packages/ai

RUN npm install -g pnpm@9 && pnpm install --frozen-lockfile --filter=@automotive-ai-saas/api...

# Development stage with Miniflare
FROM base AS dev
WORKDIR /app
ENV NODE_ENV=development

COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 8787

CMD ["pnpm", "dev:api"]

# Build stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm install -g pnpm@9 && pnpm build --filter=@automotive-ai-saas/api

# Production stage (for container deployment if needed)
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/wrangler.toml ./wrangler.toml

EXPOSE 8787

CMD ["node", "dist/index.js"]