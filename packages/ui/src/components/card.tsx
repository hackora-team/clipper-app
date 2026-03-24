import type { ReactNode } from "react";

interface CardProps {
	children: ReactNode;
	className?: string;
}

export const Card = ({ children, className = "" }: CardProps) => {
	return (
		<div
			className={`rounded-xl border border-gray-200 bg-white p-6 shadow-sm ${className}`}
		>
			{children}
		</div>
	);
};

interface CardHeaderProps {
	children: ReactNode;
	className?: string;
}

export const CardHeader = ({ children, className = "" }: CardHeaderProps) => {
	return <div className={`mb-4 ${className}`}>{children}</div>;
};

interface CardContentProps {
	children: ReactNode;
	className?: string;
}

export const CardContent = ({ children, className = "" }: CardContentProps) => {
	return <div className={className}>{children}</div>;
};
