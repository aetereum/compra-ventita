# Automotive AI SaaS - Dockerfile for Web (Next.js)
# For local development and container deployment

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

RUN npm install -g pnpm@9 && pnpm install --frozen-lockfile --filter=@automotive-ai-saas/web...

# Development stage
FROM base AS dev
WORKDIR /app
ENV NODE_ENV=development

COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 3000

CMD ["pnpm", "dev:web"]

# Build stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm install -g pnpm@9 && pnpm build --filter=@automotive-ai-saas/web

# Production stage
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./public

# Set the correct permission for prerender cache
mkdir .next
chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]