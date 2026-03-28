import type { LabelHTMLAttributes } from "react";

export function Label({ children, className = "", ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
	return (
		<label
			className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-white/70 ${className}`}
			{...props}
		>
			{children}
		</label>
	);
}
