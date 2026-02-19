# ── Stage 1: Build ────────────────────────────────────────────
# Context = repo root (set by Railway).  All COPYs are relative to repo root.
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install
COPY backend/package.json backend/package-lock.json ./
RUN npm ci

# Copy source
COPY backend/tsconfig.json ./tsconfig.json
COPY backend/src/ ./src/

# Compile TypeScript
RUN npx tsc

# ── Stage 2: Run ──────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Copy compiled JS + production deps
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

ENV PORT=3001
EXPOSE 3001

CMD ["node", "dist/server.js"]
