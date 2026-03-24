import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import type { AuthUser } from "../middleware/mock-auth.js";
import { prisma } from "../utils/prisma.js";

const sse = new Hono();

const MOCK_CLIPS = [
	{
		title: "The Most Shocking Moment",
		description: "An unexpected twist that will captivate viewers",
		startTime: 45.0,
		endTime: 105.0,
		viralScore: 9,
	},
	{
		title: "Key Insight Worth Sharing",
		description: "A powerful insight that resonates with audiences",
		startTime: 180.0,
		endTime: 240.0,
		viralScore: 8,
	},
	{
		title: "Hilarious Reaction",
		description: "A genuinely funny moment perfect for social media",
		startTime: 320.0,
		endTime: 380.0,
		viralScore: 7,
	},
	{
		title: "Emotional Peak",
		description: "The most emotionally charged segment",
		startTime: 500.0,
		endTime: 560.0,
		viralScore: 6,
	},
];

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// GET /api/jobs/:id/events
sse.get("/:id/events", async (c) => {
	const user = c.get("user") as AuthUser;
	const jobId = c.req.param("id");

	const job = await prisma.job.findFirst({
		where: { id: jobId, userId: user.id },
	});

	if (!job) {
		return c.json({ error: "Job not found" }, 404);
	}

	return streamSSE(c, async (stream) => {
		const sendEvent = async (event: string, data: Record<string, unknown>) => {
			await stream.writeSSE({
				event,
				data: JSON.stringify(data),
			});
		};

		// Step 1: Extracting audio (0-2s)
		await prisma.job.update({
			where: { id: jobId },
			data: {
				status: "EXTRACTING_AUDIO",
				currentStep: "EXTRACTING_AUDIO",
				progress: 0,
			},
		});
		await sendEvent("progress", {
			step: "EXTRACTING_AUDIO",
			progress: 0,
			message: "Extracting audio from video...",
		});
		await sleep(1000);
		await sendEvent("progress", {
			step: "EXTRACTING_AUDIO",
			progress: 50,
			message: "Extracting audio from video...",
		});
		await sleep(1000);
		await sendEvent("progress", {
			step: "EXTRACTING_AUDIO",
			progress: 100,
			message: "Audio extracted",
		});

		// Step 2: Transcribing (2-7s)
		await prisma.job.update({
			where: { id: jobId },
			data: {
				status: "TRANSCRIBING",
				currentStep: "TRANSCRIBING",
				progress: 0,
			},
		});
		for (let i = 0; i <= 100; i += 10) {
			await sendEvent("progress", {
				step: "TRANSCRIBING",
				progress: i,
				message: `Transcribing audio... ${i}%`,
			});
			await sleep(500);
		}

		// Step 3: Detecting clips (7-9s)
		await prisma.job.update({
			where: { id: jobId },
			data: {
				status: "DETECTING_CLIPS",
				currentStep: "DETECTING_CLIPS",
				progress: 0,
			},
		});
		await sendEvent("progress", {
			step: "DETECTING_CLIPS",
			progress: 0,
			message: "Analyzing content for viral moments...",
		});
		await sleep(1000);
		await sendEvent("progress", {
			step: "DETECTING_CLIPS",
			progress: 50,
			message: "Identifying best clips...",
		});
		await sleep(1000);
		await sendEvent("progress", {
			step: "DETECTING_CLIPS",
			progress: 100,
			message: "Clips detected",
		});

		// Step 4: Rendering (9-13s)
		await prisma.job.update({
			where: { id: jobId },
			data: {
				status: "RENDERING",
				currentStep: "RENDERING",
				progress: 0,
			},
		});
		for (let i = 0; i <= 100; i += 8) {
			const p = Math.min(i, 100);
			await sendEvent("progress", {
				step: "RENDERING",
				progress: p,
				message: `Rendering clips with subtitles... ${p}%`,
			});
			await sleep(300);
		}

		// Create mock clip records
		const createdClips = await prisma.$transaction(
			MOCK_CLIPS.map((clip) =>
				prisma.clip.create({
					data: {
						jobId,
						title: clip.title,
						description: clip.description,
						startTime: clip.startTime,
						endTime: clip.endTime,
						viralScore: clip.viralScore,
						status: "COMPLETED",
					},
				}),
			),
		);

		// Mark job as completed
		await prisma.job.update({
			where: { id: jobId },
			data: {
				status: "COMPLETED",
				currentStep: null,
				progress: 100,
				completedAt: new Date(),
			},
		});

		await sendEvent("completed", {
			jobId,
			clipCount: createdClips.length,
		});
	});
});

export { sse };
