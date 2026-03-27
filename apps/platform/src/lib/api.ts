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

export async function uploadVideo(
	file: File,
	onProgress?: (pct: number) => void,
): Promise<{ jobId: string }> {
	return new Promise((resolve, reject) => {
		const formData = new FormData();
		formData.append("video", file);

		const xhr = new XMLHttpRequest();
		xhr.open("POST", `${API_URL}/api/jobs`);

		xhr.upload.onprogress = (e) => {
			if (e.lengthComputable && onProgress) {
				onProgress(Math.round((e.loaded / e.total) * 100));
			}
		};

		xhr.onload = () => {
			if (xhr.status >= 200 && xhr.status < 300) {
				resolve(JSON.parse(xhr.responseText) as { jobId: string });
			} else {
				const err = JSON.parse(xhr.responseText) as { error?: string };
				reject(new Error(err.error ?? `Upload failed: ${xhr.status}`));
			}
		};

		xhr.onerror = () => reject(new Error("Network error during upload"));
		xhr.send(formData);
	});
}
