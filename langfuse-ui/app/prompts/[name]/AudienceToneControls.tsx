"use client";

import { useEffect, useState } from "react";

type AudienceKey = "Firm" | "Team";
type ToneKey = "Formal" | "Informal" | "Friendly";

export default function AudienceToneControls({ name }: { name: string }) {
  const [selectedAudience, setSelectedAudience] = useState<AudienceKey | null>(null);
  const [selectedTone, setSelectedTone] = useState<ToneKey | null>(null);
  const [values, setValues] = useState<{ audience: Record<AudienceKey, string>; tone: Record<ToneKey, string> }>(
    { audience: { Firm: "", Team: "" }, tone: { Formal: "", Informal: "", Friendly: "" } }
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"audience" | "tone" | null>(null);
  const [modalKey, setModalKey] = useState<string>("");
  const [modalValue, setModalValue] = useState<string>("");

  function openEdit(type: "audience" | "tone", key: string, current: string) {
    setModalType(type);
    setModalKey(key);
    setModalValue(current || "");
    setModalOpen(true);
  }

  function saveModal() {
    if (!modalType || !modalKey) { setModalOpen(false); return; }
    if (modalType === "audience") {
      setValues((prev) => ({ ...prev, audience: { ...prev.audience, [modalKey as AudienceKey]: modalValue } }));
    } else {
      setValues((prev) => ({ ...prev, tone: { ...prev.tone, [modalKey as ToneKey]: modalValue } }));
    }
    setModalOpen(false);
  }

  useEffect(() => {
    function onEsc(e: KeyboardEvent) { if (e.key === "Escape") setModalOpen(false); }
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  function Pill({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`px-3 py-1.5 rounded-full text-sm ring-1 transition ${active ? "bg-[#003145] text-white ring-[#003145]" : "bg-white text-[#003145] ring-[#003145]/20 hover:bg-[#003145]/5"}`}
      >
        {children}
      </button>
    );
  }

  function EditBtn({ onClick }: { onClick: () => void }) {
    return (
      <button type="button" onClick={onClick} title="Edit value" className="px-2 py-1 rounded border text-xs bg-white hover:bg-gray-50">
        ✎
      </button>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 text-sm font-semibold text-[#003145]">Audience</div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="inline-flex items-center gap-2">
            <Pill active={selectedAudience === "Firm"} onClick={() => setSelectedAudience("Firm")}>Firm</Pill>
            <EditBtn onClick={() => openEdit("audience", "Firm", values.audience.Firm)} />
            {values.audience.Firm ? <span className="text-xs text-[#003145]/70">{values.audience.Firm}</span> : null}
          </div>
          <div className="inline-flex items-center gap-2">
            <Pill active={selectedAudience === "Team"} onClick={() => setSelectedAudience("Team")}>Team</Pill>
            <EditBtn onClick={() => openEdit("audience", "Team", values.audience.Team)} />
            {values.audience.Team ? <span className="text-xs text-[#003145]/70">{values.audience.Team}</span> : null}
          </div>
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-semibold text-[#003145]">Tone</div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="inline-flex items-center gap-2">
            <Pill active={selectedTone === "Formal"} onClick={() => setSelectedTone("Formal")}>Formal</Pill>
            <EditBtn onClick={() => openEdit("tone", "Formal", values.tone.Formal)} />
            {values.tone.Formal ? <span className="text-xs text-[#003145]/70">{values.tone.Formal}</span> : null}
          </div>
          <div className="inline-flex items-center gap-2">
            <Pill active={selectedTone === "Informal"} onClick={() => setSelectedTone("Informal")}>Informal</Pill>
            <EditBtn onClick={() => openEdit("tone", "Informal", values.tone.Informal)} />
            {values.tone.Informal ? <span className="text-xs text-[#003145]/70">{values.tone.Informal}</span> : null}
          </div>
          <div className="inline-flex items-center gap-2">
            <Pill active={selectedTone === "Friendly"} onClick={() => setSelectedTone("Friendly")}>Friendly</Pill>
            <EditBtn onClick={() => openEdit("tone", "Friendly", values.tone.Friendly)} />
            {values.tone.Friendly ? <span className="text-xs text-[#003145]/70">{values.tone.Friendly}</span> : null}
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModalOpen(false)}>
          <div className="w-full max-w-md rounded-xl bg-white shadow-lg border p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-[#003145]">Set {modalType} value – {modalKey}</div>
              <button className="px-2 py-1 border rounded" onClick={() => setModalOpen(false)}>✕</button>
            </div>
            <input
              className="w-full px-3 py-2 rounded border border-[#003145]/30"
              placeholder="Enter a value to store…"
              value={modalValue}
              onChange={(e) => setModalValue(e.target.value)}
            />
            <div className="flex items-center justify-end gap-2 mt-3">
              <button className="px-3 py-1.5 rounded border" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="px-3 py-1.5 rounded bg-[#003145] text-white disabled:opacity-60" onClick={saveModal} disabled={!modalValue.trim()}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



