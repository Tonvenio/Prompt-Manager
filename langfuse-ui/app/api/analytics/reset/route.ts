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

export async function POST(req: NextRequest) {
  const store = await cookies();
  const username = store.get("auth_user")?.value || "";
  if (!ALLOWED_USERS.has(username)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const confirm = String(body?.confirm || "").trim().toLowerCase();
  if (confirm !== "delete analytics") {
    return new NextResponse("Confirmation phrase mismatch", { status: 400 });
  }

  try {
    const filePath = getLogFilePath();
    await fs.promises.writeFile(filePath, "", { encoding: "utf8" }).catch(async () => {
      // If write fails because file doesn't exist, ensure directory exists then create empty file
      try { await fs.promises.mkdir(path.dirname(filePath), { recursive: true }); } catch {}
      await fs.promises.writeFile(filePath, "", { encoding: "utf8" });
    });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    return new NextResponse("Failed to reset", { status: 500 });
  }
}



