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

	const dbJob = await prisma.job.findUniqueOrThrow({ where: { id: jobId } });
	const result = await transcribeAudio(audioPath, dbJob.aspectRatio === "9:16");

	await prisma.job.update({
		where: { id: jobId },
		data: { transcript: result as unknown as object },
	});

	await videoQueue.add(JOB_NAMES.DETECT_CLIPS, { jobId });
}
