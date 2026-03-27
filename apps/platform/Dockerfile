FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.22.0 --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/platform/package.json ./apps/platform/

RUN pnpm install --filter platform --frozen-lockfile

COPY apps/platform ./apps/platform

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm --filter platform build

# Production image
FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@10.22.0 --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/platform/package.json ./apps/platform/

RUN pnpm install --filter platform --frozen-lockfile

COPY --from=builder /app/apps/platform/dist ./apps/platform/dist

WORKDIR /app/apps/platform

EXPOSE 3000

CMD ["node", "dist/server/server.js"]
