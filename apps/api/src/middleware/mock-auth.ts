import type { Context, Next } from "hono";

export interface AuthUser {
	id: string;
	email: string;
	name: string;
	creditBalance: number;
}

const MOCK_USER: AuthUser = {
	id: "mock-user-id",
	email: "dev@test.com",
	name: "Dev User",
	creditBalance: 100,
};

export async function mockAuth(c: Context, next: Next) {
	c.set("user", MOCK_USER);
	await next();
}
