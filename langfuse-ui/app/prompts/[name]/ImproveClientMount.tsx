"use client";

import { useEffect, useState } from "react";
import { ImproveModal } from "./ImproveModal";

type Status = "waiting" | "done" | "error";

export function ImproveClientMount({ promptText, name }: { promptText: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("waiting");
  const [result, setResult] = useState("");

  async function runImprove() {
    setStatus("waiting");
    setResult("");
    try {
      const res = await fetch("/api/agents/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText }),
        cache: "no-store",
      });
      const raw = await res.text();
      let data: any = undefined;
      try { data = JSON.parse(raw); } catch {}
      // eslint-disable-next-line no-console
      console.log("[ImproveClientMount] response", { status: res.status, data, raw: raw.slice(0, 1500) });
      const content = (data && (data.output ?? data.body ?? data.error)) || raw || "";
      setResult(content);
      setStatus(content ? "done" : (res.ok ? "done" : "error"));
    } catch (e) {
      setStatus("error");
      setResult(String(e));
    }
  }

  function openModal() {
    setOpen(true);
    // kick off improvement immediately
    runImprove();
  }

  useEffect(() => {
    (window as any).__openImprove = openModal;
    return () => { (window as any).__openImprove = undefined; };
  }, [promptText]);

  return (
    <div className="flex gap-3">
      <button type="button" className="px-3 py-2 border rounded" onClick={openModal}>
        🤖 Improve Prompt
      </button>
      {open ? (
        <ImproveModal
          promptText={promptText}
          status={status}
          result={result}
          setResult={setResult}
          onClose={() => setOpen(false)}
          onApply={(newText) => { (window as any).__setPromptText?.(newText); }}
          name={name}
        />
      ) : null}
    </div>
  );
}


