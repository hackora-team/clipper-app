# Vertical Layout (9:16) — Implementation Plan

## Overview

When a user selects 9:16 format, clips are rendered as portrait video (1080×1920)
with the frame automatically reframed to follow the active speaker.

---

## How It Works End-to-End

```
User selects 9:16 → uploads video
  ↓
Job created with aspectRatio = "9:16"
  ↓
[1] extract-audio        → unchanged
  ↓
[2] transcribe           → ElevenLabs with diarize=true (no chunking for 9:16)
                           each word gets speaker_id: "speaker_0" | "speaker_1"
  ↓
[3] detect-clips         → unchanged
  ↓
[4] render-clip (per clip, 9:16 path):
      a. Build speaker segments from transcript within clip time range
      b. Extract one frame per unique speaker → send to Gemini → face X positions
      c. Map speaker_id → face_center_x in the source video
      d. For each speaker segment in the clip:
           - Cut that segment from source video
           - Crop to 607×1080 centered on speaker's face_center_x
           - Scale to 1080×1920
           → segment_N.mp4
      e. Concatenate all segments → combined_raw.mp4
      f. Burn subtitles (9:16 ASS settings) → final output 1080×1920
```

---

## Speaker → Face Mapping Algorithm

### Why not use diarization with chunking?

ElevenLabs diarization returns speaker IDs relative to each audio chunk independently.
`speaker_0` in chunk 1 might be `speaker_1` in chunk 2. For 9:16 jobs we skip chunking
entirely and send the full audio as one request (ElevenLabs supports up to 2GB).
Timeout is raised to 600s for this path.

### Face mapping steps

```
1. Build speaker timeline from diarized transcript:
   [
     { speaker_id: "speaker_0", start: 0.0,  end: 12.4 },
     { speaker_id: "speaker_1", start: 12.4, end: 28.1 },
     { speaker_id: "speaker_0", start: 28.1, end: 41.0 },
     ...
   ]

2. Find unique speaker IDs → ["speaker_0", "speaker_1"]

3. For each unique speaker:
   - Find their first segment that is >= 3 seconds long
   - Pick timestamp = segment midpoint
   - Extract frame: ffmpeg -ss {t} -i video.mp4 -vframes 1 -q:v 2 frame.jpg

4. Send frame(s) to Gemini Flash via OpenRouter:
   Prompt: "This is a frame from a podcast video.
            Return ONLY a JSON array of face bounding boxes.
            Format: [{ x_center: 0.0-1.0 }]
            x_center is each face's horizontal center as fraction of image width.
            Sort by x_center ascending (left to right)."

   Gemini returns: [{ x_center: 0.25 }, { x_center: 0.74 }]

5. Map speaker → face by first-speech order:
   - Speaker who speaks earliest → leftmost face (x_center = 0.25)
   - Next speaker               → next face    (x_center = 0.74)

   Result: { speaker_0: 480px, speaker_1: 1421px }  (for 1920px wide source)

6. Fallbacks:
   - Gemini returns 0 faces → center crop (x_center = 0.5)
   - Gemini returns 1 face  → use that face for all speakers
   - 3+ speakers            → sort by first-speech, assign left-to-right
```

### Why this works

For podcast/interview content (the primary use case), speakers sit in fixed positions
for the entire recording. Detecting faces once is sufficient for the whole video.
The first-speech → leftmost-face heuristic matches the typical setup where the host
(who speaks first) sits on the left.

---

## Crop Math

Source: 1920×1080 (16:9)
Target: 1080×1920 (9:16)

```
crop_width  = floor(1080 × 9/16)  = 607px
crop_height = 1080px

crop_x = face_center_x_pixels − floor(607 / 2)
crop_x = clamp(crop_x, 0, 1920 − 607)   → clamp(crop_x, 0, 1313)

FFmpeg filter:
  crop=607:1080:{crop_x}:0, scale=1080:1920

Example — Speaker A at x=480:
  crop_x = 480 − 303 = 177
  → crop=607:1080:177:0, scale=1080:1920

Example — Speaker B at x=1421:
  crop_x = 1421 − 303 = 1118
  → crop=607:1080:1118:0, scale=1080:1920
```

---

## Subtitle Changes for 9:16

Current ASS header (16:9):
```
PlayResX: 1920
PlayResY: 1080
Fontsize:  72
MarginV:   50
```

