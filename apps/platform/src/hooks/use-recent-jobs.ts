import { useState, useEffect } from "react";

export interface RecentJob {
	id: string;
	fileName: string;
	createdAt: string;
}

const STORAGE_KEY = "clipper:recent-jobs";
const MAX_ENTRIES = 20;

function readFromStorage(): RecentJob[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? (JSON.parse(raw) as RecentJob[]) : [];
	} catch {
		return [];
	}
}

function writeToStorage(jobs: RecentJob[]): void {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
}

export function useRecentJobs() {
	const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);

	useEffect(() => {
		setRecentJobs(readFromStorage());
	}, []);

	function addRecentJob(job: RecentJob): void {
		const current = readFromStorage().filter((j) => j.id !== job.id);
		const updated = [job, ...current].slice(0, MAX_ENTRIES);
		writeToStorage(updated);
		setRecentJobs(updated);
	}

	function removeRecentJob(id: string): void {
		const updated = readFromStorage().filter((j) => j.id !== id);
		writeToStorage(updated);
		setRecentJobs(updated);
	}

	return { recentJobs, addRecentJob, removeRecentJob };
}
