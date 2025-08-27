"use client";

import { useEffect, useState } from "react";

type Comment = { id: string; author: string; text: string; createdAt: string; reactions?: Record<string, number> };

export default function LibraryComments({ name }: { name: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      const res = await fetch(`/api/comments/${encodeURIComponent(name)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const j = await res.json();
      setComments(Array.isArray(j?.data) ? j.data : []);
    } catch (e: any) { setError(e?.message || "Failed to load comments"); }
  }

  useEffect(() => { load(); /* eslint-disable react-hooks/exhaustive-deps */ }, [name]);

  async function submit() {
    const val = text.trim();
    if (!val) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/comments/${encodeURIComponent(name)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: val }) });
      if (!res.ok) throw new Error(await res.text());
      setText("");
      await load();
    } catch (e: any) { setError(e?.message || "Failed to post"); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input className="flex-1 px-3 py-2 rounded border" value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a comment" />
        <button className="px-3 py-2 rounded bg-[#003145] text-white" onClick={submit} disabled={loading}>{loading ? "Posting…" : "Post"}</button>
      </div>
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      <div className="space-y-2">
        {comments.map((c) => (
          <div key={c.id} className="p-3 rounded border bg-white">
            <div className="text-xs text-[#003145]/60">{c.author} · {new Date(c.createdAt).toLocaleString()}</div>
            <div className="text-sm">{c.text}</div>
          </div>
        ))}
        {comments.length === 0 && <div className="text-sm text-[#003145]/60">No comments yet.</div>}
      </div>
    </div>
  );
}
