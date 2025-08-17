"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type UserPrompt = {
  id: string;
  userId: string;
  title: string;
  content: string;
  legalArea: string;
  tags: string[];
  isPublic: boolean;
  version: number;
  promptLanguage?: string;
  targetLanguage?: string;
  createdAt: string;
  updatedAt: string;
};

export default function MyPromptsPage() {
  const [items, setItems] = useState<UserPrompt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState<UserPrompt | null>(null);
  const [form, setForm] = useState({
    title: "",
    content: "",
    legalArea: "",
    tags: "",
    isPublic: false as boolean,
    promptLanguage: "",
    targetLanguage: "",
  });

  async function load() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/user-prompts", { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      setItems(await res.json());
    } catch (e: any) {
      setError(e?.message || "Failed to load prompts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function startCreate() {
    setEditing(null);
    setForm({ title: "", content: "", legalArea: "", tags: "", isPublic: false, promptLanguage: "", targetLanguage: "" });
  }

  function startEdit(p: UserPrompt) {
    setEditing(p);
    setForm({
      title: p.title,
      content: p.content,
      legalArea: p.legalArea,
      tags: (p.tags || []).join(", "),
      isPublic: Boolean(p.isPublic),
      promptLanguage: p.promptLanguage || "",
      targetLanguage: p.targetLanguage || "",
    });
  }

  async function save() {
    const payload = {
      ...form,
      tags: form.tags.split(",").map(s => s.trim()).filter(Boolean),
    } as any;
    if (editing) payload.id = editing.id;
    const res = await fetch("/api/user-prompts", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    setEditing(null);
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this prompt?")) return;
    const res = await fetch(`/api/user-prompts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) alert("Failed to delete");
    await load();
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "my_prompts.json"; a.click();
    URL.revokeObjectURL(url);
  }

  async function exportTranslated() {
    // Fetch user-allowed languages from profile
    let allowed: string[] = [];
    try {
      const prof = await fetch("/api/auth/me", { cache: "no-store" }).then(r => r.json());
      const langs = Array.isArray(prof?.profile?.languages) ? prof.profile.languages : [];
      if (Array.isArray(langs)) allowed = langs.filter(Boolean);
    } catch {}
    const hint = allowed.length ? `One of: ${allowed.join(", ")}` : "(set in User Menu)";
    const initialLanguage = prompt(`Initial language (Prompt-Sprache)? ${hint}`) || "";
    const outputLanguage = prompt(`Output language (Zielsprache)? ${hint}`) || "";
    if (!outputLanguage) return;
    if (allowed.length && (!allowed.includes(outputLanguage) || (initialLanguage && !allowed.includes(initialLanguage)))) {
      alert("Please select languages from your User Menu first. Click 'Select languages' to set them.");
      return;
    }
    const res = await fetch("/api/user-prompts/export-translated", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initialLanguage, outputLanguage }),
    });
    if (!res.ok) { alert(await res.text()); return; }
    const json = await res.json();
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `my_prompts_${initialLanguage}_to_${outputLanguage}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  async function importJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const arr = JSON.parse(text);
      if (!Array.isArray(arr)) throw new Error("Invalid file");
      for (const p of arr) {
        await fetch("/api/user-prompts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: p.title,
            content: p.content,
            legalArea: p.legalArea,
            tags: Array.isArray(p.tags) ? p.tags : [],
            isPublic: Boolean(p.isPublic),
            promptLanguage: p.promptLanguage || "",
            targetLanguage: p.targetLanguage || "",
          }),
        });
      }
      await load();
      e.currentTarget.value = "";
    } catch {
      alert("Invalid JSON");
    }
  }

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [items]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#003145]">My Prompts</h1>
        <div className="flex items-center gap-2">
          <button className="px-3 py-2 border rounded bg-white" onClick={exportJson}>Export</button>
          <button className="px-3 py-2 border rounded bg-white" onClick={exportTranslated}>Export (translated)</button>
          <a className="text-sm text-[#003145] underline" href="#" onClick={(e) => { e.preventDefault(); (window as any).openUserMenu?.(); }}>Select languages</a>
          <label className="px-3 py-2 border rounded bg-white cursor-pointer">
            Import
            <input type="file" accept="application/json" className="hidden" onChange={importJson} />
          </label>
          <button className="px-3 py-2 rounded bg-[#003145] text-white" onClick={startCreate}>New Prompt</button>
        </div>
      </div>

      {error ? <div className="p-3 bg-red-50 border border-red-200 rounded">{error}</div> : null}

      {editing !== null && (
        <div className="border rounded bg-white p-4 space-y-3">
          <div className="flex items-center justify-between"><div className="font-medium">{editing ? "Edit Prompt" : "New Prompt"}</div><button className="px-2 py-1 border rounded" onClick={() => setEditing(null)}>×</button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Title</label>
              <input className="w-full px-3 py-2 border rounded" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Legal Area</label>
              <input className="w-full px-3 py-2 border rounded" value={form.legalArea} onChange={(e) => setForm({ ...form, legalArea: e.target.value })} placeholder="e.g. Contract Law" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Prompt Language</label>
              <input className="w-full px-3 py-2 border rounded" value={form.promptLanguage} onChange={(e) => setForm({ ...form, promptLanguage: e.target.value })} placeholder="Deutsch/Englisch/…" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Target Language</label>
              <input className="w-full px-3 py-2 border rounded" value={form.targetLanguage} onChange={(e) => setForm({ ...form, targetLanguage: e.target.value })} placeholder="Deutsch/Englisch/…" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Tags (comma-separated)</label>
            <input className="w-full px-3 py-2 border rounded" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="e.g. GDPR, Contract" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Content</label>
            <textarea className="w-full h-48 p-3 border rounded" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Write your prompt here…" />
          </div>
          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.isPublic} onChange={(e) => setForm({ ...form, isPublic: e.target.checked })} /> Make public</label>
            <div className="flex items-center gap-2">
              <button className="px-3 py-2 border rounded" onClick={() => setEditing(null)}>Cancel</button>
              <button className="px-3 py-2 rounded bg-[#003145] text-white" onClick={() => save().catch(err => alert(err.message || "Failed to save"))}>{editing ? "Save version" : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      <div className="border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Title</th>
              <th className="p-2 text-left">Legal area</th>
              <th className="p-2 text-left">Languages</th>
              <th className="p-2 text-left">Version</th>
              <th className="p-2 text-left">Updated</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-2 font-medium">{p.title}</td>
                <td className="p-2">{p.legalArea || "—"}</td>
                <td className="p-2">{[p.promptLanguage, p.targetLanguage].filter(Boolean).join(" → ") || "—"}</td>
                <td className="p-2">{p.version}</td>
                <td className="p-2">{new Date(p.updatedAt).toLocaleString()}</td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <button className="px-2 py-1 border rounded" onClick={() => startEdit(p)}>Edit</button>
                    <button className="px-2 py-1 border rounded" onClick={() => remove(p.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {!sorted.length && (
              <tr><td className="p-3 text-[#003145]/60" colSpan={6}>No prompts yet. Create your first one.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-sm text-[#003145]/70">Tip: Use language fields for Prompt-Sprache and Zielsprache to manage both separately.</div>
    </div>
  );
}


