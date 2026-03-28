import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export function hashPassword(password: string) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

export function comparePassword(password: string, hashPassword: string) {
  return bcrypt.compare(password, hashPassword);
}

export function generateAcessToken(userId: number) {
  const secret = process.env.JWT_SECRET;
  console.log(secret);
  if (!secret) {
    throw new Error("JWT_SECRET is not defined");
  }
  return jwt.sign({ sub: userId, type: "access" }, secret, {
    expiresIn: "15m",
  });
}

export function generateRefreshToken(userId: number) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not defined");
  }
  return jwt.sign({ sub: userId, type: "refresh" }, secret, {
    expiresIn: "7d",
  });
}

export function verifyRefreshToken(token: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not defined");
  }
  return jwt.verify(token, secret);
}
