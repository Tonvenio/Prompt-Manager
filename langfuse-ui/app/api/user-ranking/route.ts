import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getRankings, setRankings, UserRanking } from "../_data";

export async function GET() {
  const items = await getRankings();
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const items = await getRankings();
  const idx = items.findIndex(r => r.userId === body.userId);
  const rec: UserRanking = {
    userId: String(body.userId || (await (cookies as any)()?.get("auth_user")?.value || "")),
    totalScore: Number(body.totalScore || 0),
    promptCount: Number(body.promptCount || 0),
    helpfulVotes: Number(body.helpfulVotes || 0),
    expertiseAreas: Array.isArray(body.expertiseAreas) ? body.expertiseAreas : [],
    level: (body.level === "expert" || body.level === "senior" ? body.level : "junior"),
  };
  if (idx >= 0) items[idx] = rec; else items.push(rec);
  await setRankings(items);
  return NextResponse.json(rec);
}



