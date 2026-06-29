import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { verifySession } from "@/lib/auth";
import { SESSION_COOKIE } from "@/constants";

/**
 * Route handler for downloading generated PDF files.
 * Protected by JWT auth check (reads the session cookie).
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const session = await verifySession(token);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const filePath = request.nextUrl.searchParams.get("path");
    if (!filePath) {
      return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
    }

    // Security: ensure the path is within uploads directory
    const resolvedPath = path.resolve(filePath);
    const uploadsDir = path.resolve("uploads");
    if (!resolvedPath.startsWith(uploadsDir)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 403 });
    }

    try {
      await fs.access(resolvedPath);
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileBuffer = await fs.readFile(resolvedPath);
    const filename = path.basename(resolvedPath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(fileBuffer.length),
      },
    });
  } catch (error) {
    console.error("[download]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}