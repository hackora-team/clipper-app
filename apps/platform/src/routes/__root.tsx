import { TanStackDevtools } from "@tanstack/react-devtools";
import {
	createRootRoute,
	HeadContent,
	Link,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { Coins } from "lucide-react";
import { useEffect, useState } from "react";
import { getCredits } from "../lib/api";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "Clipper — AI Video Clip Generator" },
			{
				name: "description",
				content:
					"Upload a long-form video and get AI-generated short clips with subtitles, ready to download.",
			},
		],
		links: [{ rel: "stylesheet", href: appCss }],
	}),
	component: RootComponent,
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
				{children}
				<TanStackDevtools
					config={{ position: "bottom-right" }}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}

function RootComponent() {
	const [credits, setCredits] = useState<number | null>(null);

	useEffect(() => {
		getCredits()
			.then((data) => setCredits(data.balance))
			.catch(() => setCredits(null));
	}, []);

	return (
		<>
			<nav className="border-b border-gray-200 bg-white">
				<div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
					<Link to="/" className="text-lg font-bold text-gray-900">
						Clipper
					</Link>

					<div className="flex items-center gap-4">
						<Link
							to="/"
							className="text-sm font-medium text-gray-600 hover:text-gray-900"
						>
							Upload
						</Link>

						{credits !== null && (
							<div className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
								<Coins className="h-4 w-4" />
								{credits} credits
							</div>
						)}
					</div>
				</div>
			</nav>

			<main className="mx-auto max-w-5xl px-4 py-8">
				<Outlet />
			</main>
		</>
	);
}
