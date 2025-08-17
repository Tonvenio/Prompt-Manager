import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";

const ALLOWED_USERS = new Set<string>([
  "marc.ohrendorf",
  "gereon.abendroth",
  "christian.braun",
  "alexander.lilienthal",
]);

type LogEvent = {
  type: string;
  timestamp: string;
  username?: string;
  props?: Record<string, any>;
};

function getLogFilePath(): string {
  const envPath = process.env.ANALYTICS_LOG_FILE;
  if (envPath) return envPath;
  return path.resolve(process.cwd(), ".analytics.log");
}

function parseLines(raw: string): LogEvent[] {
  const out: LogEvent[] = [];
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try { out.push(JSON.parse(t)); } catch { /* ignore bad lines */ }
  }
  return out;
}

function summarize(events: LogEvent[], sinceMs: number) {
  const perUser: Record<string, any> = {};

  function ensureUser(u: string) {
    if (!perUser[u]) {
      perUser[u] = {
        logins: 0,
        loginTimestamps: [] as string[],
        activeMs: 0,
        promptViews: {} as Record<string, number>,
        promptUses: { total: 0, byTool: {} as Record<string, number> },
      };
    }
    return perUser[u];
  }

  // Heartbeats per user to compute active time
  const heartbeatsByUser: Record<string, number[]> = {};

  for (const e of events) {
    const ts = Date.parse(e.timestamp || (e.props as any)?._ts || "");
    if (!Number.isFinite(ts) || ts < sinceMs) continue;
    const username = String(e.username || (e.props as any)?.username || "").trim();
    if (!username) continue;
    const u = ensureUser(username);

    if (e.type === "login" || e.type === "login_success") {
      u.logins += 1;
      u.loginTimestamps.push(new Date(ts).toISOString());
    } else if (e.type === "heartbeat") {
      (heartbeatsByUser[username] ||= []).push(ts);
    } else if (e.type === "prompt_view") {
      const name = String(e.props?.name || "");
      if (name) u.promptViews[name] = (u.promptViews[name] || 0) + 1;
    } else if (e.type === "prompt_use") {
      const key = String(e.props?.key || "copy");
      u.promptUses.total += 1;
      u.promptUses.byTool[key] = (u.promptUses.byTool[key] || 0) + 1;
    }
  }

  // Active time: sum deltas between consecutive heartbeats when gap <= 45s
  const GAP_THRESHOLD_MS = 45000;
  for (const [user, stamps] of Object.entries(heartbeatsByUser)) {
    stamps.sort((a, b) => a - b);
    let total = 0;
    for (let i = 1; i < stamps.length; i++) {
      const delta = stamps[i] - stamps[i - 1];
      if (delta > 0 && delta <= GAP_THRESHOLD_MS) total += delta;
    }
    const u = ensureUser(user);
    u.activeMs = total;
  }

  const overall = {
    users: Object.keys(perUser).length,
    totalLogins: Object.values(perUser).reduce((s: number, u: any) => s + u.logins, 0),
    totalActiveMs: Object.values(perUser).reduce((s: number, u: any) => s + (u.activeMs || 0), 0),
  };

  return { perUser, overall };
}

export async function GET(req: NextRequest) {
  const store = await cookies();
  const username = store.get("auth_user")?.value || "";
  if (!ALLOWED_USERS.has(username)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const days = Number(searchParams.get("days") || "30");
  const now = Date.now();
  const sinceMs = now - Math.max(1, days) * 24 * 60 * 60 * 1000;

  try {
    const filePath = getLogFilePath();
    const raw = await fs.promises.readFile(filePath, "utf8").catch(() => "");
    const events = parseLines(raw);
    const summary = summarize(events, sinceMs);
    return NextResponse.json({ since: new Date(sinceMs).toISOString(), ...summary });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "failed" }, { status: 500 });
  }
}



