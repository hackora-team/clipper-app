import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import { Readable } from "node:stream";
import { Hono } from "hono";
import { prisma } from "../utils/prisma";

export const clipRoute = new Hono();

clipRoute.get("/:id", async (c) => {
	const clip = await prisma.clip.findUnique({
		where: { id: c.req.param("id") },
	});
	if (!clip) return c.json({ error: "Clip not found" }, 404);
	return c.json(clip);
});

clipRoute.get("/:id/stream", async (c) => {
	const clip = await prisma.clip.findUnique({
		where: { id: c.req.param("id") },
	});

	if (!clip?.outputPath || clip.status !== "COMPLETED") {
		return c.json({ error: "Clip not available" }, 404);
	}

	const stat = await fs.stat(clip.outputPath).catch(() => null);
	if (!stat) return c.json({ error: "File not found" }, 404);

	const range = c.req.header("Range");
	if (range) {
		const parts = range.replace("bytes=", "").split("-");
		const start = Number.parseInt(parts[0], 10);
		const end = parts[1] ? Number.parseInt(parts[1], 10) : stat.size - 1;
		const chunkSize = end - start + 1;

		c.header("Content-Range", `bytes ${start}-${end}/${stat.size}`);
		c.header("Accept-Ranges", "bytes");
		c.header("Content-Length", chunkSize.toString());
		c.header("Content-Type", "video/mp4");
		c.status(206);

		const fileStream = createReadStream(clip.outputPath, { start, end });
		return c.body(Readable.toWeb(fileStream) as ReadableStream);
	}

	c.header("Accept-Ranges", "bytes");
	c.header("Content-Length", stat.size.toString());
	c.header("Content-Type", "video/mp4");
	const fileStream = createReadStream(clip.outputPath);
	return c.body(Readable.toWeb(fileStream) as ReadableStream);
});

clipRoute.get("/:id/download", async (c) => {
	const clip = await prisma.clip.findUnique({
		where: { id: c.req.param("id") },
	});

	if (!clip?.outputPath || clip.status !== "COMPLETED") {
		return c.json({ error: "Clip not available" }, 404);
	}

	const stat = await fs.stat(clip.outputPath).catch(() => null);
	if (!stat) return c.json({ error: "File not found" }, 404);

	const safeTitle = clip.title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
	c.header("Content-Disposition", `attachment; filename="${safeTitle}.mp4"`);
	c.header("Content-Type", "video/mp4");
	c.header("Content-Length", stat.size.toString());

	const fileStream = createReadStream(clip.outputPath);
	return c.body(Readable.toWeb(fileStream) as ReadableStream);
});
