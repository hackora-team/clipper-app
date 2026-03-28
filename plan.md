# Clipper App — Plan for Tasks A2–A7

## Person A: Infrastructure + Video Processing Pipeline

---

## Current Project State

| What               | Status                                                                 |
| ------------------ | ---------------------------------------------------------------------- |
| **Hono server**    | Running on port 8000 (project uses Hono, not Express)                  |
| **Prisma**         | Set up but **no models** yet (Person C owns schema, we need Job/Clip)  |
| **Redis**          | **Not in docker-compose** — needed for BullMQ                          |
| **BullMQ**         | **Not installed** — part of A1, needs setup as prerequisite            |
| **ffmpeg**         | **Not installed** as a Node dependency — core requirement for A2–A5    |
| **Dir scaffolding** | Already has `src/queue/processors/`, `src/routes/`, `src/services/`, `storage/{outputs,temp,uploads}` |

---

## Prerequisites (backfill from A1)

Before A2–A7 can work, these A1 items need to be in place:

1. Add **Redis** service to `docker-compose.dev.yml` + `REDIS_URL` in `.env`
2. Install **bullmq**, **fluent-ffmpeg**, **@types/fluent-ffmpeg**, **node-cron**, **@types/node-cron**
3. Create minimum **Job** + **Clip** Prisma models (coordinate with Person C)
4. Set up BullMQ infrastructure (queue definitions, worker, job routing)

---

## File Structure (what we'll create)

```
apps/api/src/
├── index.ts                          (modify: register worker + cron startup)
├── lib/
│   ├── redis.ts                      (new: Redis/IORedis connection)
│   ├── queue.ts                      (new: BullMQ queue definitions)
│   └── worker.ts                     (new: Worker + job routing)
├── types/
│   └── queue.ts                      (new: job payload type definitions)
├── queue/
│   └── processors/
│       ├── extract-audio.ts          (new: A2)
│       ├── render-clip.ts            (new: A5)
│       └── cleanup.ts               (new: A7)
├── services/
│   ├── ffmpeg.service.ts             (new: shared ffmpeg helpers)
│   ├── clip-cutting.service.ts       (new: A3)
│   ├── subtitle.service.ts           (new: A4)
│   ├── cleanup.service.ts            (new: A6 artifact cleanup)
│   └── cron.service.ts               (new: A7 scheduler)
├── routes/                           (empty — Person D creates job routes)
└── utils/
    └── prisma.ts                     (existing, no changes)
```

---

## Implementation Phases

### Phase 1 — Foundation (Prerequisites)

#### 1.1 Add Redis to Docker Compose

- Add Redis 7 service to `docker-compose.dev.yml` on port `6379`
- Add `REDIS_URL=redis://localhost:6379` to `.env`

#### 1.2 Install dependencies

```bash
pnpm --filter=api add bullmq ioredis fluent-ffmpeg node-cron
pnpm --filter=api add -D @types/fluent-ffmpeg @types/node-cron
```

#### 1.3 Define Prisma models (Job + Clip)

Add enums and models to `apps/api/prisma/schema.prisma`:

- **`JobStatus`** enum: `PENDING`, `EXTRACTING_AUDIO`, `TRANSCRIBING`, `DETECTING_CLIPS`, `RENDERING`, `COMPLETED`, `FAILED`, `EXPIRED`
- **`ClipStatus`** enum: `PENDING`, `RENDERING`, `COMPLETED`, `FAILED`
- **`Job`** model: `id`, `userId` (nullable until Person C adds User), `status`, `filePath`, `audioPath`, `transcript` (JSON), `errorMessage`, `createdAt`, `updatedAt`
- **`Clip`** model: `id`, `jobId` (FK → Job), `title`, `description`, `startTime` (Float), `endTime` (Float), `viralScore` (Float), `outputPath`, `subtitlePath`, `status`, `errorMessage`, `createdAt`, `updatedAt`

Run migration after schema is defined.

#### 1.4 Set up BullMQ infrastructure

