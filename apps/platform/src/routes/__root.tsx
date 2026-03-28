import { TanStackDevtools } from "@tanstack/react-devtools";
import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
	useLocation,
	useNavigate,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { useEffect, useState } from "react";

import "../styles.css";
import "@monorepo/ui/globals.css";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "TanStack Start Starter",
			},
		],
	}),

	shellComponent: RootDocument,
	component: RootComponent,
});

function parseJwtPayload(token: string) {
	try {
		const base64 = token.split(".")[1];
		const json = atob(base64);
		return JSON.parse(json);
	} catch {
		return null;
	}
}

function Header() {
	const navigate = useNavigate();
	const [email, setEmail] = useState<string | null>(null);

	useEffect(() => {
		const token = localStorage.getItem("accessToken");
		if (token) {
			const payload = parseJwtPayload(token);
			if (payload?.email) {
				setEmail(payload.email);
			} else if (payload?.sub) {
				setEmail(`User #${payload.sub}`);
			}
		}
	}, []);

	function handleLogout() {
		localStorage.removeItem("accessToken");
		localStorage.removeItem("refreshToken");
		navigate({ to: "/login" });
	}

	return (
		<header className="sticky top-0 z-50 w-full border-b border-purple-500/20 bg-black/80 backdrop-blur-md">
			<div className="flex h-14 items-center justify-between px-6">
				<div className="flex items-center gap-2">
					<span className="text-lg font-semibold text-white tracking-tight">
						Clipper
					</span>
				</div>
				<div className="flex items-center gap-4">
					{email && <span className="text-sm text-purple-300/80">{email}</span>}
					<button
						type="button"
						onClick={handleLogout}
						className="text-sm px-3 py-1.5 rounded-md border border-purple-500/30 text-purple-300 hover:bg-purple-500/10 hover:text-purple-200 transition-all"
					>
						Log out
					</button>
				</div>
			</div>
		</header>
	);
}

const AUTH_ROUTES = ["/login", "/register"];

function RootComponent() {
	const location = useLocation();
	const isAuthPage = AUTH_ROUTES.includes(location.pathname);

	if (isAuthPage) {
		return <Outlet />;
	}

	return (
		<div className="min-h-screen bg-black text-white">
			<Header />
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
				{children}
				<TanStackDevtools
					config={{
						position: "bottom-right",
					}}
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
