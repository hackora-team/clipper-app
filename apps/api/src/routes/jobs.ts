import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Hono } from "hono";
import type { AuthUser } from "../middleware/mock-auth.js";
import { prisma } from "../utils/prisma.js";

const jobs = new Hono();

const UPLOAD_DIR = join(process.cwd(), "uploads");

// Credit cost based on estimated duration (minutes)
function estimateCreditCost(fileSizeBytes: number): number {
	// Rough estimate: 1MB ≈ 1 minute for compressed video
	const estimatedMinutes = fileSizeBytes / (1024 * 1024);
	if (estimatedMinutes <= 10) return 1;
	if (estimatedMinutes <= 30) return 3;
	return 5;
}

// Validate video magic bytes
function validateVideoType(buffer: ArrayBuffer): {
	valid: boolean;
	mimeType: string;
} {
	const bytes = new Uint8Array(buffer).slice(0, 12);

	// MP4/MOV: ftyp signature at offset 4
	if (
		bytes[4] === 0x66 &&
		bytes[5] === 0x74 &&
		bytes[6] === 0x79 &&
		bytes[7] === 0x70
	) {
		return { valid: true, mimeType: "video/mp4" };
	}

	// WebM: EBML signature
	if (
		bytes[0] === 0x1a &&
		bytes[1] === 0x45 &&
		bytes[2] === 0xdf &&
		bytes[3] === 0xa3
	) {
		return { valid: true, mimeType: "video/webm" };
	}

	return { valid: false, mimeType: "" };
}

// POST /api/jobs/upload
jobs.post("/upload", async (c) => {
	const user = c.get("user") as AuthUser;

	const formData = await c.req.formData();
	const file = formData.get("file") as File | null;

	if (!file) {
		return c.json({ error: "No file provided" }, 400);
	}

	// Validate file type via magic bytes
	const buffer = await file.arrayBuffer();
	const { valid } = validateVideoType(buffer);

	if (!valid) {
		return c.json(
			{ error: "Invalid file type. Accepted: MP4, WebM, MOV" },
			400,
		);
	}

	// Check file size (mock Pro plan: 500MB)
	const maxSize = 500 * 1024 * 1024;
	if (file.size > maxSize) {
		return c.json(
			{ error: `File exceeds ${maxSize / (1024 * 1024)}MB limit` },
			413,
		);
	}

	// Check credit balance
	const dbUser = await prisma.user.findUnique({
		where: { id: user.id },
	});

	const creditCost = estimateCreditCost(file.size);

	if (!dbUser || dbUser.creditBalance < creditCost) {
		return c.json({ error: "Insufficient credits" }, 402);
	}

	// Save file to disk
	await mkdir(UPLOAD_DIR, { recursive: true });
	const filename = `${Date.now()}-${file.name}`;
	const filepath = join(UPLOAD_DIR, filename);
	await writeFile(filepath, Buffer.from(buffer));

	// Create job record
	const job = await prisma.job.create({
		data: {
			userId: user.id,
			originalFilename: file.name,
			originalPath: filepath,
			fileSize: file.size,
			creditsCharged: creditCost,
			ipAddress: c.req.header("x-forwarded-for") || "127.0.0.1",
		},
	});

	return c.json({
		jobId: job.id,
		status: job.status,
		creditCost,
	});
});

// POST /api/jobs/:id/start
jobs.post("/:id/start", async (c) => {
	const user = c.get("user") as AuthUser;
	const jobId = c.req.param("id");

	const job = await prisma.job.findFirst({
		where: { id: jobId, userId: user.id },
	});

	if (!job) {
		return c.json({ error: "Job not found" }, 404);
	}

	if (job.status !== "UPLOADED") {
		return c.json({ error: "Job already started" }, 400);
	}

	// Deduct credits
	await prisma.$transaction([
		prisma.user.update({
			where: { id: user.id },
			data: { creditBalance: { decrement: job.creditsCharged } },
		}),
		prisma.creditTransaction.create({
			data: {
				userId: user.id,
				type: "USAGE",
				amount: -job.creditsCharged,
				balance: 0, // will be approximate
				description: `Video processing: ${job.originalFilename}`,
				jobId: job.id,
			},
		}),
		prisma.job.update({
			where: { id: jobId },
			data: { status: "EXTRACTING_AUDIO", currentStep: "EXTRACTING_AUDIO" },
		}),
	]);

	return c.json({ jobId, status: "EXTRACTING_AUDIO" });
});

// GET /api/jobs
jobs.get("/", async (c) => {
	const user = c.get("user") as AuthUser;

	const userJobs = await prisma.job.findMany({
		where: { userId: user.id },
		orderBy: { createdAt: "desc" },
		include: { clips: true },
	});

	return c.json({ jobs: userJobs });
});

// GET /api/jobs/:id
jobs.get("/:id", async (c) => {
	const user = c.get("user") as AuthUser;
	const jobId = c.req.param("id");

	const job = await prisma.job.findFirst({
		where: { id: jobId, userId: user.id },
		include: {
			clips: {
				orderBy: { viralScore: "desc" },
			},
		},
	});

	if (!job) {
		return c.json({ error: "Job not found" }, 404);
	}

	return c.json({ job });
});

export { jobs };
