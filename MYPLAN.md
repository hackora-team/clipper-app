# Clipper App — Full Implementation Plan

## Project Overview

Build a web application that takes long-form video content, uses AI to identify the most interesting and engaging moments, and automatically generates shorter clips with burned-in subtitles — ready for social media.

**No login required.** Users land on the page, upload a video, and get clips back. Jobs are identified by a unique ID in the URL — anyone with the link can view results (similar to how unlisted YouTube videos or shared Google Docs work).

**Core flow:**
Upload video → Extract audio → Transcribe with AI → Detect viral-worthy segments → Cut clips → Burn subtitles → Deliver downloads

---

## Current Project State

| Component | Status |
|---|---|
| Monorepo | pnpm workspaces (`apps/*`, `packages/*`) |
| Backend (`apps/api`) | Hono server on port 8000, single `GET /` route |
| Frontend (`apps/platform`) | React 19 + TanStack Start/Router + Tailwind 4, single home page |
| Database | PostgreSQL 16 via Docker on port 5446, Prisma configured but **no models** |
| Shared UI (`packages/ui`) | `@monorepo/ui` with a single `Button` component |
| Queue / Workers | None |
| AI / Video Processing | None |

---

## Tech Stack Decisions

| Concern | Choice | Rationale |
|---|---|---|
| Video processing | `fluent-ffmpeg` + system `ffmpeg` | Industry standard, handles all codec/format needs |
| Job queue | BullMQ + Redis | Reliable, supports retries/backoff, great for long-running video tasks |
| AI transcription | OpenAI Whisper API | Accurate word-level timestamps, supports many languages |
| AI clip detection | OpenAI GPT-4o | Analyze transcript to find viral-worthy segments with scoring |
| File storage | Local filesystem (`storage/`) for dev, S3-compatible for prod | Simple to start, easy to migrate |
| Real-time updates | Server-Sent Events (SSE) | Lightweight, one-way updates perfect for job progress |
| Auth | **None** | Anonymous access — no login required, jobs identified by unique URL |
| State management | TanStack Query | Already in the TanStack ecosystem, great for server state |
| Recent jobs memory | `localStorage` | Store recent jobIds client-side so user can revisit past jobs |

---

## Database Schema (Prisma)

No `User` model — jobs are anonymous and accessed by their unique `cuid` ID.

```prisma
enum JobStatus {
  PENDING
  EXTRACTING_AUDIO
  TRANSCRIBING
  DETECTING_CLIPS
  RENDERING
  COMPLETED
  FAILED
  EXPIRED
}

enum ClipStatus {
  PENDING
  RENDERING
  COMPLETED
  FAILED
}

model Job {
  id           String    @id @default(cuid())
  status       JobStatus @default(PENDING)
  fileName     String
  filePath     String?
  audioPath    String?
  transcript   Json?
  errorMessage String?
  clips        Clip[]
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

model Clip {
  id           String     @id @default(cuid())
  jobId        String
  job          Job        @relation(fields: [jobId], references: [id])
  title        String
  description  String?
  startTime    Float
  endTime      Float
  duration     Float
  viralScore   Float      @default(0)
  outputPath   String?
  subtitlePath String?
  status       ClipStatus @default(PENDING)
  errorMessage String?
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
}
```

---

## Backend Architecture (`apps/api`)

### File Structure

