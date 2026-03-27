import { createReadStream, createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { HttpBindings } from "@hono/node-server";
import { Hono } from "hono";
import { emitJobEvent } from "../lib/events";
import { JOB_NAMES, videoQueue } from "../lib/queue";
import { getStoragePath } from "../services/ffmpeg.service";
import { prisma } from "../utils/prisma";

const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_UPLOAD_BYTES =
	Number(process.env.MAX_UPLOAD_SIZE_MB ?? 500) * 1024 * 1024;

const ALLOWED_TYPES = [
	"video/mp4",
	"video/quicktime",
	"video/x-msvideo",
	"video/x-matroska",
	"video/webm",
];

export const uploadRoute = new Hono<{ Bindings: HttpBindings }>();

// Phase 1 — Initiate upload
uploadRoute.post("/init", async (c) => {
	const body = await c.req.json<{
		fileName: string;
		mimeType: string;
		fileSize: number;
	}>();

	if (!body.fileName || !body.mimeType || !body.fileSize) {
		return c.json(
			{ error: "fileName, mimeType and fileSize are required" },
			400,
		);
	}

	if (!ALLOWED_TYPES.includes(body.mimeType)) {
		return c.json(
			{ error: "Invalid file type. Supported: MP4, MOV, AVI, MKV, WebM" },
			400,
		);
	}

	if (body.fileSize > MAX_UPLOAD_BYTES) {
		return c.json(
			{
				error: `File too large. Max size: ${process.env.MAX_UPLOAD_SIZE_MB ?? 500}MB`,
			},
			400,
		);
	}

	const totalChunks = Math.ceil(body.fileSize / CHUNK_SIZE);

	const upload = await prisma.upload.create({
		data: {
			fileName: body.fileName,
			mimeType: body.mimeType,
			fileSize: body.fileSize,
			totalChunks,
		},
	});

	await fs.mkdir(path.join(getStoragePath(), "chunks", upload.id), {
		recursive: true,
	});

	return c.json({ uploadId: upload.id, totalChunks }, 201);
});

// Phase 2 — Upload a chunk
uploadRoute.post("/:uploadId/chunk", async (c) => {
	const uploadId = c.req.param("uploadId");
	const chunkIndex = Number(c.req.header("x-chunk-index"));
	const chunkTotal = Number(c.req.header("x-chunk-total"));

	if (Number.isNaN(chunkIndex) || Number.isNaN(chunkTotal)) {
		return c.json(
			{ error: "X-Chunk-Index and X-Chunk-Total headers required" },
			400,
		);
	}

	const upload = await prisma.upload.findUnique({ where: { id: uploadId } });
	if (!upload) return c.json({ error: "Upload not found" }, 404);
	if (upload.status !== "UPLOADING") {
		return c.json({ error: "Upload is no longer accepting chunks" }, 409);
	}
	if (chunkIndex >= upload.totalChunks || chunkIndex < 0) {
		return c.json({ error: "Invalid chunk index" }, 400);
	}

	const chunkPath = path.join(
		getStoragePath(),
		"chunks",
		uploadId,
		`${chunkIndex}.part`,
	);

	const incoming = c.env.incoming;

	await new Promise<void>((resolve, reject) => {
		const ws = createWriteStream(chunkPath);
		incoming.pipe(ws);
		ws.on("finish", resolve);
		ws.on("error", reject);
		incoming.on("error", reject);
	});

	return c.json({ received: chunkIndex, total: chunkTotal });
});

// Phase 3 — Finalize: assemble chunks and enqueue job
uploadRoute.post("/:uploadId/finalize", async (c) => {
	const uploadId = c.req.param("uploadId");
	const body = await c.req
		.json<{ aspectRatio?: string }>()
		.catch(() => ({ aspectRatio: undefined }));
	const aspectRatio = body.aspectRatio === "9:16" ? "9:16" : "16:9";

	// Atomically transition UPLOADING → ASSEMBLING
	const updated = await prisma.upload.updateMany({
		where: { id: uploadId, status: "UPLOADING" },
		data: { status: "ASSEMBLING" },
	});
	if (updated.count === 0) {
		return c.json({ error: "Upload not found or already finalized" }, 409);
	}

	const upload = await prisma.upload.findUnique({ where: { id: uploadId } });
	if (!upload) return c.json({ error: "Upload not found" }, 404);

	const chunkDir = path.join(getStoragePath(), "chunks", uploadId);

	// Verify all chunks are present
	const missing: number[] = [];
	for (let i = 0; i < upload.totalChunks; i++) {
		const exists = await fs
			.access(path.join(chunkDir, `${i}.part`))
			.then(() => true)
			.catch(() => false);
		if (!exists) missing.push(i);
	}
	if (missing.length > 0) {
		await prisma.upload.update({
			where: { id: uploadId },
			data: { status: "UPLOADING" },
		});
		return c.json({ error: "Missing chunks", missing }, 400);
	}

	// Assemble chunks into a temp file
	const ext = path.extname(upload.fileName) || ".mp4";
	const tmpPath = path.join(
		getStoragePath(),
		"uploads",
		`tmp_${uploadId}${ext}`,
	);

	try {
		await new Promise<void>((resolve, reject) => {
			const ws = createWriteStream(tmpPath);
			const writeChunk = (index: number) => {
				if (index >= upload.totalChunks) {
					ws.end();
					return;
				}
				const rs = createReadStream(path.join(chunkDir, `${index}.part`));
				rs.pipe(ws, { end: false });
				rs.on("end", () => writeChunk(index + 1));
				rs.on("error", reject);
			};
			ws.on("finish", resolve);
			ws.on("error", reject);
			writeChunk(0);
		});
	} catch (_err) {
		await prisma.upload.update({
			where: { id: uploadId },
			data: { status: "FAILED" },
		});
		await fs.unlink(tmpPath).catch(() => undefined);
		return c.json({ error: "Assembly failed" }, 500);
	}

	// Create job and move file into place
	const job = await prisma.job.create({
		data: { fileName: upload.fileName, status: "PENDING", aspectRatio },
	});

	const filePath = path.join(getStoragePath(), "uploads", `${job.id}${ext}`);
	await fs.rename(tmpPath, filePath);

	await prisma.job.update({ where: { id: job.id }, data: { filePath } });
	await prisma.upload.update({
		where: { id: uploadId },
		data: { status: "DONE" },
	});

	// Clean up chunk directory
	await fs.rm(chunkDir, { recursive: true, force: true });

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
