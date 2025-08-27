import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

type Comment = {
  id: string;
  author: string;
  text: string;
  createdAt: string; // ISO
  reactions?: Record<string, number>;
  reactByUser?: Record<string, number>; // username -> total reactions on this comment
};

// Ephemeral in-memory store per server instance
const commentsStore: Record<string, Comment[]> = {};
// Also mirror into a global so summary endpoint (and other routes) can read it
const globalAny: any = global as any;
globalAny.__commentsStore = globalAny.__commentsStore || commentsStore;

function getCommentsFor(name: string): Comment[] {
  if (!commentsStore[name]) commentsStore[name] = [];
  return commentsStore[name];
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const awaitedParams = await params;
  const name = decodeURIComponent(awaitedParams.name || "");
  if (!name) return new NextResponse("Missing name", { status: 400 });
  const list = getCommentsFor(name);
  // newest first
  const data = [...list].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  try { (globalAny.__commentsStore as Record<string, Comment[]>)[name] = list; } catch {}
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const awaitedParams = await params;
  const name = decodeURIComponent(awaitedParams.name || "");
  if (!name) return new NextResponse("Missing name", { status: 400 });
  const body = await req.json().catch(() => ({}));
  // Reaction support
  if (body?.reaction && body.reaction.id && body.reaction.emoji) {
    const list = getCommentsFor(name);
    const comment = list.find((c) => c.id === body.reaction.id);
    if (!comment) return new NextResponse("Comment not found", { status: 404 });
    const e = String(body.reaction.emoji);
    // Enforce per-user reaction limit (max 5 per comment)
    const storeCookies = await cookies();
    const user = (storeCookies.get("auth_user")?.value || "Anonymous").toString();
    const counts = (comment.reactByUser ||= {});
    const used = Number(counts[user] || 0);
    if (used >= 5) {
      return new NextResponse("Reaction limit reached (max 5 per comment)", { status: 429 });
    }
    counts[user] = used + 1;
    comment.reactions = comment.reactions || {};
    comment.reactions[e] = (comment.reactions[e] || 0) + 1;
    try { (globalAny.__commentsStore as Record<string, Comment[]>)[name] = list; } catch {}
    return NextResponse.json({ ok: true });
  }
  const text = String((body?.text ?? "")).trim();
  if (!text) return new NextResponse("Missing text", { status: 400 });

  const store = await cookies();
  const author = (store.get("auth_user")?.value || body?.author || "Anonymous").toString();
  const comment: Comment = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    author,
    text,
    createdAt: new Date().toISOString(),
    reactions: {},
    reactByUser: {},
  };
  const list = getCommentsFor(name);
  list.push(comment);
  try { (globalAny.__commentsStore as Record<string, Comment[]>)[name] = list; } catch {}
  return NextResponse.json(comment, { status: 201 });
}


