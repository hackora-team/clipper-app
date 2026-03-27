import fs from "node:fs/promises";
import path from "node:path";
import type { Job } from "bullmq";
import { emitJobEvent } from "../../lib/events";
import { cleanupClipArtifacts } from "../../services/cleanup.service";
import { cutVideoClip } from "../../services/clip-cutting.service";
import {
	buildSpeakerSegments,
	detectSpeakerFacePositions,
} from "../../services/face-detection.service";
import {
	concatVideos,
	cutAndCropVertical,
	getStoragePath,
	getVideoWidth,
} from "../../services/ffmpeg.service";
import { generateSubtitlesAndFinalizeClip } from "../../services/subtitle.service";
import type { WordTimestamp } from "../../services/transcription.service";
import type { RenderClipPayload } from "../../types/queue";
import { prisma } from "../../utils/prisma";

export async function renderClipProcessor(job: Job): Promise<void> {
	const { jobId, clipId, videoPath, startTime, endTime, aspectRatio } =
		job.data as RenderClipPayload;

	await prisma.clip.update({
		where: { id: clipId },
		data: { status: "RENDERING" },
	});

	try {
		const dbJob = await prisma.job.findUniqueOrThrow({ where: { id: jobId } });
		const transcript = dbJob.transcript as unknown as {
			text: string;
			words: WordTimestamp[];
		};

		const wordsInRange = transcript.words.filter(
			(w) => w.start >= startTime - 0.5 && w.start <= endTime + 0.5,
		);

		let rawClipPath: string;
		let outputPath: string;
		let subtitlePath: string;

		if (aspectRatio === "9:16" && videoPath) {
			// --- 9:16 vertical path with speaker tracking ---
			const videoWidth = await getVideoWidth(videoPath);
			const cropW = Math.floor(videoWidth * (9 / 16));
			const maxCropX = videoWidth - cropW;
			const centerCropX = Math.floor((videoWidth - cropW) / 2);

			// Detect face positions per speaker
			const faceMap = await detectSpeakerFacePositions(
				videoPath,
				transcript.words,
				videoWidth,
			);

			// Build speaker segments within the clip's time range
			const segments = buildSpeakerSegments(wordsInRange, startTime, endTime);

			const tempDir = path.join(getStoragePath(), "temp");
			const segmentPaths: string[] = [];

			if (segments.length === 0 || Object.keys(faceMap).length === 0) {
				// No diarization data — fall back to center crop
				const segPath = path.join(tempDir, `${clipId}_seg0.mp4`);
				await cutAndCropVertical(
					videoPath,
					segPath,
					startTime,
					endTime,
					centerCropX,
				);
				segmentPaths.push(segPath);
			} else {
				for (let i = 0; i < segments.length; i++) {
					const seg = segments[i];
					const faceCenterX =
						faceMap[seg.speaker_id] ?? centerCropX + Math.floor(cropW / 2);
					const cropX = Math.min(
						Math.max(0, faceCenterX - Math.floor(cropW / 2)),
						maxCropX,
					);
					const segPath = path.join(tempDir, `${clipId}_seg${i}.mp4`);
					await cutAndCropVertical(
						videoPath,
						segPath,
						seg.start,
						seg.end,
						cropX,
					);
					segmentPaths.push(segPath);
				}
			}

			// Concatenate segments → raw vertical clip
			rawClipPath = path.join(tempDir, `${clipId}_raw.mp4`);
			if (segmentPaths.length === 1) {
				await fs.rename(segmentPaths[0], rawClipPath);
			} else {
				await concatVideos(segmentPaths, rawClipPath);
				await Promise.all(
					segmentPaths.map((p) => fs.unlink(p).catch(() => {})),
				);
			}

			({ outputPath, subtitlePath } = await generateSubtitlesAndFinalizeClip(
				rawClipPath,
				clipId,
				wordsInRange,
				startTime,
				"9:16",
			));
		} else {
			// --- 16:9 landscape path (original) ---
			rawClipPath = await cutVideoClip(
				videoPath ?? "",
				clipId,
				startTime,
				endTime,
			);
			({ outputPath, subtitlePath } = await generateSubtitlesAndFinalizeClip(
				rawClipPath,
				clipId,
				wordsInRange,
				startTime,
			));
		}

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
