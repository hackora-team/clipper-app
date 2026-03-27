import fs from "node:fs/promises";
import path from "node:path";
import axios from "axios";
import FormData from "form-data";
import { splitAudio } from "./ffmpeg.service";

export interface WordTimestamp {
	word: string;
	start: number;
	end: number;
	speaker_id?: string;
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
	diarize = false,
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
	if (diarize) form.append("diarize", "true");

	const response = await axios.post(
		"https://api.elevenlabs.io/v1/speech-to-text",
		form,
		{
			headers: {
				"xi-api-key": process.env.ELEVENLABS_API_KEY ?? "",
				...form.getHeaders(),
			},
			maxBodyLength: Infinity,
			timeout: diarize ? 600_000 : 120_000,
		},
	);

	const data = response.data as {
		text: string;
		words: Array<{
			text: string;
			start: number;
			end: number;
			type: string;
			speaker_id?: string;
		}>;
	};

	const words: WordTimestamp[] = [];
	const audioEvents: AudioEvent[] = [];

	for (const entry of data.words ?? []) {
		if (entry.type === "word") {
			words.push({
				word: entry.text,
				start: entry.start + offsetSeconds,
				end: entry.end + offsetSeconds,
				...(entry.speaker_id ? { speaker_id: entry.speaker_id } : {}),
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
	diarize = false,
): Promise<TranscriptResult> {
	const stat = await fs.stat(audioPath);

	// Diarized transcription: always send as single request for consistent speaker IDs
	if (diarize || stat.size <= CHUNK_SIZE_BYTES) {
		return transcribeChunk(audioPath, 0, diarize);
	}

	// Large file (non-diarized) — split into parallel chunks
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
		await Promise.all(chunkPaths.map((p) => fs.unlink(p).catch(() => {})));
	}
}
