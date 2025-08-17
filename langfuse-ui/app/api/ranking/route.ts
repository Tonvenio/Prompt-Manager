import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

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

export async function GET(_req: NextRequest) {
  // Aggregate analytics heartbeats and prompt_use
  let events: LogEvent[] = [];
  try {
    const raw = await fs.promises.readFile(getLogFilePath(), "utf8").catch(() => "");
    events = parseLines(raw);
  } catch {}

  const sinceMs = Date.now() - 90 * 24 * 60 * 60 * 1000; // last 90 days window
  const heartbeatsByUser: Record<string, number[]> = {};
  const copiesByUser: Record<string, number> = {};

  for (const e of events) {
    const ts = Date.parse(e.timestamp || (e.props as any)?._ts || "");
    if (!Number.isFinite(ts) || ts < sinceMs) continue;
    const user = String(e.username || (e.props as any)?.username || "").trim();
    if (!user) continue;
    if (e.type === "heartbeat") {
      (heartbeatsByUser[user] ||= []).push(ts);
    } else if (e.type === "prompt_use") {
      copiesByUser[user] = (copiesByUser[user] || 0) + 1;
    }
  }

  const activeMsByUser: Record<string, number> = {};
  const GAP = 45000; // ms between heartbeats
  for (const [u, stamps] of Object.entries(heartbeatsByUser)) {
    stamps.sort((a, b) => a - b);
    let total = 0;
    for (let i = 1; i < stamps.length; i++) {
      const d = stamps[i] - stamps[i - 1];
      if (d > 0 && d <= GAP) total += d;
    }
    activeMsByUser[u] = total;
  }

  // Aggregate comments and reactions from the in-memory comments store
  const globalAny: any = global as any;
  const store = (globalAny.__commentsStore || {}) as Record<string, Array<{ id: string; author: string; reactions?: Record<string, number>; reactByUser?: Record<string, number> }>>;

  const commentsGiven: Record<string, number> = {};
  const reactionsGiven: Record<string, number> = {};
  const reactionsReceived: Record<string, number> = {};

  for (const items of Object.values(store)) {
    for (const c of items) {
      const author = String(c.author || "").trim();
      if (author) commentsGiven[author] = (commentsGiven[author] || 0) + 1;
      // reactions received by author
      if (author && c.reactions) {
        const rcv = Object.values(c.reactions).reduce((s, n) => s + Number(n || 0), 0);
        reactionsReceived[author] = (reactionsReceived[author] || 0) + rcv;
      }
      // reactions given by individual users (only to others' comments)
      if (c.reactByUser) {
        for (const [user, n] of Object.entries(c.reactByUser)) {
          if (!user) continue;
          if (user === author) continue; // do not count reactions to own comment
          reactionsGiven[user] = (reactionsGiven[user] || 0) + Number(n || 0);
        }
      }
    }
  }

  // Collect all users observed anywhere
  const users = new Set<string>([
    ...Object.keys(activeMsByUser),
    ...Object.keys(copiesByUser),
    ...Object.keys(commentsGiven),
    ...Object.keys(reactionsGiven),
    ...Object.keys(reactionsReceived),
  ].filter(Boolean));

  const rows = Array.from(users).map((u) => {
    const activeMs = activeMsByUser[u] || 0;
    const activePts = Math.min(Math.round(activeMs / 300000), 20); // +1 per 5m, cap 20
    const copied = copiesByUser[u] || 0;
    const comments = commentsGiven[u] || 0;
    const rGiven = reactionsGiven[u] || 0;
    const rRecv = reactionsReceived[u] || 0;
    const karma = activePts + copied * 1 + comments * 2 + rGiven * 2 + rRecv * 3;
    return { username: u, activeMs, copied, comments, reactionsGiven: rGiven, reactionsReceived: rRecv, karma };
  }).sort((a, b) => b.karma - a.karma);

  return NextResponse.json({ data: rows });
}



