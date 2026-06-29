import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/constants";
import { env } from "./env";
import type { SessionUser } from "@/types";

/**
 * Authentication core.
 *
 * Uses `jose` (Web Crypto) so the same verification logic runs in the Edge
 * middleware AND in Node server components/actions. Password hashing
 * (bcrypt, Node-only) lives in the login action, not here.
 */

const ISSUER = "performance-tracker";
const AUDIENCE = "performance-tracker-admin";

function secretKey(): Uint8Array {
  return new TextEncoder().encode(env.jwtSecret);
}

/** Sign a session JWT for the given admin. */
export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({ name: user.name, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(env.jwtExpiresIn)
    .sign(secretKey());
}

/** Verify a token string and return the session user, or null if invalid. */
export async function verifySession(
  token: string | undefined,
): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (!payload.sub) return null;
    return {
      id: payload.sub,
      name: String(payload.name ?? ""),
      email: String(payload.email ?? ""),
    };
  } catch {
    return null;
  }
}

/** Read the current session from cookies (server components / actions). */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

/** Redirect to /login unless authenticated; returns the session otherwise. */
export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Persist the session token as a secure, HttpOnly cookie. */
export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

/** Remove the session cookie (logout). */
export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