9:16 ASS header:
```
PlayResX: 1080
PlayResY: 1920
Fontsize:  55   ← smaller to fit narrow width
MarginV:  200   ← more bottom margin looks better on portrait
```

The `buildAssContent` function receives an `aspectRatio` parameter and uses
the appropriate header. No changes needed to `burnSubtitles` — it just calls
`ffmpeg -vf subtitles=...` which respects the ASS PlayRes.

---

## Files to Change

### 1. `apps/api/prisma/schema.prisma`
Add `aspectRatio` to Job model:
```prisma
model Job {
  ...
  aspectRatio  String  @default("16:9")
  ...
}
```
Migration: `add-aspect-ratio`

### 2. `apps/api/src/services/transcription.service.ts`
- Add `speaker_id?: string` to `WordTimestamp` interface
- Add `diarize` parameter to `transcribeAudio(audioPath, diarize = false)`
- When `diarize = true`: skip chunking, send full file, timeout 600s,
  extract `speaker_id` from each word entry
- When `diarize = false`: existing chunked parallel behaviour unchanged

### 3. New: `apps/api/src/services/face-detection.service.ts`
```
detectSpeakerFacePositions(
  videoPath: string,
  speakerSegments: SpeakerSegment[]
): Promise<Record<string, number>>   // speaker_id → face_center_x (pixels)
```
Steps:
- Extract one JPEG frame per unique speaker via FFmpeg
- Send to Gemini Flash (OpenRouter) with vision prompt
- Parse response → map speaker_id → x pixel coordinate
- Cleanup temp frame files

### 4. `apps/api/src/services/ffmpeg.service.ts`
Add three new functions:

```ts
// Extract a single JPEG frame at a given timestamp
extractFrame(videoPath, outputPath, timestampSeconds): Promise<void>

// Cut + crop + scale a segment to 9:16
cutAndCropVertical(
  videoPath, outputPath,
  startTime, endTime,
  cropX              // pixels from left in source video
): Promise<void>
// FFmpeg: -ss start -t duration -vf "crop=607:1080:{cropX}:0,scale=1080:1920"

// Concatenate multiple video files (same codec, same resolution)
concatVideos(segmentPaths: string[], outputPath: string): Promise<void>
// FFmpeg concat demuxer with a temp concat.txt file
```

### 5. `apps/api/src/services/subtitle.service.ts`
- Add `aspectRatio` parameter to `buildAssContent(phrases, aspectRatio)`
- Add `aspectRatio` parameter to `generateSubtitlesAndFinalizeClip(..., aspectRatio)`
- Use 9:16 ASS header values when `aspectRatio === "9:16"`

### 6. `apps/api/src/queue/processors/render-clip.ts`
Branch on `aspectRatio`:

```
if job.aspectRatio === "16:9":
  → existing path (cutVideoClip → generateSubtitlesAndFinalizeClip)

if job.aspectRatio === "9:16":
  1. Build speaker segments within [startTime, endTime] from transcript words
  2. Call detectSpeakerFacePositions() → speakerFaceMap
  3. For each speaker segment:
       a. cutAndCropVertical() → temp segment file (1080×1920)
  4. concatVideos(segments) → combined raw clip
  5. generateSubtitlesAndFinalizeClip(raw, clipId, words, startTime, "9:16")
  6. Cleanup temp segment files
```

### 7. `apps/api/src/types/queue.ts`
Add `aspectRatio` to `RenderClipPayload`:
```ts
export interface RenderClipPayload {
  jobId: string;
  clipId: string;
  videoPath: string | null;
  startTime: number;
  endTime: number;
  aspectRatio: string;   // ← new
}
```

### 8. `apps/api/src/queue/processors/detect-clips.ts`
Pass `aspectRatio` when queuing render jobs:
```ts
await videoQueue.add(JOB_NAMES.RENDER_CLIP, {
  ...,
  aspectRatio: dbJob.aspectRatio,   // ← new
});
```

### 9. `apps/api/src/queue/processors/transcribe.ts`
Pass `diarize: true` when job is 9:16:
```ts
const dbJob = await prisma.job.findUniqueOrThrow({ where: { id: jobId } });
const result = await transcribeAudio(audioPath, dbJob.aspectRatio === "9:16");
```

