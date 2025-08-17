"use client";

import { useEffect, useRef, useState } from "react";

export function FancySelect({
  value,
  placeholder,
  options,
  onChange,
  className = "",
  disabled = false,
}: {
  value: string;
  placeholder: string;
  options: string[];
  onChange: (v: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); window.removeEventListener("keydown", onKey); };
  }, []);

  const label = value || placeholder;

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        className="group w-full inline-flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border border-[#003145]/30 bg-white shadow-sm text-[#003145] focus:outline-none focus:ring-2 focus:ring-[#003145]/20 focus:border-[#003145] transition-colors hover:bg-[#003145] hover:text-white hover:border-[#003145]"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`truncate ${value ? "" : "opacity-70"} group-hover:text-white`}>{label}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition ${open ? "rotate-180" : ""}`}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-[2000] mt-2 left-0 bg-white border border-[#003145]/15 rounded-xl shadow-xl overflow-hidden min-w-[24rem] max-w-[40rem]">
          <div className="max-h-60 overflow-auto">
            <div className="px-3 py-2 text-xs uppercase tracking-wide text-[#003145]/50 select-none whitespace-nowrap">{placeholder}</div>
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                className={`group w-full px-4 py-2 hover:bg-[#003145] hover:text-white ${opt === value ? "bg-[#003145]/10" : ""}`}
                onClick={() => { onChange(opt); setOpen(false); }}
                role="option"
                aria-selected={opt === value}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="block text-left whitespace-nowrap overflow-hidden text-ellipsis group-hover:text-white">{opt}</span>
                  {opt === value ? (
                    <span>✓</span>
                  ) : null}
                </div>
              </button>
            ))}
            {options.length === 0 && (
              <div className="px-4 py-3 text-sm text-[#003145]/60">No options</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


