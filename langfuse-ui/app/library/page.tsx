"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { AnimatedSection } from "@/components/AnimatedSection";
import { AnimatedSearchBar, AnimatedFilterPill } from "@/components/AnimatedFilters";
import { useStaggerAnimation, useIntersectionAnimation } from "@/hooks/useAnimations";

type Workflow = {
  id: string;
  title: string;
  description: string;
  author: string;
  practice: string;
  access: "Public" | "Private";
  tags: string[];
  createdAt: string;
};

const SAMPLE_WORKFLOWS: Workflow[] = [
  {
    id: "translate",
    title: "Document Translation",
    description:
      "Upload all documents you want translated into your chosen language. The workflow will use DeepL to translate all files accordingly.",
    author: "Legora",
    practice: "Other",
    access: "Public",
    tags: ["Documents", "Translation", "DeepL"],
    createdAt: "2024-06-09T22:45:00Z",
  },
  {
    id: "structure-notes",
    title: "Structure My Meetings Notes and Outline Next Steps",
    description:
      "Use this prompt to structure the meeting notes and outline next steps.",
    author: "Legora",
    practice: "Other",
    access: "Public",
    tags: ["Meetings", "Outline"],
    createdAt: "2024-06-09T22:39:00Z",
  },
  {
    id: "compliance-check",
    title: "Internal Compliance Check",
    description:
      "Use this prompt to verify if this is compliant with our internal policies when uploaded to a certain database.",
    author: "Legora",
    practice: "Other",
    access: "Public",
    tags: ["Compliance", "Policy"],
    createdAt: "2024-06-09T22:25:00Z",
  },
];

const FILTERS = ["Favorites", "Created by me", "Osborne Clarke", "Legora"];

