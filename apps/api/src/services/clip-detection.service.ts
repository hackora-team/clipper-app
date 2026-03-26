import { openai } from "../lib/openai";
import type { WordTimestamp } from "./transcription.service";

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

Rules:
- Return 3-8 clips, sorted by viralScore descending
- Each clip must be 15-90 seconds long
- Clips must not overlap
- Only return a JSON object with key "clips" containing an array

Example response:
{"clips": [{"title": "...", "description": "...", "startTime": 10.5, "endTime": 45.2, "viralScore": 87}]}`;

export async function detectViralClips(
	words: WordTimestamp[],
): Promise<DetectedClip[]> {
	const transcriptText = words
		.map((w) => `[${w.start.toFixed(1)}s] ${w.word}`)
		.join(" ");

	const response = await openai.chat.completions.create({
		model: "gpt-4o",
		response_format: { type: "json_object" },
		messages: [
			{ role: "system", content: SYSTEM_PROMPT },
			{
				role: "user",
				content: `Analyze this transcript and identify the most engaging moments:\n\n${transcriptText}`,
			},
		],
		temperature: 0.3,
	});

	const content = response.choices[0]?.message?.content;
	if (!content) throw new Error("No response from GPT-4o");

	const parsed = JSON.parse(content) as { clips: DetectedClip[] };
	if (!Array.isArray(parsed.clips)) throw new Error("Invalid response format from GPT-4o");

	return parsed.clips.filter(
		(clip) =>
			clip.startTime >= 0 &&
			clip.endTime > clip.startTime &&
			clip.endTime - clip.startTime >= 10,
	);
}
