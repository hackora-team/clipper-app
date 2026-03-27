export interface ExtractAudioPayload {
	jobId: string;
	videoPath: string;
}

export interface TranscribePayload {
	jobId: string;
	audioPath: string;
}

export interface DetectClipsPayload {
	jobId: string;
}

export interface RenderClipPayload {
	jobId: string;
	clipId: string;
	videoPath: string | null;
	startTime: number;
	endTime: number;
	aspectRatio: string;
}

export type JobPayload =
	| ExtractAudioPayload
	| TranscribePayload
	| DetectClipsPayload
	| RenderClipPayload;
