"use server";

import { redirect } from "next/navigation";
import { connectToDatabase } from "@/lib/db";
import { AdminModel } from "@/models";
import { verifyPassword } from "@/lib/password";
import {
  signSession,
  setSessionCookie,
  clearSessionCookie,
} from "@/lib/auth";
import { loginSchema } from "./schema";
import type { ActionResult, SessionUser } from "@/types";

/**
 * Authenticate an admin and start a session.
 * Returns a serialisable result; the client redirects on success.
 */
export async function loginAction(
  _prev: ActionResult<SessionUser> | null,
  formData: FormData,
): Promise<ActionResult<SessionUser>> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please correct the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await connectToDatabase();

    // passwordHash is `select: false` — explicitly include it.
    const admin = await AdminModel.findOne({ email: parsed.data.email })
      .select("+passwordHash")
      .exec();

    const genericError = "Invalid email or password.";
    if (!admin || admin.status !== "active") {
      return { success: false, error: genericError };
    }

    const ok = await verifyPassword(parsed.data.password, admin.passwordHash);
    if (!ok) {
      return { success: false, error: genericError };
    }

    const user: SessionUser = {
      id: String(admin._id),
      name: admin.name,
      email: admin.email,
    };

    const token = await signSession(user);
    await setSessionCookie(token);

    return { success: true, data: user };
  } catch (error) {
    console.error("[loginAction]", error);
    return {
      success: false,
      error: "Unable to sign in right now. Please try again.",
    };
  }
}

/** Clear the session and return to the login page. */
export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
