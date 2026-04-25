# syntax=docker/dockerfile:1.6
# ======================================================================
# FECOT Frontend — Dockerfile (Next.js 16 com output: standalone)
# ======================================================================

# ----- Stage 1: deps -----
FROM node:20-alpine AS deps
WORKDIR /app

# Copia só os manifests primeiro pra cachear o npm install
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund --legacy-peer-deps


# ----- Stage 2: builder -----
FROM node:20-alpine AS builder
WORKDIR /app

# Build-arg pra a URL da API (vira variável NEXT_PUBLIC_*  embutida no bundle)
ARG NEXT_PUBLIC_API_URL=http://localhost:3002
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build de produção. `output: 'standalone'` no next.config gera um .next/standalone
# enxuto que carrega só o necessário (sem o node_modules inteiro)
RUN npm run build


# ----- Stage 3: runner -----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Usuário não-root
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Copia o output standalone (já contém node_modules trimado e package.json)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

# Healthcheck simples
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3000 || exit 1

# server.js é gerado pelo Next no modo standalone
CMD ["node", "server.js"]
