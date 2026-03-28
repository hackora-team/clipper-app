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

const SAMPLES_PER_SPEAKER = 3;

/**
 * For each unique speaker, extracts SAMPLES_PER_SPEAKER frames spread across
 * their first substantial segment, sends them all in one Gemini call, and
 * averages the x_center results. No speaker ordering assumption.
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
		3, // need at least 3s for representative frames
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
		const speakerIds = [...firstSegmentBySpeaker.keys()];

		// Extract SAMPLES_PER_SPEAKER frames per speaker spread across their segment
		const speakerFramePaths = new Map<string, string[]>();
		await Promise.all(
			speakerIds.map(async (sid) => {
				const seg = firstSegmentBySpeaker.get(sid);
				if (!seg) return;
				const duration = seg.end - seg.start;
				const paths: string[] = [];
				for (let i = 0; i < SAMPLES_PER_SPEAKER; i++) {
					// Sample at 25%, 50%, 75% (or evenly spaced for other counts)
					const fraction = (i + 1) / (SAMPLES_PER_SPEAKER + 1);
					const ts = seg.start + duration * fraction;
					const framePath = path.join(
						tempDir,
						`face_${sid}_${i}_${Date.now()}.jpg`,
					);
					frameFiles.push(framePath);
					await extractFrame(videoPath, framePath, ts);
					paths.push(framePath);
				}
				speakerFramePaths.set(sid, paths);
			}),
		);

		// For each speaker, send all their frames in one Gemini call and average results
		const result: Record<string, number> = {};
		await Promise.all(
			speakerIds.map(async (sid) => {
				const paths = speakerFramePaths.get(sid);
				if (!paths || paths.length === 0) return;

				const imageContents = await Promise.all(
					paths.map(async (p) => {
						const buf = await fs.readFile(p);
						return buf.toString("base64");
					}),
				);

				const response = await openrouter.chat.completions.create({
					model: "google/gemini-2.5-flash-preview",
					messages: [
						{
							role: "user",
							content: [
								...imageContents.map((b64, i) => ({
									type: "image_url" as const,
									image_url: {
										url: `data:image/jpeg;base64,${b64}`,
									},
									...(i === 0 ? {} : {}),
								})),
								{
									type: "text" as const,
									text: `These ${paths.length} frames are from a podcast/interview, all captured while the SAME person is actively speaking.
Identify the active speaker's face in each frame and return their horizontal center position.
Return ONLY valid JSON — no markdown, no explanation.
Format: {"x_centers": [0.32, 0.34, 0.33]}
x_center = horizontal center as a fraction of image width (0.0 = left edge, 1.0 = right edge), one value per frame in order.
If a face is not detected in a frame, omit that frame's value.
If no faces detected at all, return {"x_centers": []}.`,
								},
							],
						},
					],
					max_tokens: 128,
				});

				const raw = response.choices[0]?.message?.content?.trim() ?? "{}";
				const cleaned = raw
					.replace(/```(?:json)?\s*/g, "")
					.replace(/```/g, "")
					.trim();
				const parsed = JSON.parse(cleaned) as {
					x_centers?: number[];
				};
				const xCenters = parsed.x_centers?.filter(
					(x) => typeof x === "number" && x >= 0 && x <= 1,
				);
				if (xCenters && xCenters.length > 0) {
					const avg = xCenters.reduce((sum, x) => sum + x, 0) / xCenters.length;
					result[sid] = Math.round(avg * videoWidth);
				}
			}),
		);

		return result;
	} catch {
		return {};
	} finally {
		await Promise.all(frameFiles.map((f) => fs.unlink(f).catch(() => {})));
	}
}
