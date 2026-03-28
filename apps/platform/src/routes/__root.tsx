import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
	useLocation,
} from "@tanstack/react-router";

import "../styles.css";
import "@monorepo/ui/globals.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
				content: "Turn long videos into viral clips automatically using AI",
			},
		],
		links: [{ rel: "stylesheet", href: appCss }],
	}),
	shellComponent: RootDocument,
	component: RootComponent,
});

const AUTH_ROUTES = ["/login", "/register"];

function RootComponent() {
	const location = useLocation();
	const isAuthPage = AUTH_ROUTES.includes(location.pathname);

	if (isAuthPage) {
		return <Outlet />;
	}

	return (
		<div className="min-h-screen bg-black text-white">
			<Navbar />
			<main>
				<Outlet />
			</main>
		</div>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				<QueryClientProvider client={queryClient}>
					{children}
				</QueryClientProvider>
				<Scripts />
			</body>
		</html>
	);
}
