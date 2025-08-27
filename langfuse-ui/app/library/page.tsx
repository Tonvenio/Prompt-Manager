"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { AnimatedSection } from "@/components/AnimatedSection";
import { AnimatedSearchBar, AnimatedFilterPill, AnimatedViewToggle } from "@/components/AnimatedFilters";
import { useStaggerAnimation, useIntersectionAnimation } from "@/hooks/useAnimations";
import { TagPills } from "@/app/prompts/TagPills";
import { trackClient } from "@/app/components/ClientAnalytics";
import { UsePromptModal } from "@/app/prompts/[name]/UsePromptModal";
import { ImproveModal } from "@/app/prompts/[name]/ImproveModal";
import { CompareModal } from "@/app/prompts/[name]/CompareModal";
import LibraryComments from "@/app/library/LibraryComments";
import LibraryDetailsModal from "@/app/library/LibraryDetailsModal";

// Types reused from /prompts
type PromptMeta = {
  name: string;
  versions: number[];
  labels: string[];
  tags: string[];
  lastUpdatedAt: string;
  lastConfig?: unknown;
  lastPromptText?: string;
};

type PromptListResponse = {
  data: PromptMeta[];
  meta: { page: number; limit: number; totalItems: number; totalPages: number };
};

export default function LibraryPage(): React.ReactElement {
  const [loading, setLoading] = useState(false);
  const [prompts, setPrompts] = useState<PromptMeta[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [activeTag, setActiveTag] = useState<string>("");
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "bento">("table");
  const [currentUsername, setCurrentUsername] = useState<string>("");
  const [currentProfile, setCurrentProfile] = useState<any>({ languages: [], areas: [] });
  const [filters, setFilters] = useState<{
    Context: string;
    Jurisdiction: string;
    Area_or_PG: string[];
    Tool: string[];
    SubmittedBy: string;
    Language: string;
  }>({ Context: "", Jurisdiction: "", Area_or_PG: [], Tool: [], SubmittedBy: "", Language: "" });
  const [error, setError] = useState<string>("");

  const listRef = useStaggerAnimation("[data-list-item]", {}, true);
  const detailRef = useIntersectionAnimation({ y: 0, opacity: 1 });
  const rightPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    trackClient("library_open", {});
  }, []);

  // Load list from backend (Langfuse via API route)
  async function load() {
    setLoading(true); setError("");
    try {
      const url = `/api/langfuse/list${activeTag ? `?tag=${encodeURIComponent(activeTag)}` : ""}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const json: PromptListResponse = await res.json();
      setPrompts(json.data);
      const tags = Array.from(new Set(json.data.flatMap(p => p.tags || []))).sort();
      setAllTags(tags);
      // social summary best-effort
      try {
        const sres = await fetch('/api/comments/summary', { cache: 'no-store' });
        if (sres.ok) {
          const sjson = await sres.json();
          const map: Record<string, { comments: number; reactions: number }> = {};
          for (const row of (Array.isArray(sjson?.data) ? sjson.data : [])) {
            map[row.name] = { comments: row.comments || 0, reactions: row.reactions || 0 };
          }
          (window as any).__promptSocialSummary = map;
        }
      } catch {}
    } catch (e: any) {
      setError(e.message || "Failed to load prompts");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable react-hooks/exhaustive-deps */ }, [activeTag]);

  // load current user (username + profile)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        setCurrentUsername(String(json?.username || ""));
        setCurrentProfile(json?.profile || {});
        try {
          const langs = Array.isArray(json?.profile?.languages) ? json.profile.languages : [];
          if (!filters.Language && langs.length === 1) {
            setFilters((prev) => ({ ...prev, Language: langs[0] }));
          }
        } catch {}
      } catch { /* ignore */ }
    })();
  }, []);

  // Selection state mirrors prompts list; pick first available
  const [selectedName, setSelectedName] = useState<string>("");
  useEffect(() => {
    if (!selectedName && prompts.length > 0) setSelectedName(prompts[0].name);
  }, [prompts, selectedName]);

  useEffect(() => {
    if (!rightPanelRef.current) return;
    gsap.fromTo(
      rightPanelRef.current,
      { x: 40, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.5, ease: "power2.out" }
    );
  }, [selectedName]);

  // Helper: current selection object
  const selected = useMemo(() => prompts.find(p => p.name === selectedName) || null, [prompts, selectedName]);

  const [showUse, setShowUse] = useState(false);
  const [showImprove, setShowImprove] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [improveStatus, setImproveStatus] = useState<"waiting"|"done"|"error">("waiting");
  const [improveResult, setImproveResult] = useState<string>("");

  async function startImprove() {
    if (!selected) return;
    setShowImprove(true);
    setImproveStatus("waiting");
    setImproveResult("");
    try {
      const res = await fetch('/api/agents/improve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: selected.lastPromptText || '' }) });
      const j = await res.json();
      const out = String(j?.output || "");
      setImproveResult(out);
      setImproveStatus("done");
    } catch {
      setImproveStatus("error");
    }
  }

  function applyImprovedText(_newText: string) {
    // Phase C will save to Langfuse; for now just close
    setShowImprove(false);
  }

  // Tag pill click => set filters or search
  function handleTagClick(tag: string) {
    const [cat, val] = tag.split(">").map(s => s.trim());
    if (cat === "Context" && val) return setFilters(prev => ({ ...prev, Context: val }));
    if (cat === "Jurisdiction" && val) return setFilters(prev => ({ ...prev, Jurisdiction: val }));
    if (cat === "Area_or_PG" && val) return setFilters(prev => ({ ...prev, Area_or_PG: Array.from(new Set([...(prev.Area_or_PG || []), val])) }));
    if (cat === "Tool" && val) return setFilters(prev => ({ ...prev, Tool: Array.from(new Set([...(prev.Tool || []), val])) }));
    if (cat === "SubmittedBy" && val) return setFilters(prev => ({ ...prev, SubmittedBy: val }));
    if (cat === "Language" && val) return setFilters(prev => ({ ...prev, Language: val }));
    setQuery(val || tag);
  }

  // Build options for selects (later phases may add FancySelect UI)
  const optionsByCategory = useMemo(() => {
    const context = new Set<string>();
    const jurisdiction = new Set<string>();
    const area = new Set<string>();
    const tool = new Set<string>();
    const submittedBy = new Set<string>();
    const language = new Set<string>();
    for (const p of prompts) {
      for (const t of p.tags || []) {
        const [cat, val] = t.split(">").map(s => s.trim());
        if (cat === "Context" && val) context.add(val);
        if (cat === "Jurisdiction" && val) jurisdiction.add(val);
        if (cat === "Area_or_PG" && val) area.add(val);
        if (cat === "Tool" && val) tool.add(val);
        if (cat === "SubmittedBy" && val) submittedBy.add(val);
        if (cat === "Language" && val) language.add(val);
      }
    }
    return {
      Context: Array.from(context).sort(),
      Jurisdiction: Array.from(jurisdiction).sort(),
      Area_or_PG: Array.from(area).sort(),
      Tool: Array.from(tool).sort(),
      SubmittedBy: Array.from(submittedBy).sort(),
      Language: Array.from(language).sort(),
    };
  }, [prompts]);

  // Full-text search + category filters
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const hasActiveCategoryFilters = Boolean(
      filters.Context ||
      filters.Jurisdiction ||
      (filters.Area_or_PG?.length) ||
      (filters.Tool?.length) ||
      filters.SubmittedBy ||
      filters.Language
    );
    return prompts.filter(p => {
      // Hide certain labels
      const labels = Array.isArray(p.labels) ? p.labels.map((l) => String(l).toLowerCase()) : [];
      if (labels.includes('substantial_change') || labels.includes('requested')) return false;
      const hay = [
        p.name,
        (p.tags || []).join(" "),
        JSON.stringify(p.lastConfig ?? {}),
        String(p.lastPromptText || ""),
      ].join(" ").toLowerCase();
      if (q && !hay.includes(q)) return false;

      if (hasActiveCategoryFilters) {
        const tagPairs = (p.tags || []).map(t => t.split(">").map(s => s.trim())) as [string, string][];
        const singles: [keyof typeof filters, string][] = (
          [
            ["Context", filters.Context],
            ["Jurisdiction", filters.Jurisdiction],
            ["SubmittedBy", filters.SubmittedBy],
            ["Language", filters.Language],
          ] as [keyof typeof filters, string][]
        ).filter(([, v]) => Boolean(v));
        for (const [catName, value] of singles) {
          const ok = tagPairs.some(([cat, val]) => cat === catName && val === value);
          if (!ok) return false;
        }
        if (filters.Area_or_PG?.length) {
          const ok = filters.Area_or_PG.some((v) => tagPairs.some(([cat, val]) => cat === "Area_or_PG" && val === v));
          if (!ok) return false;
        }
        if (filters.Tool?.length) {
          const ok = filters.Tool.some((v) => tagPairs.some(([cat, val]) => cat === "Tool" && val === v));
          if (!ok) return false;
        }
      }
      return true;
    });
  }, [prompts, query, filters]);

  function isSubmittedByCurrentUser(p: PromptMeta): boolean {
    const u = (currentUsername || "").trim().toLowerCase();
    if (!u) return false;
    return (p.tags || []).some((t) => {
      const [cat, val] = t.split('>').map((s) => s.trim());
      const v = String(val || '').trim().toLowerCase();
      return (
        (cat === 'SubmittedBy' && v === u) ||
        (cat === 'ModifiedBy' && v === u) ||
        (cat === 'Modified by' && v === u)
      );
    });
  }

  const mine = useMemo(() => filtered.filter((p) => isSubmittedByCurrentUser(p)), [filtered, currentUsername]);
  const others = useMemo(() => filtered.filter((p) => !isSubmittedByCurrentUser(p)), [filtered, currentUsername]);
  const recentNew = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return filtered
      .filter((p) => {
        const ts = Date.parse(p.lastUpdatedAt);
        return Number.isFinite(ts) && ts >= cutoff && !isSubmittedByCurrentUser(p);
      })
      .sort((a, b) => Date.parse(b.lastUpdatedAt) - Date.parse(a.lastUpdatedAt))
      .slice(0, 6);
  }, [filtered, currentUsername]);
  const othersExcludingRecent = useMemo(() => {
    const set = new Set(recentNew.map((p) => p.name));
    return others.filter((p) => !set.has(p.name));
  }, [others, recentNew]);

  const sectionedList = useMemo(() => {
    return [
      ...(mine.length ? [{ title: "My Prompts", items: mine }] : []),
      { title: "Practice Group Prompts", items: ((): PromptMeta[] => {
        const areas: string[] = Array.isArray(currentProfile?.areas) ? currentProfile.areas : [];
        if (!areas.length) return [] as PromptMeta[];
        return filtered.filter((p) => (p.tags || []).some((t) => {
          const [cat, val] = String(t).split('>').map((s) => s.trim());
          return cat === 'Area_or_PG' && areas.includes(val);
        }));
      })() },
      { title: "Community Prompts", items: othersExcludingRecent },
    ];
  }, [mine, currentProfile, filtered, othersExcludingRecent]);

  const totalCount = filtered.length;

  // Compute top tags by frequency to avoid rendering hundreds
  const topTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of prompts) {
      for (const t of p.tags || []) {
        counts.set(t, (counts.get(t) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([t]) => t);
  }, [prompts]);

  return (
    <div className="h-full w-full flex">
      <aside className="w-80 shrink-0 border-r border-[#003145]/10 bg-white/70 backdrop-blur-sm">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <button className="px-3 py-2 rounded-lg text-white bg-gradient-to-r from-[#FB5A17] to-[#FF8A50] shadow">+ Create Prompt</button>
            <AnimatedViewToggle viewMode={viewMode} onChange={setViewMode} />
          </div>

          <div className="text-xs uppercase tracking-wide text-[#003145]/60 mb-2">Top tags</div>
          <div className="grid grid-cols-2 gap-2 mb-4 pr-1">
            {topTags.map((t, i) => (
              <AnimatedFilterPill key={t} index={i} label={t} active={activeTag === t} onClick={() => setActiveTag(activeTag === t ? "" : t)} />
            ))}
          </div>

          <div className="text-xs uppercase tracking-wide text-[#003145]/60 mb-2">Quick categories</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(optionsByCategory).map(([cat, vals]) => (
              <button key={cat} className="px-2 py-1 rounded hover:bg-[#003145]/5 text-left" onClick={() => setFilters(prev => ({ ...prev, [cat]: Array.isArray(vals) ? String(vals[0] || "") : String(vals) }))}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <main className="flex-1 grid grid-cols-[1fr_520px]">
        <section className="border-r border-[#003145]/10 p-6 overflow-y-auto">
          <AnimatedSection
            title="Library"
            count={totalCount}
            countLabel="items"
            actionButton={
              <button onClick={load} className="px-3 py-1.5 rounded bg-[#003145] text-white text-sm" disabled={loading}>{loading ? "Loading…" : "Reload"}</button>
            }
            backgroundGradient="from-[#003145]/[0.02] to-[#FB5A17]/[0.03]"
            titleGradient="from-[#003145] via-[#FB5A17] to-[#003145]"
          >
            <AnimatedSearchBar value={query} onChange={setQuery} />

            {/* Table view parity */}
            {viewMode === 'table' ? (
              <table className="w-full border rounded overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-2 border-b">Folder</th>
                    <th className="text-left p-2 border-b">Name</th>
                    <th className="text-left p-2 border-b">Tags</th>
                    <th className="text-left p-2 border-b">Labels</th>
                    <th className="text-left p-2 border-b">Community</th>
                    <th className="text-left p-2 border-b">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {sectionedList.map((section) => (
                    <React.Fragment key={section.title}>
                      {section.items.length > 0 && (
                        <tr>
                          <td colSpan={6} className="p-2 bg-gray-50 text-[#003145] font-semibold">{section.title}</td>
                        </tr>
                      )}
                      {section.title === 'Community Prompts' && recentNew.length > 0 && (
                        <tr>
                          <td colSpan={6} className="p-2 bg-gray-100 text-[#003145] font-medium pl-8">↳ New Prompts</td>
                        </tr>
                      )}
                      {(section.title === 'Community Prompts' ? recentNew : section.items).map((p) => (
                        <tr key={`${section.title}-${p.name}`} className="hover:bg-gray-50 cursor-pointer" data-list-item onClick={() => { setSelectedName(p.name); setShowDetails(true); trackClient('library_select', { name: p.name }); }}>
                          <td className="p-2 border-b">{(() => { const parts = p.name.split('/'); return parts.length > 1 ? parts.slice(0, -1).join('/') : parts[0]; })()}</td>
                          <td className="p-2 border-b">{(() => { const parts = p.name.split('/'); return parts[parts.length - 1]; })()}</td>
                          <td className="p-2 border-b"><TagPills tags={p.tags || []} onTagClick={handleTagClick} /></td>
                          <td className="p-2 border-b">{(p.labels || []).join(", ")}</td>
                          <td className="p-2 border-b">{(() => { const m = (window as any).__promptSocialSummary || {}; const s = m[p.name] || { comments: 0, reactions: 0 }; return (<span className="inline-flex items-center gap-2 text-xs"><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#003145]/10 text-[#003145]" title="Reactions">👏 {s.reactions}</span><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#003145]/10 text-[#003145]" title="Comments">💬 {s.comments}</span></span>); })()}</td>
                          <td className="p-2 border-b" onClick={(e) => e.stopPropagation()}><button className="px-2 py-1 rounded bg-[#FB5A17] text-white hover:opacity-90" onClick={() => { setSelectedName(p.name); setShowDetails(true); }}>Open</button></td>
                        </tr>
                      ))}
                      {section.title === 'Community Prompts' && othersExcludingRecent.map((p) => (
                        <tr key={`others-${p.name}`} className="hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedName(p.name); setShowDetails(true); trackClient('library_select', { name: p.name }); }}>
                          <td className="p-2 border-b">{(() => { const parts = p.name.split('/'); return parts.length > 1 ? parts.slice(0, -1).join('/') : parts[0]; })()}</td>
                          <td className="p-2 border-b">{(() => { const parts = p.name.split('/'); return parts[parts.length - 1]; })()}</td>
                          <td className="p-2 border-b"><TagPills tags={p.tags || []} onTagClick={handleTagClick} /></td>
                          <td className="p-2 border-b">{(p.labels || []).join(", ")}</td>
                          <td className="p-2 border-b">{(() => { const m = (window as any).__promptSocialSummary || {}; const s = m[p.name] || { comments: 0, reactions: 0 }; return (<span className="inline-flex items-center gap-2 text-xs"><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#003145]/10 text-[#003145]" title="Reactions">👏 {s.reactions}</span><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#003145]/10 text-[#003145]" title="Comments">💬 {s.comments}</span></span>); })()}</td>
                          <td className="p-2 border-b" onClick={(e) => e.stopPropagation()}><button className="px-2 py-1 rounded bg-[#FB5A17] text-white hover:opacity-90" onClick={() => { setSelectedName(p.name); setShowDetails(true); }}>Open</button></td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                  {(!loading && filtered.length === 0) && (
                    <tr><td className="p-4 text-gray-500" colSpan={6}>No prompts match your filters.</td></tr>
                  )}
                </tbody>
              </table>
            ) : (
              <div ref={listRef} className="space-y-3">
                {filtered.map((p) => (
                  <button key={p.name} data-list-item onClick={() => { setSelectedName(p.name); setShowDetails(true); trackClient('library_select', { name: p.name }); }} className={`w-full text-left rounded-xl border px-4 py-3 bg-white/80 backdrop-blur-sm transition-shadow hover:shadow ${selectedName === p.name ? 'border-[#FB5A17]/40' : 'border-[#003145]/10'}`}>
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-[#003145]">{(() => { const parts = p.name.split('/'); return parts[parts.length - 1]; })()}</div>
                      <div className="text-xs text-[#003145]/60">{new Date(p.lastUpdatedAt).toLocaleString()}</div>
                    </div>
                    <div className="mt-1"><TagPills tags={p.tags || []} onTagClick={handleTagClick} /></div>
                  </button>
                ))}
              </div>
            )}
          </AnimatedSection>
        </section>

        <section ref={rightPanelRef} className="p-6 overflow-y-auto">
          {selected && showDetails && (
            <LibraryDetailsModal
              name={selected.name}
              onClose={() => setShowDetails(false)}
            />
          )}

          {selected && (
            <>
              {showUse && (
                <UsePromptModal text={String(selected.lastPromptText || '')} name={selected.name} tags={selected.tags || []} onClose={() => setShowUse(false)} />
              )}
              {showImprove && (
                <ImproveModal promptText={String(selected.lastPromptText || '')} onClose={() => setShowImprove(false)} onApply={applyImprovedText} name={selected.name} status={improveStatus} result={improveResult} setResult={setImproveResult} />
              )}
              {showCompare && (
                <CompareModal promptOld={String(selected.lastPromptText || '')} promptNew={improveResult || String(selected.lastPromptText || '')} onClose={() => setShowCompare(false)} name={selected.name} />
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}


