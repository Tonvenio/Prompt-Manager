import { NextRequest, NextResponse } from "next/server";
import { logServerEvent } from "../../analytics/_server";

function isValidUsername(username: unknown): username is string {
  if (typeof username !== "string") return false;
  const trimmed = username.trim();
  if (!trimmed) return false;
  // Accept letters, dots and hyphens; must contain a single dot separating first and last name
  return /^[A-Za-z]+\.[A-Za-z-]+$/.test(trimmed);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { username, password } = body as { username?: string; password?: string };

  if (!isValidUsername(username)) {
    return new NextResponse("Invalid username. Use first.last", { status: 400 });
  }
  if (password !== "password") {
    return new NextResponse("Invalid credentials", { status: 401 });
  }

  const res = new NextResponse(null, { status: 204 });
  res.cookies.set("auth_user", username, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  // Fire-and-forget login event
  logServerEvent("login", { username }).catch(() => {});
  return res;
}


