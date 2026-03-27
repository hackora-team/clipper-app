# Chunked Upload — Implementation Plan

## Already done on this branch
- `Upload` model + `UploadStatus` enum in `schema.prisma`
- `upload.route.ts` — 3-phase API:
  - `POST /api/upload/init` → returns `{ uploadId, totalChunks }`
  - `POST /api/upload/:id/chunk` — streams raw binary body via `incoming.pipe(ws)` to `chunks/{uploadId}/{index}.part`
  - `POST /api/upload/:id/finalize` → assembles parts, creates `Job`, enqueues BullMQ, returns `{ jobId }`
- `initStorage` creates the `chunks` dir

## Step 1 — Run Prisma migration
`schema.prisma` has the `Upload` model but no migration file exists for it yet.
```
cd apps/api && npx prisma migrate dev --name add-upload-model
```

## Step 2 — Mount uploadRoute in `index.ts`
- Import `uploadRoute` and add `app.route("/api/upload", uploadRoute)`
- Add `x-chunk-index` and `x-chunk-total` to CORS `allowHeaders`

## Step 3 — Rewrite `uploadVideo()` in `api.ts`
Replace the single XHR to `POST /api/jobs` with:

1. `POST /api/upload/init` → `{ fileName, mimeType, fileSize }` → get `uploadId, totalChunks`
2. Loop over chunks (5 MB slices of the `File`):
   - `fetch POST /api/upload/:uploadId/chunk`
   - Body: raw `Blob` slice (no FormData)
   - Headers: `x-chunk-index: N`, `x-chunk-total: M`
   - Progress: `(chunksUploaded / totalChunks) * 100` after each chunk
3. `POST /api/upload/:uploadId/finalize` → get `{ jobId }`

## What stays unchanged
- `job.route.ts` `POST /api/jobs` (old busboy route) — stays, frontend just won't call it
- `video-upload.tsx` — no changes needed
