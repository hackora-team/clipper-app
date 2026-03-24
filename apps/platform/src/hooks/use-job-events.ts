import { useCallback, useEffect, useRef, useState } from "react";
import { createJobEventSource } from "../lib/api";
import type { SSECompletedEvent, SSEProgressEvent } from "../lib/types";

export interface StepInfo {
	name: string;
	label: string;
	progress: number;
	status: "pending" | "active" | "completed";
	message?: string;
}

const STEP_ORDER = [
	{ name: "EXTRACTING_AUDIO", label: "Extracting audio" },
	{ name: "TRANSCRIBING", label: "Transcribing" },
	{ name: "DETECTING_CLIPS", label: "Analyzing content" },
	{ name: "RENDERING", label: "Rendering clips" },
];

export function useJobEvents(jobId: string) {
	const [steps, setSteps] = useState<StepInfo[]>(
		STEP_ORDER.map((s) => ({
			...s,
			progress: 0,
			status: "pending" as const,
		})),
	);
	const [isComplete, setIsComplete] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [clipCount, setClipCount] = useState(0);
	const esRef = useRef<EventSource | null>(null);

	const cleanup = useCallback(() => {
		if (esRef.current) {
			esRef.current.close();
			esRef.current = null;
		}
	}, []);

	useEffect(() => {
		const es = createJobEventSource(jobId);
		esRef.current = es;

		es.addEventListener("progress", (e) => {
			const data: SSEProgressEvent = JSON.parse(e.data);

			setSteps((prev) =>
				prev.map((step) => {
					const stepIndex = STEP_ORDER.findIndex((s) => s.name === step.name);
					const currentIndex = STEP_ORDER.findIndex(
						(s) => s.name === data.step,
					);

					if (step.name === data.step) {
						return {
							...step,
							progress: data.progress,
							status:
								data.progress >= 100
									? ("completed" as const)
									: ("active" as const),
							message: data.message,
						};
					}
					if (stepIndex < currentIndex) {
						return { ...step, progress: 100, status: "completed" as const };
					}
					return step;
				}),
			);
		});

		es.addEventListener("completed", (e) => {
			const data: SSECompletedEvent = JSON.parse(e.data);
			setClipCount(data.clipCount);
			setIsComplete(true);
			setSteps((prev) =>
				prev.map((step) => ({
					...step,
					progress: 100,
					status: "completed" as const,
				})),
			);
			cleanup();
		});

		es.addEventListener("error", () => {
			if (es.readyState === EventSource.CLOSED) {
				setError("Connection lost. Processing may still be running.");
			}
		});

		return cleanup;
	}, [jobId, cleanup]);

	const overallProgress =
		steps.reduce((sum, s) => sum + s.progress, 0) / steps.length;

	return { steps, isComplete, error, clipCount, overallProgress };
}
