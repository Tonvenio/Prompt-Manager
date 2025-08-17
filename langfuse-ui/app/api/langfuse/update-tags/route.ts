import { NextResponse } from "next/server";
import { lfAuthHeader, lfHost, lfJson } from "../_lib";

/**
 * POST body:
 * {
 *   "name": "prompt-name",
 *   "action": "remove" | "removeAll",
 *   "tag": "optional-tag-when-action-is-remove"
 * }
 *
 * Strategy:
 * 1) Fetch current prompt (default "production" label).
 * 2) Prepare new tags array (remove one or all).
 * 3) Create a NEW prompt version via POST /api/public/v2/prompts
 *    carrying over prompt content, config & labels, but with updated tags.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { name, action, tag } = body as { name?: string; action?: "add"|"remove"|"removeAll"; tag?: string };

  if (!name || !action || (action === "remove" && !tag)) {
    return new NextResponse("Missing fields", { status: 400 });
  }

  // 1) Fetch current latest-labeled prompt
  const current = await lfJson(`${lfHost()}/api/public/v2/prompts/${encodeURIComponent(name)}?label=latest`, {
    headers: { ...lfAuthHeader() },
    cache: "no-store",
  });

  // current is either a chat or text prompt; detect shape
  const type: "chat" | "text" = current.type;
  const labels: string[] = current.labels ?? [];
  const existingTags: string[] = current.tags ?? [];
  let newTags: string[];
  if (action === "removeAll") {
    newTags = [];
  } else if (action === "remove") {
    newTags = existingTags.filter((t: string) => t !== tag);
  } else {
    // add
    const next = new Set<string>(existingTags);
    if (tag) next.add(tag);
    newTags = Array.from(next);
  }

  // Always use the canonical server-provided name to avoid accidental renames
  const canonicalName: string = current.name;

  // Build create body while carrying prompt content
  const createUrl = `${lfHost()}/api/public/v2/prompts`;
  let payload: any;

  if (type === "text") {
    payload = {
      type: "text",
      name: canonicalName,
      prompt: current.prompt,           // string
      config: current.config ?? null,
      labels,                           // carry labels
      tags: newTags,                    // UPDATED TAGS
      commitMessage: `Tags updated: ${action === "removeAll" ? "cleared all" : action === "remove" ? `removed ${tag}` : `added ${tag}`}`,
    };
  } else {
    payload = {
      type: "chat",
      name: canonicalName,
      prompt: current.prompt,           // array of chat messages
      config: current.config ?? null,
      labels,
      tags: newTags,
      commitMessage: `Tags updated: ${action === "removeAll" ? "cleared all" : action === "remove" ? `removed ${tag}` : `added ${tag}`}`,
    };
  }

  // 3) Create new version
  const created = await lfJson(createUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...lfAuthHeader(),
    },
    body: JSON.stringify(payload),
  });

  return NextResponse.json(created);
}


