import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import ffmpeg from "fluent-ffmpeg";

if (process.env.FFMPEG_PATH) ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
if (process.env.FFPROBE_PATH) ffmpeg.setFfprobePath(process.env.FFPROBE_PATH);

export function extractAudio(
	inputPath: string,
	outputPath: string,
): Promise<void> {
	return new Promise((resolve, reject) => {
		ffmpeg(inputPath)
			.outputOptions([
				"-vn",
				"-acodec libmp3lame",
				"-ar 16000",
				"-ac 1",
				"-b:a 64k",
			])
			.output(outputPath)
			.on("end", () => resolve())
			.on("error", (err) =>
				reject(new Error(`ffmpeg extractAudio: ${err.message}`)),
			)
			.run();
	});
}

export function cutClip(
	inputPath: string,
	outputPath: string,
	startTime: number,
	endTime: number,
): Promise<void> {
	const duration = endTime - startTime;
	return new Promise((resolve, reject) => {
		ffmpeg(inputPath)
			.inputOptions([`-ss ${Math.max(0, startTime - 0.1)}`])
			.outputOptions([
				`-t ${duration + 0.1}`,
				"-c:v libx264",
				"-preset fast",
				"-crf 23",
				"-c:a aac",
				"-b:a 128k",
				"-async 1",
				"-avoid_negative_ts make_zero",
			])
			.output(outputPath)
			.on("end", () => resolve())
			.on("error", (err) => reject(new Error(`ffmpeg cutClip: ${err.message}`)))
			.run();
	});
}

export function burnSubtitles(
	inputPath: string,
	subtitlePath: string,
	outputPath: string,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const args = [
			"-i",
			inputPath,
			"-vf",
			`subtitles=${subtitlePath}`,
			"-c:v",
			"libx264",
			"-preset",
			"fast",
			"-crf",
			"23",
			"-c:a",
			"aac",
			"-b:a",
			"128k",
			"-y",
			outputPath,
		];
		const proc = spawn(process.env.FFMPEG_PATH ?? "ffmpeg", args);
		let stderr = "";
		proc.stderr.on("data", (data) => {
			stderr += data.toString();
		});
		proc.on("close", (code) => {
			if (code === 0) resolve();
			else
				reject(
					new Error(
						`ffmpeg burnSubtitles exited with code ${code}: ${stderr.slice(-500)}`,
					),
				);
		});
		proc.on("error", (err) =>
			reject(new Error(`ffmpeg burnSubtitles: ${err.message}`)),
		);
	});
}

export function splitAudio(
	inputPath: string,
	outputDir: string,
	chunkDuration: number,
): Promise<string[]> {
	return new Promise((resolve, reject) => {
		ffmpeg.ffprobe(inputPath, (err, metadata) => {
			if (err) return reject(new Error(`ffprobe: ${err.message}`));
			const totalDuration = metadata.format.duration ?? 0;
			interface ChunkInfo {
				path: string;
				start: number;
			}
			const chunks: ChunkInfo[] = [];
			let start = 0;
			let index = 0;
			while (start < totalDuration) {
				chunks.push({
					path: path.join(outputDir, `chunk_${index}.mp3`),
					start,
				});
				start += chunkDuration;
				index++;
			}
			let completed = 0;
			const chunkPaths = chunks.map((c) => c.path);
			for (const chunk of chunks) {
				ffmpeg(inputPath)
					.inputOptions([`-ss ${chunk.start}`])
					.outputOptions([`-t ${chunkDuration}`, "-acodec copy"])
					.output(chunk.path)
					.on("end", () => {
						completed++;
						if (completed === chunks.length) resolve(chunkPaths);
					})
					.on("error", (e) =>
						reject(new Error(`ffmpeg splitAudio: ${e.message}`)),
					)
					.run();
			}
		});
	});
}

