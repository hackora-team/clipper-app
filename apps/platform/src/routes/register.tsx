import { api } from "@/utils/api";
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
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/register")({
	component: RouteComponent,
});

function RouteComponent() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	async function handleRegister(e: React.FormEvent) {
		e.preventDefault();
		setIsLoading(true);
		try {
			const res = await api.auth.register.$post({
				json: {
					email,
					password,
				},
			});

			if (!res.ok) {
				const error = await res.json();
				console.error(error);
				return;
			}

			const data = await res.json();
			setEmail("");
			setPassword("");
			return data;
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<div className="min-h-screen w-full bg-black flex items-center justify-center p-4">
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1),transparent_50%)]" />
			<Card className="w-full max-w-md relative z-10 border-purple-500/20">
				<CardHeader className="text-center space-y-1">
					<CardTitle className="text-3xl font-bold tracking-tight text-white">Create account</CardTitle>
					<CardDescription>Enter your details to get started</CardDescription>
				</CardHeader>
				<form onSubmit={handleRegister}>
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
							label={isLoading ? "Creating account..." : "Create account"}
							type="submit"
							className="w-full"
							disabled={isLoading}
						/>
						<p className="text-sm text-white/50">
							Already have an account?{" "}
							<Link to="/login" className="text-purple-400 hover:text-purple-300 transition-colors">
								Sign in
							</Link>
						</p>
					</CardFooter>
				</form>
			</Card>
		</div>
	);
}
