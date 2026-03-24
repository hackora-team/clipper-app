import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { Hono } from "hono";
import type { AuthUser } from "../middleware/mock-auth.js";
import { prisma } from "../utils/prisma.js";

const clips = new Hono();

// GET /api/clips/:id/download
clips.get("/:id/download", async (c) => {
	const user = c.get("user") as AuthUser;
	const clipId = c.req.param("id");

	const clip = await prisma.clip.findUnique({
		where: { id: clipId },
		include: { job: { select: { userId: true } } },
	});

	if (!clip || clip.job.userId !== user.id) {
		return c.json({ error: "Clip not found" }, 404);
	}

	if (!clip.outputPath || !existsSync(clip.outputPath)) {
		// For mock: return the original uploaded video as a stand-in
		const job = await prisma.job.findUnique({
			where: { id: clip.jobId },
		});

		if (job?.originalPath && existsSync(job.originalPath)) {
			const fileStat = await stat(job.originalPath);
			const stream = createReadStream(job.originalPath);
			const webStream = Readable.toWeb(stream) as ReadableStream;

			return new Response(webStream, {
				headers: {
					"Content-Type": "video/mp4",
					"Content-Length": fileStat.size.toString(),
					"Content-Disposition": `attachment; filename="${clip.title}.mp4"`,
				},
			});
		}

		return c.json({ error: "Clip file not available" }, 404);
	}

	const fileStat = await stat(clip.outputPath);
	const stream = createReadStream(clip.outputPath);
	const webStream = Readable.toWeb(stream) as ReadableStream;

	return new Response(webStream, {
		headers: {
			"Content-Type": "video/mp4",
			"Content-Length": fileStat.size.toString(),
			"Content-Disposition": `attachment; filename="${clip.title}.mp4"`,
		},
	});
});

export { clips };
