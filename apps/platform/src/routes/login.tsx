import {
	Button,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	Input,
	Label,
} from "@monorepo/ui";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/utils/api";

export const Route = createFileRoute("/login")({
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	async function handleLogin(e: React.FormEvent) {
		e.preventDefault();
		setIsLoading(true);
		try {
			const res = await api.auth.login.$post({
				json: {
					email,
					password,
				},
			});

			if (!res.ok) {
				const error = await res.json();
				toast.error((error as { message?: string }).message ?? "Login failed");
				return;
			}

			const data = await res.json();
			localStorage.setItem("accessToken", data.accessToken);
			localStorage.setItem("refreshToken", data.refreshToken);
			setEmail("");
			setPassword("");
			navigate({ to: "/" });
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<div className="min-h-screen w-full bg-black flex items-center justify-center p-4">
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1),transparent_50%)]" />
			<Card className="w-full max-w-md relative z-10 border-purple-500/20">
				<CardHeader className="text-center space-y-1">
					<CardTitle className="text-3xl font-bold tracking-tight text-white">
						Welcome
					</CardTitle>
					<CardDescription>
						Enter your credentials to access your account
					</CardDescription>
				</CardHeader>
				<form onSubmit={handleLogin}>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="email">Email address</Label>
							<Input
								id="email"
								type="email"
								placeholder="name@example.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								type="password"
								placeholder="••••••••"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
							/>
						</div>
					</CardContent>
					<CardFooter className="flex-col space-y-3">
						<Button
							label={isLoading ? "Signing in..." : "Sign in"}
							type="submit"
							className="w-full"
							disabled={isLoading}
						/>
						<p className="text-sm text-white/50">
							Don't have an account?{" "}
							<Link
								to="/register"
								className="text-purple-400 hover:text-purple-300 transition-colors"
							>
								Sign up
							</Link>
						</p>
					</CardFooter>
				</form>
			</Card>
		</div>
	);
}
