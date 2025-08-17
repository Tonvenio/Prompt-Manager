"use client";

import { useEffect, useMemo, useState } from "react";
import { trackClient } from "../../components/ClientAnalytics";
import Image from "next/image";
import LearnPromptModal from "./LearnPromptModal";
import LogoHarvey from "../../icons/Logo Harvey.png";
import LogoLegora from "../../icons/Logo Legora.png";
import LogoOCGPT from "../../icons/Logo OC-GPT.png";

export function UsePromptModal({ text, onClose, tags = [], name }: { text: string; onClose: () => void; tags?: string[]; name?: string }) {
  const [copiedKey, setCopiedKey] = useState<string>("");
  const [allowedLanguages, setAllowedLanguages] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [detectedLanguage, setDetectedLanguage] = useState<string>("");
  const [showWorking, setShowWorking] = useState<boolean>(false);
  const [showLearn, setShowLearn] = useState<boolean>(false);
  const [translating, setTranslating] = useState(false);

  function detectLanguageName(input: string): string {
    const sample = (input || "").slice(0, 2000).toLowerCase();
    const has = (w: string[]) => w.some((x) => sample.includes(x));
    if (has([" der ", " die ", " und ", " nicht ", " ist ", " mit ", " für ", "ß"])) return "Deutsch";
    if (has([" the ", " and ", " or ", " not ", " is ", " with ", " for "])) return "Englisch";
    if (has([" le ", " la ", " et ", " pas ", " pour ", " avec "])) return "Französisch";
    if (has([" el ", " la ", " y ", " no ", " con ", " para "])) return "Spanisch";
    if (has([" il ", " la ", " e ", " non ", " con ", " per "])) return "Italienisch";
    return "";
  }

  useEffect(() => {
    (async () => {
      try {
        const prof = await fetch("/api/auth/me", { cache: "no-store" }).then(r => r.json());
        const langs = Array.isArray(prof?.profile?.languages) ? prof.profile.languages : [];
        setAllowedLanguages(langs);
        const detected = detectLanguageName(text);
        setDetectedLanguage(detected);
        // Default select detected if present in allowed list; otherwise first allowed
        if (langs.length) {
          setSelectedLanguage(langs.includes(detected) ? detected : langs[0]);
        } else {
          setSelectedLanguage("");
        }
      } catch { setAllowedLanguages([]); }
    })();
  }, []);

  async function copyAndFlash(key: string) {
    let outText = text || "";
    // If a target language is selected and allowed, translate on the fly via n8n
    if (selectedLanguage && selectedLanguage !== detectedLanguage && allowedLanguages.includes(selectedLanguage)) {
      setTranslating(true);
      setShowWorking(true);
      try {
        const endpoint = process.env.NEXT_PUBLIC_N8N_TRANSLATOR_URL || "https://mac.broadbill-little.ts.net/webhook/prompt-translator";
        const encodedPrompt = encodeURIComponent(outText);
        const url = `${endpoint}?prompt=${encodedPrompt}&lastName=${encodeURIComponent(selectedLanguage)}`;
        const res = await fetch(url, { method: "POST" });
        if (res.ok) {
          const raw = await res.text();
          try {
            const j = JSON.parse(raw);
            outText = String((j as any).translatedText || (j as any).text || (j as any).data?.translatedText || raw);
          } catch { outText = raw; }
        }
      } catch { /* fallback to original */ }
      finally { setTranslating(false); setShowWorking(false); }
    }
    try { await navigator.clipboard.writeText(outText); } catch {}
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(""), 1500);
    try {
      const tgt = selectedLanguage && selectedLanguage !== detectedLanguage ? selectedLanguage : "current";
      trackClient("prompt_use", { key, path: typeof window !== "undefined" ? window.location.pathname : undefined, targetLanguage: tgt });
    } catch {}
  }

  const availableToolNames = useMemo(() => {
    const names = new Set<string>();
    for (const t of tags) {
      const [cat, val] = String(t).split('>').map((s) => s.trim());
      if ((cat || '').toLowerCase() === 'tool' && val) {
        names.add(val.toLowerCase());
      }
    }
    return names;
  }, [tags]);

  const cards: { key: string; title: string; subtitle: string; requiresTool?: string }[] = [
    { key: "ocgpt", title: "OC-GPT", subtitle: "Copy to clipboard – paste in OC-GPT", requiresTool: "oc-gpt" },
    { key: "legora", title: "Legora", subtitle: "Copy to clipboard – paste in Legora", requiresTool: "legora" },
    { key: "harvey", title: "Harvey", subtitle: "Copy to clipboard – paste in Harvey", requiresTool: "harvey" },
    { key: "copy", title: "Copy Prompt", subtitle: "Just copy the prompt" },
  ].filter((c) => {
    if (!c.requiresTool) return true;
    const normalized = (c.requiresTool || '').replace(/[^a-z0-9]/g, '');
    for (const v of Array.from(availableToolNames)) {
      if (String(v || '').replace(/[^a-z0-9]/g, '') === normalized) return true;
    }
    return false;
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[15vh] p-6" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Use Prompt</h3>
          <button className="px-2 py-1 border rounded" onClick={onClose}>×</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cards.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => copyAndFlash(c.key)}
              className="group text-left p-4 rounded-2xl border hover:shadow-md transition bg-white hover:bg-[#003145] hover:border-[#003145]"
              disabled={translating}
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0">
                  {c.key === "harvey" && (
                    <Image src={LogoHarvey} alt="Harvey logo" width={28} height={28} className="rounded" />
                  )}
                  {c.key === "legora" && (
                    <Image src={LogoLegora} alt="Legora logo" width={28} height={28} className="rounded" />
                  )}
                  {c.key === "ocgpt" && (
                    <Image src={LogoOCGPT} alt="OC-GPT logo" width={28} height={28} className="rounded" />
                  )}
                  {c.key === "copy" && (
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="text-[#003145] group-hover:text-white"
                    >
                      <rect x="9" y="3" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M6 7H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M12 7h4" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  )}
                </div>
                <div>
                  <div className="text-base font-semibold text-[#003145] group-hover:text-white">{c.title}</div>
                  <div className="text-sm text-[#003145]/70 group-hover:text-white">{translating ? "Translating…" : (copiedKey === c.key ? "Copied!" : c.subtitle)}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Bottom language bubbles */}
        <div className="mt-4 pt-3 border-t border-[#003145]/10">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-[#003145]/80">Language</div>
            <div className="flex items-center gap-3">
              <a href="#" className="text-sm underline text-[#003145]" onClick={(e) => { e.preventDefault(); (window as any).openUserMenu?.(); }}>Select languages</a>
              {name ? (
                <a href="#" className="text-sm underline text-[#003145]" onClick={(e) => { e.preventDefault(); setShowLearn(true); }}>Learn this prompt</a>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {allowedLanguages.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setSelectedLanguage(l)}
                className={`px-3 py-1 rounded-full border ${selectedLanguage === l ? "bg-[#003145] text-white border-[#003145]" : "bg-white text-[#003145] border-[#003145]/30"}`}
              >
                {l}
              </button>
            ))}
            {!allowedLanguages.length && (
              <span className="text-xs text-[#003145]/60">No languages configured</span>
            )}
          </div>
          {showWorking && (
            <div className="mt-3 flex items-center justify-center">
              <div aria-label="Translating" className="wrench-anim" />
            </div>
          )}
        </div>
        <style>{`
          .wrench-anim { width: 64px; height: 64px; position: relative; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15)); background: none; }
          .wrench-anim::before, .wrench-anim::after { content: ""; position: absolute; left: 50%; top: 50%; width: 48px; height: 48px; transform-origin: 50% 50%; background: none; mask-size: contain; -webkit-mask-size: contain; mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat; mask-position: center; -webkit-mask-position: center; }
          .wrench-anim::before { background-color: #003145; -webkit-mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g><path d="M70 8c-7 2-12 9-12 17 0 3 1 6 2 8L43 50 34 48 18 64l18 18 16-16-2-9 17-17c2 1 5 2 8 2 8 0 15-5 17-12l-18 6-10-10 6-18z"/></g></svg>'); mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g><path d="M70 8c-7 2-12 9-12 17 0 3 1 6 2 8L43 50 34 48 18 64l18 18 16-16-2-9 17-17c2 1 5 2 8 2 8 0 15-5 17-12l-18 6-10-10 6-18z"/></g></svg>'); transform: translate(-50%, -50%) rotate(0deg) scale(0.9); animation: wrench-rotate 1.8s linear infinite; }
          .wrench-anim::after { background-color: #FB5A17; -webkit-mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g transform="rotate(45,50,50)"><path d="M70 8c-7 2-12 9-12 17 0 3 1 6 2 8L43 50 34 48 18 64l18 18 16-16-2-9 17-17c2 1 5 2 8 2 8 0 15-5 17-12l-18 6-10-10 6-18z"/></g></svg>'); mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g transform="rotate(45,50,50)"><path d="M70 8c-7 2-12 9-12 17 0 3 1 6 2 8L43 50 34 48 18 64l18 18 16-16-2-9 17-17c2 1 5 2 8 2 8 0 15-5 17-12l-18 6-10-10 6-18z"/></g></svg>'); transform: translate(-50%, -50%) rotate(0deg) scale(0.9); animation: wrench-rotate-rev 1.8s linear infinite; opacity: 0.95; }
          @keyframes wrench-rotate { from { transform: translate(-50%, -50%) rotate(0deg) scale(0.9); } to { transform: translate(-50%, -50%) rotate(360deg) scale(0.9); } }
          @keyframes wrench-rotate-rev { from { transform: translate(-50%, -50%) rotate(360deg) scale(0.9); } to { transform: translate(-50%, -50%) rotate(0deg) scale(0.9); } }
        `}</style>

        {showLearn && name ? (
          <LearnPromptModal name={name} videoUrl={process.env.NEXT_PUBLIC_PROMPT_TUTORIAL_URL || ""} onClose={() => setShowLearn(false)} />
        ) : null}
      </div>
    </div>
  );
}


