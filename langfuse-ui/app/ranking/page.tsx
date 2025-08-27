import Link from "next/link";
import { headers } from "next/headers";

type Row = {
  username: string;
  activeMs: number;
  copied: number;
  comments: number;
  reactionsGiven: number;
  reactionsReceived: number;
  karma: number;
};

function fmt(n: number) { return new Intl.NumberFormat().format(n); }

export default async function RankingPage() {
  // Build absolute URL for server-side fetch to avoid "Failed to parse URL" in some runtimes
  const h = await headers();
  const proto = h.get("x-forwarded-proto") || "http";
  const host = h.get("host") || "localhost:3000";
  const base = process.env.NEXT_PUBLIC_BASE_URL || `${proto}://${host}`;
  let rows: Row[] = [];
  try {
    const res = await fetch(`${base}/api/ranking`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      rows = Array.isArray(json?.data) ? json.data : [];
    }
  } catch {
    // ignore – show empty state
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#003145]">User Ranking</h1>
        <Link className="px-3 py-2 border rounded" href="/prompts">← Back to prompts</Link>
      </div>

      <div className="text-sm text-[#003145]/70">KarmaPoints are computed from activity: time in app (hidden), copies, comments, reactions given and received.</div>

      <div className="border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Rank</th>
              <th className="p-2 text-left">User</th>
              <th className="p-2 text-left">Copied</th>
              <th className="p-2 text-left">Comments</th>
              <th className="p-2 text-left">Reactions given</th>
              <th className="p-2 text-left">Reactions received</th>
              <th className="p-2 text-left">KarmaPoints</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.username} className="border-t">
                <td className="p-2">{i + 1}</td>
                <td className="p-2 font-medium">{r.username}</td>
                <td className="p-2">{fmt(r.copied)}</td>
                <td className="p-2">{fmt(r.comments)}</td>
                <td className="p-2">{fmt(r.reactionsGiven)}</td>
                <td className="p-2">{fmt(r.reactionsReceived)}</td>
                <td className="p-2 font-semibold">{fmt(r.karma)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="p-3 text-[#003145]/60" colSpan={7}>No data yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