```
apps/api/src/
├── index.ts                          # App entry: mount routes, start worker + cron
├── routes/
│   ├── job.route.ts                  # Upload + job status endpoints
│   └── clip.route.ts                 # Clip listing + download
├── services/
│   ├── ffmpeg.service.ts             # ffmpeg wrapper (extract audio, cut, burn subs)
│   ├── transcription.service.ts      # OpenAI Whisper API integration
│   ├── clip-detection.service.ts     # GPT-4o transcript analysis for clip detection
│   ├── clip-cutting.service.ts       # Cut video segments at timestamps
│   ├── subtitle.service.ts           # Generate ASS subtitles + burn into video
│   ├── cleanup.service.ts            # Delete temp/expired files
│   └── cron.service.ts               # Scheduled cleanup (24h TTL)
├── queue/
│   └── processors/
│       ├── extract-audio.ts          # Step 1: Video → WAV
│       ├── transcribe.ts             # Step 2: WAV → word-level transcript
│       ├── detect-clips.ts           # Step 3: Transcript → interesting segments
│       ├── render-clip.ts            # Step 4: Cut + subtitle + encode per clip
│       └── cleanup.ts               # Periodic file cleanup
├── lib/
│   ├── redis.ts                      # Shared IORedis connection
│   ├── queue.ts                      # BullMQ queue definitions
│   ├── worker.ts                     # Worker + job name routing
│   └── openai.ts                     # OpenAI client singleton
├── types/
│   └── queue.ts                      # Job payload TypeScript interfaces
└── utils/
    └── prisma.ts                     # Existing Prisma client
```

### API Routes

All routes are public — no authentication required.

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/jobs` | Upload video + create job (multipart form) |
| `GET` | `/api/jobs/:id` | Get job details with clips |
| `GET` | `/api/jobs/:id/clips` | List clips for a job |
| `GET` | `/api/clips/:id/download` | Download rendered clip file |
| `GET` | `/api/jobs/:id/events` | SSE stream for real-time job progress |

5 routes total. Simple and focused.

### Video Processing Pipeline (BullMQ)

The pipeline is a sequence of jobs chained together. Each step queues the next on success.

```
User uploads video
       │
       ▼
┌─────────────────────┐
│  1. EXTRACT AUDIO   │  Video → 16kHz mono WAV
│  (extract-audio)    │  Update Job → EXTRACTING_AUDIO
└────────┬────────────┘
         │ queues next
         ▼
┌─────────────────────┐
│  2. TRANSCRIBE      │  WAV → OpenAI Whisper API → word-level JSON
│  (transcribe)       │  Update Job → TRANSCRIBING
└────────┬────────────┘
         │ queues next
         ▼
┌─────────────────────┐
│  3. DETECT CLIPS    │  Transcript → GPT-4o → scored clip suggestions
│  (detect-clips)     │  Update Job → DETECTING_CLIPS
│                     │  Create Clip records in DB
└────────┬────────────┘
         │ queues N render jobs (one per clip)
         ▼
┌─────────────────────┐
│  4. RENDER CLIP     │  Per clip: cut segment → generate subtitles → burn
│  (render-clip)      │  Update Job → RENDERING
│  × N clips          │  When all clips done → Job → COMPLETED
└─────────────────────┘
```

### AI Integration Details

**Step 2 — Transcription (OpenAI Whisper):**
- Send extracted audio to `POST /v1/audio/transcriptions`
- Request `verbose_json` response format for word-level timestamps
- Store full transcript JSON on the Job record
- Each word object: `{ word: string, start: number, end: number }`

**Step 3 — Clip Detection (GPT-4o):**
- Send transcript text to GPT-4o with a carefully crafted prompt
- The prompt instructs the model to:
  - Identify 3–8 segments (15–90 seconds each) that are most engaging
  - Score each segment 0–100 on "viral potential"
  - Provide a short catchy title and description for each
  - Return exact start/end timestamps from the transcript
- Parse the structured JSON response
- Create `Clip` records in the database for each detected segment

**Example prompt structure:**

```
You are a viral content editor. Analyze this transcript from a long-form video
and identify the most engaging, shareable moments.

For each clip, return:
- title: A catchy, click-worthy title (max 60 chars)
- description: Why this moment is engaging (1 sentence)
- startTime: Start timestamp in seconds
- endTime: End timestamp in seconds
- viralScore: 0-100 score based on engagement potential

Criteria for high viral scores:
- Emotional peaks (humor, surprise, insight)
- Self-contained stories or anecdotes
- Controversial or debate-worthy statements
- Actionable advice or tips
- Strong opening hooks

