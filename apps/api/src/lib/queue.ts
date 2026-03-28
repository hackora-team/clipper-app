import { Queue } from "bullmq";
import { redis } from "./redis";

export const videoQueue = new Queue("video-processing", {
	connection: redis,
	defaultJobOptions: {
		attempts: 3,
		backoff: { type: "exponential", delay: 2000 },
		removeOnComplete: 100,
		removeOnFail: 200,
	},
});

export const JOB_NAMES = {
	EXTRACT_AUDIO: "extract-audio",
	TRANSCRIBE: "transcribe",
	DETECT_CLIPS: "detect-clips",
	RENDER_CLIP: "render-clip",
} as const;
