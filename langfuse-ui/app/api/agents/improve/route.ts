import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { prompt } = (await req.json().catch(() => ({}))) as { prompt?: string };
  if (!prompt) return new NextResponse("Missing prompt", { status: 400 });

  // Default to your working webhook; override via N8N_WEBHOOK_URL if needed
  const base = process.env.N8N_WEBHOOK_URL ?? "https://mac.broadbill-little.ts.net/webhook/prompt-optimizer";

  try {
    // This webhook expects POST with query parameter `prompt`
    const url = `${base}?prompt=${encodeURIComponent(prompt)}`;
    const res = await fetch(url, { method: "POST" });
    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        { error: "Upstream error", status: res.status, body: text?.slice(0, 4000) },
        { status: 502 }
      );
    }

    try {
      const json: any = JSON.parse(text);
      let output: string | undefined;
      if (Array.isArray(json) && json.length && typeof json[0] === "object") {
        output = json[0]?.output ?? json[0]?.body ?? json[0]?.result;
      }
      if (!output && json && typeof json === "object") {
        output = json.output ?? json.body ?? json.result;
      }
      return NextResponse.json({ output: output ?? text, raw: text, status: res.status });
    } catch {
      return NextResponse.json({ output: text, raw: text, status: res.status });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to call webhook", status: 500 }, { status: 500 });
  }
}


