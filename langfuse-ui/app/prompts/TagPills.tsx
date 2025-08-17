"use client";

import { useState } from "react";

export function TagPills({ tags, onTagClick }: { tags: string[]; onTagClick?: (tag: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const displayTags = (tags || []).filter((t) => {
    const cat = t.split('>')[0].trim();
    return cat !== 'SubmittedBy' && cat !== 'ModifiedBy' && cat !== 'Modified by';
  });
  // Sort by category, then by value within category
  // Start with field of law first (Area_or_PG), then others
  const CATEGORY_ORDER = ["Area_or_PG", "Context", "Jurisdiction", "Tool", "Language"]; 
  const orderMap = new Map(CATEGORY_ORDER.map((c, i) => [c, i] as const));
  const displayTagsSorted = [...displayTags].sort((a, b) => {
    const [caRaw, vaRaw] = String(a).split('>').map((s) => s.trim());
    const [cbRaw, vbRaw] = String(b).split('>').map((s) => s.trim());
    const ca = caRaw || ""; const cb = cbRaw || "";
    const va = (vaRaw ?? caRaw ?? "").toLowerCase();
    const vb = (vbRaw ?? cbRaw ?? "").toLowerCase();
    const wa = orderMap.get(ca) ?? 999;
    const wb = orderMap.get(cb) ?? 999;
    if (wa !== wb) return wa - wb;
    if (ca !== cb) return ca.localeCompare(cb);
    return va.localeCompare(vb);
  });
  if (!displayTags.length) return <span>—</span>;

  const MAX_INLINE = 5; // show up to 5; reveal all after clicking "..."
  const showDots = !expanded && displayTagsSorted.length > MAX_INLINE;
  const visible = expanded ? displayTagsSorted : displayTagsSorted.slice(0, Math.min(displayTagsSorted.length, MAX_INLINE - (showDots ? 1 : 0)));

  function getCategoryStyles(tag: string) {
    const [rawCategory] = tag.split('>').map((s) => s.trim());
    const category = rawCategory || 'other';
    const stylesByCategory: Record<string, { container: string; hover: string }> = {
      // Context uses Jurisdiction styling across the site per request
      Context: {
        container: 'bg-sky-100 text-sky-900 ring-1 ring-sky-200',
        hover: 'hover:bg-sky-200',
      },
      // Jurisdiction now grey
      Jurisdiction: {
        container: 'bg-slate-100 text-slate-900 ring-1 ring-slate-200',
        hover: 'hover:bg-slate-200',
      },
      // Accent for area/product group
      Area_or_PG: {
        container: 'bg-[#FB5A17]/10 text-[#9a3a10] ring-1 ring-[#FB5A17]/20',
        hover: 'hover:bg-[#FB5A17]/15',
      },
      // Subtle indigo for tools
      Tool: {
        container: 'bg-indigo-100 text-indigo-900 ring-1 ring-indigo-200',
        hover: 'hover:bg-indigo-200',
      },
      // Calming emerald for languages
      Language: {
        container: 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200',
        hover: 'hover:bg-emerald-200',
      },
      // Default neutral
      other: {
        container: 'bg-slate-100 text-slate-800 ring-1 ring-slate-200',
        hover: 'hover:bg-slate-200',
      },
    };
    return stylesByCategory[category] || stylesByCategory.other;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((t) => (
        <button
          key={t}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTagClick?.(t);
          }}
          className={`inline-flex items-center max-w-full whitespace-nowrap px-3 py-1 rounded-full font-semibold text-sm transition ${getCategoryStyles(t).container} ${getCategoryStyles(t).hover}`}
          title={`Filter by ${t}`}
        >
          <span className="truncate">{(() => {
            const parts = t.split('>').map(s => s.trim());
            const category = parts[0] || '';
            const value = parts.length > 1 ? parts[1] : parts[0];
            if (category === 'Jurisdiction' || category === 'Language') {
              return `${category} > ${value}`;
            }
            return value;
          })()}</span>
        </button>
      ))}
      {showDots && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
          className="inline-flex items-center px-3 py-1 rounded-full text-sm border bg-[#003145]/5 text-[#003145] border-[#003145]/15 hover:bg-[#003145]/10 transition"
          title="Show all tags"
        >
          ...
        </button>
      )}
    </div>
  );
}


