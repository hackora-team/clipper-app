import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "../utils/prisma";
import { getStoragePath } from "./ffmpeg.service";

export async function cleanupJobArtifacts(jobId: string): Promise<void> {
	const storagePath = getStoragePath();
	const dirs = ["uploads", "temp", "outputs"];

	for (const dir of dirs) {
		const dirPath = path.join(storagePath, dir);
		try {
			const files = await fs.readdir(dirPath);
			for (const file of files) {
				if (file.startsWith(jobId)) {
					await fs.unlink(path.join(dirPath, file)).catch(() => undefined);
				}
			}
		} catch {
			// directory might not exist
		}
	}
}

export async function cleanupClipArtifacts(clipId: string): Promise<void> {
	const storagePath = getStoragePath();
	const dirs = ["temp", "outputs"];

	for (const dir of dirs) {
		const dirPath = path.join(storagePath, dir);
		try {
			const files = await fs.readdir(dirPath);
			for (const file of files) {
				if (file.startsWith(clipId)) {
					await fs.unlink(path.join(dirPath, file)).catch(() => undefined);
				}
			}
		} catch {
			// directory might not exist
		}
	}
}

export async function cleanupOldFiles(): Promise<void> {
	const storagePath = getStoragePath();
	const TTL_MS = 24 * 60 * 60 * 1000;
	const cutoff = Date.now() - TTL_MS;
	const dirs = ["uploads", "temp", "outputs"];

	let filesDeleted = 0;

	for (const dir of dirs) {
		const dirPath = path.join(storagePath, dir);
		try {
			const files = await fs.readdir(dirPath);
			for (const file of files) {
				const filePath = path.join(dirPath, file);
				const stat = await fs.stat(filePath).catch(() => null);
				if (stat && stat.mtimeMs < cutoff) {
					await fs.unlink(filePath).catch(() => undefined);
					filesDeleted++;
				}
			}
		} catch {
			// directory might not exist
		}
	}

	const expiredJobs = await prisma.job.updateMany({
		where: {
			status: { in: ["COMPLETED", "FAILED"] },
			updatedAt: { lt: new Date(cutoff) },
		},
		data: {
			status: "EXPIRED",
			filePath: null,
			audioPath: null,
		},
	});

	console.log(
		`Cleanup: deleted ${filesDeleted} files, expired ${expiredJobs.count} jobs`,
	);
}
