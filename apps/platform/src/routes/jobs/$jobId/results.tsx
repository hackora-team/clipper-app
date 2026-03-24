import { Badge, Card } from "@monorepo/ui";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Upload } from "lucide-react";
import { getClipDownloadUrl, getJob } from "../../../lib/api";
import type { Clip } from "../../../lib/types";

export const Route = createFileRoute("/jobs/$jobId/results")({
	component: ResultsPage,
	loader: async ({ params }) => {
		const { job } = await getJob(params.jobId);
		return { job };
	},
});

function formatDuration(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getScoreVariant(score: number): "success" | "warning" | "danger" {
	if (score >= 8) return "success";
	if (score >= 5) return "warning";
	return "danger";
}

function ResultsPage() {
	const { job } = Route.useLoaderData();

	if (job.status !== "COMPLETED") {
		return (
			<div className="text-center py-16">
				<p className="text-gray-500">This job is still processing.</p>
				<Link
					to="/jobs/$jobId/processing"
					params={{ jobId: job.id }}
					className="mt-4 inline-block text-blue-600 hover:underline"
				>
					View progress
				</Link>
			</div>
		);
	}

	const clips = [...job.clips].sort(
		(a: Clip, b: Clip) => b.viralScore - a.viralScore,
	);

	return (
		<div>
			<div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Your Clips</h1>
					<p className="mt-1 text-sm text-gray-500">
						{job.originalFilename} &bull; {clips.length} clip
						{clips.length !== 1 ? "s" : ""} generated
					</p>
				</div>
				<Link
					to="/"
					className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
				>
					<Upload className="h-4 w-4" />
					Upload Another
				</Link>
			</div>

			{clips.length === 0 ? (
				<Card className="text-center py-12">
					<p className="text-gray-500">No clips were generated.</p>
				</Card>
			) : (
				<div className="grid gap-6 md:grid-cols-2">
					{clips.map((clip: Clip) => (
						<ClipCard key={clip.id} clip={clip} />
					))}
				</div>
			)}
		</div>
	);
}

function ClipCard({ clip }: { clip: Clip }) {
	const downloadUrl = getClipDownloadUrl(clip.id);
	const duration = clip.endTime - clip.startTime;

	return (
		<Card className="overflow-hidden !p-0">
			{/* Video preview */}
			<div className="aspect-video bg-black">
				<video
					src={downloadUrl}
					controls
					preload="metadata"
					className="h-full w-full object-contain"
				>
					<track kind="captions" />
				</video>
			</div>

			{/* Clip info */}
			<div className="p-4">
				<div className="mb-2 flex items-start justify-between gap-2">
					<h3 className="font-semibold text-gray-900">{clip.title}</h3>
					<Badge variant={getScoreVariant(clip.viralScore)}>
						{clip.viralScore}/10
					</Badge>
				</div>

				<p className="mb-3 text-sm text-gray-500">{clip.description}</p>

				<div className="flex items-center justify-between">
					<span className="text-xs text-gray-400">
						{formatDuration(clip.startTime)} – {formatDuration(clip.endTime)} (
						{formatDuration(duration)})
					</span>
					<a
						href={downloadUrl}
						download={`${clip.title}.mp4`}
						className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
					>
						<Download className="h-3.5 w-3.5" />
						Download
					</a>
				</div>
			</div>
		</Card>
	);
}
