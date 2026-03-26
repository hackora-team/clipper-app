import { createFileRoute } from "@tanstack/react-router";
import { Captions, Sparkles, Zap } from "lucide-react";
import { RecentJobs } from "../components/recent-jobs";
import { VideoUpload } from "../components/video-upload";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePage() {
	return (
		<div className="min-h-[calc(100vh-4rem)] bg-gray-950">
			<div className="max-w-3xl mx-auto px-4 py-16">
				<div className="text-center mb-12">
					<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium mb-6">
						<Sparkles className="w-3 h-3" />
						Powered by GPT-4o + Whisper
					</div>
					<h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
						Turn long videos into{" "}
						<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
							viral clips
						</span>
					</h1>
					<p className="text-gray-400 text-lg max-w-xl mx-auto">
						Upload any long-form video. AI finds the most engaging moments, cuts
						them, and burns in subtitles automatically.
					</p>
				</div>

				<div className="mb-10">
					<VideoUpload />
				</div>

				<div className="grid grid-cols-3 gap-4 mb-12">
					{[
						{
							icon: Sparkles,
							title: "AI Detection",
							desc: "GPT-4o identifies viral moments",
						},
						{
							icon: Captions,
							title: "Auto Subtitles",
							desc: "Word-level captions burned in",
						},
						{
							icon: Zap,
							title: "Instant Clips",
							desc: "Ready to post in minutes",
						},
					].map(({ icon: Icon, title, desc }) => (
						<div
							key={title}
							className="p-4 rounded-xl bg-gray-900/50 border border-gray-800 text-center"
						>
							<Icon className="w-5 h-5 text-purple-400 mx-auto mb-2" />
							<p className="text-white text-sm font-medium">{title}</p>
							<p className="text-gray-500 text-xs mt-0.5">{desc}</p>
						</div>
					))}
				</div>

				<RecentJobs />
			</div>
		</div>
	);
}
