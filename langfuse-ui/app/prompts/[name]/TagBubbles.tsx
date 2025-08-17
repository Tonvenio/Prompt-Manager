"use client";

import { useEffect, useState } from "react";

export function TagBubbles({ name, initialTags }: { name: string; initialTags: string[] }) {
  const [tags, setTags] = useState<string[]>(initialTags || []);
  const [busyTag, setBusyTag] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [byCategory, setByCategory] = useState<Record<string, string[]>>({});
  const [loadingAllTags, setLoadingAllTags] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set());
  const [savingAdd, setSavingAdd] = useState(false);
  const [showLangChoice, setShowLangChoice] = useState(false);
  const [langChoiceOptions, setLangChoiceOptions] = useState<string[]>([]);
  const [pendingNonLangToAdd, setPendingNonLangToAdd] = useState<string[]>([]);
  const [existingLangTag, setExistingLangTag] = useState<string>("");
  useEffect(() => {
    if (!showAddModal) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setShowAddModal(false); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showAddModal]);

  // Allow external refresh of tags after workflows (e.g., language correction)
  async function refreshTags() {
    try {
      const res = await fetch(`/api/langfuse/get?promptName=${encodeURIComponent(name)}&label=latest`, { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      const next = Array.isArray(json?.tags) ? (json.tags as string[]) : [];
      setTags(next);
    } catch {}
  }

  useEffect(() => {
    const g: any = (window as any);
    const map: Map<string, () => void> = g.__refreshTagsMap || (g.__refreshTagsMap = new Map());
    map.set(name, refreshTags);
    const openMap: Map<string, () => void> = g.__openAddTagMap || (g.__openAddTagMap = new Map());
    openMap.set(name, () => { setShowAddModal(true); loadAllTags(); });
    return () => {
      try { map.delete(name); } catch {}
      try { openMap.delete(name); } catch {}
    };
  }, [name]);

  async function remove(tag: string) {
    if (busyTag) return;
    setBusyTag(tag);
    setError("");
    try {
      const res = await fetch("/api/langfuse/update-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, action: "remove", tag }),
      });
      if (!res.ok) throw new Error(await res.text());
      setTags((prev) => prev.filter((t) => t !== tag));
    } catch (e: any) {
      setError(e.message || "Failed to remove tag");
    } finally {
      setBusyTag(null);
    }
  }

  async function add(tag: string) {
    if (busyTag) return;
    setBusyTag(tag);
    setError("");
    try {
      const res = await fetch("/api/langfuse/update-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, action: "add", tag }),
      });
      if (!res.ok) throw new Error(await res.text());
      setTags((prev) => Array.from(new Set([...prev, tag])));
      setShowAddModal(false);
    } catch (e: any) {
      setError(e.message || "Failed to add tag");
    } finally {
      setBusyTag(null);
    }
  }

  async function loadAllTags() {
    if (allTags.length || loadingAllTags) return;
    setLoadingAllTags(true);
    setError("");
    try {
      // Fetch a broad list and collect unique tags
      const res = await fetch(`/api/langfuse/tags`, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      const tagsFromList: string[] = Array.isArray(json?.tags) ? json.tags : [];
      setAllTags(tagsFromList);
      if (json?.byCategory && typeof json.byCategory === 'object') {
        const map = json.byCategory as Record<string, string[]>;
        // Hide SubmittedBy, ModifiedBy, and Language in the modal suggestions
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
      setLoadingAllTags(false);
    }
  }

  const displayTags = (tags || []).filter((t) => {
    const cat = t.split('>')[0].trim();
    return cat !== 'SubmittedBy' && cat !== 'ModifiedBy' && cat !== 'Modified by' && cat !== 'Language';
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
  const used = new Set<string>(tags || []);
  const DEFAULT_TAGS = [
    "Tool > OC-GPT",
    "Tool > Legora",
    "Tool > Harvey",
  ];
  const candidates = (allTags.length ? allTags : Array.from(new Set((tags || []).concat(initialTags || []).concat(DEFAULT_TAGS))))
    .filter((t) => !used.has(t))
    .filter((t) => {
      const cat = t.split('>')[0].trim();
      return cat !== 'SubmittedBy' && cat !== 'ModifiedBy' && cat !== 'Modified by' && cat !== 'Language';
    });

  function toggleSelect(tag: string) {
    setSelectedToAdd(prev => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag); else next.add(tag);
      return next;
    });
  }

  async function saveSelected() {
    if (!selectedToAdd.size) { setShowAddModal(false); return; }
    setError("");
    const toAdd = Array.from(selectedToAdd);
    const hasLanguageAlready = (tags || []).some((t) => t.split('>')[0].trim() === 'Language');
    const newLanguageTags = toAdd.filter((t) => t.split('>')[0].trim() === 'Language');
    const nonLang = toAdd.filter((t) => t.split('>')[0].trim() !== 'Language');
    const existingLang = (tags || []).find((t) => t.split('>')[0].trim() === 'Language') || '';
    const existingVal = existingLang.split('>')[1]?.trim() || '';

    // Case 1: already has Language and adding at least one new language
    // Case 2: adding more than one new language and none exists yet
    if ((hasLanguageAlready && newLanguageTags.length > 0) || (!hasLanguageAlready && newLanguageTags.length > 1)) {
      const options = Array.from(new Set([existingVal, ...newLanguageTags.map((t) => t.split('>')[1]?.trim() || '').filter(Boolean)].filter(Boolean)));
      setExistingLangTag(existingLang);
      setLangChoiceOptions(options);
      setPendingNonLangToAdd(nonLang);
      setShowLangChoice(true);
      return;
    }

    // Otherwise proceed with single-language logic (either zero or exactly one)
    setSavingAdd(true);
    try {
      // If exactly one new language and different from existing, replace
      if (newLanguageTags.length === 1) {
        const newVal = newLanguageTags[0].split('>')[1]?.trim() || '';
        if (hasLanguageAlready && existingVal && existingVal !== newVal) {
          await fetch("/api/langfuse/update-tags", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, action: "remove", tag: existingLang }),
          });
          setTags(prev => (prev || []).filter((t) => t !== existingLang));
        }
      }

      const finalToAdd = nonLang.concat(newLanguageTags);
      for (const tag of finalToAdd) {
        const res = await fetch("/api/langfuse/update-tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, action: "add", tag }),
        });
        if (!res.ok) throw new Error(await res.text());
        setTags(prev => Array.from(new Set([...(prev || []), tag])));
      }
      setShowAddModal(false);
      setSelectedToAdd(new Set());
    } catch (e: any) {
      setError(e.message || "Failed to add tag(s)");
    } finally {
      setSavingAdd(false);
    }
  }

  async function applyLanguageChoice(chosen: string) {
    try {
      setSavingAdd(true);
      // Remove existing language tag if different
      const existingVal = existingLangTag.split('>')[1]?.trim() || '';
      if (existingLangTag && existingVal && existingVal !== chosen) {
        await fetch("/api/langfuse/update-tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, action: "remove", tag: existingLangTag }),
        });
        setTags(prev => (prev || []).filter((t) => t !== existingLangTag));
      }
      const addList = [...pendingNonLangToAdd, `Language > ${chosen}`];
      for (const tag of addList) {
        const res = await fetch("/api/langfuse/update-tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, action: "add", tag }),
        });
        if (!res.ok) throw new Error(await res.text());
        setTags(prev => Array.from(new Set([...(prev || []), tag])));
      }
      setShowAddModal(false);
      setShowLangChoice(false);
      setSelectedToAdd(new Set());
      setPendingNonLangToAdd([]);
      setExistingLangTag("");
    } catch (e: any) {
      setError(e.message || "Failed to add tag(s)");
    } finally {
      setSavingAdd(false);
    }
  }
  // Always render list; if empty show just the add button

  function getCategoryStyles(tag: string) {
    const [rawCategory] = tag.split('>').map((s) => s.trim());
    const category = rawCategory || 'other';
    const stylesByCategory: Record<string, { container: string; hover: string; removeBtn: string; removeBtnHover: string }> = {
      // Context uses Jurisdiction styling across the site per request
      Context: {
        container: 'bg-sky-100 text-sky-900 ring-1 ring-sky-200',
        hover: 'hover:bg-sky-200',
        removeBtn: 'bg-sky-200 text-sky-900 hover:bg-sky-300',
        removeBtnHover: 'hover:bg-sky-300',
      },
      Jurisdiction: {
        container: 'bg-slate-100 text-slate-900 ring-1 ring-slate-200',
        hover: 'hover:bg-slate-200',
        removeBtn: 'bg-slate-200 text-slate-900 hover:bg-slate-300',
        removeBtnHover: 'hover:bg-slate-300',
      },
      Area_or_PG: {
        container: 'bg-[#FB5A17]/10 text-[#9a3a10] ring-1 ring-[#FB5A17]/20',
        hover: 'hover:bg-[#FB5A17]/15',
        removeBtn: 'bg-[#FB5A17]/20 text-[#9a3a10] hover:bg-[#FB5A17]/30',
        removeBtnHover: 'hover:bg-[#FB5A17]/30',
      },
      Tool: {
        container: 'bg-indigo-100 text-indigo-900 ring-1 ring-indigo-200',
        hover: 'hover:bg-indigo-200',
        removeBtn: 'bg-indigo-200 text-indigo-900 hover:bg-indigo-300',
        removeBtnHover: 'hover:bg-indigo-300',
      },
      Language: {
        container: 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200',
        hover: 'hover:bg-emerald-200',
        removeBtn: 'bg-emerald-200 text-emerald-900 hover:bg-emerald-300',
        removeBtnHover: 'hover:bg-emerald-300',
      },
      other: {
        container: 'bg-slate-100 text-slate-800 ring-1 ring-slate-200',
        hover: 'hover:bg-slate-200',
        removeBtn: 'bg-slate-200 text-slate-800 hover:bg-slate-300',
        removeBtnHover: 'hover:bg-slate-300',
      },
    };
    return stylesByCategory[category] || stylesByCategory.other;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {displayTagsSorted.map((t) => (
        <span
          key={t}
          className={`inline-flex items-center max-w-full whitespace-nowrap px-3 py-1 rounded-full font-semibold text-sm ring-1 ${getCategoryStyles(t).container} ${getCategoryStyles(t).hover}`}
          title={t}
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
          <button
            className={`ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full text-xs transition ${getCategoryStyles(t).removeBtn} ${getCategoryStyles(t).removeBtnHover}`}
            onClick={() => remove(t)}
            disabled={busyTag === t}
            aria-label={`Remove ${t}`}
            title="Remove tag"
          >
            {busyTag === t ? "…" : "×"}
          </button>
        </span>
      ))}
      {/* Add Tag entry */}
      <button
        className="inline-flex items-center px-3 py-1 rounded-full text-sm border bg-white text-[#003145] border-[#003145]/20 hover:bg-[#003145]/10"
        onClick={() => { setShowAddModal(true); loadAllTags(); }}
      >
        Add Tag+
      </button>
      {error ? <span className="text-red-600 text-sm">{error}</span> : null}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-5xl rounded-xl bg-white shadow-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-[#003145]">Add tag</div>
              <button className="px-2 py-1 border rounded no-brand-hover" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <div className="max-h-72 overflow-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-1 pb-6">
              {loadingAllTags ? (
                <div className="text-sm text-gray-600">Loading tags…</div>
              ) : (
                Object.entries(byCategory).length ? (
                  [...Object.entries(byCategory)].sort((a, b) => {
                    const order = new Map<string, number>([["Area_or_PG", 0]]);
                    const wa = order.get(a[0]) ?? 100 + a[0].localeCompare(b[0]);
                    const wb = order.get(b[0]) ?? 100 + b[0].localeCompare(a[0]);
                    return wa - wb;
                  }).map(([cat, list]) => {
                    const remaining = list.filter((t) => !used.has(t));
                    if (!remaining.length) return null;
                    return (
                      <div key={cat} className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">{cat}</div>
                        <div className="flex flex-wrap gap-2">
                          {remaining.map((t) => {
                            const selected = selectedToAdd.has(t);
                            const styles = getCategoryStyles(t);
                            const parts = t.split('>').map(s => s.trim());
                            const value = parts.length > 1 ? parts[1] : parts[0];
                            return (
                              <button
                                key={t}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => toggleSelect(t)}
                                className={`inline-flex items-center max-w-full whitespace-nowrap px-3 py-1 rounded-full font-semibold text-sm ring-1 ${styles.container} ${styles.hover} ${selected ? '!bg-[#003145] !text-white !ring-[#003145]' : ''}`}
                              >
                                <span className="truncate">{value}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                ) : candidates.length ? (
                  <div className="flex flex-wrap gap-2">
                    {candidates.map((t) => {
                      const selected = selectedToAdd.has(t);
                      const styles = getCategoryStyles(t);
                      const parts = t.split('>').map(s => s.trim());
                      const value = parts.length > 1 ? parts[1] : parts[0];
                      return (
                        <button
                          key={t}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => toggleSelect(t)}
                          className={`inline-flex items-center max-w-full whitespace-nowrap px-3 py-1 rounded-full font-semibold text-sm ring-1 ${styles.container} ${styles.hover} ${selected ? '!bg-[#003145] !text-white !ring-[#003145]' : ''}`}
                        >
                          <span className="truncate">{value}</span>
                        </button>
                      );
                    })}
                  </div>
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
                <button className="px-3 py-1.5 border rounded" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button
                  className="px-3 py-1.5 rounded bg-[#003145] text-white disabled:opacity-60"
                  onClick={saveSelected}
                  disabled={savingAdd || selectedToAdd.size === 0}
                >
                  {savingAdd ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


