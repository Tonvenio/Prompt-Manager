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

function getLogFilePath(): string {
  const envPath = process.env.ANALYTICS_LOG_FILE;
  if (envPath) return envPath;
  return path.resolve(process.cwd(), ".analytics.log");
}

export async function GET(req: NextRequest) {
  const store = await cookies();
  const username = store.get("auth_user")?.value || "";
  if (!ALLOWED_USERS.has(username)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const days = Number(searchParams.get("days") || "30");
  const sinceMs = Date.now() - Math.max(1, days) * 24 * 60 * 60 * 1000;

  const filePath = getLogFilePath();
  const raw = await fs.promises.readFile(filePath, "utf8").catch(() => "");
  const lines = raw.split("\n").filter(Boolean);
  const rows: string[] = [];
  rows.push(["timestamp","username","type","name","key","path","ua","ip"].join(","));
  for (const line of lines) {
    try {
      const ev = JSON.parse(line);
      const ts = Date.parse(ev.timestamp || ev.props?._ts || "");
      if (!Number.isFinite(ts) || ts < sinceMs) continue;
      const row = [
        new Date(ts).toISOString(),
        JSON.stringify(ev.username || ev.props?.username || "").slice(1,-1),
        JSON.stringify(ev.type || "").slice(1,-1),
        JSON.stringify(ev.props?.name || "").slice(1,-1),
        JSON.stringify(ev.props?.key || "").slice(1,-1),
        JSON.stringify(ev.props?._path || ev.props?.path || "").slice(1,-1),
        JSON.stringify(ev.props?._ua || "").slice(1,-1),
        JSON.stringify(ev.props?._ip || "").slice(1,-1),
      ].join(",");
      rows.push(row);
    } catch {}
  }

  const csv = rows.join("\n");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="analytics_${days}d.csv"`,
      "Cache-Control": "no-store",
    },
  });
}



