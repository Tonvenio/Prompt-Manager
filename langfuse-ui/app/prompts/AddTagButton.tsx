"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  name: string;
  onAdded?: () => void;
  className?: string;
};

export function AddTagButton({ name, onAdded, className }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [allTags, setAllTags] = useState<string[]>([]);
  const [byCategory, setByCategory] = useState<Record<string, string[]>>({});
  const [showLangChoice, setShowLangChoice] = useState(false);
  const [langChoiceOptions, setLangChoiceOptions] = useState<string[]>([]);
  const [pendingNonLangToAdd, setPendingNonLangToAdd] = useState<string[]>([]);
  const [existingLangTag, setExistingLangTag] = useState<string>("");
  const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function loadTags() {
    if (allTags.length || Object.keys(byCategory).length || loading) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/langfuse/tags`, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      const tagsFromList: string[] = Array.isArray(json?.tags) ? json.tags : [];
      setAllTags(tagsFromList);
      if (json?.byCategory && typeof json.byCategory === 'object') {
        const map = json.byCategory as Record<string, string[]>;
        const filtered: Record<string, string[]> = {};
        for (const [cat, list] of Object.entries(map)) {
          const catName = String(cat).trim();
          if (catName === 'SubmittedBy' || catName === 'ModifiedBy' || catName === 'Modified by' || catName === 'Language') continue;
          filtered[cat] = list as string[];
        }
        setByCategory(filtered);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load tags");
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(tag: string) {
    setSelectedToAdd(prev => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag); else next.add(tag);
      return next;
    });
  }

  async function save() {
    if (!selectedToAdd.size) { setOpen(false); return; }
    setSaving(true); setError("");
    try {
      const toAdd = Array.from(selectedToAdd);
      const newLanguageTags = toAdd.filter((t) => t.split('>')[0].trim() === 'Language');
      const nonLang = toAdd.filter((t) => t.split('>')[0].trim() !== 'Language');
      // If any language tags were selected, mimic detail page behavior: allow exactly one language
      if (newLanguageTags.length) {
        // Discover current language via GET endpoint
        let existing = "";
        try {
          const r = await fetch(`/api/langfuse/get?promptName=${encodeURIComponent(name)}&label=latest`, { cache: 'no-store' });
          if (r.ok) {
            const j = await r.json();
            const tags: string[] = Array.isArray(j?.tags) ? j.tags : [];
            existing = (tags.find((t: string) => t.split('>')[0].trim() === 'Language') || '');
          }
        } catch {}
        const existingVal = existing.split('>')[1]?.trim() || '';
        const options = Array.from(new Set([existingVal, ...newLanguageTags.map((t) => t.split('>')[1]?.trim() || '').filter(Boolean)].filter(Boolean)));
        if (options.length > 1) {
          setExistingLangTag(existing);
          setLangChoiceOptions(options);
          setPendingNonLangToAdd(nonLang);
          setShowLangChoice(true);
          return;
        }
      }
      // No language conflict, proceed
      for (const tag of toAdd) {
        const res = await fetch("/api/langfuse/update-tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, action: "add", tag }),
        });
        if (!res.ok) throw new Error(await res.text());
      }
      setOpen(false);
      setSelectedToAdd(new Set());
      try { onAdded?.(); } catch {}
    } catch (e: any) {
      setError(e.message || "Failed to add tag(s)");
    } finally {
      setSaving(false);
    }
  }

  async function applyLanguageChoice(chosen: string) {
    try {
      setSaving(true);
      const existingVal = existingLangTag.split('>')[1]?.trim() || '';
      if (existingLangTag && existingVal && existingVal !== chosen) {
        await fetch("/api/langfuse/update-tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, action: "remove", tag: existingLangTag }),
        });
      }
      const addList = [...pendingNonLangToAdd, `Language > ${chosen}`];
      for (const tag of addList) {
        const res = await fetch("/api/langfuse/update-tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, action: "add", tag }),
        });
        if (!res.ok) throw new Error(await res.text());
      }
      setOpen(false);
      setShowLangChoice(false);
      setSelectedToAdd(new Set());
      setPendingNonLangToAdd([]);
      setExistingLangTag("");
      try { onAdded?.(); } catch {}
    } catch (e: any) {
      setError(e.message || "Failed to add tag(s)");
    } finally {
      setSaving(false);
    }
  }

  function getCategoryStyles(tag: string) {
    const [rawCategory] = tag.split('>').map((s) => s.trim());
    const category = rawCategory || 'other';
    const stylesByCategory: Record<string, { container: string; hover: string }> = {
      Context: { container: 'bg-sky-100 text-sky-900 ring-1 ring-sky-200', hover: 'hover:bg-sky-200' },
      Jurisdiction: { container: 'bg-slate-100 text-slate-900 ring-1 ring-slate-200', hover: 'hover:bg-slate-200' },
      Area_or_PG: { container: 'bg-[#FB5A17]/10 text-[#9a3a10] ring-1 ring-[#FB5A17]/20', hover: 'hover:bg-[#FB5A17]/15' },
      Tool: { container: 'bg-indigo-100 text-indigo-900 ring-1 ring-indigo-200', hover: 'hover:bg-indigo-200' },
      other: { container: 'bg-slate-100 text-slate-800 ring-1 ring-slate-200', hover: 'hover:bg-slate-200' },
    };
    return stylesByCategory[category] || stylesByCategory.other;
  }

  const candidates = useMemo(() => {
    const list: string[] = [];
    for (const [cat, arr] of Object.entries(byCategory)) {
      for (const v of arr) list.push(`${cat} > ${v}`);
    }
    return list;
  }, [byCategory]);

  return (
    <>
      <button
        type="button"
        className={className || "px-3 py-1 rounded-full border bg-white text-[#003145] border-[#003145]/20 hover:bg-[#003145]/10"}
        onClick={(e) => { e.stopPropagation(); setOpen(true); loadTags(); }}
        title="Add Tag+"
      >
        Add Tag+
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setOpen(false)}>
          <div className="w-full max-w-5xl rounded-xl bg-white shadow-lg border p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="font-semibold text-[#003145]">Add tag</div>
              <button className="px-2 py-1 border rounded no-brand-hover" onClick={() => setOpen(false)}>✕</button>
            </div>
            <div className="max-h-72 overflow-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-1 pb-6">
              {loading ? (
                <div className="text-sm text-gray-600">Loading tags…</div>
              ) : (
                Object.entries(byCategory).length ? (
                  [...Object.entries(byCategory)].sort((a, b) => {
                    const order = new Map<string, number>([["Area_or_PG", 0]]);
                    const wa = order.get(a[0]) ?? 100 + a[0].localeCompare(b[0]);
                    const wb = order.get(b[0]) ?? 100 + b[0].localeCompare(a[0]);
                    return wa - wb;
                  }).map(([cat, list]) => {
                    if (!list.length) return null;
                    return (
                      <div key={cat} className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">{cat}</div>
                        <div className="flex flex-wrap gap-2">
                          {list.map((t) => {
                            const tag = `${cat} > ${t}`;
                            const selected = selectedToAdd.has(tag);
                            const styles = getCategoryStyles(tag);
                            return (
                              <button
                                key={tag}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => toggleSelect(tag)}
                                className={`inline-flex items-center max-w-full whitespace-nowrap px-3 py-1 rounded-full font-semibold text-sm ring-1 ${styles.container} ${styles.hover} ${selected ? '!bg-[#003145] !text-white !ring-[#003145]' : ''}`}
                              >
                                <span className="truncate">{t}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                ) : candidates.length ? (
                  <div className="text-sm text-gray-600">No categories available.</div>
                ) : (
                  <div className="text-sm text-gray-600">No available tags to add.</div>
                )
              )}
            </div>
            {showLangChoice && (
              <div className="p-3 border rounded bg-amber-50 text-amber-950 mb-3">
                <div className="font-medium mb-1">Choose language tag</div>
                <div className="text-sm mb-3">Only one Language tag is allowed. This choice updates tags for filtering and display only. It does not change the prompt text itself.</div>
                <div className="flex flex-wrap gap-2">
                  {langChoiceOptions.map((opt) => (
                    <button key={opt} className="px-3 py-1.5 rounded-full border bg-white hover:bg-gray-50" onClick={() => applyLanguageChoice(opt)}>{opt}</button>
                  ))}
                </div>
              </div>
            )}
            {error ? <div className="text-sm text-red-600">{error}</div> : null}
            <div className="flex items-center justify-between gap-2">
              {(() => {
                const subject = encodeURIComponent("OC Prompt Manager: Tag Request");
                const body = encodeURIComponent("Hi AI Team, I would like to request to add the following tag to the OC Prompt Manager: [Enter Tag Here]\nThanks!");
                const href = `mailto:ai@osborneclarke.com?subject=${subject}&body=${body}`;
                return (
                  <a
                    href={href}
                    className="px-3 py-1.5 rounded border text-[#003145] hover:bg-[#003145]/10"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Request Tag
                  </a>
                );
              })()}
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 border rounded" onClick={() => setOpen(false)}>Cancel</button>
                <button className="px-3 py-1.5 rounded bg-[#003145] text-white disabled:opacity-60" onClick={save} disabled={saving || selectedToAdd.size === 0}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


