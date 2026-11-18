# Sampacho Conecta — imagen de producción (Node 24: la base usa node:sqlite)
# Etapas: deps → builder → tools (comandos de mantenimiento) → runner (la app)
FROM node:24-bookworm-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Herramientas de mantenimiento (seed, create-admin): incluye código fuente y dependencias de desarrollo.
FROM builder AS tools
ENV NODE_ENV=production SAMPACHO_DATA_DIR=/data
USER node
CMD ["node", "--version"]

# La aplicación: solo lo mínimo para correr.
FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    SAMPACHO_DATA_DIR=/data
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --chown=node:node scripts/backup.mjs ./backup.mjs
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/salud').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
