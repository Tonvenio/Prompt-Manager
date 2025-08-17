import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// Access the same in-memory store via module cache of the name route file
// We can't import the store directly due to module scoping, so keep a shadow store here as a best-effort fallback
const globalAny: any = global as any;
globalAny.__commentsStore = globalAny.__commentsStore || {};

type Summary = { name: string; comments: number; reactions: number };

export async function GET(req: NextRequest) {
  // This endpoint returns an empty object unless the same server instance handled comments.
  // It's a lightweight heuristic suitable for the demo/mvp.
  const store = (globalAny.__commentsStore || {}) as Record<string, Array<{ text: string; reactions?: Record<string, number> }>>;
  const list: Summary[] = Object.entries(store).map(([name, items]) => {
    const comments = items.length;
    let reactions = 0;
    for (const c of items) {
      if (c.reactions) {
        for (const v of Object.values(c.reactions)) reactions += Number(v || 0);
      }
    }
    return { name, comments, reactions };
  });
  return NextResponse.json({ data: list });
}



