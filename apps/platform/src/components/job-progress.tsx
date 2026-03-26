import { CheckCircle, Circle, Loader, XCircle } from "lucide-react";
import type { Job } from "../hooks/use-jobs";

const STEPS = [
	{ key: "EXTRACTING_AUDIO", label: "Extract Audio" },
	{ key: "TRANSCRIBING", label: "Transcribing" },
	{ key: "DETECTING_CLIPS", label: "Detecting Clips" },
	{ key: "RENDERING", label: "Rendering" },
	{ key: "COMPLETED", label: "Complete" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

const STATUS_ORDER: Record<string, number> = {
	PENDING: 0,
	EXTRACTING_AUDIO: 1,
	TRANSCRIBING: 2,
	DETECTING_CLIPS: 3,
	RENDERING: 4,
	COMPLETED: 5,
	FAILED: -1,
	EXPIRED: -1,
};

interface JobProgressProps {
	job: Job;
}

export function JobProgress({ job }: JobProgressProps) {
	const currentOrder = STATUS_ORDER[job.status] ?? 0;
	const isFailed = job.status === "FAILED";

	return (
		<div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
			<div className="flex items-center justify-between mb-6">
				<h2 className="font-semibold text-white">Processing</h2>
				{isFailed && (
					<span className="text-sm text-red-400 flex items-center gap-1">
						<XCircle className="w-4 h-4" />
						Failed
					</span>
				)}
				{job.status === "COMPLETED" && (
					<span className="text-sm text-green-400 flex items-center gap-1">
						<CheckCircle className="w-4 h-4" />
						Done
					</span>
				)}
			</div>

			<div className="space-y-4">
				{STEPS.map((step, i) => {
					const stepOrder = STATUS_ORDER[step.key] ?? 0;
					const isDone =
						!isFailed &&
						(step.key === "COMPLETED"
							? job.status === "COMPLETED"
							: currentOrder > stepOrder);
					const isCurrent = !isFailed && currentOrder === stepOrder;
					const isPending = isFailed
						? false
						: !isDone && !isCurrent && step.key !== "COMPLETED";

					return (
						<div key={step.key} className="flex items-center gap-3">
							<div className="flex-shrink-0">
								{isFailed && i <= (currentOrder === -1 ? 0 : currentOrder) ? (
									<XCircle className="w-5 h-5 text-red-500" />
								) : isDone ? (
									<CheckCircle className="w-5 h-5 text-green-500" />
								) : isCurrent ? (
									<Loader className="w-5 h-5 text-purple-400 animate-spin" />
								) : (
									<Circle className="w-5 h-5 text-gray-700" />
								)}
							</div>
							<span
								className={
									isDone
										? "text-green-400 text-sm"
										: isCurrent
											? "text-purple-300 text-sm font-medium"
											: isPending
												? "text-gray-600 text-sm"
												: "text-gray-500 text-sm"
								}
							>
								{step.label}
							</span>
							{isCurrent && (
								<span className="ml-auto text-xs text-gray-500 animate-pulse">
									In progress...
								</span>
							)}
						</div>
					);
				})}
			</div>

			{isFailed && job.errorMessage && (
				<div className="mt-4 p-3 bg-red-950/50 border border-red-900/50 rounded-lg">
					<p className="text-sm text-red-300">{job.errorMessage}</p>
				</div>
			)}
		</div>
	);
}
