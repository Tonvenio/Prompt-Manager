"use client";

import { useEffect, useMemo, useState } from "react";

type Comment = {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  reactions?: Record<string, number>;
};

// Limit to the 6 most important emojis for both composer and reactions
const EMOJIS = ["👍", "❤️", "🎉", "💡", "🔥", "👏"];

export function Comments({ name }: { name: string }) {
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [emojiCounts, setEmojiCounts] = useState<Record<string, number>>({});
  const [reactingId, setReactingId] = useState<string>("");

  async function load() {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/comments/${encodeURIComponent(name)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      const list: Comment[] = Array.isArray(json?.data) ? json.data : [];
      setComments(list);
      // Count emojis
      const counts: Record<string, number> = {};
      for (const c of list) {
        for (const e of EMOJIS) {
          const n = (c.text.match(new RegExp(e, "g")) || []).length;
          if (n) counts[e] = (counts[e] || 0) + n;
        }
      }
      setEmojiCounts(counts);
    } catch (e: any) {
      setError(e?.message || "Failed to load comments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable react-hooks/exhaustive-deps */ }, [name]);

  const topSix = useMemo(() => {
    return Object.entries(emojiCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [emojiCounts]);

  async function submit() {
    const t = text.trim();
    if (!t) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/comments/${encodeURIComponent(name)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t }),
      });
      if (!res.ok) throw new Error(await res.text());
      setText("");
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to submit");
    } finally {
      setLoading(false);
    }
  }

  function insertEmoji(emoji: string) {
    setText((v) => `${v}${emoji}`);
  }

  async function react(commentId: string, emoji: string) {
    setReactingId(commentId);
    try {
      const res = await fetch(`/api/comments/${encodeURIComponent(name)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction: { id: commentId, emoji } }),
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (e) {
      // ignore errors
    } finally {
      setReactingId("");
    }
  }

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-base font-semibold text-[#003145]">Comments</div>
        <div className="flex items-center gap-2 text-sm">
          {topSix.length > 0 && <span className="text-[#003145]/60">Top emojis:</span>}
          {topSix.map(([e, n]) => (
            <span key={e} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#003145]/10 text-[#003145]">
              <span>{e}</span>
              <span className="text-[11px]">{n}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[#003145]/10 bg-white/70 p-3">
        <textarea
          className="w-full p-2 rounded border border-[#003145]/20"
          placeholder="Add a public comment…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
        />
        <div className="flex items-center justify-between mt-2">
          <div className="flex flex-wrap gap-2">
            {EMOJIS.map((e) => (
              <button
                type="button"
                key={e}
                onClick={() => insertEmoji(e)}
                title={e}
                className="px-2 py-1 rounded bg-white border border-[#003145]/20 hover:bg-[#003145]/5"
              >
                {e}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={loading || !text.trim()}
            className="px-3 py-1.5 rounded text-white bg-[#003145] hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Posting…" : "Post"}
          </button>
        </div>
        {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
      </div>

      <div className="space-y-2">
        {comments.map((c) => (
          <div key={c.id} className="p-3 rounded-xl border border-[#003145]/10 bg-white/70">
            <div className="text-sm text-[#003145]/60 flex items-center justify-between">
              <span>{c.author || "Anonymous"}</span>
              <span>{new Date(c.createdAt).toLocaleString()}</span>
            </div>
            <div className="mt-1 whitespace-pre-wrap">{c.text}</div>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  className={`px-2 py-1 rounded border ${reactingId === c.id ? 'opacity-50' : 'bg-white'} border-[#003145]/20 hover:bg-[#003145]/5`}
                  disabled={!!reactingId}
                  onClick={() => react(c.id, e)}
                  title={`React ${e}`}
                >
                  <span className="mr-1">{e}</span>
                  <span className="text[11px] text-[#003145]/70">{c.reactions?.[e] || 0}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
        {/* Intentionally hide the empty-state text when there are no comments */}
      </div>
    </div>
  );
}


