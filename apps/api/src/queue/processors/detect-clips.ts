import type { Job } from "bullmq";
import { emitJobEvent } from "../../lib/events";
import { JOB_NAMES, videoQueue } from "../../lib/queue";
import { detectViralClips } from "../../services/clip-detection.service";
import type {
	AudioEvent,
	WordTimestamp,
} from "../../services/transcription.service";
import type { DetectClipsPayload } from "../../types/queue";
import { prisma } from "../../utils/prisma";

export async function detectClipsProcessor(job: Job): Promise<void> {
	const { jobId } = job.data as DetectClipsPayload;

	await prisma.job.update({
		where: { id: jobId },
		data: { status: "DETECTING_CLIPS" },
	});
	emitJobEvent({
		jobId,
		status: "DETECTING_CLIPS",
		message: "AI is finding the best moments...",
	});

	const dbJob = await prisma.job.findUniqueOrThrow({ where: { id: jobId } });
	const transcript = dbJob.transcript as unknown as {
		text: string;
		words: WordTimestamp[];
		audioEvents: AudioEvent[];
	};

	const detectedClips = await detectViralClips(
		transcript.words,
		transcript.audioEvents ?? [],
	);

	await prisma.job.update({
		where: { id: jobId },
		data: { status: "RENDERING" },
	});
	emitJobEvent({ jobId, status: "RENDERING", message: "Rendering clips..." });

	for (const clip of detectedClips) {
		const duration = clip.endTime - clip.startTime;
		const dbClip = await prisma.clip.create({
			data: {
				jobId,
				title: clip.title,
				description: clip.description,
				startTime: clip.startTime,
				endTime: clip.endTime,
				duration,
				viralScore: clip.viralScore,
				status: "PENDING",
			},
		});

		await videoQueue.add(JOB_NAMES.RENDER_CLIP, {
			jobId,
			clipId: dbClip.id,
			videoPath: dbJob.filePath,
			startTime: clip.startTime,
			endTime: clip.endTime,
			aspectRatio: dbJob.aspectRatio,
		});
	}
}
