"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TagPills } from "./TagPills";
import { FancySelect } from "../components/FancySelect";
import { AddTagButton } from "./AddTagButton";
import { HeaderBanner } from "../components/HeaderBanner";
import { UserMenu } from "../components/UserMenu";
import { OnboardingTip } from "../components/OnboardingTip";
import { trackClient } from "../components/ClientAnalytics";

type PromptMeta = {
  name: string;
  versions: number[];
  labels: string[];
  tags: string[];
  lastUpdatedAt: string;
  lastConfig?: any; // depends on prompt type
  lastPromptText?: string; // latest prompt content for full-text search
};

type PromptListResponse = {
  data: PromptMeta[];
  meta: { page: number; limit: number; totalItems: number; totalPages: number };
};

export default function PromptsPage() {
  const router = useRouter();
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
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [error, setError] = useState<string>("");
  const [showIdeaModal, setShowIdeaModal] = useState(false);
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaDetails, setIdeaDetails] = useState("");
  const [ideaContact, setIdeaContact] = useState("");
  const [ideaError, setIdeaError] = useState("");
  const [ideaVisibility, setIdeaVisibility] = useState<"personal" | "shared">("personal");
  const [ideaTags, setIdeaTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState<string>("");
  const [improving, setImproving] = useState(false);

  // load list
  async function load() {
    setLoading(true); setError("");
    try {
      const url = `/api/langfuse/list${activeTag ? `?tag=${encodeURIComponent(activeTag)}` : ""}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const json: PromptListResponse = await res.json();
      setPrompts(json.data);

      // collect tags
      const tags = Array.from(new Set(json.data.flatMap(p => p.tags || []))).sort();
      setAllTags(tags);

      // Load comment/reaction summary (best-effort)
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

  // load current user (username)
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

  // Close idea modal on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setShowIdeaModal(false); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // full-text search over name, tags, and lastConfig (stringified)
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
      // Hide prompts with labels we do not want to list on the overview
      const labels = Array.isArray(p.labels) ? p.labels.map((l) => String(l).toLowerCase()) : [];
      if (labels.includes('substantial_change') || labels.includes('requested')) return false;
      const hay = [
        p.name,
        (p.tags || []).join(" "),
        JSON.stringify(p.lastConfig ?? {}),
        String(p.lastPromptText || ""),
      ].join(" ").toLowerCase();
      if (q && !hay.includes(q)) return false;

      // Category-based filters: match tags like "Category > Value"
      if (hasActiveCategoryFilters) {
        const tagPairs = (p.tags || []).map(t => t.split(">").map(s => s.trim())) as [string, string][];
        // Single-select categories
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
        // Multi-select categories: match if prompt has ANY of the selected values
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

  function handleTagClick(tag: string) {
    const [cat, val] = tag.split(">").map(s => s.trim());
    if (cat === "Context" && val) {
      setFilters(prev => ({ ...prev, Context: val }));
      return;
    }
    if (cat === "Jurisdiction" && val) {
      setFilters(prev => ({ ...prev, Jurisdiction: val }));
      return;
    }
    if (cat === "Area_or_PG" && val) {
      setFilters(prev => ({ ...prev, Area_or_PG: Array.from(new Set([...(prev.Area_or_PG || []), val])) }));
      return;
    }
    if (cat === "Tool" && val) {
      setFilters(prev => ({ ...prev, Tool: Array.from(new Set([...(prev.Tool || []), val])) }));
      return;
    }
    if (cat === "SubmittedBy" && val) {
      setFilters(prev => ({ ...prev, SubmittedBy: val }));
      return;
    }
    if (cat === "Language" && val) {
      setFilters(prev => ({ ...prev, Language: val }));
      return;
    }
    setQuery(val || tag);
  }

  function openDetails(name: string) {
    try { trackClient("prompt_click", { name }); } catch {}
    router.push(`/prompts/${encodeURIComponent(name)}`);
  }

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

  async function submitIdea() {
    const details = ideaDetails.trim();
    if (!details) { setIdeaError("Please describe your idea."); return; }
    try {
      // Save as requested prompt in Langfuse
      const nameBase = (ideaTitle.trim() || "new-prompt").replace(/\s+/g, "-").toLowerCase();
      const uniqueName = `${nameBase}-${Date.now()}`;
      const labels = ["requested", ...(ideaVisibility === 'personal' ? ["personal"] : [])];
      const submitter = (currentUsername || '').trim().toLowerCase();
      const submitterTag = submitter ? [`SubmittedBy > ${submitter}`] : [];
      const payload = {
        name: uniqueName,
        newName: uniqueName,
        promptText: details,
        labels,
        appendTags: Array.from(new Set([...(ideaTags || []), ...submitterTag])),
        commitMessage: "Requested via Create Prompt modal",
      };
      const res = await fetch('/api/langfuse/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      setShowIdeaModal(false);
      setIdeaTitle(""); setIdeaDetails(""); setIdeaContact(""); setIdeaError(""); setIdeaTags([]);
      // Navigate to the newly created prompt
      const json = await res.json();
      const finalName = json?.name || uniqueName;
      try { (window as any).location.href = `/prompts/${encodeURIComponent(finalName)}`; } catch {}
    } catch (e: any) {
      setIdeaError(e?.message || "Failed to submit");
    }
  }

  const personalAreas: string[] = Array.isArray(currentProfile?.areas) ? currentProfile.areas : [];
  const areaPrompts = useMemo(() => {
    if (!personalAreas.length) return [] as PromptMeta[];
    return filtered.filter((p) => (p.tags || []).some((t) => {
      const [cat, val] = String(t).split('>').map((s) => s.trim());
      return cat === 'Area_or_PG' && personalAreas.includes(val);
    }));
  }, [filtered, personalAreas]);

  return (
    <div>
      <HeaderBanner title="OC Prompt Manager" />

      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div />
          <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center gap-1 rounded-full bg-[#003145]/5 p-1">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 rounded-full text-sm transition ${viewMode === "table" ? "bg-white text-[#003145] shadow" : "text-[#003145]/70 hover:text-[#003145]"}`}
              title="Table view"
            >
              Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode("bento")}
              className={`px-3 py-1.5 rounded-full text-sm transition ${viewMode === "bento" ? "bg-white text-[#003145] shadow" : "text-[#003145]/70 hover:text-[#003145]"}`}
              title="Bento cards"
            >
              Bento
            </button>
          </div>
          <button
            onClick={load}
            className="px-3 py-2 rounded bg-[#003145] text-white hover:opacity-90"
            disabled={loading}
          >
            {loading ? "Loading..." : "Reload"}
          </button>
            <UserMenu
            areaOptions={optionsByCategory.Area_or_PG}
            languageOptions={optionsByCategory.Language}
            onApplyFilters={(f: any) => setFilters(prev => ({
              ...prev,
              Language: Array.isArray(f.languages) ? (f.languages.length === 1 ? f.languages[0] : "") : (f.language ?? prev.Language),
            }))}
            exposeOpenRef={(open) => { (window as any).openUserMenu = open; }}
            />
          </div>
        </div>

      {/* Onboarding wizard tip */}
      <OnboardingTip openUserMenu={() => (window as any).openUserMenu?.()} />

      <div className="mb-2 text-lg font-semibold text-[#003145]/80">Filter prompts by tag</div>
      <div className="flex gap-3 items-center mb-2 flex-wrap">
        {/* Area/PG first */}
        <FancySelect
          value=""
          placeholder="Area/PG"
          options={optionsByCategory.Area_or_PG.filter(v => !(filters.Area_or_PG || []).includes(v))}
          onChange={(v) => setFilters(prev => ({ ...prev, Area_or_PG: Array.from(new Set([...(prev.Area_or_PG || []), v])) }))}
        />

        {/* Core visible facets */}
        <FancySelect
          value={filters.Context}
          placeholder="Context"
          options={optionsByCategory.Context}
          onChange={(v) => setFilters(prev => ({ ...prev, Context: v }))}
        />

        <FancySelect
          value=""
          placeholder="Tool"
          options={optionsByCategory.Tool.filter(v => !(filters.Tool || []).includes(v))}
          onChange={(v) => setFilters(prev => ({ ...prev, Tool: Array.from(new Set([...(prev.Tool || []), v])) }))}
        />

        <FancySelect
          value={filters.Language}
          placeholder="Language"
          options={optionsByCategory.Language}
          onChange={(v) => setFilters(prev => ({ ...prev, Language: v }))}
        />

        <button
          type="button"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white text-[#003145] border border-[#003145]/20 shadow-sm hover:bg-[#003145]/5"
          onClick={() => setShowMoreFilters(v => !v)}
          title="More filters"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M6 12h12M9 18h6"/></svg>
          More
        </button>
      </div>
      {showMoreFilters && (
        <div className="flex gap-3 items-center mb-4 flex-wrap">
          {/* Show selected multi-facet chips */}
          {(filters.Area_or_PG?.length ? (
            <div className="flex flex-wrap gap-2">
              {filters.Area_or_PG.map(v => (
                <span key={v} className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-blue-100 text-blue-900">
                  {v}
                  <button className="text-xs px-2 py-0.5 border rounded-full bg-white" onClick={() => setFilters(prev => ({ ...prev, Area_or_PG: prev.Area_or_PG.filter(x => x !== v) }))}>×</button>
                </span>
              ))}
            </div>
          ) : null)}
          {(filters.Tool?.length ? (
            <div className="flex flex-wrap gap-2">
              {filters.Tool.map(v => (
                <span key={v} className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-blue-100 text-blue-900">
                  {v}
                  <button className="text-xs px-2 py-0.5 border rounded-full bg-white" onClick={() => setFilters(prev => ({ ...prev, Tool: prev.Tool.filter(x => x !== v) }))}>×</button>
                </span>
              ))}
            </div>
          ) : null)}
          <FancySelect
            value={activeTag}
            placeholder="All tags"
            options={allTags}
            onChange={(v) => setActiveTag(v)}
          />

          <FancySelect
            value={filters.Jurisdiction}
            placeholder="Jurisdiction"
            options={optionsByCategory.Jurisdiction}
            onChange={(v) => setFilters(prev => ({ ...prev, Jurisdiction: v }))}
          />

          <FancySelect
            value={filters.SubmittedBy}
            placeholder="SubmittedBy"
            options={optionsByCategory.SubmittedBy}
            onChange={(v) => setFilters(prev => ({ ...prev, SubmittedBy: v }))}
          />
        </div>
      )}

      <div className="mb-2 text-lg font-semibold text-[#003145]/80">Search prompts</div>
      <div className="mb-4">
        <input
          className="w-full px-3 py-2 rounded border border-[#003145]/30"
          placeholder="Search name, tags, and full prompt content…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {error ? (
        <div className="p-3 border border-red-300 bg-red-50 rounded mb-4">{error}</div>
      ) : null}

      {viewMode === "table" ? (
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
            {mine.length > 0 && (
              <tr>
                <td colSpan={6} className="p-2 bg-gray-50 text-[#003145] font-semibold"><span className="inline-flex items-center gap-2"><span className="text-[#FB5A17]" title="Your prompts">★</span> My prompts</span></td>
              </tr>
            )}
            {mine.map(p => (
              <tr key={`mine-${p.name}`} className="hover:bg-gray-50 cursor-pointer" onClick={() => openDetails(p.name)}>
                <td className="p-2 border-b">{(() => { const parts = p.name.split('/'); return parts.length > 1 ? parts.slice(0, -1).join('/') : parts[0]; })()}</td>
                <td className="p-2 border-b">
                  <span className="inline-flex items-center gap-2">
                    {(() => { const parts = p.name.split('/'); return parts[parts.length - 1]; })()}
                  </span>
                </td>
                <td className="p-2 border-b">
                  <div className="flex items-center gap-2">
                    <TagPills tags={p.tags || []} onTagClick={handleTagClick} />
                    <AddTagButton name={p.name} onAdded={() => { try { (window as any).__refreshTagsMap?.get(p.name)?.(); } catch {} }} className="px-2 py-0.5 rounded border bg-white text-[#003145] border-[#003145]/20 hover:bg-[#003145]/10 text-xs" />
                  </div>
                </td>
                <td className="p-2 border-b">{(p.labels || []).join(", ")}</td>
                <td className="p-2 border-b">{(() => { const m = (window as any).__promptSocialSummary || {}; const s = m[p.name] || { comments: 0, reactions: 0 }; return (<span className="inline-flex items-center gap-2 text-xs"><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#003145]/10 text-[#003145]" title="Reactions">👏 {s.reactions}</span><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#003145]/10 text-[#003145]" title="Comments">💬 {s.comments}</span></span>); })()}</td>
                <td className="p-2 border-b" onClick={(e) => e.stopPropagation()}><button className="px-2 py-1 rounded bg-[#FB5A17] text-white hover:opacity-90" onClick={() => openDetails(p.name)}>Open</button></td>
              </tr>
            ))}

            {recentNew.length > 0 && (
              <tr>
                <td colSpan={6} className="p-2 bg-gray-50 text-[#003145] font-semibold">New Prompts</td>
              </tr>
            )}
            {recentNew.map(p => (
              <tr key={`recent-${p.name}`} className="hover:bg-gray-50 cursor-pointer" onClick={() => openDetails(p.name)}>
                <td className="p-2 border-b">{(() => { const parts = p.name.split('/'); return parts.length > 1 ? parts.slice(0, -1).join('/') : parts[0]; })()}</td>
                <td className="p-2 border-b">{(() => { const parts = p.name.split('/'); return parts[parts.length - 1]; })()}</td>
                <td className="p-2 border-b">
                  <div className="flex items-center gap-2">
                    <TagPills tags={p.tags || []} onTagClick={handleTagClick} />
                    <AddTagButton name={p.name} onAdded={() => { try { (window as any).__refreshTagsMap?.get(p.name)?.(); } catch {} }} className="px-2 py-0.5 rounded border bg-white text-[#003145] border-[#003145]/20 hover:bg-[#003145]/10 text-xs" />
                  </div>
                </td>
                <td className="p-2 border-b">{(p.labels || []).join(", ")}</td>
                <td className="p-2 border-b">{(() => { const m = (window as any).__promptSocialSummary || {}; const s = m[p.name] || { comments: 0, reactions: 0 }; return (<span className="inline-flex items-center gap-2 text-xs"><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#003145]/10 text-[#003145]" title="Reactions">👏 {s.reactions}</span><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#003145]/10 text-[#003145]" title="Comments">💬 {s.comments}</span></span>); })()}</td>
                <td className="p-2 border-b" onClick={(e) => e.stopPropagation()}><button className="px-2 py-1 rounded bg-[#FB5A17] text-white hover:opacity-90" onClick={() => openDetails(p.name)}>Open</button></td>
              </tr>
            ))}

            {othersExcludingRecent.map(p => (
              <tr key={`others-${p.name}`} className="hover:bg-gray-50 cursor-pointer" onClick={() => openDetails(p.name)}>
                <td className="p-2 border-b">{(() => { const parts = p.name.split('/'); return parts.length > 1 ? parts.slice(0, -1).join('/') : parts[0]; })()}</td>
                <td className="p-2 border-b">{(() => { const parts = p.name.split('/'); return parts[parts.length - 1]; })()}</td>
                <td className="p-2 border-b">
                  <div className="flex items-center gap-2">
                    <TagPills tags={p.tags || []} onTagClick={handleTagClick} />
                    <AddTagButton name={p.name} onAdded={() => { try { (window as any).__refreshTagsMap?.get(p.name)?.(); } catch {} }} className="px-2 py-0.5 rounded border bg-white text-[#003145] border-[#003145]/20 hover:bg-[#003145]/10 text-xs" />
                  </div>
                </td>
                <td className="p-2 border-b">{(p.labels || []).join(", ")}</td>
                <td className="p-2 border-b">{(() => { const m = (window as any).__promptSocialSummary || {}; const s = m[p.name] || { comments: 0, reactions: 0 }; return (<span className="inline-flex items-center gap-2 text-xs"><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#003145]/10 text-[#003145]" title="Reactions">👏 {s.reactions}</span><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#003145]/10 text-[#003145]" title="Comments">💬 {s.comments}</span></span>); })()}</td>
                <td className="p-2 border-b" onClick={(e) => e.stopPropagation()}><button className="px-2 py-1 rounded bg-[#FB5A17] text-white hover:opacity-90" onClick={() => openDetails(p.name)}>Open</button></td>
              </tr>
            ))}
            {(!loading && mine.length + othersExcludingRecent.length + recentNew.length === 0) && (
              <tr><td className="p-4 text-gray-500" colSpan={6}>No prompts.</td></tr>
            )}
          </tbody>
        </table>
      ) : (
        <div className="space-y-6">
          {mine.length > 0 && (
            <div>
              <div className="mb-2 text-sm font-semibold text-[#003145]"><span className="inline-flex items-center gap-2"><span className="text-[#FB5A17]" title="Your prompts">★</span> My prompts</span></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {mine.map(p => {
                  const parts = p.name.split('/');
                  const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : parts[0];
                  const restName = parts[parts.length - 1];
                  return (
                    <div key={`mine-${p.name}`} onClick={() => openDetails(p.name)} className="group cursor-pointer rounded-2xl border border-[#003145]/10 bg-white/70 backdrop-blur shadow-sm hover:shadow-xl transition-all duration-300 ease-out hover:-translate-y-0.5 hover:scale-[1.01] overflow-hidden">
                      <div className="h-1.5 w-full bg-gradient-to-r from-[#FB5A17]/60 via-[#FB5A17]/20 to-[#003145]/40" />
                      <div className="p-4 flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#003145]/10 text-[#003145]">{folder}</span>
                          <span className="text-[11px] text-[#003145]/60">{new Date(p.lastUpdatedAt).toLocaleDateString()}</span>
                        </div>
                        <div className="text-lg font-semibold text-[#003145] tracking-tight"><span className="inline-flex items-center gap-2">{restName}</span></div>
                        <div><TagPills tags={p.tags || []} onTagClick={handleTagClick} /></div>
                        <div className="flex items-center justify-between pt-1">
                          <div className="text-xs text-[#003145]/60">Updated {new Date(p.lastUpdatedAt).toLocaleTimeString()}</div>
                          <div className="text-xs inline-flex items-center gap-2">{(() => { const m = (window as any).__promptSocialSummary || {}; const s = m[p.name] || { comments: 0, reactions: 0 }; return (<span className="inline-flex items-center gap-2"><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#003145]/10 text-[#003145]" title="Reactions">👏 {s.reactions}</span><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#003145]/10 text-[#003145]" title="Comments">💬 {s.comments}</span></span>); })()}</div>
                          <button type="button" onClick={(e) => { e.stopPropagation(); openDetails(p.name); }} className="px-3 py-1.5 rounded-full text-sm text-white bg-gradient-to-r from-[#FB5A17] to-[#FF8A50] shadow hover:opacity-95 active:opacity-90 transition">Open</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {recentNew.length > 0 && (
            <div>
              <div className="mb-2 text-sm font-semibold text-[#003145]">New Prompts</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentNew.map(p => {
                  const parts = p.name.split('/');
                  const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : parts[0];
                  const restName = parts[parts.length - 1];
                  return (
                    <div key={`recent-${p.name}`} onClick={() => openDetails(p.name)} className="group cursor-pointer rounded-2xl border border-[#003145]/10 bg-white/70 backdrop-blur shadow-sm hover:shadow-xl transition-all duration-300 ease-out hover:-translate-y-0.5 hover:scale-[1.01] overflow-hidden">
                      <div className="h-1.5 w-full bg-gradient-to-r from-[#FB5A17]/60 via-[#FB5A17]/20 to-[#003145]/40" />
                      <div className="p-4 flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#003145]/10 text-[#003145]">{folder}</span><span className="text-[11px] text-[#003145]/60">{new Date(p.lastUpdatedAt).toLocaleDateString()}</span></div>
                        <div className="text-lg font-semibold text-[#003145] tracking-tight">{restName}</div>
                        <div><TagPills tags={p.tags || []} onTagClick={handleTagClick} /></div>
                        <div className="flex items-center justify-between pt-1">
                          <div className="text-xs text-[#003145]/60">Updated {new Date(p.lastUpdatedAt).toLocaleTimeString()}</div>
                          <div className="text-xs inline-flex items-center gap-2">{(() => { const m = (window as any).__promptSocialSummary || {}; const s = m[p.name] || { comments: 0, reactions: 0 }; return (<span className="inline-flex items-center gap-2"><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#003145]/10 text-[#003145]" title="Reactions">👏 {s.reactions}</span><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#003145]/10 text-[#003145]" title="Comments">💬 {s.comments}</span></span>); })()}</div>
                          <button type="button" onClick={(e) => { e.stopPropagation(); openDetails(p.name); }} className="px-3 py-1.5 rounded-full text-sm text-white bg-gradient-to-r from-[#FB5A17] to-[#FF8A50] shadow hover:opacity-95 active:opacity-90 transition">Open</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <div className="mb-2 text-sm font-semibold text-[#003145]">Your practice areas</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {areaPrompts.map(p => {
                const parts = p.name.split('/');
                const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : parts[0];
                const restName = parts[parts.length - 1];
                return (
                  <div key={`area-${p.name}`} onClick={() => openDetails(p.name)} className="group cursor-pointer rounded-2xl border border-[#003145]/10 bg-white/70 backdrop-blur shadow-sm hover:shadow-xl transition-all duration-300 ease-out hover:-translate-y-0.5 hover:scale-[1.01] overflow-hidden">
                    <div className="h-1.5 w-full bg-gradient-to-r from-[#FB5A17]/60 via-[#FB5A17]/20 to-[#003145]/40" />
                    <div className="p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#003145]/10 text-[#003145]">{folder}</span><span className="text-[11px] text-[#003145]/60">{new Date(p.lastUpdatedAt).toLocaleDateString()}</span></div>
                      <div className="text-lg font-semibold text-[#003145] tracking-tight">{restName}</div>
                      <div><TagPills tags={p.tags || []} onTagClick={handleTagClick} /></div>
                      <div className="flex items-center justify-between pt-1">
                        <div className="text-xs text-[#003145]/60">Updated {new Date(p.lastUpdatedAt).toLocaleTimeString()}</div>
                        <div className="text-xs inline-flex items-center gap-2">{(() => { const m = (window as any).__promptSocialSummary || {}; const s = m[p.name] || { comments: 0, reactions: 0 }; return (<span className="inline-flex items-center gap-2"><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#003145]/10 text-[#003145]" title="Reactions">👏 {s.reactions}</span><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#003145]/10 text-[#003145]" title="Comments">💬 {s.comments}</span></span>); })()}</div>
                        <button type="button" onClick={(e) => { e.stopPropagation(); openDetails(p.name); }} className="px-3 py-1.5 rounded-full text-sm text-white bg-gradient-to-r from-[#FB5A17] to-[#FF8A50] shadow hover:opacity-95 active:opacity-90 transition">Open</button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {(!loading && areaPrompts.length === 0) && (
                <div className="col-span-full p-6 text-center text-gray-500 border rounded-2xl">No prompts in your practice areas.</div>
              )}
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm font-semibold text-[#003145]">Community prompts</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {othersExcludingRecent.map(p => {
                const parts = p.name.split('/');
                const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : parts[0];
                const restName = parts[parts.length - 1];
                return (
                  <div key={`others-${p.name}`} onClick={() => openDetails(p.name)} className="group cursor-pointer rounded-2xl border border-[#003145]/10 bg-white/70 backdrop-blur shadow-sm hover:shadow-xl transition-all duration-300 ease-out hover:-translate-y-0.5 hover:scale-[1.01] overflow-hidden">
                    <div className="h-1.5 w-full bg-gradient-to-r from-[#FB5A17]/60 via-[#FB5A17]/20 to-[#003145]/40" />
                    <div className="p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#003145]/10 text-[#003145]">{folder}</span><span className="text-[11px] text-[#003145]/60">{new Date(p.lastUpdatedAt).toLocaleDateString()}</span></div>
                      <div className="text-lg font-semibold text-[#003145] tracking-tight">{restName}</div>
                      <div><TagPills tags={p.tags || []} onTagClick={handleTagClick} /></div>
                      <div className="flex items-center justify-between pt-1">
                        <div className="text-xs text-[#003145]/60">Updated {new Date(p.lastUpdatedAt).toLocaleTimeString()}</div>
                        <div className="text-xs inline-flex items-center gap-2">{(() => { const m = (window as any).__promptSocialSummary || {}; const s = m[p.name] || { comments: 0, reactions: 0 }; return (<span className="inline-flex items-center gap-2"><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#003145]/10 text-[#003145]" title="Reactions">👏 {s.reactions}</span><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#003145]/10 text-[#003145]" title="Comments">💬 {s.comments}</span></span>); })()}</div>
                        <button type="button" onClick={(e) => { e.stopPropagation(); openDetails(p.name); }} className="px-3 py-1.5 rounded-full text-sm text-white bg-gradient-to-r from-[#FB5A17] to-[#FF8A50] shadow hover:opacity-95 active:opacity-90 transition">Open</button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {(!loading && othersExcludingRecent.length === 0) && (
                <div className="col-span-full p-6 text-center text-gray-500 border rounded-2xl">No prompts.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Details moved to /prompts/[name] */}
      
      {/* Floating create prompt card */}
      <div className="fixed bottom-10 right-6 z-[9999]">
        <button
          type="button"
          onClick={() => setShowIdeaModal(true)}
          className="group flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg border border-[#003145]/10 bg-white/90 hover:bg-[#003145] hover:shadow-xl backdrop-blur transition"
          title="Create a prompt"
        >
          <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#FB5A17] to-[#FF8A50] text-white flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v18M3 12h18"/></svg>
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold text-[#003145] group-hover:text-white">Create Prompt.</div>
            <div className="text-xs text-[#003145]/70 group-hover:text-white">Start a new prompt</div>
          </div>
        </button>
      </div>

      {showIdeaModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[15vh] p-6" onClick={() => setShowIdeaModal(false)}>
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-xl border p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Create Prompt</h3>
              <button className="px-2 py-1 border rounded" onClick={() => setShowIdeaModal(false)}>×</button>
            </div>
            <div className="space-y-3 max-h-[85vh] overflow-auto">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Idea title (optional)</label>
                <input value={ideaTitle} onChange={(e) => setIdeaTitle(e.target.value)} className="w-full px-3 py-2 rounded border border-[#003145]/30" placeholder="e.g. Contract clause analyzer" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Prompt visibility</label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2"><input type="radio" name="ideaVisibility" checked={ideaVisibility === 'personal'} onChange={() => setIdeaVisibility('personal')} /> Personal</label>
                  <label className="inline-flex items-center gap-2"><input type="radio" name="ideaVisibility" checked={ideaVisibility === 'shared'} onChange={() => setIdeaVisibility('shared')} /> Shared</label>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Describe your prompt idea</label>
                <textarea value={ideaDetails} onChange={(e) => { setIdeaDetails(e.target.value); if (ideaError) setIdeaError(""); }} className="w-full h-72 p-3 rounded border border-[#003145]/30" placeholder="What should it do? Any inputs/outputs, context, examples, tools?" />
                <div className="flex items-center justify-end mt-2">
                  <button className="px-3 py-2 border rounded" onClick={async () => {
                    const text = ideaDetails.trim();
                    if (!text) { setIdeaError("Please enter the prompt first."); return; }
                    setImproving(true);
                    try {
                      const res = await fetch('/api/agents/improve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: text }) });
                      const j = await res.json();
                      const out = (j?.output || '').toString();
                      if (out) setIdeaDetails(out);
                    } catch {}
                    finally { setImproving(false); }
                  }} disabled={improving}>{improving ? 'Improving…' : '🤖 Improve Prompt'}</button>
                </div>
                {ideaError ? <div className="mt-1 text-sm text-red-600">{ideaError}</div> : null}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm text-gray-600">Tags</label>
                  <div className="text-xs">
                    <button className="px-2 py-1 border rounded" onClick={() => {
                      const set = new Set<string>();
                      const uname = (currentUsername || '').trim();
                      if (uname) set.add(`SubmittedBy > ${uname.toLowerCase()}`);
                      const areas: string[] = Array.isArray(currentProfile?.areas) ? currentProfile.areas : [];
                      for (const a of areas) { if (a) set.add(`Area_or_PG > ${a}`); }
                      const langs: string[] = Array.isArray(currentProfile?.languages) ? currentProfile.languages : [];
                      for (const l of langs) { if (l) set.add(`Language > ${l}`); }
                      setIdeaTags(Array.from(set));
                    }}>Suggest tags</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {ideaTags.map((t) => (
                    <span key={t} className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-blue-100 text-blue-900">
                      {t}
                      <button className="text-xs px-2 py-0.5 border rounded-full bg-white" onClick={() => setIdeaTags(prev => prev.filter(x => x !== t))}>×</button>
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <FancySelect
                    value=""
                    placeholder="Language"
                    options={Array.from(new Set([...(currentProfile.languages || []), ...optionsByCategory.Language]))}
                    onChange={(v) => setIdeaTags(prev => Array.from(new Set([...(prev||[]), `Language > ${v}`])))}
                  />
                  <FancySelect
                    value=""
                    placeholder="Area/PG"
                    options={Array.from(new Set([...(currentProfile.areas || []), ...optionsByCategory.Area_or_PG]))}
                    onChange={(v) => setIdeaTags(prev => Array.from(new Set([...(prev||[]), `Area_or_PG > ${v}`])))}
                  />
                  <FancySelect
                    value=""
                    placeholder="Context"
                    options={optionsByCategory.Context}
                    onChange={(v) => setIdeaTags(prev => Array.from(new Set([...(prev||[]), `Context > ${v}`])))}
                  />
                  <FancySelect
                    value=""
                    placeholder="Jurisdiction"
                    options={optionsByCategory.Jurisdiction}
                    onChange={(v) => setIdeaTags(prev => Array.from(new Set([...(prev||[]), `Jurisdiction > ${v}`])))}
                  />
                  <FancySelect
                    value=""
                    placeholder="Tool"
                    options={optionsByCategory.Tool}
                    onChange={(v) => setIdeaTags(prev => Array.from(new Set([...(prev||[]), `Tool > ${v}`])))}
                  />
                  <FancySelect
                    value=""
                    placeholder="SubmittedBy"
                    options={Array.from(new Set([currentUsername.toLowerCase(), ...optionsByCategory.SubmittedBy])).filter(Boolean)}
                    onChange={(v) => setIdeaTags(prev => Array.from(new Set([...(prev||[]), `SubmittedBy > ${v}`])))}
                  />
                </div>
                <div className="text-xs text-[#003145]/60 mt-1">Need to select languages? <a href="#" className="underline" onClick={(e) => { e.preventDefault(); (window as any).openUserMenu?.(); }}>Open User Menu</a></div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Your contact (optional)</label>
                <input value={ideaContact} onChange={(e) => setIdeaContact(e.target.value)} className="w-full px-3 py-2 rounded border border-[#003145]/30" placeholder="Name or email" />
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button className="px-3 py-2 rounded border" onClick={() => setShowIdeaModal(false)}>Cancel</button>
                <button className="px-3 py-2 rounded bg-[#003145] text-white" onClick={submitIdea}>Send email</button>
              </div>
              <div className="text-xs text-[#003145]/60">We’ll open your email client addressed to ai@osborneclarke.com with your idea.</div>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}


