import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const {
    language = "",
    languages = [],
    areas = [],
    personalLLMContext = "",
    primaryLegalAreas = [],
    secondaryLegalAreas = [],
    experienceLevel = "junior",
    firm = "",
    specializations = [],
    promptLanguage = "",
    targetLanguage = "",
  } = body as any;
  const res = new NextResponse(null, { status: 204 });
  res.cookies.set("user_profile", JSON.stringify({ language, languages, areas, personalLLMContext, primaryLegalAreas, secondaryLegalAreas, experienceLevel, firm, specializations, promptLanguage, targetLanguage }), {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}


