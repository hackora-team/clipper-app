import type { Job } from "bullmq";
import { emitJobEvent } from "../../lib/events";
import { JOB_NAMES, videoQueue } from "../../lib/queue";
import { transcribeAudio } from "../../services/transcription.service";
import type { TranscribePayload } from "../../types/queue";
import { prisma } from "../../utils/prisma";

export async function transcribeProcessor(job: Job): Promise<void> {
	const { jobId, audioPath } = job.data as TranscribePayload;

	await prisma.job.update({
		where: { id: jobId },
		data: { status: "TRANSCRIBING" },
	});
	emitJobEvent({
		jobId,
		status: "TRANSCRIBING",
		message: "Transcribing audio with AI...",
	});

	const result = await transcribeAudio(audioPath);

	await prisma.job.update({
		where: { id: jobId },
		data: { transcript: result as unknown as Record<string, unknown> },
	});

	await videoQueue.add(JOB_NAMES.DETECT_CLIPS, { jobId });
}
