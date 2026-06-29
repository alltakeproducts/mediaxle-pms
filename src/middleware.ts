import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/constants";

/**
 * Route-protection middleware (Edge runtime).
 *
 * Verifies the session JWT with `jose` (Web Crypto) — no Node APIs, no DB.
 * Unauthenticated users hitting a protected route are redirected to /login;
 * already-authenticated users hitting /login are sent to the dashboard.
 */

const ISSUER = "performance-tracker";
const AUDIENCE = "performance-tracker-admin";

async function isValidSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    await jwtVerify(token, secret, { issuer: ISSUER, audience: AUDIENCE });
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const authed = await isValidSession(token);

  const isLogin = pathname === "/login";

  // Authenticated user visiting /login → send to dashboard.
  if (isLogin) {
    if (authed) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Any other matched route requires auth.
  if (!authed) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  /**
   * Protect everything except Next internals, static assets, and the
   * file-download/email route handlers (which do their own auth checks).
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/public|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
