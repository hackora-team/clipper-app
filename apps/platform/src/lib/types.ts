export type JobStatus =
	| "UPLOADED"
	| "EXTRACTING_AUDIO"
	| "TRANSCRIBING"
	| "DETECTING_CLIPS"
	| "RENDERING"
	| "COMPLETED"
	| "FAILED";

export type ClipStatus = "PENDING" | "RENDERING" | "COMPLETED" | "FAILED";

export interface Clip {
	id: string;
	jobId: string;
	title: string;
	description: string;
	startTime: number;
	endTime: number;
	viralScore: number;
	outputPath: string | null;
	status: ClipStatus;
	createdAt: string;
}

export interface Job {
	id: string;
	userId: string;
	status: JobStatus;
	originalFilename: string;
	originalPath: string;
	duration: number | null;
	fileSize: number;
	creditsCharged: number;
	currentStep: string | null;
	progress: number;
	errorMessage: string | null;
	createdAt: string;
	updatedAt: string;
	completedAt: string | null;
	clips: Clip[];
}

export interface SSEProgressEvent {
	step: string;
	progress: number;
	message: string;
}

export interface SSECompletedEvent {
	jobId: string;
	clipCount: number;
}