| File                  | Purpose                                                        |
| --------------------- | -------------------------------------------------------------- |
| `src/lib/redis.ts`    | Export shared IORedis connection using `REDIS_URL`             |
| `src/lib/queue.ts`    | Define `videoProcessingQueue` (single queue, job-name routing) |
| `src/lib/worker.ts`   | Worker that routes jobs by name to the correct processor       |
| `src/types/queue.ts`  | TypeScript interfaces for each job payload                     |

Job names: `extract-audio`, `transcribe`, `detect-clips`, `render-clip`

---

### Phase 2 — A2: Audio Extraction Processor

**Goal:** Extract audio from uploaded video as 16kHz mono WAV.

**File:** `src/queue/processors/extract-audio.ts`
**Helper:** `src/services/ffmpeg.service.ts`

**Logic:**

1. Receive job payload: `{ jobId, videoPath }`
2. Update `Job.status` → `EXTRACTING_AUDIO`
3. Run ffmpeg: input video → 16kHz mono WAV → `storage/temp/{jobId}.wav`
   - Flags: `-vn -acodec pcm_s16le -ar 16000 -ac 1`
4. On success:
   - Save `audioPath` on the Job record
   - Auto-queue `transcribe` job with `{ jobId, audioPath }`
5. On failure:
   - Log ffmpeg stderr
   - Throw error (BullMQ retry handles it — see Phase 6)

**ffmpeg.service.ts** exports reusable helpers:
- `extractAudio(inputPath, outputPath): Promise<void>`
- `cutClip(inputPath, outputPath, startTime, endTime): Promise<void>`
- `burnSubtitles(inputPath, subtitlePath, outputPath): Promise<void>`
- `getVideoDuration(inputPath): Promise<number>`

---

### Phase 3 — A3: Clip Cutting Service

**Goal:** Cut a segment from the original video at detected timestamps.

**File:** `src/services/clip-cutting.service.ts`

**Logic:**

1. Accept `videoPath`, `startTime`, `endTime`, `outputPath`
2. Use ffmpeg with accurate seeking:
   - Fast seek: `-ss {startTime}` before `-i` for rough positioning
   - Duration: `-t {endTime - startTime}`
   - Re-encode: `-c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k`
3. Handle edge cases:
   - Add 0.1s padding before start for keyframe accuracy
   - Ensure audio stays in sync with `-async 1`
4. Return output path on success

---

### Phase 4 — A4: Subtitle Burning

**Goal:** Generate styled subtitles and burn them into clips.

**File:** `src/services/subtitle.service.ts`

**Logic:**

1. **Group words into phrases:**
   - Take word-level timestamps from transcript (`{ word, start, end }[]`)
   - Group into display phrases: max 6–8 words per line
   - Break at pauses > 500ms or sentence-ending punctuation (`.!?`)
2. **Generate ASS subtitle file:**
   - Style: white text, black outline (border 3), bottom center, bold sans-serif font
   - Write phrases with timestamps to `.ass` format in `storage/temp/{clipId}.ass`
3. **Burn into clip:**
   - Use ffmpeg `subtitles` filter: `-vf "subtitles={assPath}"`
   - Output: valid MP4 (H.264 + AAC)
   - Save to `storage/outputs/{clipId}.mp4`

---

### Phase 5 — A5: Render Clip Processor (Orchestrator)

**Goal:** Orchestrate the full render pipeline for a single clip.

**File:** `src/queue/processors/render-clip.ts`

**Logic:**

1. Receive job payload: `{ jobId, clipId, videoPath, startTime, endTime, words }`
2. Update `Clip.status` → `RENDERING`
3. Pipeline:
   - **Step 1 — Cut:** Call clip-cutting service → `storage/temp/{clipId}_raw.mp4`
   - **Step 2 — Subtitles:** Generate ASS file → `storage/temp/{clipId}.ass`
   - **Step 3 — Burn:** Burn subtitles into cut clip → `storage/outputs/{clipId}.mp4`
4. On success:
   - Update `Clip.status` → `COMPLETED`, save `outputPath`
   - Clean up temp files (`_raw.mp4`, `.ass`)
   - Check if ALL clips for the parent Job are now `COMPLETED` or `FAILED`
   - If yes → update `Job.status` → `COMPLETED`
