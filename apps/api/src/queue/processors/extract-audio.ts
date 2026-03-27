import path from "node:path";
import type { Job } from "bullmq";
import { emitJobEvent } from "../../lib/events";
import { JOB_NAMES, videoQueue } from "../../lib/queue";
import { extractAudio, getStoragePath } from "../../services/ffmpeg.service";
import type { ExtractAudioPayload } from "../../types/queue";
import { prisma } from "../../utils/prisma";

export async function extractAudioProcessor(job: Job): Promise<void> {
	const { jobId, videoPath } = job.data as ExtractAudioPayload;

	await prisma.job.update({
		where: { id: jobId },
		data: { status: "EXTRACTING_AUDIO" },
	});
	emitJobEvent({
		jobId,
		status: "EXTRACTING_AUDIO",
		message: "Extracting audio from video...",
	});

	const audioPath = path.join(getStoragePath(), "temp", `${jobId}.mp3`);
	await extractAudio(videoPath, audioPath);

	await prisma.job.update({
		where: { id: jobId },
		data: { audioPath },
	});

	await videoQueue.add(JOB_NAMES.TRANSCRIBE, { jobId, audioPath });
}
