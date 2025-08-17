import { NextResponse } from "next/server";
import { lfAuthHeader, lfHost, lfJson } from "../_lib";

export async function GET() {
  const limit = 100; // Langfuse maximum
  let page = 1;
  const allTags = new Set<string>();
  try {
    // Paginate until all pages fetched
    while (true) {
      const qs = new URLSearchParams({ page: String(page), limit: String(limit) }).toString();
      const url = `${lfHost()}/api/public/v2/prompts?${qs}`;
      const data = await lfJson(url, { headers: { ...lfAuthHeader() }, cache: "no-store" });
      const items: any[] = Array.isArray(data?.data) ? data.data : [];
      for (const p of items) {
        for (const t of (p?.tags || [])) {
          allTags.add(String(t));
        }
      }
      const totalPages = Number(data?.meta?.totalPages ?? 1);
      if (page >= totalPages) break;
      page += 1;
    }
    // Include a small set of canonical tags so users can add known options
    const DEFAULT_TAGS = [
      "Tool > OC-GPT",
      "Tool > Legora",
      "Tool > Harvey",
    ];
    for (const t of DEFAULT_TAGS) allTags.add(t);
    const tags = Array.from(allTags).sort();
    const byCategory: Record<string, string[]> = {};
    for (const t of tags) {
      const [catRaw, valRaw] = String(t).split('>').map((s) => s.trim());
      const cat = catRaw || 'Other';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(t);
    }
    // Sort each category by value for nicer UX
    for (const cat of Object.keys(byCategory)) {
      byCategory[cat] = byCategory[cat].sort((a, b) => {
        const [, vaRaw] = a.split('>').map(s => s.trim());
        const [, vbRaw] = b.split('>').map(s => s.trim());
        const va = (vaRaw || a).toLowerCase();
        const vb = (vbRaw || b).toLowerCase();
        return va.localeCompare(vb);
      });
    }
    return NextResponse.json({ tags, byCategory });
  } catch (e: any) {
    return new NextResponse(e?.message || "Failed to list tags", { status: 500 });
  }
}


