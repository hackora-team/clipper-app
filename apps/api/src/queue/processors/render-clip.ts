import type { Job } from "bullmq";
import fs from "node:fs/promises";
import { prisma } from "../../utils/prisma";
import { cutVideoClip } from "../../services/clip-cutting.service";
import { generateSubtitlesAndFinalizeClip } from "../../services/subtitle.service";
import { cleanupClipArtifacts } from "../../services/cleanup.service";
import { emitJobEvent } from "../../lib/events";
import type { RenderClipPayload } from "../../types/queue";
import type { WordTimestamp } from "../../services/transcription.service";

export async function renderClipProcessor(job: Job): Promise<void> {
	const { jobId, clipId, videoPath, startTime, endTime } =
		job.data as RenderClipPayload;

	await prisma.clip.update({
		where: { id: clipId },
		data: { status: "RENDERING" },
	});

	try {
		const dbJob = await prisma.job.findUniqueOrThrow({ where: { id: jobId } });
		const transcript = dbJob.transcript as { text: string; words: WordTimestamp[] };

		const wordsInRange = transcript.words.filter(
			(w) => w.start >= startTime - 0.5 && w.start <= endTime + 0.5,
		);

		const rawClipPath = await cutVideoClip(
			videoPath ?? "",
			clipId,
			startTime,
			endTime,
		);

		const { outputPath, subtitlePath } = await generateSubtitlesAndFinalizeClip(
			rawClipPath,
			clipId,
			wordsInRange,
			startTime,
		);

		await prisma.clip.update({
			where: { id: clipId },
			data: { status: "COMPLETED", outputPath, subtitlePath },
		});

		await fs.unlink(rawClipPath).catch(() => undefined);

		const allClips = await prisma.clip.findMany({ where: { jobId } });
		const allDone = allClips.every(
			(c) => c.status === "COMPLETED" || c.status === "FAILED",
		);

		if (allDone) {
			const hasSuccess = allClips.some((c) => c.status === "COMPLETED");
			await prisma.job.update({
				where: { id: jobId },
				data: { status: hasSuccess ? "COMPLETED" : "FAILED" },
			});
			emitJobEvent({
				jobId,
				status: hasSuccess ? "COMPLETED" : "FAILED",
				message: hasSuccess
					? `All ${allClips.length} clips are ready!`
					: "All clips failed to render",
			});
		} else {
			const completedCount = allClips.filter(
				(c) => c.status === "COMPLETED",
			).length;
			emitJobEvent({
				jobId,
				status: "RENDERING",
				message: `Rendered ${completedCount} of ${allClips.length} clips...`,
			});
		}
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : String(err);
		await prisma.clip.update({
			where: { id: clipId },
			data: { status: "FAILED", errorMessage },
		});
		await cleanupClipArtifacts(clipId);

		const allClips = await prisma.clip.findMany({ where: { jobId } });
		const allDone = allClips.every(
			(c) => c.status === "COMPLETED" || c.status === "FAILED",
		);
		if (allDone) {
			const hasSuccess = allClips.some((c) => c.status === "COMPLETED");
			await prisma.job.update({
				where: { id: jobId },
				data: { status: hasSuccess ? "COMPLETED" : "FAILED", errorMessage },
			});
			emitJobEvent({
				jobId,
				status: hasSuccess ? "COMPLETED" : "FAILED",
				message: hasSuccess ? "Some clips are ready" : "Rendering failed",
			});
		}
		throw err;
	}
}
