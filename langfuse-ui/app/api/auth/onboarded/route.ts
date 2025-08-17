import { NextResponse } from "next/server";

export async function POST() {
  const res = new NextResponse(null, { status: 204 });
  res.cookies.set("onboarded_v1", "1", {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}


