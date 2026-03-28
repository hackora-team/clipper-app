FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@10.22.0 --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/platform/package.json ./apps/platform/
COPY packages/ui/package.json ./packages/ui/

RUN pnpm install --frozen-lockfile

COPY apps/platform ./apps/platform
COPY packages/ui ./packages/ui

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm --filter platform build

WORKDIR /app/apps/platform

EXPOSE 3000

CMD ["node", "server.mjs"]