export default function LibraryPage(): JSX.Element {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<Workflow | null>(SAMPLE_WORKFLOWS[0]);

  const listRef = useStaggerAnimation("[data-list-item]", {}, true);
  const detailRef = useIntersectionAnimation({ y: 0, opacity: 1 });
  const rightPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rightPanelRef.current) return;
    gsap.fromTo(
      rightPanelRef.current,
      { x: 40, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.5, ease: "power2.out" }
    );
  }, [selected]);

  const filtered = useMemo(() => {
    const byQuery = (w: Workflow) =>
      [w.title, w.description, w.tags.join(" ")].join(" ").toLowerCase().includes(query.toLowerCase());
    const byFilter = (w: Workflow) => {
      if (!activeFilter) return true;
      if (activeFilter === "Favorites") return false;
      if (activeFilter === "Created by me") return false;
      if (activeFilter === "Osborne Clarke") return w.tags.includes("Osborne Clarke");
      if (activeFilter === "Legora") return true;
      return true;
    };
    return SAMPLE_WORKFLOWS.filter((w) => byQuery(w) && byFilter(w));
  }, [query, activeFilter]);

  return (
    <div className="h-full w-full flex">
      <aside className="w-72 shrink-0 border-r border-[#003145]/10 bg-white/70 backdrop-blur-sm">
        <div className="p-4">
          <button className="w-full mb-3 px-3 py-2 rounded-lg text-white bg-gradient-to-r from-[#FB5A17] to-[#FF8A50] shadow">
            + Create new
          </button>

          <div className="text-xs uppercase tracking-wide text-[#003145]/60 mb-2">Type</div>
          <nav className="space-y-1">
            <a className="block px-2 py-1.5 rounded hover:bg-[#003145]/5 cursor-pointer">All</a>
            <a className="block px-2 py-1.5 rounded bg-[#003145]/10 font-medium cursor-pointer">Prompts</a>
            <a className="block px-2 py-1.5 rounded hover:bg-[#003145]/5 cursor-pointer">Workflows</a>
          </nav>

          <div className="text-xs uppercase tracking-wide text-[#003145]/60 mt-6 mb-2">Filters</div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f, i) => (
              <AnimatedFilterPill key={f} index={i} label={f} active={activeFilter === f} onClick={() => setActiveFilter(activeFilter === f ? null : f)} />
            ))}
          </div>

          <div className="text-xs uppercase tracking-wide text-[#003145]/60 mt-6 mb-2">Categories</div>
          <ul className="space-y-1 text-sm">
            <li className="px-2 py-1 rounded hover:bg-[#003145]/5 cursor-pointer">M&A</li>
            <li className="px-2 py-1 rounded hover:bg-[#003145]/5 cursor-pointer">Word Add-in</li>
            <li className="px-2 py-1 rounded hover:bg-[#003145]/5 cursor-pointer">General Drafting</li>
            <li className="px-2 py-1 rounded hover:bg-[#003145]/5 cursor-pointer">Arbitration</li>
          </ul>
        </div>
      </aside>

      <main className="flex-1 grid grid-cols-[1fr_480px]">
        <section className="border-r border-[#003145]/10 p-6 overflow-y-auto">
          <AnimatedSection
            title="Library"
            count={filtered.length}
            countLabel="items"
            actionButton={
              <div className="hidden md:block text-sm text-[#003145]/60">Updated 09 Jun, 22:45</div>
            }
            backgroundGradient="from-[#003145]/[0.02] to-[#FB5A17]/[0.03]"
            titleGradient="from-[#003145] via-[#FB5A17] to-[#003145]"
          >
            <AnimatedSearchBar value={query} onChange={setQuery} />
            <div ref={listRef} className="space-y-3">
              {filtered.map((w) => (
                <button
                  key={w.id}
                  data-list-item
                  onClick={() => setSelected(w)}
                  className={`w-full text-left rounded-xl border px-4 py-3 bg-white/80 backdrop-blur-sm transition-shadow hover:shadow ${
                    selected?.id === w.id ? "border-[#FB5A17]/40" : "border-[#003145]/10"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-[#003145]">{w.title}</div>
                    <div className="text-xs text-[#003145]/60">{new Date(w.createdAt).toLocaleString()}</div>
                  </div>
                  <p className="text-sm text-[#003145]/70 mt-1 line-clamp-2">{w.description}</p>
                </button>
              ))}
            </div>
          </AnimatedSection>
        </section>

        <section ref={rightPanelRef} className="p-6 overflow-y-auto">
          {selected && (
            <div ref={detailRef as unknown as React.RefObject<HTMLDivElement>} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-[#003145]">{selected.title}</h2>
                <button className="px-4 py-2 rounded-lg text-white bg-[#003145] hover:bg-[#002535] transition">Use</button>
              </div>

              <div className="text-sm text-[#003145]/80">{selected.description}</div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-[#003145]/10 p-3 bg-white/70">
                  <div className="text-xs text-[#003145]/60">Author</div>
                  <div className="font-medium flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#003145]/10">⚙️</span>
                    {selected.author}
                  </div>
                </div>
                <div className="rounded-lg border border-[#003145]/10 p-3 bg-white/70">
                  <div className="text-xs text-[#003145]/60">Practice…</div>
                  <div className="font-medium">{selected.practice}</div>
                </div>
                <div className="rounded-lg border border-[#003145]/10 p-3 bg-white/70">
                  <div className="text-xs text-[#003145]/60">Access</div>
                  <div className="font-medium flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#003145]/10">☁️</span>
                    {selected.access}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-sm uppercase tracking-wide text-[#003145]/60 mb-2">Step 1 · Translate</div>
                <div className="rounded-xl border border-[#003145]/10 bg-white/80 p-4">
                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#003145]/5">
                      <span className="w-2 h-2 rounded-full bg-[#003145]" /> Translate
                    </span>
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FB5A17]/10 text-[#FB5A17]">Input Documents</span>
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FB5A17]/10 text-[#FB5A17]">Input Target language</span>
                  </div>
                  <p className="text-[#003145]/80 mt-3 text-sm">Translate this document into the selected language.</p>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}


