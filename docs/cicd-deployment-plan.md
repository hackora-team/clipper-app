# CI/CD Deployment Plan

**Date:** 2026-03-27
**Target:** Sumopod VPS + Docker Compose
**Domain:** clipper.moni.id
**SSL:** Let's Encrypt (Certbot via nginx)
**Storage:** Docker named volume

---

## Architecture on VPS

```
Internet (HTTPS :443 / HTTP :80)
         ↓
   nginx container
   ├── clipper.moni.id/api/*  → api container (port 8000)
   └── clipper.moni.id/*      → platform container (nginx static, port 3000)

Internal Docker network (clipper-net):
   api → db (postgres:5432)
   api → redis (redis:6379)

Docker volumes:
   postgres_data  → /var/lib/postgresql/data
   redis_data     → /data
   storage_data   → /app/storage  (uploads, temp, outputs)
   certbot_conf   → /etc/letsencrypt
   certbot_www    → /var/www/certbot
```

---

## Files to Create

| File | Purpose |
|---|---|
| `apps/api/Dockerfile` | Node.js 20 + ffmpeg (with libass) image |
| `apps/api/.dockerignore` | Exclude node_modules, storage, .env |
| `apps/platform/Dockerfile` | Multi-stage: Vite build → nginx static |
| `apps/platform/.dockerignore` | Exclude node_modules |
| `apps/platform/nginx.conf` | SPA fallback config (try_files → index.html) |
| `nginx/default.conf` | Reverse proxy: /api/* → api, /* → platform, HTTPS redirect |
| `nginx/ssl.conf` | SSL params (TLS 1.2/1.3, ciphers, HSTS) |
| `docker-compose.prod.yml` | All production services |
| `.github/workflows/deployment.yml` | Updated CI/CD pipeline |

---

## Dockerfile Details

### `apps/api/Dockerfile`
```
FROM node:20-alpine

# Install ffmpeg with libass (for subtitle burning)
RUN apk add --no-cache ffmpeg

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.22.0 --activate

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/ ./packages/

# Install only api dependencies
RUN pnpm install --filter api --frozen-lockfile

# Copy source
COPY apps/api ./apps/api

# Generate Prisma client
RUN pnpm --filter api exec prisma generate

# Build TypeScript
RUN pnpm --filter api build

EXPOSE 8000

CMD ["node", "apps/api/dist/index.js"]
```

### `apps/platform/Dockerfile` (multi-stage)
```
# Stage 1: Build
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.22.0 --activate

WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY apps/platform/package.json ./apps/platform/
COPY packages/ ./packages/

RUN pnpm install --filter platform --frozen-lockfile

COPY apps/platform ./apps/platform

# Build args for env vars baked into frontend
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm --filter platform build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=builder /app/apps/platform/dist /usr/share/nginx/html
COPY apps/platform/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
```

---

## `docker-compose.prod.yml` Services

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf
      - ./nginx/ssl.conf:/etc/nginx/ssl.conf
      - certbot_conf:/etc/letsencrypt
      - certbot_www:/var/www/certbot
    depends_on:
      - api
      - platform
    restart: unless-stopped

  certbot:
    image: certbot/certbot
    volumes:
      - certbot_conf:/etc/letsencrypt
      - certbot_www:/var/www/certbot
    entrypoint: >
      /bin/sh -c "trap exit TERM;
      while :; do certbot renew --webroot -w /var/www/certbot;
      sleep 12h & wait $${!}; done"

  api:
    image: ghcr.io/hackora-team/clipper-api:latest
    environment:
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: redis://redis:6379
      ELEVENLABS_API_KEY: ${ELEVENLABS_API_KEY}
      OPENROUTER_API_KEY: ${OPENROUTER_API_KEY}
      STORAGE_PATH: /app/storage
      CORS_ORIGIN: https://clipper.moni.id
    volumes:
      - storage_data:/app/storage
    depends_on:
      - db
      - redis
    restart: unless-stopped

  platform:
    image: ghcr.io/hackora-team/clipper-platform:latest
    restart: unless-stopped

  db:
    image: postgres:16
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  storage_data:
  certbot_conf:
  certbot_www:

networks:
  default:
    name: clipper-net
```

---

## Nginx Config

### `nginx/default.conf`

```nginx
# HTTP → HTTPS redirect
server {
    listen 80;
    server_name clipper.moni.id;

    # Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS
server {
    listen 443 ssl;
    server_name clipper.moni.id;

    include /etc/nginx/ssl.conf;

    client_max_body_size 600m;

    # API proxy
    location /api/ {
        proxy_pass http://api:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 300s;  # long timeout for SSE + uploads
        proxy_send_timeout 300s;
    }

    # SSE — disable buffering
    location /api/jobs/ {
        proxy_pass http://api:8000;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 3600s;
    }

    # Platform (SPA)
    location / {
        proxy_pass http://platform:3000;
        proxy_set_header Host $host;
    }
}
```

### `nginx/ssl.conf`
```nginx
ssl_certificate     /etc/letsencrypt/live/clipper.moni.id/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/clipper.moni.id/privkey.pem;
ssl_protocols       TLSv1.2 TLSv1.3;
ssl_ciphers         HIGH:!aNULL:!MD5;
ssl_prefer_server_ciphers on;
add_header Strict-Transport-Security "max-age=31536000" always;
```

---

## Updated CI/CD Pipeline

### Job 1: `pr-check` (on PR → main)
1. Checkout
2. Setup pnpm 10.22.0 + Node 20
3. `pnpm install`
4. `pnpm lint` (Biome)
5. `pnpm --filter api exec tsc --noEmit` (type-check)

### Job 2: `deploy` (on push to main)
1. Checkout
2. Setup pnpm 10.22.0 + Node 20
3. `pnpm install`
4. `pnpm lint` + type-check
5. Login to GitHub Container Registry (`ghcr.io`)
6. Build & push `clipper-api` image
7. Build & push `clipper-platform` image (with `VITE_API_URL=https://clipper.moni.id`)
8. SSH into Sumopod VPS:
   ```bash
   docker compose -f docker-compose.prod.yml pull
   docker compose -f docker-compose.prod.yml run --rm api \
     node -e "require('./apps/api/dist/utils/prisma').prisma.\$executeRaw\`SELECT 1\`" \
     || true
   # Run prisma migrate
   docker compose -f docker-compose.prod.yml run --rm api \
     pnpm --filter api exec prisma migrate deploy
   docker compose -f docker-compose.prod.yml up -d
   ```

---

## GitHub Secrets Required

| Secret | Description |
|---|---|
| `VPS_HOST` | Sumopod VPS IP or hostname |
| `VPS_USER` | SSH user (e.g. `root` or `ubuntu`) |
| `VPS_SSH_KEY` | Private SSH key (PEM format) |
| `VPS_PORT` | SSH port (default `22`) |
| `DATABASE_URL` | `postgresql://user:pass@db:5432/clipper` |
| `POSTGRES_USER` | DB username |
| `POSTGRES_PASSWORD` | DB password |
| `POSTGRES_DB` | DB name |
| `ELEVENLABS_API_KEY` | ElevenLabs key |
| `OPENROUTER_API_KEY` | OpenRouter key |

GitHub token (`GITHUB_TOKEN`) is auto-provided for GHCR push — no extra secret needed.

---

## Code Changes Required

### 1. `apps/api/src/index.ts` — dynamic CORS origin
```ts
// Replace hardcoded localhost origins with:
origin: process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
  : ["http://localhost:3000", "http://localhost:4000"],
```

### 2. `apps/api/package.json` — add build script
```json
"build": "tsc -p tsconfig.json"
```

### 3. SSL bootstrapping (first deploy only)
On first deploy, SSL cert doesn't exist yet. Two-step process:
1. Deploy nginx with HTTP-only config first
2. Run `certbot certonly --webroot` to get cert
3. Redeploy nginx with HTTPS config

---

## One-Time VPS Setup (manual, before first deploy)

```bash
# On Sumopod VPS
apt update && apt install -y docker.io docker-compose-plugin
mkdir -p /opt/clipper
# Copy docker-compose.prod.yml and nginx/ to /opt/clipper
# Create .env file with all secrets
# Bootstrap SSL (see above)
```

---

## Deploy Flow Summary

```
Merge PR to main
      ↓
GitHub Actions
  ✓ lint + type-check
  ✓ docker build clipper-api  → ghcr.io/hackora-team/clipper-api:latest
  ✓ docker build clipper-platform (VITE_API_URL=https://clipper.moni.id)
                              → ghcr.io/hackora-team/clipper-platform:latest
  ✓ SSH to Sumopod VPS
      → docker compose pull
      → prisma migrate deploy
      → docker compose up -d
      ↓
Live at https://clipper.moni.id
```
