import { Worker } from "bullmq";
import { redis } from "./redis";
import { extractAudioProcessor } from "../queue/processors/extract-audio";
import { transcribeProcessor } from "../queue/processors/transcribe";
import { detectClipsProcessor } from "../queue/processors/detect-clips";
import { renderClipProcessor } from "../queue/processors/render-clip";
import type { Job } from "bullmq";

export function createWorker() {
	const worker = new Worker(
		"video-processing",
		async (job: Job) => {
			switch (job.name) {
				case "extract-audio":
					return extractAudioProcessor(job);
				case "transcribe":
					return transcribeProcessor(job);
				case "detect-clips":
					return detectClipsProcessor(job);
				case "render-clip":
					return renderClipProcessor(job);
				default:
					throw new Error(`Unknown job name: ${job.name}`);
			}
		},
		{
			connection: redis,
			concurrency: 2,
		},
	);

	worker.on("failed", (job, err) => {
		console.error(`Job ${job?.id} (${job?.name}) failed:`, err.message);
	});

	worker.on("completed", (job) => {
		console.log(`Job ${job.id} (${job.name}) completed`);
	});

	return worker;
}
