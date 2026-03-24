interface ProgressBarProps {
	progress: number;
	label?: string;
	size?: "sm" | "md" | "lg";
}

export const ProgressBar = ({
	progress,
	label,
	size = "md",
}: ProgressBarProps) => {
	const clampedProgress = Math.max(0, Math.min(100, progress));

	const heightClass = {
		sm: "h-1.5",
		md: "h-2.5",
		lg: "h-4",
	}[size];

	return (
		<div className="w-full">
			{label && (
				<div className="mb-1 flex justify-between text-sm">
					<span className="text-gray-700">{label}</span>
					<span className="text-gray-500">{Math.round(clampedProgress)}%</span>
				</div>
			)}
			<div className={`w-full rounded-full bg-gray-200 ${heightClass}`}>
				<div
					className={`${heightClass} rounded-full bg-blue-600 transition-all duration-300 ease-out`}
					style={{ width: `${clampedProgress}%` }}
				/>
			</div>
		</div>
	);
};
