import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserPrompts } from "../../_data";

export async function POST(req: NextRequest) {
  const store = await cookies();
  const user = store.get("auth_user")?.value || "";
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => ({}));
  const initialLanguage = String(body.initialLanguage || "").trim();
  const outputLanguage = String(body.outputLanguage || "").trim();
  const ids = Array.isArray(body.ids) ? body.ids.map((s: any) => String(s)) : null;

  if (!outputLanguage) {
    return new NextResponse("Missing outputLanguage", { status: 400 });
  }

  const endpoint = process.env.N8N_TRANSLATOR_URL || "https://mac.broadbill-little.ts.net/webhook/prompt-translator";

  const all = await getUserPrompts();
  const mine = all.filter(p => p.userId === user && (!ids || ids.includes(p.id)));

  async function translate(text: string): Promise<string> {
    try {
      const url = `${endpoint}?prompt=${encodeURIComponent(text)}&lastName=${encodeURIComponent(outputLanguage)}`;
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const raw = await res.text();
      try {
        const json = JSON.parse(raw);
        return String((json as any).translatedText || (json as any).text || (json as any).data?.translatedText || raw);
      } catch {
        return raw;
      }
    } catch (e: any) {
      // if translation fails, fallback to original text to keep export flowing
      return text;
    }
  }

  const out = [] as any[];
  for (const p of mine) {
    const translated = await translate(p.content);
    out.push({
      id: p.id,
      title: p.title,
      content: translated,
      legalArea: p.legalArea,
      tags: p.tags,
      isPublic: p.isPublic,
      version: p.version,
      promptLanguage: initialLanguage,
      targetLanguage: outputLanguage,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    });
  }

  return NextResponse.json({ items: out });
}


