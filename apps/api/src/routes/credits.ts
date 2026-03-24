import { Hono } from "hono";
import type { AuthUser } from "../middleware/mock-auth.js";
import { prisma } from "../utils/prisma.js";

const credits = new Hono();

credits.get("/balance", async (c) => {
	const user = c.get("user") as AuthUser;

	const dbUser = await prisma.user.findUnique({
		where: { id: user.id },
		select: { creditBalance: true },
	});

	return c.json({
		balance: dbUser?.creditBalance ?? 0,
	});
});

credits.get("/transactions", async (c) => {
	const user = c.get("user") as AuthUser;

	const transactions = await prisma.creditTransaction.findMany({
		where: { userId: user.id },
		orderBy: { createdAt: "desc" },
		take: 20,
	});

	return c.json({ transactions });
});

export { credits };
