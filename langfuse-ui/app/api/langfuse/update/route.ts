import { NextResponse } from "next/server";
import { lfAuthHeader, lfHost, lfJson } from "../_lib";

/**
 * POST body:
 * {
 *   name: string,
 *   promptText: string
 * }
 *
 * Notes:
 * - We detect current prompt type (text or chat) from latest version
 * - For chat prompts, promptText must be a JSON array compatible with Langfuse chat schema
 * - Creates a new version preserving config, labels, and tags
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { name, newName, promptText, labels: labelsOverride, commitMessage, appendTags, languageHint } = body as { name?: string; newName?: string; promptText?: string; labels?: string[]; commitMessage?: string; appendTags?: string[]; languageHint?: string };

  if (!name || typeof promptText !== "string") {
    return new NextResponse("Missing fields", { status: 400 });
  }

  // Load latest prompt of LOOKUP name to preserve metadata
  const current = await lfJson(`${lfHost()}/api/public/v2/prompts/${encodeURIComponent(name)}?label=latest`, {
    headers: { ...lfAuthHeader() },
    cache: "no-store",
  });

  const type: "chat" | "text" = current.type;
  let newPrompt: any = promptText;
  if (type === "chat") {
    try {
      newPrompt = JSON.parse(promptText);
    } catch {
      return new NextResponse("For chat prompts, promptText must be valid JSON", { status: 400 });
    }
  }

  // Build tags with optional language override (replace existing Language > ... tag)
  const currentTags: string[] = Array.isArray(current.tags) ? current.tags : [];
  let tagsFinal: string[] = currentTags;
  if (languageHint && typeof languageHint === "string" && languageHint.trim()) {
    const langTag = `Language > ${languageHint.trim()}`;
    tagsFinal = currentTags.filter((t) => t.split('>')[0].trim() !== 'Language');
    tagsFinal.push(langTag);
  }
  if (Array.isArray(appendTags) && appendTags.length) {
    tagsFinal = Array.from(new Set([...(tagsFinal || []), ...appendTags]));
  }

  const payload: any = {
    type,
    name: newName || name,
    prompt: newPrompt,
    config: current.config ?? null,
    labels: Array.isArray(labelsOverride) ? labelsOverride : (current.labels ?? []),
    tags: tagsFinal,
    commitMessage: commitMessage || "Update prompt via UI",
  };

  const created = await lfJson(`${lfHost()}/api/public/v2/prompts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...lfAuthHeader() },
    body: JSON.stringify(payload),
  });

  return NextResponse.json(created);
}


