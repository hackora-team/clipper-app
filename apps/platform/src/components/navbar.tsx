import { Link } from "@tanstack/react-router";
import { Scissors } from "lucide-react";

export function Navbar() {
	return (
		<header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
			<div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
				<Link
					to="/"
					className="flex items-center gap-2 font-bold text-lg text-white hover:text-purple-400 transition-colors"
				>
					<Scissors className="w-5 h-5 text-purple-500" />
					Clipper
				</Link>

				<nav className="flex items-center gap-4">
					<Link
						to="/"
						className="text-sm text-gray-400 hover:text-white transition-colors"
					>
						New Clip
					</Link>
				</nav>
			</div>
		</header>
	);
}
