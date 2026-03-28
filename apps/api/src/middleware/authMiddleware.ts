import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/prisma";

export const authMiddleware = createMiddleware(async (c, next) => {
	const token = c.req.header("token");

	if (!token) {
		throw new HTTPException(401, { message: "Unauthorized" });
	}

	try {
		const secret = process.env.JWT_SECRET;
		if (!secret) {
			throw new Error("JWT_SECRET is not defined");
		}
		const payload = jwt.verify(token, secret) as unknown as {
			sub: number;
			type?: string;
		};

		if (
			payload.type &&
			payload.type !== "access" &&
			payload.type !== "access"
		) {
			throw new HTTPException(401, {
				message: "Invalid token type. Access token required.",
			});
		}

		const user = await prisma.user.findUnique({
			where: {
				id: Number(payload.sub),
			},
			select: {
				id: true,
				email: true,
			},
		});
		c.set("user", user);
		await next();
	} catch (error) {
		if (error instanceof HTTPException) {
			throw error;
		}
		console.log("Error=>", error);
		throw new HTTPException(401, { message: "invalid token" });
	}
});
