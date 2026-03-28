import { createWriteStream } from "node:fs";
import path from "node:path";
import type { HttpBindings } from "@hono/node-server";
import busboy from "busboy";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { emitJobEvent, jobEmitter } from "../lib/events";
import { JOB_NAMES, videoQueue } from "../lib/queue";
import { getStoragePath } from "../services/ffmpeg.service";
import { prisma } from "../utils/prisma";

const MAX_UPLOAD_BYTES =
	Number(process.env.MAX_UPLOAD_SIZE_MB ?? 500) * 1024 * 1024;

const ALLOWED_TYPES = [
	"video/mp4",
	"video/quicktime",
	"video/x-msvideo",
	"video/x-matroska",
	"video/webm",
];

export const jobRoute = new Hono<{ Bindings: HttpBindings }>();

jobRoute.post("/", async (c) => {
	const contentType = c.req.header("content-type");
	if (!contentType?.startsWith("multipart/form-data")) {
		return c.json({ error: "Expected multipart/form-data" }, 400);
	}

	const incoming = c.env.incoming as import("node:http").IncomingMessage;

	type UploadResult = {
		fileName: string;
		mimeType: string;
		filePath: string;
	};

	let result: UploadResult;
	try {
		result = await new Promise<UploadResult>((resolve, reject) => {
			const bb = busboy({
				headers: { "content-type": contentType },
				limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
			});

			let settled = false;
			const done = (val: UploadResult | Error) => {
				if (settled) return;
				settled = true;
				val instanceof Error ? reject(val) : resolve(val);
			};

			bb.on("file", (fieldName, stream, info) => {
				if (fieldName !== "video") {
					stream.resume();
					return;
				}

				const { filename, mimeType } = info;
				if (!ALLOWED_TYPES.includes(mimeType)) {
					stream.resume();
					done(
						new Error("Invalid file type. Supported: MP4, MOV, AVI, MKV, WebM"),
					);
					return;
				}

				const ext = path.extname(filename) || ".mp4";
				const tmpPath = path.join(
					getStoragePath(),
					"uploads",
					`tmp_${Date.now()}${ext}`,
				);
				const ws = createWriteStream(tmpPath);

				stream.on("limit", () => {
					ws.destroy();
					done(
						new Error(
							`File too large. Max size: ${process.env.MAX_UPLOAD_SIZE_MB ?? 500}MB`,
						),
					);
				});

				stream.pipe(ws);
				ws.on("finish", () =>
					done({ fileName: filename, mimeType, filePath: tmpPath }),
				);
				ws.on("error", (err) => done(err));
				stream.on("error", (err) => done(err));
			});

			bb.on("error", (err) =>
				done(err instanceof Error ? err : new Error(String(err))),
			);
			incoming.pipe(bb);
		});
	} catch (err) {
		return c.json(
			{ error: err instanceof Error ? err.message : "Upload failed" },
			400,
		);
	}

	if (!result) {
		return c.json({ error: "No video file provided" }, 400);
	}

	const job = await prisma.job.create({
		data: { fileName: result.fileName, status: "PENDING" },
	});

	const ext = path.extname(result.fileName) || ".mp4";
	const filePath = path.join(getStoragePath(), "uploads", `${job.id}${ext}`);
	await import("node:fs/promises").then((fs) =>
		fs.rename(result.filePath, filePath),
	);

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
