import fs from "node:fs/promises";
import path from "node:path";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { emitJobEvent, jobEmitter } from "../lib/events";
import { JOB_NAMES, videoQueue } from "../lib/queue";
import { getStoragePath } from "../services/ffmpeg.service";
import { prisma } from "../utils/prisma";

const MAX_UPLOAD_BYTES =
	Number(process.env.MAX_UPLOAD_SIZE_MB ?? 500) * 1024 * 1024;

export const jobRoute = new Hono();

jobRoute.post("/", async (c) => {
	let body: Record<string, File | string>;
	try {
		body = (await c.req.parseBody()) as Record<string, File | string>;
	} catch {
		return c.json({ error: "Failed to parse request body" }, 400);
	}

	const file = body.video;
	if (!file || typeof file === "string") {
		return c.json({ error: "No video file provided" }, 400);
	}

	const allowedTypes = [
		"video/mp4",
		"video/quicktime",
		"video/x-msvideo",
		"video/x-matroska",
		"video/webm",
	];
	if (!allowedTypes.includes(file.type)) {
		return c.json(
			{ error: "Invalid file type. Supported: MP4, MOV, AVI, MKV, WebM" },
			400,
		);
	}

	if (file.size > MAX_UPLOAD_BYTES) {
		return c.json(
			{
				error: `File too large. Max size: ${process.env.MAX_UPLOAD_SIZE_MB ?? 500}MB`,
			},
			400,
		);
	}

	const job = await prisma.job.create({
		data: { fileName: file.name, status: "PENDING" },
	});

	const ext = path.extname(file.name) || ".mp4";
	const filePath = path.join(getStoragePath(), "uploads", `${job.id}${ext}`);
	const buffer = Buffer.from(await file.arrayBuffer());
	await fs.writeFile(filePath, buffer);

	await prisma.job.update({
		where: { id: job.id },
		data: { filePath },
	});

	await videoQueue.add(JOB_NAMES.EXTRACT_AUDIO, {
		jobId: job.id,
		videoPath: filePath,
	});

	emitJobEvent({
		jobId: job.id,
		status: "PENDING",
		message: "Job created, processing will start shortly...",
	});

	return c.json({ jobId: job.id }, 201);
});

jobRoute.get("/:id", async (c) => {
	const job = await prisma.job.findUnique({
		where: { id: c.req.param("id") },
		include: {
			clips: { orderBy: { viralScore: "desc" } },
		},
	});

	if (!job) return c.json({ error: "Job not found" }, 404);

	return c.json(job);
});

jobRoute.get("/:id/clips", async (c) => {
	const job = await prisma.job.findUnique({ where: { id: c.req.param("id") } });
	if (!job) return c.json({ error: "Job not found" }, 404);

	const clips = await prisma.clip.findMany({
		where: { jobId: c.req.param("id") },
		orderBy: { viralScore: "desc" },
	});

	return c.json(clips);
});

jobRoute.get("/:id/events", async (c) => {
	const jobId = c.req.param("id");

	const job = await prisma.job.findUnique({
		where: { id: jobId },
		include: { clips: { orderBy: { viralScore: "desc" } } },
	});
	if (!job) return c.json({ error: "Job not found" }, 404);

	return streamSSE(c, async (stream) => {
		let done = false;

		stream.onAbort(() => {
			done = true;
		});

		await stream.writeSSE({
			data: JSON.stringify(job),
			event: "snapshot",
		});

		if (
			job.status === "COMPLETED" ||
			job.status === "FAILED" ||
			job.status === "EXPIRED"
		) {
			return;
		}

		await new Promise<void>((resolve) => {
			const onEvent = async (payload: unknown) => {
				if (done) {
					resolve();
					return;
				}
				try {
					const payloadObj = payload as { status: string };
					const updatedJob = await prisma.job.findUnique({
						where: { id: jobId },
						include: { clips: { orderBy: { viralScore: "desc" } } },
					});
					await stream.writeSSE({
						data: JSON.stringify({ ...updatedJob, _event: payloadObj }),
						event: "update",
					});
					if (
						payloadObj.status === "COMPLETED" ||
						payloadObj.status === "FAILED"
					) {
						jobEmitter.off(`job:${jobId}`, onEvent);
						resolve();
					}
				} catch {
					jobEmitter.off(`job:${jobId}`, onEvent);
					resolve();
				}
			};

			jobEmitter.on(`job:${jobId}`, onEvent);

			setTimeout(
				() => {
					jobEmitter.off(`job:${jobId}`, onEvent);
					resolve();
				},
				30 * 60 * 1000,
			);
		});
	});
});