Return 3-8 clips, sorted by viralScore descending.
Ensure clips don't overlap and each is 15-90 seconds long.

TRANSCRIPT:
{transcript_text_with_timestamps}
```

### Retry & Error Handling

| Config | Value |
|---|---|
| Max attempts | 3 |
| Backoff | Exponential: 2s → 4s → 8s |
| On permanent failure | Set Job → FAILED, clean up all temp files |

### File Cleanup (Cron)

- Runs every hour via `node-cron`
- Deletes files in `storage/uploads/`, `storage/temp/`, `storage/outputs/` older than 24h
- Marks completed/failed Jobs as `EXPIRED` after 24h

---

## Frontend Architecture (`apps/platform`)

### File Structure

```
apps/platform/src/
├── routes/
│   ├── __root.tsx                    # Root layout: navbar, global styles
│   ├── index.tsx                     # Home page: hero + upload zone
│   └── jobs/
│       └── $jobId.tsx                # Job detail: progress + clip results
├── components/
│   ├── navbar.tsx                    # Top navigation bar (logo + "New Clip" link)
│   ├── video-upload.tsx              # Drag-and-drop upload with progress bar
│   ├── job-progress.tsx              # Real-time step-by-step progress indicator (SSE)
│   ├── clip-card.tsx                 # Single clip preview card
│   ├── clip-player.tsx              # Video player for clip preview
│   ├── viral-score-badge.tsx         # Visual score indicator
│   └── recent-jobs.tsx              # List of recent jobs from localStorage
├── hooks/
│   ├── use-jobs.ts                   # TanStack Query hooks for jobs
│   ├── use-clips.ts                  # TanStack Query hooks for clips
│   ├── use-job-events.ts            # SSE hook for real-time job progress
│   └── use-recent-jobs.ts           # localStorage hook for recent job history
├── lib/
│   ├── api.ts                        # Fetch wrapper pointed at backend
│   └── utils.ts                      # Shared helpers (formatDuration, etc.)
├── router.tsx                        # Existing TanStack router config
├── routeTree.gen.ts                  # Auto-generated route tree
└── styles.css                        # Global Tailwind styles
```

### Pages & UX Flow

Only **2 pages** — minimal and focused.

**1. Home Page (`/`)**
- Hero section: "Turn long videos into viral clips with AI"
- Feature highlights (AI detection, auto-subtitles, viral scoring)
- Large drag-and-drop upload zone for video files
  - Accepted formats: MP4, MOV, AVI, MKV, WebM
  - File size limit display (e.g., 500MB)
  - Upload progress bar
  - On upload complete → redirect to `/jobs/$jobId`
- "Recent Jobs" section below the upload zone
  - Reads `jobId` list from `localStorage`
  - Shows file name, status, date for each
  - Click → navigate to job detail page

**2. Job Detail Page (`/jobs/$jobId`)**
- **While processing:**
  - Step-by-step progress indicator (extract → transcribe → detect → render)
  - Current step highlighted with spinner
  - SSE-powered real-time updates (no polling)
- **When completed:**
  - Grid of clip cards, sorted by viral score
  - Each clip card shows: title, duration, viral score badge, thumbnail preview
  - Click clip → expand with video player
  - Download button per clip
  - "Download All" button (zip)
- **On failure:**
  - Error message with explanation
  - "Try Again" button → navigate back to home to re-upload
- **On expired:**
  - Friendly message: "This job has expired. Files are deleted after 24 hours."
  - "Create New Clip" button → navigate home

### Client-Side Job History (localStorage)

Instead of a database-backed job list, store recent jobs in the browser:

```typescript
type RecentJob = {
  id: string;
  fileName: string;
  createdAt: string;
};

