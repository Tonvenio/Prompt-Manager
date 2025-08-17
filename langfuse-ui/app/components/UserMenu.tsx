"use client";

import { useEffect, useState } from "react";
import { LogoutButton } from "./LogoutButton";

type Profile = { language?: string; languages?: string[]; areas: string[]; personalLLMContext?: string };

export function UserMenu({
  onApplyFilters,
  areaOptions = [],
  languageOptions = [],
  exposeOpenRef,
}: {
  onApplyFilters?: (filters: { language?: string; languages?: string[]; areas?: string[] }) => void;
  areaOptions?: string[];
  languageOptions?: string[];
  exposeOpenRef?: (open: () => void) => void;
}) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [profile, setProfile] = useState<Profile>({ language: "", languages: [], areas: [], personalLLMContext: "" });
  const [saving, setSaving] = useState(false);
  const [personalizing, setPersonalizing] = useState(false);

  async function load() {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setUsername(data.username || "");
      setProfile(data.profile || { language: "", languages: [], areas: [], personalLLMContext: "" });
    }
  }

  useEffect(() => { if (open) load(); }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const languages = Array.isArray(profile.languages) ? profile.languages : (profile.language ? [profile.language] : []);
      onApplyFilters?.({ language: languages[0], languages, areas: profile.areas });
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function personalize() {
    setPersonalizing(true);
    try {
      const res = await fetch("/api/auth/personalize", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        const context: string = data?.context ?? "";
        setProfile(prev => ({ ...prev, personalLLMContext: context }));
      }
    } finally {
      setPersonalizing(false);
    }
  }

  useEffect(() => { exposeOpenRef?.(() => setOpen(true)); }, [exposeOpenRef]);

  return (
    <>
      <button
        type="button"
        className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#003145] text-white hover:opacity-90 shadow-sm"
        onClick={() => setOpen(true)}
        aria-label="User menu"
        title="User menu"
      >
        {/* person icon */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[5vh] pb-[8vh] p-6"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative bg-white w-full max-w-xl p-6 rounded-2xl shadow-xl border animate-[fadeIn_200ms_ease-out] max-h-[85vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-3 right-3 px-2 py-1 border rounded"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              ×
            </button>

            <h2 className="text-xl font-semibold mb-4">User settings</h2>

            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-600">Username</div>
                <div className="font-medium">{username || "—"}</div>
              </div>

              <div>
                <label className="block text-sm mb-1">Main languages (up to 3)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(profile.languages || []).map((lng) => (
                    <span key={lng} className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-[#003145]/10 text-[#003145]">
                      {lng}
                      <button
                        className="text-xs px-2 py-0.5 border rounded-full bg-white"
                        onClick={() => setProfile(prev => ({ ...prev, languages: (prev.languages || []).filter(x => x !== lng) }))}
                        type="button"
                      >×</button>
                    </span>
                  ))}
                </div>
                <div>
                  {/* Modern dropdown */}
                  <div className="relative">
                    <div className="absolute inset-0 pointer-events-none" />
                    <div className="hidden" />
                  </div>
                  <div className="max-w-sm">
                    <div className="mb-2">
                      {/* Use FancySelect for consistent styling */}
                    </div>
                    {(() => {
                      const { FancySelect } = require("./FancySelect");
                      return (
                        <FancySelect
                          value=""
                          placeholder="Add language…"
                          options={languageOptions.filter((v: string) => !(profile.languages || []).includes(v))}
                          onChange={(v: string) => setProfile((prev: any) => {
                            const next = Array.from(new Set([...(prev.languages || []), v])).slice(0,3);
                            return { ...prev, languages: next, language: next[0] || "" };
                          })}
                        />
                      );
                    })()}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1">Practice areas (up to 3)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {profile.areas.map((a) => (
                    <span key={a} className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-blue-100 text-blue-900">
                      {a}
                      <button
                        className="text-xs px-2 py-0.5 border rounded-full bg-white"
                        onClick={() => setProfile(prev => ({ ...prev, areas: prev.areas.filter(x => x !== a) }))}
                        type="button"
                      >×</button>
                    </span>
                  ))}
                </div>
                <div className="max-w-sm">
                  {(() => {
                    const { FancySelect } = require("./FancySelect");
                    return (
                      <FancySelect
                        value=""
                        placeholder="Add area…"
                        options={areaOptions.filter((v: string) => !(profile.areas || []).includes(v))}
                        onChange={(v: string) => setProfile((prev: any) => ({ ...prev, areas: Array.from(new Set([...(prev.areas || []).slice(0,3), v])).slice(0,3) }))}
                      />
                    );
                  })()}
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1">Personal LLM Context</label>
                <textarea
                  className="w-full px-4 py-3 rounded-lg border border-[#003145]/30 font-mono text-sm h-64 resize-y bg-gray-50 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#003145]/20 focus:border-[#003145]"
                  value={profile.personalLLMContext || ""}
                  onChange={(e) => setProfile(prev => ({ ...prev, personalLLMContext: e.target.value }))}
                  placeholder="This context will be used to personalize your LLM experience"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    className="px-3 py-2 border rounded"
                    onClick={personalize}
                    disabled={personalizing}
                    type="button"
                  >
                    {personalizing ? "Personalizing…" : "Personalize"}
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="px-3 py-2 rounded bg-[#003145] text-white" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save & Apply"}</button>
                <LogoutButton />
              </div>
            </div>

            <style>{`
              @keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
          </div>
        </div>
      )}
    </>
  );
}


