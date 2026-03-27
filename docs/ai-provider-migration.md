# AI Provider Migration Plan

**Branch:** `feat/update-partner-ai-and-transcript`
**Date:** 2026-03-27

## Overview

Replace OpenAI (Whisper + GPT-4o) with purpose-fit providers:

| Service | Before | After |
|---|---|---|
| Transcription | OpenAI Whisper (`whisper-1`) | ElevenLabs Scribe v2 |
| Clip Detection | OpenAI GPT-4o | OpenRouter → `google/gemini-flash-1.5` |

**Why:**
- ElevenLabs Scribe v2 returns word-level timestamps + audio event tags (laughter, applause, music) — richer signal for viral detection
- OpenRouter gives model flexibility without vendor lock-in; Gemini Flash 1.5 is fast and cost-effective for JSON-structured analysis

---

## Files Changed

| File | Action |
|---|---|
| `apps/api/package.json` | Add `@elevenlabs/elevenlabs-js` |
| `apps/api/src/lib/openai.ts` | **Delete** |
| `apps/api/src/lib/elevenlabs.ts` | **Create** — ElevenLabs client |
| `apps/api/src/lib/openrouter.ts` | **Create** — OpenRouter client (via OpenAI SDK) |
| `apps/api/src/services/transcription.service.ts` | **Rewrite** |
| `apps/api/src/services/clip-detection.service.ts` | **Rewrite** |
| `apps/api/src/queue/processors/detect-clips.ts` | **Update** — pass `audioEvents` |
| `.env` | **Update** — swap API keys |

Processors `extract-audio.ts`, `transcribe.ts`, `render-clip.ts` — **no changes needed**.

---

## Step-by-Step Implementation

### Step 1 — Install ElevenLabs SDK

```bash
pnpm add @elevenlabs/elevenlabs-js --filter api
```

The `openai` package is **kept** — OpenRouter uses the OpenAI-compatible SDK with a custom `baseURL`.

---

### Step 2 — Create `lib/elevenlabs.ts`

```ts
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});
```

---

### Step 3 — Create `lib/openrouter.ts`

OpenRouter is OpenAI API-compatible — same SDK, different `baseURL` and key:

```ts
import OpenAI from "openai";

export const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});
```

---

### Step 4 — Delete `lib/openai.ts`

No longer used. Both services now have dedicated client files.

---

### Step 5 — Rewrite `services/transcription.service.ts`

**New interfaces:**

```ts
export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

export interface AudioEvent {
  type: string;   // e.g. "laughter", "applause", "music"
  start: number;
  end: number;
}

export interface TranscriptResult {
  text: string;
  words: WordTimestamp[];
  audioEvents: AudioEvent[];  // NEW — used by clip detection for context
}
```

**ElevenLabs Scribe v2 call:**
- `model_id: "scribe_v2"`
- `timestamps_granularity: "word"`
- `tag_audio_events: true`

**Response mapping:**
- Entries with `type === "word"` → `words[]`
- Entries with `type === "audio_event"` → `audioEvents[]` (map `value` as `type`)
- Spacing entries are discarded

`TranscriptResult` shape is backward-compatible — `words` field unchanged, `audioEvents` is additive.

---

### Step 6 — Rewrite `services/clip-detection.service.ts`

**Updated signature:**
```ts
export async function detectViralClips(
  words: WordTimestamp[],
  audioEvents: AudioEvent[],
): Promise<DetectedClip[]>
```

**Transcript string sent to Gemini:**

Words and audio events are merged and sorted by timestamp so Gemini sees emotional context inline:

```
[10.2s] so the thing is
[12.5s] [laughter]
[13.1s] yeah exactly what i mean
[18.0s] [applause]
[24.6s] that is why it matters
```

**Model & client changes:**
- Import `openrouter` instead of `openai`
- Model: `"google/gemini-flash-1.5"`
- Remove `response_format: { type: "json_object" }` — not reliably supported by Gemini via OpenRouter
- Instead: prompt explicitly instructs JSON-only output; response is parsed with a JSON extraction helper that strips markdown code fences if present (e.g. ` ```json ... ``` `)
- Update error messages from "GPT-4o" → "Gemini"

**System prompt update:**
Add a line noting audio events as context signals:
> Audio events like [laughter] or [applause] are markers of emotional peaks — weight them in your viral scoring.

---

### Step 7 — Update `queue/processors/detect-clips.ts`

Currently passes only `transcript.words`. Update to also pass `transcript.audioEvents`:

```ts
// Before
const detectedClips = await detectViralClips(transcript.words);

// After
const detectedClips = await detectViralClips(transcript.words, transcript.audioEvents);
```

---

### Step 8 — Update `.env`

```bash
# Remove
OPENAI_API_KEY="..."

# Add
ELEVENLABS_API_KEY="..."
OPENROUTER_API_KEY="..."
```

---

## Data Flow After Migration

```
Audio file (MP3)
      ↓
ElevenLabs Scribe v2
      ↓
{ text, words: [{ word, start, end }], audioEvents: [{ type, start, end }] }
      ↓ stored in Job.transcript
      ↓
Merged timeline sent to Gemini via OpenRouter
[0.5s] word word word
[3.2s] [laughter]
[4.1s] word word word
      ↓
Gemini returns clips[] with title, description, startTime, endTime, viralScore
      ↓
Clip records created → render-clip queue (unchanged)
```

---

## What Does NOT Change

- `WordTimestamp` interface shape — subtitle pipeline reads this, no changes needed
- `DetectedClip` interface — same shape out of clip detection
- `transcribe.ts` processor — calls `transcribeAudio()`, same signature
- `render-clip.ts` processor — reads words from `Job.transcript`, same format
- `subtitle.service.ts` — reads `words[]` only, audio events are never passed here
- Frontend — no changes, SSE events and job/clip shapes are identical

---

## Notes

- Audio events (laughter, applause, music) are **only used as context for Gemini** — they never appear in subtitles or clip metadata shown to users
- Gemini Flash 1.5 does not guarantee `json_object` response format via OpenRouter, so the implementation must handle JSON wrapped in markdown code fences
- If `audioEvents` is empty (no audio events detected), `detectViralClips` falls back gracefully to words-only analysis
