import { useState } from "react";
import { ChevronDown, ChevronUp, Clock, Download } from "lucide-react";
import { ViralScoreBadge } from "./viral-score-badge";
import { ClipPlayer } from "./clip-player";
import { formatDuration } from "../lib/utils";
import { getApiUrl } from "../lib/api";
import type { Clip } from "../hooks/use-jobs";

interface ClipCardProps {
	clip: Clip;
	rank: number;
}

export function ClipCard({ clip, rank }: ClipCardProps) {
	const [expanded, setExpanded] = useState(false);
	const downloadUrl = getApiUrl(`/api/clips/${clip.id}/download`);

	const isReady = clip.status === "COMPLETED";
	const isRendering = clip.status === "RENDERING" || clip.status === "PENDING";
	const isFailed = clip.status === "FAILED";

	return (
		<div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
			<div className="p-4">
				<div className="flex items-start justify-between gap-3">
					<div className="flex items-start gap-3 min-w-0">
						<span className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-800 text-gray-400 text-xs font-bold flex items-center justify-center">
							{rank}
						</span>
						<div className="min-w-0">
							<h3 className="font-semibold text-white text-sm leading-tight line-clamp-2">
								{clip.title}
							</h3>
							{clip.description && (
								<p className="text-gray-400 text-xs mt-1 line-clamp-2">
									{clip.description}
								</p>
							)}
							<div className="flex items-center gap-3 mt-2">
								<span className="flex items-center gap-1 text-gray-500 text-xs">
									<Clock className="w-3 h-3" />
									{formatDuration(clip.duration)}
								</span>
								<ViralScoreBadge score={clip.viralScore} size="sm" />
								{isRendering && (
									<span className="text-xs text-blue-400 animate-pulse">
										Rendering...
									</span>
								)}
								{isFailed && (
									<span className="text-xs text-red-400">Failed</span>
								)}
							</div>
						</div>
					</div>

					<div className="flex-shrink-0 flex items-center gap-2">
						{isReady && (
							<a
								href={downloadUrl}
								download
								className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
								title="Download"
							>
								<Download className="w-4 h-4" />
							</a>
						)}
						{isReady && (
							<button
								type="button"
								onClick={() => setExpanded((v) => !v)}
								className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
								title={expanded ? "Hide preview" : "Show preview"}
							>
								{expanded ? (
									<ChevronUp className="w-4 h-4" />
								) : (
									<ChevronDown className="w-4 h-4" />
								)}
							</button>
						)}
					</div>
				</div>
			</div>

			{expanded && isReady && (
				<div className="border-t border-gray-800">
					<ClipPlayer clip={clip} />
				</div>
			)}

			{isFailed && clip.errorMessage && (
				<div className="border-t border-gray-800 px-4 py-2">
					<p className="text-xs text-red-400">{clip.errorMessage}</p>
				</div>
			)}
		</div>
	);
}
