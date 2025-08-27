"use client";

import { useEffect, useMemo, useState, useRef, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { TagPills } from "./TagPills";
import { FancySelect } from "../components/FancySelect";
import { AddTagButton } from "./AddTagButton";
import { HeaderBanner } from "../components/HeaderBanner";
import { UserMenu } from "../components/UserMenu";
import { OnboardingTip } from "../components/OnboardingTip";
import { trackClient } from "../components/ClientAnalytics";
import { gsap } from "gsap";
import { 
  useStaggerAnimation, 
  useIntersectionAnimation, 
  useMagneticHover,
  useTextScramble,
  useParallaxScroll 
} from "../../hooks/useAnimations";
import { AnimationConfig } from "../../utils/animationConfig";
import { AnimatedPromptCard } from "../../components/AnimatedPromptCard";
import { AnimatedSection } from "../../components/AnimatedSection";
import { AnimatedSearchBar, AnimatedViewToggle } from "../../components/AnimatedFilters";

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
  const pageRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
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

  // Add hover animations for filter dropdowns
  useEffect(() => {
    const dropdowns = document.querySelectorAll('.filter-dropdown, .filter-dropdown-extra');
    
    dropdowns.forEach((dropdown) => {
      const handleMouseEnter = () => {
        gsap.to(dropdown, {
          y: -2,
          scale: 1.02,
          duration: 0.2,
          ease: 'power2.out',
        });
      };

      const handleMouseLeave = () => {
        gsap.to(dropdown, {
          y: 0,
          scale: 1,
          duration: 0.2,
          ease: 'power2.out',
        });
      };

      dropdown.addEventListener('mouseenter', handleMouseEnter);
      dropdown.addEventListener('mouseleave', handleMouseLeave);

      return () => {
        dropdown.removeEventListener('mouseenter', handleMouseEnter);
        dropdown.removeEventListener('mouseleave', handleMouseLeave);
      };
    });
  }, [showMoreFilters]);

  // Animate more filters section when it appears
  useEffect(() => {
    if (showMoreFilters) {
      // Animate the container
      gsap.fromTo(
        '.more-filters-section',
        { opacity: 0, height: 0, marginBottom: 0 },
        { 
          opacity: 1, 
          height: 'auto', 
          marginBottom: 16,
          duration: 0.4, 
          ease: 'power2.out' 
        }
      );

      // Animate extra dropdowns
      gsap.fromTo(
        '.filter-dropdown-extra',
        { opacity: 0, y: -10, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.3,
          stagger: 0.05,
          delay: 0.1,
          ease: 'back.out(1.7)'
        }
      );

      // Animate filter chips
      gsap.fromTo(
        '.filter-chip',
        { opacity: 0, scale: 0, rotate: -180 },
        {
          opacity: 1,
          scale: 1,
          rotate: 0,
          duration: 0.4,
          stagger: 0.03,
          ease: 'back.out(1.7)'
        }
      );
    }
  }, [showMoreFilters, filters.Area_or_PG, filters.Tool]);

  // Page entrance animations
  useLayoutEffect(() => {
    if (!pageRef.current) return;

    const ctx = gsap.context(() => {
      // Animate header
      gsap.fromTo(
        '.header-banner',
        { opacity: 0, y: -30 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }
      );

      // Animate filter section title
      gsap.fromTo(
        '.filter-title',
        { opacity: 0, x: -30 },
        { 
          opacity: 1, 
          x: 0, 
          duration: 0.6, 
          delay: 0.2,
          ease: 'power3.out' 
        }
      );

      // Animate filter section content
      gsap.fromTo(
        '.filter-content',
        { opacity: 0, scale: 0.9 },
        { 
          opacity: 1, 
          scale: 1, 
          duration: 0.6, 
          delay: 0.3,
          ease: 'back.out(1.7)' 
        }
      );

      // Animate search section title
      gsap.fromTo(
        '.search-title',
        { opacity: 0, x: -30 },
        { 
          opacity: 1, 
          x: 0, 
          duration: 0.6, 
          delay: 0.4,
          ease: 'power3.out' 
        }
      );

      // Animate search bar
      gsap.fromTo(
        '.search-bar',
        { opacity: 0, scale: 0.9 },
        { 
          opacity: 1, 
          scale: 1, 
          duration: 0.6, 
          delay: 0.5,
          ease: 'back.out(1.7)' 
        }
      );

      // Animate filter dropdowns with stagger
      gsap.fromTo(
        '.filter-dropdown',
        { opacity: 0, y: 20, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.5,
          delay: 0.35,
          stagger: 0.05,
          ease: 'power2.out'
        }
      );

      // Animate more filters button
      gsap.fromTo(
        '.more-filters-btn',
        { opacity: 0, rotate: -180 },
        {
          opacity: 1,
          rotate: 0,
          duration: 0.6,
          delay: 0.6,
          ease: 'back.out(1.7)'
        }
      );
    }, pageRef);

    return () => ctx.revert();
  }, []);

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
    if (!details) { setIdeaError("Please enter your prompt."); return; }
    try {
      // Save as personal prompt in Langfuse with only 'personal' label
      const nameBase = (ideaTitle.trim() || "new-prompt").replace(/\s+/g, "-").toLowerCase();
      const uniqueName = `${nameBase}-${Date.now()}`;
      const labels = ["personal"]; // Only 'personal' label, no other labels
      const submitter = (currentUsername || '').trim().toLowerCase();
      const submitterTag = submitter ? [`SubmittedBy > ${submitter}`] : [];
      const payload = {
        name: uniqueName,
        newName: uniqueName,
        promptText: details,
        labels,
        appendTags: Array.from(new Set([...(ideaTags || []), ...submitterTag])),
        commitMessage: "Created via Create Prompt button",
      };
      const res = await fetch('/api/langfuse/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      setShowIdeaModal(false);
      setIdeaTitle(""); setIdeaDetails(""); setIdeaContact(""); setIdeaError(""); setIdeaTags([]);
      setIdeaVisibility("personal"); // Reset to default
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
    <div ref={pageRef} className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div 
        className="fixed inset-0 opacity-50" 
        style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      />
      <div className="relative">
        <div className="header-banner">
          <HeaderBanner title="OC Prompt Manager" />
        </div>
        
        <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div />
          <div className="flex items-center gap-2">
          {/* View toggle */}
          <AnimatedViewToggle 
            viewMode={viewMode}
            onChange={setViewMode}
          />
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

      <div className="filter-section">
        <div className="filter-title mb-2 text-lg font-semibold text-[#003145]/80">Filter prompts by tag</div>
        <div className="filter-content flex gap-3 items-center mb-2 flex-wrap">
        {/* Area/PG first */}
        <div className="filter-dropdown">
          <FancySelect
            value=""
            placeholder="Area/PG"
            options={optionsByCategory.Area_or_PG.filter(v => !(filters.Area_or_PG || []).includes(v))}
            onChange={(v) => setFilters(prev => ({ ...prev, Area_or_PG: Array.from(new Set([...(prev.Area_or_PG || []), v])) }))}
          />
        </div>

        {/* Core visible facets */}
        <div className="filter-dropdown">
          <FancySelect
            value={filters.Context}
            placeholder="Context"
            options={optionsByCategory.Context}
            onChange={(v) => setFilters(prev => ({ ...prev, Context: v }))}
          />
        </div>

        <div className="filter-dropdown">
          <FancySelect
            value=""
            placeholder="Tool"
            options={optionsByCategory.Tool.filter(v => !(filters.Tool || []).includes(v))}
            onChange={(v) => setFilters(prev => ({ ...prev, Tool: Array.from(new Set([...(prev.Tool || []), v])) }))}
          />
        </div>

        <div className="filter-dropdown">
          <FancySelect
            value={filters.Language}
            placeholder="Language"
            options={optionsByCategory.Language}
            onChange={(v) => setFilters(prev => ({ ...prev, Language: v }))}
          />
        </div>

        <button
          type="button"
          className="more-filters-btn inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white text-[#003145] border border-[#003145]/20 shadow-sm hover:bg-[#003145]/5"
          onClick={() => setShowMoreFilters(v => !v)}
          title="More filters"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M6 12h12M9 18h6"/></svg>
          More
        </button>
      </div>
      {showMoreFilters && (
        <div className="more-filters-section flex gap-3 items-center mb-4 flex-wrap">
          {/* Show selected multi-facet chips */}
          {(filters.Area_or_PG?.length ? (
            <div className="flex flex-wrap gap-2">
              {filters.Area_or_PG.map((v, i) => (
                <span key={v} className="filter-chip inline-flex items-center gap-2 px-2 py-1 rounded-full bg-blue-100 text-blue-900" style={{ animationDelay: `${i * 50}ms` }}>
                  {v}
                  <button className="text-xs px-2 py-0.5 border rounded-full bg-white hover:bg-red-50 transition-colors" onClick={() => setFilters(prev => ({ ...prev, Area_or_PG: prev.Area_or_PG.filter(x => x !== v) }))}>×</button>
                </span>
              ))}
            </div>
          ) : null)}
          {(filters.Tool?.length ? (
            <div className="flex flex-wrap gap-2">
              {filters.Tool.map((v, i) => (
                <span key={v} className="filter-chip inline-flex items-center gap-2 px-2 py-1 rounded-full bg-blue-100 text-blue-900" style={{ animationDelay: `${i * 50}ms` }}>
                  {v}
                  <button className="text-xs px-2 py-0.5 border rounded-full bg-white hover:bg-red-50 transition-colors" onClick={() => setFilters(prev => ({ ...prev, Tool: prev.Tool.filter(x => x !== v) }))}>×</button>
                </span>
              ))}
            </div>
          ) : null)}
          <div className="filter-dropdown-extra">
            <FancySelect
              value={activeTag}
              placeholder="All tags"
              options={allTags}
              onChange={(v) => setActiveTag(v)}
            />
          </div>

          <div className="filter-dropdown-extra">
            <FancySelect
              value={filters.Jurisdiction}
              placeholder="Jurisdiction"
              options={optionsByCategory.Jurisdiction}
              onChange={(v) => setFilters(prev => ({ ...prev, Jurisdiction: v }))}
            />
          </div>

          <div className="filter-dropdown-extra">
            <FancySelect
              value={filters.SubmittedBy}
              placeholder="SubmittedBy"
              options={optionsByCategory.SubmittedBy}
              onChange={(v) => setFilters(prev => ({ ...prev, SubmittedBy: v }))}
            />
          </div>
        </div>
      )}
      </div>

      <div className="search-section">
        <div className="search-title mb-2 text-lg font-semibold text-[#003145]/80">Search prompts</div>
        <div className="search-bar">
          <AnimatedSearchBar 
            value={query}
            onChange={setQuery}
            placeholder="Search name, tags, and full prompt content…"
          />
        </div>
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
                <td colSpan={6} className="p-2 bg-gray-50 text-[#003145] font-semibold">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2"><span className="text-[#FB5A17]" title="Your prompts">★</span> My prompts</span>
                    <button
                      type="button"
                      onClick={() => setShowIdeaModal(true)}
                      className="px-3 py-1.5 rounded bg-[#FB5A17] text-white hover:opacity-90 text-sm"
                    >
                      + Create Prompt
                    </button>
                  </div>
                </td>
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


            {/* Practice Group Prompts section - always shown */}
            <tr>
              <td colSpan={6} className="p-2 bg-gray-50 text-[#003145] font-semibold">Practice Group Prompts</td>
            </tr>
            {areaPrompts.length > 0 ? areaPrompts.map(p => (
              <tr key={`area-${p.name}`} className="hover:bg-gray-50 cursor-pointer" onClick={() => openDetails(p.name)}>
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
            )) : (
              <tr><td className="p-4 text-gray-500" colSpan={6}>No practice group prompts.</td></tr>
            )}

            {/* Community Prompts section - always shown */}
            <tr>
              <td colSpan={6} className="p-2 bg-gray-50 text-[#003145] font-semibold">Community Prompts</td>
            </tr>
            
            {/* New Prompts as a subgroup */}
            {recentNew.length > 0 && (
              <>
                <tr>
                  <td colSpan={6} className="p-2 bg-gray-100 text-[#003145] font-medium pl-8">↳ New Prompts</td>
                </tr>
                {recentNew.map(p => (
                  <tr key={`recent-${p.name}`} className="hover:bg-gray-50 cursor-pointer" onClick={() => openDetails(p.name)}>
                    <td className="p-2 border-b pl-8">{(() => { const parts = p.name.split('/'); return parts.length > 1 ? parts.slice(0, -1).join('/') : parts[0]; })()}</td>
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
              </>
            )}
            {othersExcludingRecent.length > 0 ? othersExcludingRecent.map(p => (
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
            )) : (
              <tr><td className="p-4 text-gray-500" colSpan={6}>No community prompts.</td></tr>
            )}
          </tbody>
        </table>
      ) : (
        <div className="space-y-8">
          {mine.length > 0 && (
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[#FB5A17]/5 via-transparent to-[#003145]/5 rounded-3xl -m-4" />
              <div className="relative">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold bg-gradient-to-r from-[#FB5A17] to-[#003145] bg-clip-text text-transparent">My Prompts</span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-[#FB5A17]/20 to-[#FB5A17]/10 text-[#FB5A17] border border-[#FB5A17]/20">
                      {mine.length} {mine.length === 1 ? 'prompt' : 'prompts'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowIdeaModal(true)}
                    className="group relative px-4 py-2 rounded-xl bg-gradient-to-r from-[#FB5A17] to-[#FF8A50] text-white font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <span className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="relative flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Create Prompt
                    </span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {mine.map((p, idx) => {
                    const parts = p.name.split('/');
                    const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : parts[0];
                    const restName = parts[parts.length - 1];
                    const gradients = [
                      'from-blue-500/20 via-purple-500/10 to-pink-500/20',
                      'from-green-500/20 via-teal-500/10 to-cyan-500/20',
                      'from-yellow-500/20 via-orange-500/10 to-red-500/20',
                      'from-indigo-500/20 via-purple-500/10 to-pink-500/20',
                      'from-rose-500/20 via-pink-500/10 to-purple-500/20',
                    ];
                    const patterns = [
                      'radial-gradient(circle at 20% 80%, rgba(251, 90, 23, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(0, 49, 69, 0.1) 0%, transparent 50%)',
                      'radial-gradient(circle at 10% 20%, rgba(59, 130, 246, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 30%)',
                      'radial-gradient(circle at 70% 40%, rgba(34, 197, 94, 0.1) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(14, 165, 233, 0.1) 0%, transparent 50%)',
                      'radial-gradient(circle at 30% 30%, rgba(251, 191, 36, 0.1) 0%, transparent 40%), radial-gradient(circle at 70% 70%, rgba(251, 146, 60, 0.1) 0%, transparent 40%)',
                      'radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.1) 0%, transparent 50%), radial-gradient(circle at 50% 100%, rgba(236, 72, 153, 0.1) 0%, transparent 50%)',
                    ];
                    return (
                      <div key={`mine-${p.name}`} onClick={() => openDetails(p.name)} className="group relative cursor-pointer">
                        <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-xl"
                          style={{ backgroundImage: `linear-gradient(135deg, rgba(251, 90, 23, 0.3), rgba(0, 49, 69, 0.3))` }}
                        />
                        <div className="relative rounded-2xl border border-[#003145]/10 bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-2xl transform hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 overflow-hidden">
                          <div className="absolute inset-0 opacity-30" style={{ background: patterns[idx % patterns.length] }} />
                          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#FB5A17]/10 to-transparent rounded-full -mr-16 -mt-16" />
                          <div className="relative">
                            <div className={`h-2 w-full bg-gradient-to-r ${gradients[idx % gradients.length]}`} />
                            <div className="p-5">
                              <div className="flex items-center justify-between gap-3 mb-3">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-[#003145]/10 to-[#003145]/5 text-[#003145] border border-[#003145]/10">
                                  <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                  </svg>
                                  {folder}
                                </span>
                                <span className="text-[11px] text-[#003145]/50 font-medium">{new Date(p.lastUpdatedAt).toLocaleDateString()}</span>
                              </div>
                              <div className="mb-3">
                                <h3 className="text-xl font-bold text-[#003145] tracking-tight mb-1 line-clamp-2">{restName}</h3>
                                <div className="flex items-center gap-2 text-xs text-[#003145]/60">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Updated {new Date(p.lastUpdatedAt).toLocaleTimeString()}
                                </div>
                              </div>
                              <div className="mb-4"><TagPills tags={p.tags || []} onTagClick={handleTagClick} /></div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {(() => { 
                                    const m = (window as any).__promptSocialSummary || {}; 
                                    const s = m[p.name] || { comments: 0, reactions: 0 }; 
                                    return (
                                      <>
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-blue-500/10 to-blue-600/10 text-blue-700 text-xs font-medium" title="Reactions">
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                          </svg>
                                          {s.reactions}
                                        </span>
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-green-500/10 to-green-600/10 text-green-700 text-xs font-medium" title="Comments">
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                          </svg>
                                          {s.comments}
                                        </span>
                                      </>
                                    ); 
                                  })()}
                                </div>
                                <button type="button" onClick={(e) => { e.stopPropagation(); openDetails(p.name); }} 
                                  className="group/btn relative px-4 py-1.5 rounded-full text-sm font-medium text-white bg-gradient-to-r from-[#FB5A17] to-[#FF8A50] shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200">
                                  <span className="absolute inset-0 bg-white/20 rounded-full opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                                  <span className="relative">Open</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}


          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 rounded-3xl -m-4" />
            <div className="relative">
              <div className="mb-4 flex items-center gap-3">
                <span className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">Practice Group Prompts</span>
                {areaPrompts.length > 0 && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-700 border border-cyan-500/20">
                    {areaPrompts.length} {areaPrompts.length === 1 ? 'prompt' : 'prompts'}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {areaPrompts.map((p, idx) => {
                  const parts = p.name.split('/');
                  const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : parts[0];
                  const restName = parts[parts.length - 1];
                  const gradients = [
                    'from-cyan-500/20 via-blue-500/10 to-indigo-500/20',
                    'from-teal-500/20 via-emerald-500/10 to-green-500/20',
                    'from-blue-500/20 via-indigo-500/10 to-purple-500/20',
                    'from-sky-500/20 via-cyan-500/10 to-teal-500/20',
                  ];
                  const patterns = [
                    'radial-gradient(circle at 25% 25%, rgba(6, 182, 212, 0.15) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(59, 130, 246, 0.15) 0%, transparent 50%)',
                    'radial-gradient(circle at 60% 30%, rgba(20, 184, 166, 0.15) 0%, transparent 45%), radial-gradient(circle at 30% 70%, rgba(16, 185, 129, 0.15) 0%, transparent 45%)',
                    'radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.15) 0%, transparent 40%), radial-gradient(circle at 80% 50%, rgba(99, 102, 241, 0.15) 0%, transparent 40%)',
                    'radial-gradient(circle at 40% 20%, rgba(14, 165, 233, 0.15) 0%, transparent 50%), radial-gradient(circle at 60% 80%, rgba(6, 182, 212, 0.15) 0%, transparent 50%)',
                  ];
                  return (
                    <div key={`area-${p.name}`} onClick={() => openDetails(p.name)} className="group relative cursor-pointer">
                      <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-xl"
                        style={{ backgroundImage: `linear-gradient(135deg, rgba(6, 182, 212, 0.3), rgba(59, 130, 246, 0.3))` }}
                      />
                      <div className="relative rounded-2xl border border-cyan-600/10 bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-2xl transform hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 overflow-hidden">
                        <div className="absolute inset-0 opacity-25" style={{ background: patterns[idx % patterns.length] }} />
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full -mr-16 -mt-16" />
                        <div className="relative">
                          <div className={`h-2 w-full bg-gradient-to-r ${gradients[idx % gradients.length]}`} />
                          <div className="p-5">
                            <div className="flex items-center justify-between gap-3 mb-3">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-cyan-600/10 to-blue-600/5 text-cyan-700 border border-cyan-600/10">
                                <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                {folder}
                              </span>
                              <span className="text-[11px] text-cyan-700/50 font-medium">{new Date(p.lastUpdatedAt).toLocaleDateString()}</span>
                            </div>
                            <div className="mb-3">
                              <h3 className="text-xl font-bold text-[#003145] tracking-tight mb-1 line-clamp-2">{restName}</h3>
                              <div className="flex items-center gap-2 text-xs text-[#003145]/60">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Updated {new Date(p.lastUpdatedAt).toLocaleTimeString()}
                              </div>
                            </div>
                            <div className="mb-4"><TagPills tags={p.tags || []} onTagClick={handleTagClick} /></div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {(() => { 
                                  const m = (window as any).__promptSocialSummary || {}; 
                                  const s = m[p.name] || { comments: 0, reactions: 0 }; 
                                  return (
                                    <>
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-blue-500/10 to-blue-600/10 text-blue-700 text-xs font-medium" title="Reactions">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                        </svg>
                                        {s.reactions}
                                      </span>
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-green-500/10 to-green-600/10 text-green-700 text-xs font-medium" title="Comments">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                        </svg>
                                        {s.comments}
                                      </span>
                                    </>
                                  ); 
                                })()}
                              </div>
                              <button type="button" onClick={(e) => { e.stopPropagation(); openDetails(p.name); }} 
                                className="group/btn relative px-4 py-1.5 rounded-full text-sm font-medium text-white bg-gradient-to-r from-cyan-600 to-blue-600 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200">
                                <span className="absolute inset-0 bg-white/20 rounded-full opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                                <span className="relative">Open</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {(!loading && areaPrompts.length === 0) && (
                  <div className="col-span-full p-8 text-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-dashed border-gray-300">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500 font-medium">No practice group prompts available</p>
                    <p className="text-gray-400 text-sm mt-1">Prompts from your practice groups will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 rounded-3xl -m-4" />
            <div className="relative">
              <div className="mb-4 flex items-center gap-3">
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Community Prompts</span>
                {others.length > 0 && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500/20 to-pink-500/10 text-purple-700 border border-purple-500/20">
                    {others.length} {others.length === 1 ? 'prompt' : 'prompts'}
                  </span>
                )}
              </div>
            
              {/* New Prompts as a subgroup */}
              {recentNew.length > 0 && (
                <div className="mb-8">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="text-lg font-bold text-[#003145]">✨ New Prompts</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-yellow-400/20 to-yellow-500/10 text-yellow-700 border border-yellow-400/30">
                      Last 30 days
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {recentNew.map((p, idx) => {
                      const parts = p.name.split('/');
                      const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : parts[0];
                      const restName = parts[parts.length - 1];
                      const gradients = [
                        'from-yellow-400/20 via-amber-400/10 to-orange-400/20',
                        'from-lime-400/20 via-green-400/10 to-emerald-400/20',
                        'from-orange-400/20 via-red-400/10 to-pink-400/20',
                      ];
                      return (
                        <div key={`recent-${p.name}`} onClick={() => openDetails(p.name)} className="group relative cursor-pointer">
                          <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl opacity-0 group-hover:opacity-20 blur transition duration-500" />
                          <div className="absolute top-0 right-0 -mt-1 -mr-1">
                            <span className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                            </span>
                          </div>
                          <div className="relative rounded-2xl border border-yellow-500/20 bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-2xl transform hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 overflow-hidden">
                            <div className="absolute inset-0 opacity-10" style={{ background: 'radial-gradient(circle at 50% 0%, rgba(251, 191, 36, 0.3) 0%, transparent 70%)' }} />
                            <div className={`h-2 w-full bg-gradient-to-r ${gradients[idx % gradients.length]}`} />
                            <div className="p-5">
                              <div className="flex items-center justify-between gap-3 mb-3">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-yellow-100 to-amber-50 text-amber-700 border border-yellow-200">
                                  <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                  </svg>
                                  {folder}
                                </span>
                                <span className="text-[11px] text-yellow-700/70 font-medium">NEW</span>
                              </div>
                              <div className="mb-3">
                                <h3 className="text-xl font-bold text-[#003145] tracking-tight mb-1 line-clamp-2">{restName}</h3>
                                <div className="flex items-center gap-2 text-xs text-[#003145]/60">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {new Date(p.lastUpdatedAt).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="mb-4"><TagPills tags={p.tags || []} onTagClick={handleTagClick} /></div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {(() => { 
                                    const m = (window as any).__promptSocialSummary || {}; 
                                    const s = m[p.name] || { comments: 0, reactions: 0 }; 
                                    return (
                                      <>
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-blue-500/10 to-blue-600/10 text-blue-700 text-xs font-medium" title="Reactions">
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                          </svg>
                                          {s.reactions}
                                        </span>
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-green-500/10 to-green-600/10 text-green-700 text-xs font-medium" title="Comments">
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                          </svg>
                                          {s.comments}
                                        </span>
                                      </>
                                    ); 
                                  })()}
                                </div>
                                <button type="button" onClick={(e) => { e.stopPropagation(); openDetails(p.name); }} 
                                  className="group/btn relative px-4 py-1.5 rounded-full text-sm font-medium text-white bg-gradient-to-r from-yellow-500 to-orange-500 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200">
                                  <span className="absolute inset-0 bg-white/20 rounded-full opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                                  <span className="relative">Open</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {othersExcludingRecent.map((p, idx) => {
                  const parts = p.name.split('/');
                  const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : parts[0];
                  const restName = parts[parts.length - 1];
                  const gradients = [
                    'from-purple-500/20 via-pink-500/10 to-rose-500/20',
                    'from-indigo-500/20 via-purple-500/10 to-pink-500/20',
                    'from-pink-500/20 via-rose-500/10 to-red-500/20',
                    'from-violet-500/20 via-purple-500/10 to-fuchsia-500/20',
                  ];
                  const patterns = [
                    'radial-gradient(circle at 35% 35%, rgba(168, 85, 247, 0.15) 0%, transparent 50%), radial-gradient(circle at 65% 65%, rgba(236, 72, 153, 0.15) 0%, transparent 50%)',
                    'radial-gradient(circle at 20% 60%, rgba(99, 102, 241, 0.15) 0%, transparent 45%), radial-gradient(circle at 80% 40%, rgba(168, 85, 247, 0.15) 0%, transparent 45%)',
                    'radial-gradient(circle at 50% 20%, rgba(236, 72, 153, 0.15) 0%, transparent 40%), radial-gradient(circle at 50% 80%, rgba(244, 114, 182, 0.15) 0%, transparent 40%)',
                    'radial-gradient(circle at 25% 75%, rgba(139, 92, 246, 0.15) 0%, transparent 50%), radial-gradient(circle at 75% 25%, rgba(217, 70, 239, 0.15) 0%, transparent 50%)',
                  ];
                  return (
                    <div key={`others-${p.name}`} onClick={() => openDetails(p.name)} className="group relative cursor-pointer">
                      <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-xl"
                        style={{ backgroundImage: `linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.2))` }}
                      />
                      <div className="relative rounded-2xl border border-purple-500/10 bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-2xl transform hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 overflow-hidden">
                        <div className="absolute inset-0 opacity-20" style={{ background: patterns[idx % patterns.length] }} />
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full -mr-16 -mt-16" />
                        <div className="relative">
                          <div className={`h-2 w-full bg-gradient-to-r ${gradients[idx % gradients.length]}`} />
                          <div className="p-5">
                            <div className="flex items-center justify-between gap-3 mb-3">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-600/10 to-pink-600/5 text-purple-700 border border-purple-600/10">
                                <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                {folder}
                              </span>
                              <span className="text-[11px] text-purple-700/50 font-medium">{new Date(p.lastUpdatedAt).toLocaleDateString()}</span>
                            </div>
                            <div className="mb-3">
                              <h3 className="text-xl font-bold text-[#003145] tracking-tight mb-1 line-clamp-2">{restName}</h3>
                              <div className="flex items-center gap-2 text-xs text-[#003145]/60">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Updated {new Date(p.lastUpdatedAt).toLocaleTimeString()}
                              </div>
                            </div>
                            <div className="mb-4"><TagPills tags={p.tags || []} onTagClick={handleTagClick} /></div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {(() => { 
                                  const m = (window as any).__promptSocialSummary || {}; 
                                  const s = m[p.name] || { comments: 0, reactions: 0 }; 
                                  return (
                                    <>
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-blue-500/10 to-blue-600/10 text-blue-700 text-xs font-medium" title="Reactions">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                        </svg>
                                        {s.reactions}
                                      </span>
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-green-500/10 to-green-600/10 text-green-700 text-xs font-medium" title="Comments">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                        </svg>
                                        {s.comments}
                                      </span>
                                    </>
                                  ); 
                                })()}
                              </div>
                              <button type="button" onClick={(e) => { e.stopPropagation(); openDetails(p.name); }} 
                                className="group/btn relative px-4 py-1.5 rounded-full text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-pink-600 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200">
                                <span className="absolute inset-0 bg-white/20 rounded-full opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                                <span className="relative">Open</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {(!loading && othersExcludingRecent.length === 0 && recentNew.length === 0) && (
                  <div className="col-span-full p-8 text-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-dashed border-gray-300">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <p className="text-gray-500 font-medium">No community prompts yet</p>
                    <p className="text-gray-400 text-sm mt-1">Be the first to share a prompt with the community!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details moved to /prompts/[name] */}

      {showIdeaModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[15vh] p-6" onClick={() => setShowIdeaModal(false)}>
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-xl border p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Create Prompt</h3>
              <button className="px-2 py-1 border rounded" onClick={() => setShowIdeaModal(false)}>×</button>
            </div>
            <div className="space-y-3 max-h-[85vh] overflow-auto">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Prompt title (optional)</label>
                <input value={ideaTitle} onChange={(e) => setIdeaTitle(e.target.value)} className="w-full px-3 py-2 rounded border border-[#003145]/30" placeholder="e.g. Contract clause analyzer" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Enter your prompt</label>
                <textarea value={ideaDetails} onChange={(e) => { setIdeaDetails(e.target.value); if (ideaError) setIdeaError(""); }} className="w-full h-72 p-3 rounded border border-[#003145]/30" placeholder="Enter your prompt text here..." />
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
              <div className="flex gap-2 justify-end pt-1">
                <button className="px-3 py-2 rounded border" onClick={() => setShowIdeaModal(false)}>Cancel</button>
                <button className="px-3 py-2 rounded bg-[#003145] text-white" onClick={submitIdea}>Create Prompt</button>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}


