"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function LibraryDetailsModal({
  name,
  onClose,
}: {
  name: string;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const src = `/prompts/${encodeURIComponent(name)}`;

  const node = (
    <div className="fixed inset-0 z-[1000]" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={onClose} />
      <div className="relative inset-0 h-full w-full p-6">
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <a href={src} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg border bg-white/70 backdrop-blur text-[#003145] shadow">Open in tab</a>
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg border bg-white/70 backdrop-blur text-[#003145] shadow">Close</button>
        </div>
        <div className="h-full w-full rounded-2xl overflow-hidden shadow-2xl border border-white/30 bg-white/20 backdrop-blur-xl">
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center text-[#003145]">
              Loading…
            </div>
          )}
          <iframe
            title={`Prompt ${name}`}
            src={src}
            className="h-full w-full bg-white"
            onLoad={() => setLoaded(true)}
          />
        </div>
      </div>
    </div>
  );

  return mounted ? createPortal(node, document.body) : null;
}
