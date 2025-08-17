"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function CompareModal({ promptOld, promptNew, onClose, name }: { promptOld: string; promptNew: string; onClose: () => void; name: string }) {
  const [status, setStatus] = useState<"waiting" | "done" | "error">("waiting");
  const [result, setResult] = useState<string>("");
  const [createdName, setCreatedName] = useState<string>("");
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    (async () => {
      try {
        const key = `${promptOld}||${promptNew}`;
        const g: any = (window as any);
        const store: Map<string, Promise<string>> = g.__compareStore || (g.__compareStore = new Map());
        let p = store.get(key);
        if (!p) {
          const u = `https://mac.broadbill-little.ts.net/webhook/oc-prompt-comparer?prompt1=${encodeURIComponent(promptOld || "")}&prompt2=${encodeURIComponent(promptNew || "")}`;
          p = fetch(u, { method: "POST", cache: "no-store" }).then(async (res) => {
            const text = await res.text();
            if (!res.ok) throw new Error(text || "Request failed");
            return text;
          });
          store.set(key, p);
        }
        const raw = await p;
        setStatus("done");
        setResult(raw);
        // Parse new array return format
        let parsed: any = undefined;
        try { parsed = JSON.parse(raw); } catch {}
        let outputStr = "";
        if (Array.isArray(parsed) && parsed[0]?.output) {
          outputStr = String(parsed[0].output || "");
        } else if (parsed && parsed.output) {
          outputStr = String(parsed.output || "");
        } else {
          outputStr = String(raw || "");
        }
        const lowered = outputStr.toLowerCase();
        const decision: "yes" | "no" = lowered.includes('"issame"') && lowered.includes('"yes"') ? 'yes' : (lowered.includes('"issame"') && lowered.includes('"no"') ? 'no' : (lowered.includes('yes') ? 'yes' : 'no'));
        // Extract prompt2Language if available
        let prompt2Language = "";
        const langMatch = outputStr.match(/"prompt2Language"\s*:\s*"([^"]+)"/i) || outputStr.match(/'prompt2Language'\s*:\s*'([^']+)'/i);
        if (langMatch) prompt2Language = langMatch[1];
        try {
          // get current user for tags
          let firstLast = 'unknown.user';
          try {
            const me = await fetch('/api/auth/me', { cache: 'no-store' }).then(r => r.json());
            const uname = String(me?.username || '').trim();
            if (uname) firstLast = uname.replace(/\s+/g, '.');
          } catch {}
          const appendTags = decision === 'yes'
            ? [`ModifiedBy > ${firstLast}`]
            : [`SubmittedBy > ${firstLast}`];
          const labels = decision === 'yes' ? undefined : ["substantial_change", "personal"]; // undefined preserves existing
          const newName = decision === 'yes' ? undefined : `${name}__${firstLast}__${Date.now()}`;
          // Deduplicate save in React StrictMode/dev by tracking decision per key
          const g2: any = (window as any);
          const decided: Set<string> = g2.__compareDecisionStore || (g2.__compareDecisionStore = new Set());
          const decisionKey = `${name}||${promptNew}||${decision}`;
          if (!decided.has(decisionKey)) {
            decided.add(decisionKey);
            await fetch('/api/langfuse/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, newName, promptText: promptNew, labels, appendTags, languageHint: prompt2Language, commitMessage: decision === 'yes' ? 'Update after comparer: accepted' : 'Create new prompt after comparer: substantial personal change' }),
            });
          }
          if (decision === 'no' && newName) {
            setCreatedName(newName);
            setSecondsLeft(5);
            try { (window as any).__refreshTagsMap?.get(newName)?.(); } catch {}
          } else {
            // close immediately on normal save
            try { (window as any).__refreshTagsMap?.get(name)?.(); } catch {}
            onClose();
          }
        } catch {}
        // If "no", we keep modal open for countdown and redirect
      } catch (e: any) {
        setStatus("error");
        setResult(e?.message || "Failed to start comparison");
      }
    })();
  }, [promptOld, promptNew]);

  // Countdown and redirect to new prompt if created
  useEffect(() => {
    if (!createdName || secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    if (secondsLeft === 1) {
      router.push(`/prompts/${encodeURIComponent(createdName)}`);
      onClose();
    }
    return () => clearTimeout(id);
  }, [createdName, secondsLeft, router, onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[15vh] p-6" onClick={onClose}>
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl border p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Working…</h3>
          <button className="px-2 py-1 border rounded" onClick={onClose}>×</button>
        </div>
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="flex items-center gap-6">
            <div className={`wrench-anim${status !== 'waiting' ? ' xshape' : ''}`} aria-hidden />
          </div>
          <div className="text-sm text-[#003145] text-center max-w-xl">
            {status === "waiting" ? "Starting comparison of your update with the current prompt…" : createdName ? `A new prompt was created. Redirecting in ${secondsLeft}s…` : "Done"}
          </div>
          {createdName ? (
            <div className="mt-2">
              <button
                className="px-3 py-1.5 rounded bg-[#003145] text-white"
                onClick={() => { router.push(`/prompts/${encodeURIComponent(createdName)}`); onClose(); }}
              >
                Move to new version
              </button>
            </div>
          ) : null}
          {(status === "error") && (
            <div className="mt-2">
              <button className="px-3 py-1.5 rounded border" onClick={onClose}>Close</button>
            </div>
          )}
        </div>
      </div>
      <style>{`
        .wrench-anim { width: 96px; height: 96px; position: relative; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15)); background: none; }
        .wrench-anim::before, .wrench-anim::after { content: ""; position: absolute; left: 50%; top: 50%; width: 72px; height: 72px; transform-origin: 50% 50%; background: none; mask-size: contain; -webkit-mask-size: contain; mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat; mask-position: center; -webkit-mask-position: center; }
        .wrench-anim::before { background-color: #003145; -webkit-mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g><path d="M70 8c-7 2-12 9-12 17 0 3 1 6 2 8L43 50 34 48 18 64l18 18 16-16-2-9 17-17c2 1 5 2 8 2 8 0 15-5 17-12l-18 6-10-10 6-18z"/></g></svg>'); mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g><path d="M70 8c-7 2-12 9-12 17 0 3 1 6 2 8L43 50 34 48 18 64l18 18 16-16-2-9 17-17c2 1 5 2 8 2 8 0 15-5 17-12l-18 6-10-10 6-18z"/></g></svg>'); transform: translate(-50%, -50%) rotate(0deg) scale(0.9); animation: wrench-rotate 1.8s linear infinite; }
        .wrench-anim::after { background-color: #FB5A17; -webkit-mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g transform="rotate(45,50,50)"><path d="M70 8c-7 2-12 9-12 17 0 3 1 6 2 8L43 50 34 48 18 64l18 18 16-16-2-9 17-17c2 1 5 2 8 2 8 0 15-5 17-12l-18 6-10-10 6-18z"/></g></svg>'); mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g transform="rotate(45,50,50)"><path d="M70 8c-7 2-12 9-12 17 0 3 1 6 2 8L43 50 34 48 18 64l18 18 16-16-2-9 17-17c2 1 5 2 8 2 8 0 15-5 17-12l-18 6-10-10 6-18z"/></g></svg>'); transform: translate(-50%, -50%) rotate(0deg) scale(0.9); animation: wrench-rotate-rev 1.8s linear infinite; opacity: 0.95; }
        .wrench-anim.xshape::before, .wrench-anim.xshape::after { animation: none !important; }
        .wrench-anim.xshape::before { transform: translate(-50%, -50%) rotate(45deg) scale(0.9) !important; }
        .wrench-anim.xshape::after { transform: translate(-50%, -50%) rotate(-45deg) scale(0.9) !important; }
        @keyframes wrench-rotate { from { transform: translate(-50%, -50%) rotate(0deg) scale(0.9); } to { transform: translate(-50%, -50%) rotate(360deg) scale(0.9); } }
        @keyframes wrench-rotate-rev { from { transform: translate(-50%, -50%) rotate(360deg) scale(0.9); } to { transform: translate(-50%, -50%) rotate(0deg) scale(0.9); } }
      `}</style>
    </div>
  );
}


