import path from "node:path";
import { cutClip, getStoragePath } from "./ffmpeg.service";

export async function cutVideoClip(
	videoPath: string,
	clipId: string,
	startTime: number,
	endTime: number,
): Promise<string> {
	const outputPath = path.join(getStoragePath(), "temp", `${clipId}_raw.mp4`);
	await cutClip(videoPath, outputPath, startTime, endTime);
	return outputPath;
}