// On upload success: push new entry to localStorage array
// On home page load: read array and display as "Recent Jobs"
// Max 20 entries, oldest removed first
```

### UI Design Direction

- Clean, modern, dark-mode-first design
- Tailwind CSS with consistent color palette
- Lucide icons (already installed)
- Responsive: works on desktop and tablet
- Smooth transitions between processing states
- Skeleton loaders while data loads

---

## Implementation Phases

### Phase 0 — Infrastructure Setup
> Estimated: 1 session

- [ ] Add Redis service to `docker-compose.dev.yml`
- [ ] Add `REDIS_URL` and `OPENAI_API_KEY` to `.env`
- [ ] Install backend dependencies: `bullmq`, `ioredis`, `fluent-ffmpeg`, `node-cron`, `openai`
- [ ] Install dev dependencies: `@types/fluent-ffmpeg`, `@types/node-cron`
- [ ] Create `storage/` directories: `uploads/`, `temp/`, `outputs/`
- [ ] Define Prisma schema (Job + Clip models, no User)
- [ ] Run `prisma migrate dev` to create tables
- [ ] Set up BullMQ infrastructure (`lib/redis.ts`, `lib/queue.ts`, `lib/worker.ts`)
- [ ] Set up OpenAI client (`lib/openai.ts`)
- [ ] Fix root `dev` script (change `-filter` to `--filter`)

### Phase 1 — Video Upload + Job Creation
> Estimated: 1 session

**Backend:**
- [ ] Create `POST /api/jobs` route with multipart upload handling
- [ ] Validate file type (video only) and size limit
- [ ] Save uploaded file to `storage/uploads/{jobId}.{ext}`
- [ ] Create Job record in DB with status `PENDING`
- [ ] Queue `extract-audio` job in BullMQ
- [ ] Create `GET /api/jobs/:id` route (returns job + clips)

**Frontend:**
- [ ] Install TanStack Query + react-dropzone
- [ ] Create `lib/api.ts` fetch wrapper
- [ ] Build home page with hero section + drag-and-drop upload
- [ ] Build upload progress bar
- [ ] On upload success: save to localStorage, redirect to `/jobs/$jobId`
- [ ] Build `use-recent-jobs.ts` hook + recent jobs list on home page
- [ ] Build navbar component

### Phase 2 — Audio Extraction + Transcription
> Estimated: 1 session

**Backend:**
- [ ] Implement `ffmpeg.service.ts` with `extractAudio()` helper
- [ ] Build `extract-audio` processor: video → 16kHz mono WAV
- [ ] Implement `transcription.service.ts` using OpenAI Whisper API
- [ ] Build `transcribe` processor: WAV → word-level transcript JSON
- [ ] Chain: extract-audio success → queue transcribe job
- [ ] Create `GET /api/jobs/:id/events` SSE endpoint

**Frontend:**
- [ ] Build SSE hook (`use-job-events.ts`)
- [ ] Build job progress component (step-by-step indicator)
- [ ] Build job detail page (`/jobs/$jobId`) with live progress

### Phase 3 — AI Clip Detection
> Estimated: 1 session

**Backend:**
- [ ] Implement `clip-detection.service.ts` with GPT-4o integration
- [ ] Craft and test the viral content detection prompt
- [ ] Parse structured JSON response from GPT-4o
- [ ] Build `detect-clips` processor: transcript → scored clip suggestions
- [ ] Create Clip records in DB for each detected segment
- [ ] Chain: detect-clips success → queue render-clip jobs (one per clip)

### Phase 4 — Clip Rendering (Cut + Subtitles)
> Estimated: 1–2 sessions

**Backend:**
- [ ] Implement `clip-cutting.service.ts`: accurate ffmpeg seeking + cutting
- [ ] Implement `subtitle.service.ts`: word grouping → ASS file generation → burn
- [ ] Build `render-clip` processor: cut → generate subs → burn → final MP4
- [ ] Track per-clip status in DB
- [ ] When all clips for a job are done, set Job → COMPLETED
- [ ] Create `GET /api/jobs/:id/clips` and `GET /api/clips/:id/download` routes

**Frontend:**
- [ ] Build clip card component (title, duration, viral score badge)
- [ ] Build clip player component (inline video preview)
- [ ] Complete job detail page: show clip grid when job is COMPLETED
- [ ] Add download button per clip
- [ ] Add "Download All" functionality

### Phase 5 — Error Handling, Cleanup + Polish
> Estimated: 1 session

**Backend:**
- [ ] Configure BullMQ retry: 3 attempts, exponential backoff
- [ ] Implement `cleanup.service.ts` for artifact removal on failure
- [ ] Handle permanent failures: set Job/Clip → FAILED, clean up files
- [ ] Implement `cron.service.ts` with hourly cleanup schedule
- [ ] Delete files older than 24h, mark Jobs as EXPIRED
- [ ] Register cron in server startup

**Frontend:**
- [ ] Show error state on job detail page with "Try Again" button
- [ ] Show per-clip error states in the clip grid
- [ ] Show EXPIRED state gracefully (files no longer available)
- [ ] Polish: loading skeletons, empty states, smooth transitions
- [ ] Responsive design pass

---

## Environment Variables

```env
# Existing
TEST=hello
VITE_TEST=hello-client
DATABASE_URL="postgresql://postgres:postgres@localhost:5446/postgres"

