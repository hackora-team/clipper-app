import type { ReactNode } from "react";

export function Card({
	children,
	className = "",
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={`rounded-xl border border-white/10 bg-[#0a0a0a] text-white shadow-2xl ${className}`}
		>
			{children}
		</div>
	);
}

export function CardHeader({
	children,
	className = "",
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div className={`flex flex-col space-y-1.5 p-6 ${className}`}>
			{children}
		</div>
	);
}

export function CardTitle({
	children,
	className = "",
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<h3
			className={`text-2xl font-semibold leading-none tracking-tight ${className}`}
		>
			{children}
		</h3>
	);
}

export function CardDescription({
	children,
	className = "",
}: {
	children: ReactNode;
	className?: string;
}) {
	return <p className={`text-sm text-white/50 ${className}`}>{children}</p>;
}

export function CardContent({
	children,
	className = "",
}: {
	children: ReactNode;
	className?: string;
}) {
	return <div className={`p-6 pt-0 ${className}`}>{children}</div>;
}

export function CardFooter({
	children,
	className = "",
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div className={`flex items-center p-6 pt-0 ${className}`}>{children}</div>
	);
}