5. On failure:
   - Update `Clip.status` → `FAILED` with error message
   - Clean up partial temp files
   - Still check if all clips are resolved (to complete the Job even with partial failures)

---

### Phase 6 — A6: Retry Logic & Error Handling

**Goal:** Automatic retries with backoff, clean up on permanent failure.

**Modify:** `src/lib/worker.ts`, create `src/services/cleanup.service.ts`

**Retry config (per job in BullMQ):**

```
attempts: 3
backoff: { type: 'exponential', delay: 2000 }
```

- Delays: 2s → 4s → 8s

**cleanup.service.ts:**

- `cleanupJobArtifacts(jobId)`: delete all files in `storage/temp/` and `storage/outputs/` matching the jobId
- `cleanupClipArtifacts(clipId)`: delete temp files for a specific clip

**On permanent failure (all retries exhausted):**

1. Set `Job.status` → `FAILED` with descriptive error message
2. Call `cleanupJobArtifacts(jobId)` to remove all partial files
3. (Person C hooks into this to trigger credit refund)

**Per-processor error handling:**

| Processor       | Common Errors                        | Handling                            |
| --------------- | ------------------------------------ | ----------------------------------- |
| extract-audio   | Corrupt video, ffmpeg crash, no audio track | Log stderr, retry, then fail Job |
| render-clip     | ffmpeg OOM, disk full, invalid timestamps   | Clean partial output, retry        |

---

### Phase 7 — A7: Automated File Cleanup (24h TTL)

**Goal:** Delete files older than 24 hours, mark expired Jobs.

**Files:** `src/services/cron.service.ts`, `src/queue/processors/cleanup.ts`

**Logic:**

1. **Cron schedule:** Run every hour via `node-cron` (`0 * * * *`)
2. **File cleanup:**
   - Scan `storage/uploads/`, `storage/temp/`, `storage/outputs/`
   - Delete any file with `mtime` older than 24 hours
3. **Database cleanup:**
   - Find Jobs where `status = COMPLETED` or `FAILED` and `updatedAt < 24h ago`
   - Update status → `EXPIRED`
   - Null out file paths (`filePath`, `audioPath`)
   - Update related Clips: null out `outputPath`, `subtitlePath`
4. **Logging:** Log count of files deleted and jobs expired per run
5. **Startup:** Register cron in `src/index.ts` so it starts with the server

---

## Implementation Order & Dependencies

```
Phase 1 (Prerequisites)
  ├── 1.1 Redis in Docker         ─┐
  ├── 1.2 Install deps            ─┤── Parallel
  └── 1.3 Prisma models           ─┘
       └── 1.4 BullMQ infra       ── Depends on 1.1 + 1.2
            └── Phase 2 (A2: Extract Audio)
                 └── Phase 3 (A3: Clip Cutting)    ─┐
                      └── Phase 4 (A4: Subtitles)   ─┤── A3 + A4 feed into A5
                           └── Phase 5 (A5: Render)  ┘
                                └── Phase 6 (A6: Retry / Cleanup)
                                     └── Phase 7 (A7: Cron Cleanup)
```

---

## Coordination Points

| With     | Topic                          | Details                                                                 |
| -------- | ------------------------------ | ----------------------------------------------------------------------- |
| Person C | Prisma schema                  | They own User/Plan/Credit models. We add Job + Clip with `userId` FK.   |
| Person C | Credit refund on failure       | A6 permanent failure should trigger C's `refundCredits()`.              |
| Person B | Transcribe job payload         | A2 queues `transcribe` — agree on `{ jobId, audioPath }` shape.        |
| Person B | Render-clip trigger            | B4 queues `render-clip` jobs — agree on `{ jobId, clipId, ... }` shape.|
| Person D | SSE progress events            | Each processor should emit events for D's frontend to consume.          |

---

## Notes

- **ffmpeg must be installed** on the host machine for dev (`brew install ffmpeg` on macOS). For production, it goes in the Docker image.
- The project uses **Hono** (not Express). All routes and middleware follow Hono patterns.
- We use **fluent-ffmpeg** as a Node wrapper but the actual `ffmpeg` binary must be in `$PATH`.
- BullMQ requires **IORedis** — we use a single shared connection for queue and worker.
