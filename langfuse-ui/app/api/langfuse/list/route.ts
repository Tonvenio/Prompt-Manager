import { NextRequest, NextResponse } from "next/server";
import { lfAuthHeader, lfHost, lfJson } from "../_lib";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name") ?? "";
  const tag  = searchParams.get("tag") ?? "";
  const page = searchParams.get("page") ?? "1";
  const limit= searchParams.get("limit") ?? "50";
  const includePrompt = (searchParams.get("includePrompt") ?? "true").toLowerCase() !== "false";

  const qs = new URLSearchParams();
  if (name)  qs.set("name", name);
  if (tag)   qs.set("tag", tag);
  qs.set("page", page);
  qs.set("limit", limit);

  const url = `${lfHost()}/api/public/v2/prompts?${qs.toString()}`;
  const data = await lfJson(url, {
    headers: { ...lfAuthHeader() },
    cache: "no-store",
  });

  // Optionally enrich each item with latest prompt text so the UI can full-text search
  if (!includePrompt) {
    return NextResponse.json(data);
  }

  const items: any[] = Array.isArray(data?.data) ? data.data : [];
  const enriched = await Promise.all(items.map(async (item: any) => {
    const name: string = item?.name;
    if (!name) return item;
    try {
      const detailUrl = `${lfHost()}/api/public/v2/prompts/${encodeURIComponent(name)}?label=latest`;
      const detail = await lfJson(detailUrl, { headers: { ...lfAuthHeader() }, cache: "no-store" });
      let text = "";
      if (typeof detail?.prompt === "string") {
        text = detail.prompt;
      } else if (Array.isArray(detail?.prompt)) {
        // Flatten chat-style prompts into a single string (role: content)
        text = detail.prompt
          .map((m: any) => [m?.role, m?.content]
            .filter(Boolean)
            .join(": "))
          .join("\n\n");
      }
      return { ...item, lastPromptText: String(text || "") };
    } catch {
      return item;
    }
  }));

  return NextResponse.json({ ...data, data: enriched });
}


