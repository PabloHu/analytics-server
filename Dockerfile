# Multi-stage build for Analytics Server (Node.js backend)

# Stage 1: Dependencies
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production

# Stage 2: Production
FROM node:20-slim AS runner
WORKDIR /app

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy application code
COPY server.js ./
COPY middleware/ ./middleware/
COPY routes/ ./routes/
COPY scripts/ ./scripts/

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 analytics && \
    chown -R analytics:nodejs /app

USER analytics

EXPOSE 3100

ENV NODE_ENV=production

CMD ["node", "server.js"]
