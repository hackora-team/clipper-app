import { openrouter } from "../lib/openrouter";
import type { AudioEvent, WordTimestamp } from "./transcription.service";

export interface DetectedClip {
	title: string;
	description: string;
	startTime: number;
	endTime: number;
	viralScore: number;
}

const SYSTEM_PROMPT = `You are a viral content editor. Analyze this transcript from a long-form video and identify the most engaging, shareable moments.

For each clip, return a JSON object with:
- title: A catchy, click-worthy title (max 60 chars)
- description: Why this moment is engaging (1 sentence)
- startTime: Start timestamp in seconds (number)
- endTime: End timestamp in seconds (number)
- viralScore: 0-100 score based on engagement potential (number)

Criteria for high viral scores:
- Emotional peaks (humor, surprise, insight, inspiration)
- Self-contained stories or anecdotes
- Controversial or debate-worthy statements
- Actionable tips or advice
- Strong opening hooks
- Audio events like [laughter] or [applause] are strong indicators of emotional peaks — weight them heavily in your viral scoring

Rules:
- Return 3-8 clips, sorted by viralScore descending
- Each clip must be 15-90 seconds long
- Clips must not overlap
- Only return a valid JSON object with key "clips" containing an array — no markdown, no explanation

Example response:
{"clips": [{"title": "...", "description": "...", "startTime": 10.5, "endTime": 45.2, "viralScore": 87}]}`;

function extractJson(content: string): string {
	const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
	if (fenceMatch) return fenceMatch[1].trim();
	const objectMatch = content.match(/\{[\s\S]*\}/);
	if (objectMatch) return objectMatch[0];
	return content.trim();
}

export async function detectViralClips(
	words: WordTimestamp[],
	audioEvents: AudioEvent[],
): Promise<DetectedClip[]> {
	const wordEntries = words.map((w) => ({
		time: w.start,
		text: w.word,
	}));

	const eventEntries = audioEvents.map((e) => ({
		time: e.start,
		text: `[${e.type}]`,
	}));

	const timeline = [...wordEntries, ...eventEntries]
		.sort((a, b) => a.time - b.time)
		.map((entry) => `[${entry.time.toFixed(1)}s] ${entry.text}`)
		.join("\n");

	const response = await openrouter.chat.completions.create({
		model: "google/gemini-2.5-flash",
		messages: [
			{ role: "system", content: SYSTEM_PROMPT },
			{
				role: "user",
				content: `Analyze this transcript and identify the most engaging moments:\n\n${timeline}`,
			},
		],
		temperature: 0.3,
	});

	const content = response.choices[0]?.message?.content;
	if (!content) throw new Error("No response from Gemini");

	const parsed = JSON.parse(extractJson(content)) as {
		clips: DetectedClip[];
	};
	if (!Array.isArray(parsed.clips))
		throw new Error("Invalid response format from Gemini");

	return parsed.clips.filter(
		(clip) =>
			clip.startTime >= 0 &&
			clip.endTime > clip.startTime &&
			clip.endTime - clip.startTime >= 10,
	);
}
