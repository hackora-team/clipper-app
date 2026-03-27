import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Clock, Download, Info, Loader } from "lucide-react";
import { ClipCard } from "../../components/clip-card";
import { JobProgress } from "../../components/job-progress";
import { useJobEvents } from "../../hooks/use-job-events";
import { useJob } from "../../hooks/use-jobs";
import { getApiUrl } from "../../lib/api";
import { formatDate } from "../../lib/utils";

export const Route = createFileRoute("/jobs/$jobId")({
	component: JobDetailPage,
});

function JobDetailPage() {
	const { jobId } = Route.useParams();
	const { data: job, isLoading, error } = useJob(jobId);

	useJobEvents(jobId);

	if (isLoading) {
		return (
			<div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
				<Loader className="w-8 h-8 text-purple-400 animate-spin" />
			</div>
		);
	}

	if (error || !job) {
		return (
			<div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
				<div className="text-center">
					<p className="text-gray-400 mb-4">Job not found</p>
					<Link
						to="/"
						className="text-purple-400 hover:text-purple-300 text-sm"
					>
						← Back to home
					</Link>
				</div>
			</div>
		);
	}

	const isProcessing =
		job.status !== "COMPLETED" &&
		job.status !== "FAILED" &&
		job.status !== "EXPIRED";

	const completedClips = job.clips.filter((c) => c.status === "COMPLETED");
	const hasClips = job.clips.length > 0;

	return (
		<div className="min-h-[calc(100vh-4rem)] bg-gray-950">
			<div className="max-w-4xl mx-auto px-4 py-8">
				<div className="flex items-center gap-3 mb-8">
					<Link
						to="/"
						className="p-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
					>
						<ArrowLeft className="w-4 h-4" />
					</Link>
					<div className="min-w-0">
						<h1 className="font-bold text-white text-lg truncate">
							{job.fileName}
						</h1>
						<p className="text-xs text-gray-500 flex items-center gap-1">
							<Clock className="w-3 h-3" />
							{formatDate(job.createdAt)}
						</p>
					</div>
				</div>

				{job.status === "EXPIRED" && (
					<div className="mb-8 p-6 bg-gray-900 border border-gray-800 rounded-xl text-center">
						<p className="text-gray-400 mb-2">This job has expired.</p>
						<p className="text-gray-600 text-sm mb-4">
							Files are automatically deleted after 24 hours.
						</p>
						<Link
							to="/"
							className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm transition-colors"
						>
							Create New Clip
						</Link>
					</div>
				)}

				{isProcessing && (
					<div className="mb-8 space-y-4">
						<div className="flex items-start gap-3 p-4 bg-blue-950/40 border border-blue-800/60 rounded-xl">
							<Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
							<div>
								<p className="text-blue-300 text-sm font-medium">
									Tab ini boleh ditutup atau ditinggal
								</p>
								<p className="text-blue-400/70 text-xs mt-0.5">
									Proses berjalan di server dan akan tetap berlangsung. Buka
									kembali halaman ini kapan saja untuk melihat hasilnya.
								</p>
							</div>
						</div>
						<JobProgress job={job} />
					</div>
				)}

				{hasClips && (
					<div>
						<div className="flex items-center justify-between mb-4">
							<h2 className="font-semibold text-white">
								{completedClips.length > 0
									? `${completedClips.length} Clip${completedClips.length !== 1 ? "s" : ""} Ready`
									: "Clips"}
							</h2>
							{completedClips.length > 1 && (
								<a
									href={getApiUrl(`/api/jobs/${job.id}/clips/download-all`)}
									className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg text-sm transition-colors"
								>
									<Download className="w-4 h-4" />
									Download All
								</a>
							)}
						</div>
						<div className="space-y-3">
							{job.clips.map((clip, i) => (
								<ClipCard key={clip.id} clip={clip} rank={i + 1} />
							))}
						</div>
					</div>
				)}

				{job.status === "FAILED" && !hasClips && (
					<div className="text-center py-12">
						<p className="text-gray-400 mb-2">Processing failed</p>
						{job.errorMessage && (
							<p className="text-sm text-gray-600 mb-4">{job.errorMessage}</p>
						)}
						<Link
							to="/"
							className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm transition-colors"
						>
							Try Again
						</Link>
					</div>
				)}

				{job.status === "COMPLETED" && completedClips.length === 0 && (
					<div className="text-center py-12">
						<p className="text-gray-400 mb-2">
							No clips were found in this video.
						</p>
						<p className="text-gray-600 text-sm mb-4">
							The video may be too short or the content wasn't suitable.
						</p>
						<Link
							to="/"
							className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm transition-colors"
						>
							Try Another Video
						</Link>
					</div>
				)}
			</div>
		</div>
	);
}
