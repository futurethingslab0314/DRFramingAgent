# ── Stage 1: Build Frontend ───────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npx vite build

# ── Stage 2: Build Backend ────────────────────────────────────
FROM node:20-alpine AS backend-builder

WORKDIR /app

# Copy package files and install
COPY backend/package.json backend/package-lock.json ./
RUN npm ci

# Copy source
COPY backend/tsconfig.json ./tsconfig.json
COPY backend/src/ ./src/

# Compile TypeScript
RUN npx tsc

# ── Stage 3: Run ──────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Copy compiled backend JS + production deps
COPY --from=backend-builder /app/dist ./dist
COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app/package.json ./package.json

# Copy frontend build output
COPY --from=frontend-builder /app/frontend/dist ./public

ENV PORT=3001
EXPOSE 3001

CMD ["node", "dist/server.js"]
