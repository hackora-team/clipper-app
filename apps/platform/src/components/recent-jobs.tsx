import { Link } from "@tanstack/react-router";
import { ArrowRight, Clock, Trash2 } from "lucide-react";
import { useRecentJobs } from "../hooks/use-recent-jobs";
import { formatDate } from "../lib/utils";

export function RecentJobs() {
	const { recentJobs, removeRecentJob } = useRecentJobs();

	if (recentJobs.length === 0) return null;

	return (
		<div>
			<h2 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
				<Clock className="w-4 h-4" />
				Recent Jobs
			</h2>
			<div className="space-y-2">
				{recentJobs.map((job) => (
					<div
						key={job.id}
						className="flex items-center gap-3 p-3 bg-gray-900 border border-gray-800 rounded-lg group hover:border-gray-700 transition-colors"
					>
						<div className="flex-1 min-w-0">
							<p className="text-sm text-white truncate font-medium">
								{job.fileName}
							</p>
							<p className="text-xs text-gray-500">
								{formatDate(job.createdAt)}
							</p>
						</div>
						<div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
							<button
								type="button"
								onClick={() => removeRecentJob(job.id)}
								className="p-1 text-gray-600 hover:text-red-400 transition-colors"
								title="Remove"
							>
								<Trash2 className="w-3.5 h-3.5" />
							</button>
						</div>
						<Link
							to="/jobs/$jobId"
							params={{ jobId: job.id }}
							className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors flex-shrink-0"
						>
							View
							<ArrowRight className="w-3 h-3" />
						</Link>
					</div>
				))}
			</div>
		</div>
	);
}
