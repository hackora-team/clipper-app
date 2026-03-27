const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export async function apiFetch<T>(
	path: string,
	options?: RequestInit,
): Promise<T> {
	const res = await fetch(`${API_URL}${path}`, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...options?.headers,
		},
	});

	if (!res.ok) {
		const err = await res.json().catch(() => ({ error: "Unknown error" }));
		throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
	}

	return res.json() as Promise<T>;
}

export function getApiUrl(path: string): string {
	return `${API_URL}${path}`;
}

const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB — must match server

export async function uploadVideo(
	file: File,
	onProgress?: (pct: number) => void,
): Promise<{ jobId: string }> {
	// Phase 1 — init
	const init = await apiFetch<{ uploadId: string; totalChunks: number }>(
		"/api/upload/init",
		{
			method: "POST",
			body: JSON.stringify({
				fileName: file.name,
				mimeType: file.type,
				fileSize: file.size,
			}),
		},
	);

	const { uploadId, totalChunks } = init;

	// Phase 2 — send chunks
	for (let i = 0; i < totalChunks; i++) {
		const start = i * CHUNK_SIZE;
		const chunk = file.slice(start, start + CHUNK_SIZE);

		const res = await fetch(`${API_URL}/api/upload/${uploadId}/chunk`, {
			method: "POST",
			body: chunk,
			headers: {
				"X-Chunk-Index": String(i),
				"X-Chunk-Total": String(totalChunks),
			},
		});

		if (!res.ok) {
			const err = await res.json().catch(() => ({ error: "Unknown error" }));
			throw new Error((err as { error?: string }).error ?? `Chunk ${i} failed`);
		}

		if (onProgress) onProgress(Math.round(((i + 1) / totalChunks) * 100));
	}

	// Phase 3 — finalize
	const { jobId } = await apiFetch<{ jobId: string }>(
		`/api/upload/${uploadId}/finalize`,
		{ method: "POST" },
	);

	return { jobId };
}
