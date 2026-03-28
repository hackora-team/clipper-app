import { Download, Play } from "lucide-react";
import { useRef } from "react";
import type { Clip } from "../hooks/use-jobs";
import { getApiUrl } from "../lib/api";

interface ClipPlayerProps {
	clip: Clip;
}

export function ClipPlayer({ clip }: ClipPlayerProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const streamUrl = getApiUrl(`/api/clips/${clip.id}/stream`);
	const downloadUrl = getApiUrl(`/api/clips/${clip.id}/download`);

	return (
		<div className="relative rounded-lg overflow-hidden bg-black">
			<video
				ref={videoRef}
				src={streamUrl}
				controls
				className="w-full max-h-96 object-contain"
				preload="metadata"
			>
				<track kind="captions" />
			</video>
			<div className="absolute top-2 right-2 flex gap-2">
				<a
					href={downloadUrl}
					download
					className="p-2 rounded-lg bg-black/70 hover:bg-black transition-colors text-white"
					title="Download clip"
				>
					<Download className="w-4 h-4" />
				</a>
			</div>
			<div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 hover:opacity-100 transition-opacity">
				<div className="p-4 rounded-full bg-black/50">
					<Play className="w-8 h-8 text-white" />
				</div>
			</div>
		</div>
	);
}
