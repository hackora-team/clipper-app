import { Flame, TrendingUp, Zap } from "lucide-react";

interface ViralScoreBadgeProps {
	score: number;
	size?: "sm" | "md";
}

export function ViralScoreBadge({ score, size = "md" }: ViralScoreBadgeProps) {
	const isHot = score >= 75;
	const isWarm = score >= 50;

	const colorClass = isHot
		? "bg-orange-500/20 text-orange-400 border-orange-500/30"
		: isWarm
			? "bg-purple-500/20 text-purple-400 border-purple-500/30"
			: "bg-gray-700/50 text-gray-400 border-gray-600/30";

	const Icon = isHot ? Flame : isWarm ? Zap : TrendingUp;
	const textSize = size === "sm" ? "text-xs" : "text-sm";

	return (
		<span
			className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-semibold ${colorClass} ${textSize}`}
		>
			<Icon className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
			{Math.round(score)}
		</span>
	);
}
