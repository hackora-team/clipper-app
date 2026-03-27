import fs from "node:fs/promises";
import path from "node:path";
import { burnSubtitles, getStoragePath } from "./ffmpeg.service";
import type { WordTimestamp } from "./transcription.service";

interface Phrase {
	start: number;
	end: number;
	text: string;
}

function secondsToAssTime(seconds: number): string {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = Math.floor(seconds % 60);
	const cs = Math.floor((seconds % 1) * 100);
	return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function groupWordsIntoPhrases(
	words: WordTimestamp[],
	clipStartTime: number,
): Phrase[] {
	const phrases: Phrase[] = [];
	let currentGroup: WordTimestamp[] = [];

	for (let i = 0; i < words.length; i++) {
		const word = words[i];
		const nextWord = words[i + 1];

		currentGroup.push(word);

		const atMaxWords = currentGroup.length >= 7;
		const sentenceEnd = /[.!?]$/.test(word.word.trim());
		const longPause = nextWord ? nextWord.start - word.end > 0.5 : false;
		const isLast = !nextWord;

		if (atMaxWords || sentenceEnd || longPause || isLast) {
			if (currentGroup.length > 0) {
				phrases.push({
					start: currentGroup[0].start - clipStartTime,
					end: currentGroup[currentGroup.length - 1].end - clipStartTime,
					text: currentGroup
						.map((w) => w.word)
						.join(" ")
						.trim(),
				});
			}
			currentGroup = [];
		}
	}

	return phrases;
}

function buildAssContent(phrases: Phrase[]): string {
	const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,72,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,4,0,2,20,20,50,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

	const dialogues = phrases
		.map(
			(p) =>
				`Dialogue: 0,${secondsToAssTime(Math.max(0, p.start))},${secondsToAssTime(p.end)},Default,,0,0,0,,${p.text}`,
		)
		.join("\n");

	return header + dialogues;
}

export async function generateSubtitlesAndFinalizeClip(
	rawClipPath: string,
	clipId: string,
	words: WordTimestamp[],
	clipStartTime: number,
): Promise<{ outputPath: string; subtitlePath: string }> {
	const tempDir = path.join(getStoragePath(), "temp");
	const subtitlePath = path.join(tempDir, `${clipId}.ass`);
	const outputPath = path.join(getStoragePath(), "outputs", `${clipId}.mp4`);

	const wordsInRange = words.filter(
		(w) => w.start >= clipStartTime - 0.5 && w.end <= clipStartTime + 9999,
	);

	const phrases = groupWordsIntoPhrases(wordsInRange, clipStartTime);
	const assContent = buildAssContent(phrases);
	await fs.writeFile(subtitlePath, assContent, "utf-8");

	await fs.mkdir(path.dirname(outputPath), { recursive: true });

	if (phrases.length > 0) {
		await burnSubtitles(rawClipPath, subtitlePath, outputPath);
	} else {
		await fs.copyFile(rawClipPath, outputPath);
	}

	await fs.unlink(subtitlePath).catch(() => {});

	return { outputPath, subtitlePath };
}
