# ── Stage 1: Build ────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app/backend

# Copy package files and install
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY tsconfig.json ./
COPY src/ src/

# Compile TypeScript
RUN npx tsc

# ── Stage 2: Run ──────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app/backend

# Copy compiled JS + production deps
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/package.json ./package.json

EXPOSE 3001

CMD ["node", "dist/server.js"]
