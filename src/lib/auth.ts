import "server-only";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { findUserById } from "./db";
import type { User } from "./types";

const COOKIE_NAME = "nortiq_session";
const SESSION_DAYS = 7;

function getSecret(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET ?? "nortiq-dev-secret-change-me-in-production";
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<void> {
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expires)
    .sign(getSecret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires,
    path: "/",
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export type SafeUser = Omit<User, "passwordHash">;

export function toSafeUser(user: User): SafeUser {
  const { passwordHash: _passwordHash, ...rest } = user;
  return rest;
}

export async function getCurrentUser(): Promise<SafeUser | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const user = await findUserById(userId);
  return user ? toSafeUser(user) : null;
}
