import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export interface Clip {
	id: string;
	jobId: string;
	title: string;
	description: string | null;
	startTime: number;
	endTime: number;
	duration: number;
	viralScore: number;
	outputPath: string | null;
	subtitlePath: string | null;
	status: "PENDING" | "RENDERING" | "COMPLETED" | "FAILED";
	errorMessage: string | null;
	createdAt: string;
}

export interface Job {
	id: string;
	status:
		| "PENDING"
		| "EXTRACTING_AUDIO"
		| "TRANSCRIBING"
		| "DETECTING_CLIPS"
		| "RENDERING"
		| "COMPLETED"
		| "FAILED"
		| "EXPIRED";
	fileName: string;
	filePath: string | null;
	audioPath: string | null;
	errorMessage: string | null;
	clips: Clip[];
	createdAt: string;
	updatedAt: string;
}

export function useJob(jobId: string) {
	return useQuery<Job>({
		queryKey: ["job", jobId],
		queryFn: () => apiFetch<Job>(`/api/jobs/${jobId}`),
		enabled: !!jobId,
		refetchOnWindowFocus: false,
		staleTime: 5000,
	});
}