### 10. `apps/api/src/routes/upload.route.ts`
Accept `aspectRatio` in the finalize body, pass to `prisma.job.create`:
```ts
const job = await prisma.job.create({
  data: {
    fileName: upload.fileName,
    status: "PENDING",
    aspectRatio: body.aspectRatio ?? "16:9",
  },
});
```

### 11. `apps/platform/src/lib/api.ts`
Pass `aspectRatio` to the init call so it's available at finalize time.
Store it in the upload session (return it from init or hold in closure):
```ts
uploadVideo(file, aspectRatio, onProgress)
```
Pass `aspectRatio` to `POST /api/upload/init` body,
and also to `POST /api/upload/:id/finalize` body.

### 12. `apps/platform/src/components/video-upload.tsx`
Add aspect ratio selector state (`"16:9"` default).
Render two clickable cards above the dropzone.
Pass selected ratio to `uploadVideo()`.

### 13. `apps/platform/src/routes/jobs/$jobId.tsx`
Show a small badge next to the job title when `job.aspectRatio === "9:16"`:
```
↕ 9:16 · Vertical
```

---

## UI Design

### Home page — format selector

```
┌──────────────────────────────────────────────────────────────────┐
│                        Clipper                      New Clip     │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│          Turn long videos into viral clips                       │
│    Upload. AI finds the best moments, cuts & burns subtitles.    │
│                                                                  │
│  Output Format                                                   │
│                                                                  │
│  ┌─────────────────────────────┐  ┌─────────────────────────┐  │
│  │  ┌───────────────────────┐  │  │      ┌──────────┐       │  │
│  │  │                       │  │  │      │          │       │  │
│  │  │        16 : 9         │  │  │      │  9 : 16  │       │  │
│  │  │                       │  │  │      │          │       │  │
│  │  └───────────────────────┘  │  │      │          │       │  │
│  │                             │  │      └──────────┘       │  │
│  │  Landscape                  │  │  Vertical               │  │
│  │  YouTube · Podcast          │  │  TikTok · Reels         │  │
│  │                             │  │  Follows active speaker │  │
│  │  ◉ (purple border+bg)       │  │  ○ (gray border)        │  │
│  └─────────────────────────────┘  └─────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      [Film icon]                         │   │
│  │                 Drop your video here                     │   │
│  │                 or click to browse                       │   │
│  │          MP4, MOV, AVI, MKV, WebM · Max 500 MB          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Processing page — aspect ratio badge

```
┌──────────────────────────────────────────────────────────────────┐
│  ←  YTDown.com_ngopenk-PODCAST...              Mar 28, 2026     │
│     [↕ 9:16 · Vertical]  ← small purple badge                  │
├──────────────────────────────────────────────────────────────────┤
│  ✓  Tab ini boleh ditutup atau ditinggal                        │
│                                                                  │
│  ✦  Extract Audio         Done                                  │
│  ✦  Transcribing          Done                                  │
│  ✦  Detecting Clips       Done                                  │
│  ✦  Rendering             In progress... (2 of 6)              │
│  ○  Complete                                                     │
└──────────────────────────────────────────────────────────────────┘
```

---

## Dependency Changes

None. Uses:
- **FFmpeg** — already installed, for frame extraction + crop + concat
- **Gemini Flash via OpenRouter** — already wired up, for face detection
- **ElevenLabs Scribe v2** — already used, add `diarize=true` param

---

## Constraints & Edge Cases

| Case | Handling |
|---|---|
| Solo speaker (monologue, vlog) | Gemini returns 1 face → use it for all segments |
| 0 faces detected by Gemini | Fall back to center crop (x_center = 0.5) |
| 3+ speakers | Sort by first-speech → assign faces left-to-right |
| Speaker segment < 0.5s | Merge with adjacent segment (same speaker if possible) |
| Face too close to edge | crop_x clamped to [0, 1313] |
| Source video narrower than 16:9 | Calculate crop_width from actual video dimensions |
| 16:9 job | Entire 9:16 path skipped, existing pipeline unchanged |

---

## Migration

```
cd apps/api
npx prisma migrate dev --name add-aspect-ratio
```

---

## Cost (per 1-hour video)

| Step | Cost |
|---|---|
| ElevenLabs transcription (with diarize) | ~$0.40 |
| Gemini clip detection | ~$0.002 |
| Gemini face detection (1–2 frames) | ~$0.0001 |
| **Total** | **~$0.40** |
