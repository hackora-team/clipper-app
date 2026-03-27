import fs from "node:fs/promises";
import path from "node:path";
import { openrouter } from "../lib/openrouter";
import { extractFrame, getStoragePath } from "./ffmpeg.service";
import type { WordTimestamp } from "./transcription.service";

export interface SpeakerSegment {
	speaker_id: string;
	start: number;
	end: number;
}

/**
 * Groups consecutive words with the same speaker_id into segments.
 * Merges segments shorter than minDuration into adjacent ones.
 */
export function buildSpeakerSegments(
	words: WordTimestamp[],
	clipStart: number,
	clipEnd: number,
	minDuration = 0.5,
): SpeakerSegment[] {
	const inRange = words.filter(
		(w) => w.start >= clipStart - 0.1 && w.end <= clipEnd + 0.1 && w.speaker_id,
	);

	if (inRange.length === 0) return [];

	const raw: SpeakerSegment[] = [];
	let current: SpeakerSegment = {
		speaker_id: inRange[0].speaker_id ?? "speaker_0",
		start: inRange[0].start,
		end: inRange[0].end,
	};

	for (let i = 1; i < inRange.length; i++) {
		const w = inRange[i];
		const sid = w.speaker_id ?? "speaker_0";
		if (sid === current.speaker_id) {
			current.end = w.end;
		} else {
			raw.push(current);
			current = { speaker_id: sid, start: w.start, end: w.end };
		}
	}
	raw.push(current);

	// Merge very short segments into the adjacent segment with the same speaker
	const merged: SpeakerSegment[] = [];
	for (const seg of raw) {
		const duration = seg.end - seg.start;
		if (duration < minDuration && merged.length > 0) {
			merged[merged.length - 1].end = seg.end;
		} else {
			merged.push({ ...seg });
		}
	}

	return merged;
}

/**
 * For each unique speaker, extracts a frame at the midpoint of their first
 * substantial segment, then asks Gemini Flash to return face X positions.
 *
 * Returns: { speaker_0: 480, speaker_1: 1421 }  (pixel x in source video)
 */
export async function detectSpeakerFacePositions(
	videoPath: string,
	words: WordTimestamp[],
	videoWidth: number,
): Promise<Record<string, number>> {
	// Build full-video speaker segments (no clip boundary)
	const allWords = words.filter((w) => w.speaker_id);
	if (allWords.length === 0) return {};

	const segments = buildSpeakerSegments(
		allWords,
		allWords[0].start,
		allWords[allWords.length - 1].end,
		3, // need at least 3s for a representative frame
	);

	// Find first substantial segment per speaker
	const firstSegmentBySpeaker = new Map<string, SpeakerSegment>();
	for (const seg of segments) {
		if (!firstSegmentBySpeaker.has(seg.speaker_id)) {
			firstSegmentBySpeaker.set(seg.speaker_id, seg);
		}
	}

	if (firstSegmentBySpeaker.size === 0) return {};

	const tempDir = path.join(getStoragePath(), "temp");
	const frameFiles: string[] = [];

	try {
		// Extract one frame per speaker at their first segment midpoint
		const speakerIds = [...firstSegmentBySpeaker.keys()];
		await Promise.all(
			speakerIds.map(async (sid) => {
				const seg = firstSegmentBySpeaker.get(sid);
				if (!seg) return;
				const ts = (seg.start + seg.end) / 2;
				const framePath = path.join(tempDir, `face_${sid}_${Date.now()}.jpg`);
				frameFiles.push(framePath);
				await extractFrame(videoPath, framePath, ts);
			}),
		);

		// Use the first speaker's frame — both faces appear in every frame
		// for static podcast setups
		const primaryFrame = frameFiles[0];
		const imageBuffer = await fs.readFile(primaryFrame);
		const base64 = imageBuffer.toString("base64");

		const response = await openrouter.chat.completions.create({
			model: "google/gemini-2.5-flash-preview",
			messages: [
				{
					role: "user",
					content: [
						{
							type: "image_url",
							image_url: { url: `data:image/jpeg;base64,${base64}` },
						},
						{
							type: "text",
							text: `This is a frame from a podcast or interview video.
Detect all human faces visible in the image.
Return ONLY a valid JSON array of face positions — no markdown, no explanation.
Format: [{"x_center": 0.25}, {"x_center": 0.74}]
x_center = horizontal center of each face as a fraction of image width (0.0 = left edge, 1.0 = right edge).
Sort by x_center ascending (leftmost face first).
If no faces are detected, return [].`,
						},
					],
				},
			],
			max_tokens: 128,
		});

		const raw = response.choices[0]?.message?.content?.trim() ?? "[]";
		const cleaned = raw
			.replace(/```(?:json)?\s*/g, "")
			.replace(/```/g, "")
			.trim();
		const faces = JSON.parse(cleaned) as Array<{ x_center: number }>;

		if (faces.length === 0) return {};

		// Map speaker_id → face x pixel position
		// First speaker by speech order → leftmost face, etc.
		const speakersByOrder = speakerIds.slice().sort((a, b) => {
			const aStart = firstSegmentBySpeaker.get(a)?.start;
			const bStart = firstSegmentBySpeaker.get(b)?.start;
			return aStart - bStart;
		});

		const result: Record<string, number> = {};
		for (let i = 0; i < speakersByOrder.length; i++) {
			const face = faces[i] ?? faces[faces.length - 1];
			result[speakersByOrder[i]] = Math.round(face.x_center * videoWidth);
		}

		return result;
	} catch {
		return {};
	} finally {
		await Promise.all(frameFiles.map((f) => fs.unlink(f).catch(() => {})));
	}
}
