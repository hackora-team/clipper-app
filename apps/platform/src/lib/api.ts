import type { Job } from "./types";

const API_URL =
	typeof window !== "undefined"
		? (import.meta.env.VITE_API_URL ?? "http://localhost:8000")
		: "http://localhost:8000";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
	const res = await fetch(`${API_URL}${path}`, {
		...options,
		headers: {
			...options?.headers,
		},
	});

	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new ApiError(
			res.status,
			(body as { error?: string }).error || res.statusText,
		);
	}

	return res.json() as Promise<T>;
}

export class ApiError extends Error {
	constructor(
		public status: number,
		message: string,
	) {
		super(message);
		this.name = "ApiError";
	}
}

export function uploadVideo(
	file: File,
	onProgress?: (percent: number) => void,
): Promise<{ jobId: string; status: string; creditCost: number }> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		const formData = new FormData();
		formData.append("file", file);

		xhr.upload.addEventListener("progress", (e) => {
			if (e.lengthComputable && onProgress) {
				onProgress(Math.round((e.loaded / e.total) * 100));
			}
		});

		xhr.addEventListener("load", () => {
			if (xhr.status >= 200 && xhr.status < 300) {
				resolve(JSON.parse(xhr.responseText));
			} else {
				const body = JSON.parse(xhr.responseText).error ?? "Upload failed";
				reject(new ApiError(xhr.status, body));
			}
		});

		xhr.addEventListener("error", () => {
			reject(new ApiError(0, "Network error during upload"));
		});

		xhr.open("POST", `${API_URL}/api/jobs/upload`);
		xhr.send(formData);
	});
}

export async function startJob(
	jobId: string,
): Promise<{ jobId: string; status: string }> {
	return apiFetch(`/api/jobs/${jobId}/start`, { method: "POST" });
}

export async function getJob(jobId: string): Promise<{ job: Job }> {
	return apiFetch(`/api/jobs/${jobId}`);
}

export async function getCredits(): Promise<{ balance: number }> {
	return apiFetch("/api/credits/balance");
}

export function getClipDownloadUrl(clipId: string): string {
	return `${API_URL}/api/clips/${clipId}/download`;
}

export function createJobEventSource(jobId: string): EventSource {
	return new EventSource(`${API_URL}/api/jobs/${jobId}/events`);
}
