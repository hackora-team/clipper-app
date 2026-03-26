import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Navbar } from "../components/navbar";

import appCss from "../styles.css?url";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: 1,
			staleTime: 10_000,
		},
	},
});

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "Clipper — AI Video Clipping" },
			{
				name: "description",
				content:
					"Turn long videos into viral clips automatically using AI",
			},
		],
		links: [{ rel: "stylesheet", href: appCss }],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				<QueryClientProvider client={queryClient}>
					<Navbar />
					<main>{children}</main>
				</QueryClientProvider>
				<Scripts />
			</body>
		</html>
	);
}

