"use client";

import { useEffect, useMemo, useState } from "react";

type Summary = {
  since: string;
  overall: { users: number; totalLogins: number; totalActiveMs: number };
  perUser: Record<string, {
    logins: number;
    loginTimestamps: string[];
    activeMs: number;
    promptViews: Record<string, number>;
    promptUses: { total: number; byTool: Record<string, number> };
  }>;
};

function msToH(ms: number) {
  return (ms / (1000 * 60 * 60)).toFixed(2);
}

export default function AnalyticsClient({ initialDays = 30 }: { initialDays?: number }) {
  const [days, setDays] = useState<number>(initialDays);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [data, setData] = useState<Summary | null>(null);
  const [resetText, setResetText] = useState<string>("");
  const [resetBusy, setResetBusy] = useState<boolean>(false);
  const [showReset, setShowReset] = useState<boolean>(false);

  async function load(d: number) {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/analytics/summary?days=${encodeURIComponent(String(d))}`, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const json: Summary = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(days); /* eslint-disable react-hooks/exhaustive-deps */ }, [days]);

  const users = useMemo(() => {
    if (!data) return [] as Array<[string, Summary["perUser"][string]]>;
    return Object.entries(data.perUser).sort((a, b) => b[1].activeMs - a[1].activeMs);
  }, [data]);

  const topPrompts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!data) return [] as Array<[string, number]>;
    for (const u of Object.values(data.perUser)) {
      for (const [name, n] of Object.entries(u.promptViews)) {
        counts[name] = (counts[name] || 0) + n;
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [data]);

  const toolsUsage = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!data) return [] as Array<[string, number]>;
    for (const u of Object.values(data.perUser)) {
      for (const [tool, n] of Object.entries(u.promptUses.byTool)) {
        counts[tool] = (counts[tool] || 0) + n;
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [data]);

  const maxPromptCount = topPrompts.length ? Math.max(...topPrompts.map(([, n]) => n)) : 1;
  const maxToolCount = toolsUsage.length ? Math.max(...toolsUsage.map(([, n]) => n)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm">Range</label>
          <select
            className="px-2 py-1 border rounded"
            value={String(days)}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <a
            href={`/api/analytics/export?days=${encodeURIComponent(String(days))}`}
            className="ml-2 px-3 py-1.5 border rounded bg-white hover:bg-gray-50"
          >
            Download CSV
          </a>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 border rounded bg-white hover:bg-gray-50"
            onClick={() => load(days)}
            disabled={loading}
          >
            {loading ? "Loading…" : "Reload"}
          </button>
          <button
            className="px-3 py-1.5 border rounded bg-white hover:bg-gray-50"
            onClick={() => { setResetText(""); setShowReset(true); }}
          >
            Reset
          </button>
        </div>
      </div>

      {error ? (
        <div className="p-3 border border-red-300 bg-red-50 rounded">{error}</div>
      ) : null}

      {showReset && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setShowReset(false)}>
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Reset analytics</h3>
              <button className="px-2 py-1 border rounded" onClick={() => setShowReset(false)}>×</button>
            </div>
            <div className="space-y-3">
              <div className="text-sm text-[#003145]/80">This will permanently truncate the analytics log. Type <code>delete analytics</code> to confirm.</div>
              <input
                className="w-full px-3 py-2 rounded border border-[#003145]/30"
                placeholder="delete analytics"
                value={resetText}
                onChange={(e) => setResetText(e.target.value)}
              />
              <div className="flex items-center justify-end gap-2">
                <button className="px-3 py-2 rounded border" onClick={() => setShowReset(false)}>Cancel</button>
                <button
                  className="px-3 py-2 rounded bg-[#003145] text-white disabled:opacity-50"
                  disabled={resetText.trim().toLowerCase() !== "delete analytics" || resetBusy}
                  onClick={async () => {
                    setResetBusy(true);
                    try {
                      const res = await fetch("/api/analytics/reset", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ confirm: resetText }),
                      });
                      if (!res.ok) throw new Error(await res.text());
                      setResetText("");
                      setShowReset(false);
                      await load(days);
                    } catch (e) {
                      alert("Failed to reset");
                    } finally {
                      setResetBusy(false);
                    }
                  }}
                >
                  {resetBusy ? "Resetting…" : "Confirm reset"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 border rounded bg-white">
              <div className="text-sm text-[#003145]/70">Active users</div>
              <div className="text-2xl font-semibold">{data.overall.users}</div>
            </div>
            <div className="p-4 border rounded bg-white">
              <div className="text-sm text-[#003145]/70">Total logins</div>
              <div className="text-2xl font-semibold">{data.overall.totalLogins}</div>
            </div>
            <div className="p-4 border rounded bg-white">
              <div className="text-sm text-[#003145]/70">Total active hours</div>
              <div className="text-2xl font-semibold">{msToH(data.overall.totalActiveMs)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 border rounded bg-white">
              <div className="mb-2 font-medium text-[#003145]">Top viewed prompts</div>
              <div className="space-y-2">
                {topPrompts.length ? topPrompts.map(([name, n]) => (
                  <div key={name} className="flex items-center gap-2">
                    <div className="shrink-0 w-10 text-right text-sm text-[#003145]/70">×{n}</div>
                    <div className="flex-1 h-3 rounded bg-gray-100 overflow-hidden">
                      <div className="h-3 bg-[#FB5A17]" style={{ width: `${(n / maxPromptCount) * 100}%` }} />
                    </div>
                    <div className="w-1/2 truncate" title={name}>{name}</div>
                  </div>
                )) : <div className="text-[#003145]/60">No data</div>}
              </div>
            </div>

            <div className="p-4 border rounded bg-white">
              <div className="mb-2 font-medium text-[#003145]">Prompt uses by tool</div>
              <div className="space-y-2">
                {toolsUsage.length ? toolsUsage.map(([tool, n]) => (
                  <div key={tool} className="flex items-center gap-2">
                    <div className="shrink-0 w-10 text-right text-sm text-[#003145]/70">×{n}</div>
                    <div className="flex-1 h-3 rounded bg-gray-100 overflow-hidden">
                      <div className="h-3 bg-[#003145]" style={{ width: `${(n / maxToolCount) * 100}%` }} />
                    </div>
                    <div className="w-1/3 truncate" title={tool}>{tool}</div>
                  </div>
                )) : <div className="text-[#003145]/60">No data</div>}
              </div>
            </div>
          </div>

          <div className="overflow-auto border rounded">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left">User</th>
                  <th className="p-2 text-left">Logins</th>
                  <th className="p-2 text-left">Active h</th>
                  <th className="p-2 text-left">Top prompt views</th>
                  <th className="p-2 text-left">Uses (by tool)</th>
                </tr>
              </thead>
              <tbody>
                {users.map(([u, s]) => {
                  const topViews = Object.entries(s.promptViews).sort((a, b) => b[1] - a[1]).slice(0, 5);
                  const uses = Object.entries(s.promptUses.byTool).sort((a, b) => b[1] - a[1]);
                  return (
                    <tr key={u} className="border-t">
                      <td className="p-2 font-medium">{u}</td>
                      <td className="p-2">{s.logins}</td>
                      <td className="p-2">{msToH(s.activeMs)}</td>
                      <td className="p-2">
                        {topViews.length ? topViews.map(([name, n]) => (
                          <div key={name}>{name} <span className="text-[#003145]/60">×{n}</span></div>
                        )): <span className="text-[#003145]/60">—</span>}
                      </td>
                      <td className="p-2">
                        {uses.length ? uses.map(([k, n]) => (
                          <span key={k} className="inline-flex items-center gap-1 mr-2 px-2 py-0.5 rounded-full bg-blue-100 text-blue-900">{k}: {n}</span>
                        )) : <span className="text-[#003145]/60">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}


