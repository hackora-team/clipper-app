import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getApiUrl } from "../lib/api";
import type { Job } from "./use-jobs";

export function useJobEvents(jobId: string | undefined) {
	const queryClient = useQueryClient();
	const esRef = useRef<EventSource | null>(null);

	useEffect(() => {
		if (!jobId) return;

		const job = queryClient.getQueryData<Job>(["job", jobId]);
		if (
			job?.status === "COMPLETED" ||
			job?.status === "FAILED" ||
			job?.status === "EXPIRED"
		) {
			return;
		}

		const es = new EventSource(getApiUrl(`/api/jobs/${jobId}/events`));
		esRef.current = es;

		const handleEvent = (e: MessageEvent) => {
			try {
				const data = JSON.parse(e.data as string) as Job;
				queryClient.setQueryData(["job", jobId], data);

				if (
					data.status === "COMPLETED" ||
					data.status === "FAILED" ||
					data.status === "EXPIRED"
				) {
					es.close();
				}
			} catch {
				// ignore parse errors
			}
		};

		es.addEventListener("snapshot", handleEvent);
		es.addEventListener("update", handleEvent);

		es.onerror = () => {
			es.close();
		};

		return () => {
			es.close();
			esRef.current = null;
		};
	}, [jobId, queryClient]);
}
