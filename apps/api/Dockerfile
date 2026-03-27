FROM node:20-alpine

# ffmpeg on Alpine includes libass for subtitle burning
RUN apk add --no-cache ffmpeg fontconfig ttf-freefont

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@10.22.0 --activate

WORKDIR /app

# Copy workspace manifests for dependency install
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma
COPY apps/api/prisma.config.ts ./apps/api/

# Install dependencies
RUN pnpm install --filter api --frozen-lockfile

# Copy source
COPY apps/api/src ./apps/api/src
COPY apps/api/tsconfig.json ./apps/api/

# Generate Prisma client and build
RUN pnpm --filter api exec prisma generate
RUN pnpm --filter api build

EXPOSE 8000

CMD ["node", "apps/api/dist/index.js"]
