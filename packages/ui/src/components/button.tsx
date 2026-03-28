import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	label: string;
	variant?: "primary" | "outline" | "ghost";
}

export const Button = ({
	label,
	variant = "primary",
	className = "",
	...props
}: ButtonProps) => {
	const variants = {
		primary:
			"bg-purple-600 text-white hover:bg-purple-700 shadow-[0_0_15px_rgba(139,92,246,0.5)]",
		outline:
			"border border-white/10 bg-transparent text-white hover:bg-white/5",
		ghost: "bg-transparent text-white/70 hover:bg-white/5 hover:text-white",
	};

	return (
		<button
			type="button"
			className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 ${variants[variant]} ${className}`}
			{...props}
		>
			{label}
		</button>
	);
};
