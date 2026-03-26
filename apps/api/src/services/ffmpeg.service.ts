import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import ffmpeg from "fluent-ffmpeg";

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
		const proc = spawn("ffmpeg", args);
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
	for (const dir of ["uploads", "temp", "outputs"]) {
		await fs.mkdir(path.join(base, dir), { recursive: true });
	}
}
