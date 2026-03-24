import {
	type DragEvent,
	type ReactNode,
	useCallback,
	useRef,
	useState,
} from "react";

interface FileDropzoneProps {
	onFile: (file: File) => void;
	accept?: string;
	maxSizeMB?: number;
	children?: ReactNode;
	disabled?: boolean;
}

export const FileDropzone = ({
	onFile,
	accept = "video/mp4,video/webm,video/quicktime",
	maxSizeMB,
	children,
	disabled = false,
}: FileDropzoneProps) => {
	const [isDragging, setIsDragging] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const handleFile = useCallback(
		(file: File) => {
			if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
				return;
			}
			onFile(file);
		},
		[onFile, maxSizeMB],
	);

	const handleDrop = useCallback(
		(e: DragEvent<HTMLDivElement>) => {
			e.preventDefault();
			setIsDragging(false);
			if (disabled) return;

			const file = e.dataTransfer.files[0];
			if (file) handleFile(file);
		},
		[handleFile, disabled],
	);

	const handleDragOver = useCallback(
		(e: DragEvent<HTMLDivElement>) => {
			e.preventDefault();
			if (!disabled) setIsDragging(true);
		},
		[disabled],
	);

	const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragging(false);
	}, []);

	return (
		// biome-ignore lint/a11y/useSemanticElements: dropzone needs div for drag events
		<div
			onDrop={handleDrop}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onClick={() => !disabled && inputRef.current?.click()}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					if (!disabled) inputRef.current?.click();
				}
			}}
			role="button"
			tabIndex={0}
			className={`
				flex min-h-48 cursor-pointer flex-col items-center justify-center
				rounded-xl border-2 border-dashed p-8 transition-colors
				${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"}
				${disabled ? "cursor-not-allowed opacity-50" : ""}
			`}
		>
			{children || (
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
						MP4, WebM, or MOV
						{maxSizeMB && ` • Max ${maxSizeMB}MB`}
					</p>
				</div>
			)}

			<input
				ref={inputRef}
				type="file"
				accept={accept}
				className="hidden"
				onChange={(e) => {
					const file = e.target.files?.[0];
					if (file) handleFile(file);
					e.target.value = "";
				}}
			/>
		</div>
	);
};
