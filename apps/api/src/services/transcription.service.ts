import fs from "node:fs/promises";
import path from "node:path";
import axios from "axios";
import FormData from "form-data";
import { splitAudio } from "./ffmpeg.service";

export interface WordTimestamp {
	word: string;
	start: number;
	end: number;
}

export interface AudioEvent {
	type: string;
	start: number;
	end: number;
}

export interface TranscriptResult {
	text: string;
	words: WordTimestamp[];
	audioEvents: AudioEvent[];
}

const CHUNK_SIZE_BYTES = 10 * 1024 * 1024; // 10MB threshold
const CHUNK_DURATION_SECONDS = 300; // 5-minute chunks

async function transcribeChunk(
	audioPath: string,
	offsetSeconds = 0,
): Promise<{
	text: string;
	words: WordTimestamp[];
	audioEvents: AudioEvent[];
}> {
	const buffer = await fs.readFile(audioPath);
	const filename = path.basename(audioPath);

	const form = new FormData();
	form.append("file", buffer, { filename, contentType: "audio/mpeg" });
	form.append("model_id", "scribe_v2");
	form.append("timestamps_granularity", "word");
	form.append("tag_audio_events", "true");

	const response = await axios.post(
		"https://api.elevenlabs.io/v1/speech-to-text",
		form,
		{
			headers: {
				"xi-api-key": process.env.ELEVENLABS_API_KEY ?? "",
				...form.getHeaders(),
			},
			maxBodyLength: Infinity,
			timeout: 120_000,
		},
	);

	const data = response.data as {
		text: string;
		words: Array<{ text: string; start: number; end: number; type: string }>;
	};

	const words: WordTimestamp[] = [];
	const audioEvents: AudioEvent[] = [];

	for (const entry of data.words ?? []) {
		if (entry.type === "word") {
			words.push({
				word: entry.text,
				start: entry.start + offsetSeconds,
				end: entry.end + offsetSeconds,
			});
		} else if (entry.type === "audio_event") {
			audioEvents.push({
				type: entry.text.replace(/^\[|\]$/g, "").toLowerCase(),
				start: entry.start + offsetSeconds,
				end: entry.end + offsetSeconds,
			});
		}
	}

	return { text: data.text, words, audioEvents };
}

export async function transcribeAudio(
	audioPath: string,
): Promise<TranscriptResult> {
	const stat = await fs.stat(audioPath);

	if (stat.size <= CHUNK_SIZE_BYTES) {
		const result = await transcribeChunk(audioPath, 0);
		return result;
	}

	// Large file — split into chunks
	const tempDir = path.dirname(audioPath);
	const chunkPaths = await splitAudio(
		audioPath,
		tempDir,
		CHUNK_DURATION_SECONDS,
	);

	try {
		const results = await Promise.all(
			chunkPaths.map((p, i) => transcribeChunk(p, i * CHUNK_DURATION_SECONDS)),
		);

		return {
			text: results.map((r) => r.text).join(" "),
			words: results.flatMap((r) => r.words),
			audioEvents: results.flatMap((r) => r.audioEvents),
		};
	} finally {
		// Clean up chunk files
		await Promise.all(chunkPaths.map((p) => fs.unlink(p).catch(() => {})));
	}
}
