import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserPrompts, setUserPrompts, newId, UserPrompt } from "../_data";

function currentUser(): string {
  return (cookies as any)()?.get("auth_user")?.value || "";
}

export async function GET() {
  const user = await currentUser();
  const all = await getUserPrompts();
  const mine = all.filter(p => p.userId === user);
  return NextResponse.json(mine);
}

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const body = await req.json();
  const now = new Date().toISOString();
  const item: UserPrompt = {
    id: newId(),
    userId: user,
    title: String(body.title || "Untitled"),
    content: String(body.content || ""),
    legalArea: String(body.legalArea || ""),
    tags: Array.isArray(body.tags) ? body.tags : [],
    isPublic: Boolean(body.isPublic),
    version: 1,
    promptLanguage: String(body.promptLanguage || ""),
    targetLanguage: String(body.targetLanguage || ""),
    createdAt: now,
    updatedAt: now,
  };
  const all = await getUserPrompts();
  all.push(item);
  await setUserPrompts(all);
  return NextResponse.json(item, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const user = await currentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const body = await req.json();
  const id = String(body.id || "");
  const all = await getUserPrompts();
  const idx = all.findIndex(p => p.id === id && p.userId === user);
  if (idx === -1) return new NextResponse("Not found", { status: 404 });
  const prev = all[idx];
  const updated: UserPrompt = {
    ...prev,
    title: body.title ?? prev.title,
    content: body.content ?? prev.content,
    legalArea: body.legalArea ?? prev.legalArea,
    tags: Array.isArray(body.tags) ? body.tags : prev.tags,
    isPublic: body.isPublic ?? prev.isPublic,
    version: Number(prev.version || 1) + 1,
    promptLanguage: body.promptLanguage ?? prev.promptLanguage,
    targetLanguage: body.targetLanguage ?? prev.targetLanguage,
    updatedAt: new Date().toISOString(),
  };
  all[idx] = updated;
  await setUserPrompts(all);
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const user = await currentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = String(searchParams.get("id") || "");
  const all = await getUserPrompts();
  const next = all.filter(p => !(p.id === id && p.userId === user));
  await setUserPrompts(next);
  return new NextResponse(null, { status: 204 });
}



