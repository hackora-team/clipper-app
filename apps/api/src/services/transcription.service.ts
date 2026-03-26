import fs from "node:fs";
import { openai } from "../lib/openai";

export interface WordTimestamp {
	word: string;
	start: number;
	end: number;
}

export interface TranscriptResult {
	text: string;
	words: WordTimestamp[];
}

export async function transcribeAudio(
	audioPath: string,
): Promise<TranscriptResult> {
	const response = await openai.audio.transcriptions.create({
		file: fs.createReadStream(audioPath),
		model: "whisper-1",
		response_format: "verbose_json",
		timestamp_granularities: ["word"],
	});

	const words: WordTimestamp[] = (response.words ?? []).map((w) => ({
		word: w.word,
		start: w.start,
		end: w.end,
	}));

	return { text: response.text, words };
}