# New — Backend
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sk-...
MAX_UPLOAD_SIZE_MB=500
STORAGE_PATH=./storage

# New — Frontend
VITE_API_URL=http://localhost:8000
```

---

## Docker Compose (Updated)

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: postgres
    ports:
      - "5446:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

## Dependencies to Install

### Backend (`apps/api`)

```bash
# Runtime
pnpm --filter=api add bullmq ioredis fluent-ffmpeg node-cron openai

# Dev
pnpm --filter=api add -D @types/fluent-ffmpeg @types/node-cron
```

### Frontend (`apps/platform`)

```bash
pnpm --filter=platform add @tanstack/react-query react-dropzone
```

### System requirement

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg
```

---

## Key Technical Considerations

1. **ffmpeg must be installed on the host** — `fluent-ffmpeg` is just a Node wrapper; the actual binary needs to be in `$PATH`.

2. **Large file uploads** — Use chunked/streaming uploads to avoid memory issues. Hono supports streaming request bodies.

3. **Concurrency control** — Limit BullMQ worker concurrency (e.g., 2 concurrent jobs) to avoid overwhelming the machine with parallel ffmpeg processes.

4. **SSE connection management** — Clean up SSE connections when clients disconnect. Use Hono's streaming response helpers.

5. **OpenAI rate limits** — Whisper API has file size limits (25MB). For longer audio, split into chunks and stitch transcripts back together.

6. **Subtitle timing accuracy** — Word-level timestamps from Whisper can drift. Add small padding around clip boundaries and validate subtitle sync.

7. **Storage growth** — The 24h cleanup cron is critical. Without it, disk usage will grow unbounded. For production, move to S3/R2 with lifecycle policies.

8. **Anonymous access trade-off** — Anyone with a `jobId` URL can view that job's results. Since `cuid` IDs are long and random, this is effectively secure (like unlisted YouTube links). No enumeration is possible.

---

## Summary

| Phase | What | Backend | Frontend |
|---|---|---|---|
| 0 | Infrastructure | Redis, BullMQ, Prisma schema, OpenAI client | — |
| 1 | Upload + Jobs | Upload route, job creation | Home page, upload UI, recent jobs |
| 2 | Extract + Transcribe | ffmpeg audio extraction, Whisper API | SSE progress, job detail page |
| 3 | AI Clip Detection | GPT-4o integration, clip scoring | — |
| 4 | Clip Rendering | Cut + subtitle + encode pipeline | Clip cards, player, download |
| 5 | Cleanup + Polish | Retries, cron cleanup, error handling | Error/expired UI, polish, responsive |
