import type { ReactNode } from "react";

interface AlertProps {
	children: ReactNode;
	variant?: "info" | "warning" | "error" | "success";
	onDismiss?: () => void;
	className?: string;
}

const variantClasses = {
	info: "bg-blue-50 border-blue-200 text-blue-800",
	warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
	error: "bg-red-50 border-red-200 text-red-800",
	success: "bg-green-50 border-green-200 text-green-800",
};

export const Alert = ({
	children,
	variant = "info",
	onDismiss,
	className = "",
}: AlertProps) => {
	return (
		<div
			role="alert"
			className={`rounded-lg border p-4 ${variantClasses[variant]} ${className}`}
		>
			<div className="flex items-start justify-between">
				<div className="flex-1">{children}</div>
				{onDismiss && (
					<button
						type="button"
						onClick={onDismiss}
						className="ml-4 inline-flex shrink-0 rounded-md p-1.5 opacity-50 hover:opacity-100"
					>
						<span className="sr-only">Dismiss</span>
						<svg
							className="h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
							strokeWidth="2"
							stroke="currentColor"
						>
							<title>Close</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				)}
			</div>
		</div>
	);
};
