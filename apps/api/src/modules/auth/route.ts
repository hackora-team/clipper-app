import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { prisma } from "../../utils/prisma";
import { loginSchema, registerSchema } from "./schema";
import { comparePassword, generateAcessToken, generateRefreshToken, hashPassword, verifyRefreshToken } from "./utils";

export const authRouter = new Hono()
  .post("/register", zValidator("json", registerSchema), async (c) => {
    //1. check collition
    const body = c.req.valid("json");

    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existingUser) {
      throw new HTTPException(409, { message: "Users already exist" });
    }

    //2. Create new user
    const newUser = await prisma.user.create({
      data: {
        email: body.email,
        password: await hashPassword(body.password),
      },
    });

    return c.json({ message: "User registered successfully", newUser });
  })
  .post("/login", zValidator("json", loginSchema), async (c) => {
    const body = c.req.valid("json");

    //check email and password
    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!existingUser) {
      throw new HTTPException(404, { message: "User is not found!" });
    }

    const isPasswordValid = await comparePassword(body.password, existingUser.password);

    if (!isPasswordValid) {
      throw new HTTPException(401, { message: "Wrong password" });
    }

    const accessToken = generateAcessToken(existingUser.id);
    console.log(accessToken);
    const refreshToken = generateRefreshToken(existingUser.id);

    //save refresh token to db
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: existingUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return c.json({
      message: "User login successfully",
      accessToken,
      refreshToken,
    });
  })
  .post("/accessToken", async (c) => {
    const body = await c.req.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      throw new HTTPException(400, { message: "Refresh token is required" });
    }

    try {
      const payload = verifyRefreshToken(refreshToken) as {
        sub?: number;
        type?: string;
      };

      // Check if it's a refresh token type
      if (payload.type && payload.type !== "refresh") {
        throw new HTTPException(401, {
          message: "Invalid token type. Refresh token required.",
        });
      }

      // Check if refresh token exists in database
      const tokenRecord = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!tokenRecord) {
        throw new HTTPException(401, { message: "Invalid refresh token" });
      }

      // Check if token is expired (database check)
      if (tokenRecord.expiresAt < new Date()) {
        // Delete expired token
        await prisma.refreshToken.delete({
          where: { token: refreshToken },
        });
        throw new HTTPException(401, { message: "Refresh token expired" });
      }

      // Update lastUsedAt
      await prisma.refreshToken.update({
        where: { token: refreshToken },
        data: { lastUsedAt: new Date() },
      });

      // Generate new access token
      const newAccessToken = generateAcessToken(tokenRecord.user.id);

      return c.json({
        message: "Token refreshed successfully",
        accessToken: newAccessToken,
      });
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      // JWT verification errors (expired, invalid, etc.)
      throw new HTTPException(401, { message: "Invalid refresh token" });
    }
  });
