import { Alert, Card, FileDropzone, ProgressBar } from "@monorepo/ui";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Film, Upload, Zap } from "lucide-react";
import { useCallback, useState } from "react";
import { ApiError, startJob, uploadVideo } from "../lib/api";

export const Route = createFileRoute("/")({ component: UploadPage });

function estimateCreditCost(fileSizeBytes: number): number {
	const estimatedMinutes = fileSizeBytes / (1024 * 1024);
	if (estimatedMinutes <= 10) return 1;
	if (estimatedMinutes <= 30) return 3;
	return 5;
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function UploadPage() {
	const navigate = useNavigate();
	const [file, setFile] = useState<File | null>(null);
	const [videoUrl, setVideoUrl] = useState<string | null>(null);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [isUploading, setIsUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleFile = useCallback((f: File) => {
		setFile(f);
		setError(null);
		setUploadProgress(0);
		const url = URL.createObjectURL(f);
		setVideoUrl(url);
	}, []);

	const handleGenerate = useCallback(async () => {
		if (!file) return;
		setIsUploading(true);
		setError(null);

		try {
			const { jobId } = await uploadVideo(file, setUploadProgress);
			await startJob(jobId);
			navigate({ to: "/jobs/$jobId/processing", params: { jobId } });
		} catch (err) {
			if (err instanceof ApiError) {
				setError(err.message);
			} else {
				setError("An unexpected error occurred. Please try again.");
			}
			setIsUploading(false);
		}
	}, [file, navigate]);

	const clearFile = useCallback(() => {
		if (videoUrl) URL.revokeObjectURL(videoUrl);
		setFile(null);
		setVideoUrl(null);
		setUploadProgress(0);
		setError(null);
	}, [videoUrl]);

	return (
		<div className="mx-auto max-w-2xl">
			<div className="mb-8 text-center">
				<h1 className="text-3xl font-bold text-gray-900">
					Generate Viral Clips
				</h1>
				<p className="mt-2 text-gray-500">
					Upload a video and our AI will find the best moments and create clips
					with subtitles.
				</p>
			</div>

			{error && (
				<Alert
					variant="error"
					onDismiss={() => setError(null)}
					className="mb-6"
				>
					{error}
				</Alert>
			)}

			{!file ? (
				<FileDropzone onFile={handleFile} maxSizeMB={500}>
					<div className="flex flex-col items-center gap-3">
						<Upload className="h-10 w-10 text-gray-400" />
						<div className="text-center">
							<p className="text-lg font-medium text-gray-600">
								<span className="hidden md:inline">
									Drag and drop your video here, or{" "}
								</span>
								<span className="text-blue-600 underline">
									<span className="md:hidden">Tap to browse</span>
									<span className="hidden md:inline">browse</span>
								</span>
							</p>
							<p className="mt-2 text-sm text-gray-400">
								MP4, WebM, or MOV &bull; Max 500MB
							</p>
						</div>
					</div>
				</FileDropzone>
			) : (
				<Card>
					{videoUrl && (
						<div className="mb-4 overflow-hidden rounded-lg bg-black">
							<video
								src={videoUrl}
								controls
								preload="metadata"
								className="mx-auto max-h-64 w-full object-contain"
							>
								<track kind="captions" />
							</video>
						</div>
					)}

					<div className="mb-4 flex items-center justify-between">
						<div className="flex items-center gap-3">
							<Film className="h-5 w-5 text-gray-400" />
							<div>
								<p className="font-medium text-gray-900">{file.name}</p>
								<p className="text-sm text-gray-500">
									{formatFileSize(file.size)}
								</p>
							</div>
						</div>
						{!isUploading && (
							<button
								type="button"
								onClick={clearFile}
								className="text-sm text-gray-400 hover:text-gray-600"
							>
								Remove
							</button>
						)}
					</div>

					<div className="mb-4 flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
						<Zap className="h-4 w-4" />
						<span>
							Estimated cost:{" "}
							<strong>{estimateCreditCost(file.size)} credit(s)</strong>
						</span>
					</div>

					{isUploading && (
						<div className="mb-4">
							<ProgressBar
								progress={uploadProgress}
								label="Uploading"
								size="md"
							/>
						</div>
					)}

					<button
						type="button"
						onClick={handleGenerate}
						disabled={isUploading}
						className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{isUploading ? "Uploading..." : "Generate Clips"}
					</button>
				</Card>
			)}
		</div>
	);
}
