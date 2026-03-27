import { useNavigate } from "@tanstack/react-router";
import { AlertCircle, AlertTriangle, Film, Loader, Upload } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRecentJobs } from "../hooks/use-recent-jobs";
import { uploadVideo } from "../lib/api";
import { formatFileSize } from "../lib/utils";

const ACCEPTED_TYPES = {
	"video/mp4": [".mp4"],
	"video/quicktime": [".mov"],
	"video/x-msvideo": [".avi"],
	"video/x-matroska": [".mkv"],
	"video/webm": [".webm"],
};
const MAX_SIZE = 500 * 1024 * 1024;

type AspectRatio = "16:9" | "9:16";

export function VideoUpload() {
	const navigate = useNavigate();
	const { addRecentJob } = useRecentJobs();

	const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
	const [uploading, setUploading] = useState(false);
	const [progress, setProgress] = useState(0);
	const [error, setError] = useState<string | null>(null);

	const handleUpload = useCallback(
		async (file: File) => {
			setUploading(true);
			setProgress(0);
			setError(null);

			try {
				const { jobId } = await uploadVideo(file, aspectRatio, setProgress);
				addRecentJob({
					id: jobId,
					fileName: file.name,
					createdAt: new Date().toISOString(),
				});
				await navigate({ to: "/jobs/$jobId", params: { jobId } });
			} catch (err) {
				setError(err instanceof Error ? err.message : "Upload failed");
				setUploading(false);
			}
		},
		[navigate, addRecentJob, aspectRatio],
	);

	const onDrop = useCallback(
		(
			accepted: File[],
			rejected: { errors: { code?: string; message: string }[] }[],
		) => {
			if (rejected.length > 0) {
				const err = rejected[0]?.errors[0];
				const msg =
					err?.code === "file-too-large"
						? `File is too large. Maximum size is ${formatFileSize(MAX_SIZE)}.`
						: (err?.message ?? "Invalid file");
				setError(msg);
				return;
			}
			if (accepted[0]) handleUpload(accepted[0]);
		},
		[handleUpload],
	);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: ACCEPTED_TYPES,
		maxSize: MAX_SIZE,
		maxFiles: 1,
		disabled: uploading,
	});

	return (
		<div>
			{/* Format selector */}
			{!uploading && (
				<div className="mb-4">
					<p className="text-sm text-gray-400 mb-3">Output Format</p>
					<div className="grid grid-cols-2 gap-3">
						{/* 16:9 card */}
						<button
							type="button"
							onClick={() => setAspectRatio("16:9")}
							className={`p-4 rounded-xl border-2 text-left transition-all ${
								aspectRatio === "16:9"
									? "border-purple-500 bg-purple-500/10"
									: "border-gray-700 hover:border-gray-600 bg-gray-900/30"
							}`}
						>
							<div
								className={`w-full aspect-video rounded-md mb-3 flex items-center justify-center text-xs font-mono ${
									aspectRatio === "16:9"
										? "bg-purple-500/20 text-purple-300"
										: "bg-gray-800 text-gray-500"
								}`}
							>
								16 : 9
							</div>
							<p
								className={`text-sm font-medium ${aspectRatio === "16:9" ? "text-white" : "text-gray-400"}`}
							>
								Landscape
							</p>
							<p className="text-xs text-gray-600 mt-0.5">YouTube · Podcast</p>
						</button>

						{/* 9:16 card */}
						<button
							type="button"
							onClick={() => setAspectRatio("9:16")}
							className={`p-4 rounded-xl border-2 text-left transition-all ${
								aspectRatio === "9:16"
									? "border-purple-500 bg-purple-500/10"
									: "border-gray-700 hover:border-gray-600 bg-gray-900/30"
							}`}
						>
							<div className="flex justify-center mb-3">
								<div
									className={`w-10 rounded-md flex items-center justify-center text-xs font-mono ${
										aspectRatio === "9:16"
											? "bg-purple-500/20 text-purple-300"
											: "bg-gray-800 text-gray-500"
									}`}
									style={{ aspectRatio: "9/16", minHeight: "3.5rem" }}
								>
									<span className="rotate-90 whitespace-nowrap">9 : 16</span>
								</div>
							</div>
							<p
								className={`text-sm font-medium ${aspectRatio === "9:16" ? "text-white" : "text-gray-400"}`}
							>
								Vertical
							</p>
							<p className="text-xs text-gray-600 mt-0.5">
								TikTok · Reels · Follows speaker
							</p>
						</button>
					</div>
				</div>
			)}

			{/* Upload warning */}
			{uploading && (
				<div className="mb-4 flex items-start gap-3 p-4 bg-amber-950/40 border border-amber-800/60 rounded-xl">
					<AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
					<div>
						<p className="text-amber-300 text-sm font-medium">
							Jangan refresh atau tutup halaman ini!
						</p>
						<p className="text-amber-500/80 text-xs mt-0.5">
							Upload sedang berlangsung. Jika halaman di-refresh, proses akan
							berhenti dan perlu diulang dari awal.
						</p>
					</div>
				</div>
			)}

			{/* Dropzone */}
			<div
				{...getRootProps()}
				className={`
          relative rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-all
          ${uploading ? "pointer-events-none opacity-80" : ""}
          ${
						isDragActive
							? "border-purple-500 bg-purple-500/10"
							: "border-gray-700 hover:border-gray-500 hover:bg-gray-900/50 bg-gray-900/30"
					}
        `}
			>
				<input {...getInputProps()} />

				{uploading ? (
					<div className="space-y-4">
						<Loader className="w-12 h-12 mx-auto text-purple-400 animate-spin" />
						<div>
							<p className="text-white font-medium mb-2">Uploading...</p>
							<div className="w-64 mx-auto bg-gray-800 rounded-full h-2">
								<div
									className="bg-purple-500 h-2 rounded-full transition-all duration-300"
									style={{ width: `${progress}%` }}
								/>
							</div>
							<p className="text-gray-500 text-sm mt-2">{progress}%</p>
						</div>
					</div>
				) : isDragActive ? (
					<div className="space-y-3">
						<Upload className="w-12 h-12 mx-auto text-purple-400" />
						<p className="text-purple-300 font-medium text-lg">Drop it here!</p>
					</div>
				) : (
					<div className="space-y-4">
						<div className="w-16 h-16 mx-auto rounded-2xl bg-purple-500/20 flex items-center justify-center">
							<Film className="w-8 h-8 text-purple-400" />
						</div>
						<div>
							<p className="text-white font-semibold text-lg">
								Drop your video here
							</p>
							<p className="text-gray-500 mt-1 text-sm">
								or{" "}
								<span className="text-purple-400 underline underline-offset-2">
									click to browse
								</span>
							</p>
						</div>
						<p className="text-gray-600 text-xs">
							MP4, MOV, AVI, MKV, WebM · Max {formatFileSize(MAX_SIZE)}
						</p>
					</div>
				)}
			</div>

			{error && (
				<div className="mt-3 flex items-center gap-2 text-red-400 text-sm p-3 bg-red-950/30 border border-red-900/50 rounded-lg">
					<AlertCircle className="w-4 h-4 flex-shrink-0" />
					{error}
				</div>
			)}
		</div>
	);
}
