import { Alert, Card, ProgressBar } from "@monorepo/ui";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Circle, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useJobEvents } from "../../../hooks/use-job-events";
import { getJob } from "../../../lib/api";

export const Route = createFileRoute("/jobs/$jobId/processing")({
	component: ProcessingPage,
	loader: async ({ params }) => {
		const { job } = await getJob(params.jobId);
		return { job };
	},
});

function ProcessingPage() {
	const { jobId } = Route.useParams();
	const { job } = Route.useLoaderData();
	const navigate = useNavigate();
	const { steps, isComplete, error, clipCount, overallProgress } =
		useJobEvents(jobId);

	// Redirect to results if already completed (from loader)
	useEffect(() => {
		if (job.status === "COMPLETED") {
			navigate({ to: "/jobs/$jobId/results", params: { jobId } });
		}
	}, [job.status, jobId, navigate]);

	// Redirect when SSE says completed
	useEffect(() => {
		if (isComplete) {
			const timer = setTimeout(() => {
				navigate({ to: "/jobs/$jobId/results", params: { jobId } });
			}, 1000);
			return () => clearTimeout(timer);
		}
	}, [isComplete, jobId, navigate]);

	return (
		<div className="mx-auto max-w-lg">
			<div className="mb-8 text-center">
				<h1 className="text-2xl font-bold text-gray-900">
					Processing Your Video
				</h1>
				<p className="mt-1 text-sm text-gray-500">{job.originalFilename}</p>
			</div>

			{error && (
				<Alert variant="error" className="mb-6">
					<div>
						<p className="font-medium">{error}</p>
						<p className="mt-1 text-sm">Your credits have been refunded.</p>
						<button
							type="button"
							onClick={() => navigate({ to: "/" })}
							className="mt-3 rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-200"
						>
							Try Again
						</button>
					</div>
				</Alert>
			)}

			<Card>
				{/* Step checklist */}
				<div className="space-y-4">
					{steps.map((step) => (
						<div key={step.name} className="flex items-start gap-3">
							{/* Step icon */}
							<div className="mt-0.5 shrink-0">
								{step.status === "completed" ? (
									<div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
										<Check className="h-4 w-4 text-green-600" />
									</div>
								) : step.status === "active" ? (
									<div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100">
										<Loader2 className="h-4 w-4 animate-spin text-blue-600" />
									</div>
								) : (
									<div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100">
										<Circle className="h-3 w-3 text-gray-400" />
									</div>
								)}
							</div>

							{/* Step content */}
							<div className="flex-1">
								<p
									className={`text-sm font-medium ${
										step.status === "completed"
											? "text-green-700"
											: step.status === "active"
												? "text-blue-700"
												: "text-gray-400"
									}`}
								>
									{step.label}
									{step.status === "active" &&
										step.progress > 0 &&
										step.progress < 100 &&
										` ${Math.round(step.progress)}%`}
								</p>
								{step.message && step.status === "active" && (
									<p className="mt-0.5 text-xs text-gray-500">{step.message}</p>
								)}
							</div>
						</div>
					))}
				</div>

				{/* Overall progress bar */}
				<div className="mt-6 border-t border-gray-100 pt-4">
					<ProgressBar progress={overallProgress} label="Overall progress" />
				</div>

				{isComplete && (
					<div className="mt-4 rounded-lg bg-green-50 p-3 text-center text-sm font-medium text-green-700">
						Done! {clipCount} clip{clipCount !== 1 ? "s" : ""} generated.
						Redirecting...
					</div>
				)}
			</Card>
		</div>
	);
}
