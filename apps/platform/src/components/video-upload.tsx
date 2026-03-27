import { useNavigate } from "@tanstack/react-router";
import { AlertCircle, Film, Loader, Upload } from "lucide-react";
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

export function VideoUpload() {
	const navigate = useNavigate();
	const { addRecentJob } = useRecentJobs();

	const [uploading, setUploading] = useState(false);
	const [progress, setProgress] = useState(0);
	const [error, setError] = useState<string | null>(null);

	const handleUpload = useCallback(
		async (file: File) => {
			setUploading(true);
			setProgress(0);
			setError(null);

			try {
				const { jobId } = await uploadVideo(file, setProgress);
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
		[navigate, addRecentJob],
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