export function extractFrame(
	videoPath: string,
	outputPath: string,
	timestampSeconds: number,
): Promise<void> {
	return new Promise((resolve, reject) => {
		ffmpeg(videoPath)
			.inputOptions([`-ss ${timestampSeconds}`])
			.outputOptions(["-vframes 1", "-q:v 2"])
			.output(outputPath)
			.on("end", () => resolve())
			.on("error", (err) =>
				reject(new Error(`ffmpeg extractFrame: ${err.message}`)),
			)
			.run();
	});
}

export function getVideoWidth(videoPath: string): Promise<number> {
	return new Promise((resolve, reject) => {
		ffmpeg.ffprobe(videoPath, (err, metadata) => {
			if (err) return reject(new Error(`ffprobe: ${err.message}`));
			const stream = metadata.streams.find((s) => s.codec_type === "video");
			resolve(stream?.width ?? 1920);
		});
	});
}

export function cutAndCropVertical(
	inputPath: string,
	outputPath: string,
	startTime: number,
	endTime: number,
	cropX: number,
): Promise<void> {
	const duration = endTime - startTime;
	// crop a 9:16 slice from 16:9 source, scale to 1080×1920
	const cropW = "ih*(9/16)";
	return new Promise((resolve, reject) => {
		ffmpeg(inputPath)
			.inputOptions([`-ss ${Math.max(0, startTime - 0.1)}`])
			.outputOptions([
				`-t ${duration + 0.1}`,
				"-vf",
				`crop=${cropW}:ih:${cropX}:0,scale=1080:1920`,
				"-c:v libx264",
				"-preset fast",
				"-crf 23",
				"-c:a aac",
				"-b:a 128k",
				"-async 1",
				"-avoid_negative_ts make_zero",
			])
			.output(outputPath)
			.on("end", () => resolve())
			.on("error", (err) =>
				reject(new Error(`ffmpeg cutAndCropVertical: ${err.message}`)),
			)
			.run();
	});
}

export async function concatVideos(
	segmentPaths: string[],
	outputPath: string,
): Promise<void> {
	const listPath = `${outputPath}.concat.txt`;
	const listContent = segmentPaths
		.map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
		.join("\n");
	await fs.writeFile(listPath, listContent, "utf-8");

	await new Promise<void>((resolve, reject) => {
		const args = [
			"-f",
			"concat",
			"-safe",
			"0",
			"-i",
			listPath,
			"-c",
			"copy",
			"-y",
			outputPath,
		];
		const proc = spawn(process.env.FFMPEG_PATH ?? "ffmpeg", args);
		let stderr = "";
		proc.stderr.on("data", (d) => {
			stderr += d.toString();
		});
		proc.on("close", (code) => {
			if (code === 0) resolve();
			else
				reject(
					new Error(
						`ffmpeg concatVideos exited ${code}: ${stderr.slice(-300)}`,
					),
				);
		});
		proc.on("error", (err) =>
			reject(new Error(`ffmpeg concatVideos: ${err.message}`)),
		);
	});

	await fs.unlink(listPath).catch(() => {});
}

export function getVideoDuration(inputPath: string): Promise<number> {
	return new Promise((resolve, reject) => {
		ffmpeg.ffprobe(inputPath, (err, metadata) => {
			if (err) return reject(new Error(`ffprobe: ${err.message}`));
			resolve(metadata.format.duration ?? 0);
		});
	});
}

export async function ensureDir(dirPath: string): Promise<void> {
	await fs.mkdir(dirPath, { recursive: true });
}

export function getStoragePath(): string {
	return process.env.STORAGE_PATH
		? path.resolve(process.env.STORAGE_PATH)
		: path.join(process.cwd(), "storage");
}

export async function initStorage(): Promise<void> {
	const base = getStoragePath();
	for (const dir of ["uploads", "temp", "outputs", "chunks"]) {
		await fs.mkdir(path.join(base, dir), { recursive: true });
	}
}
