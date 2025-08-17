import { cookies } from "next/headers";
import fs from "fs";
import path from "path";

type AnalyticsEvent = {
  type: string;
  timestamp: string;
  username?: string;
  props?: Record<string, any>;
};

function getLogFilePath(): string {
  const envPath = process.env.ANALYTICS_LOG_FILE;
  if (envPath) return envPath;
  // Default to project root .analytics.log
  // __dirname is .../app/api/analytics, go up 3 levels to repo root by default
  const fallback = path.resolve(process.cwd(), ".analytics.log");
  return fallback;
}

export async function logServerEvent(type: string, props: Record<string, any> = {}): Promise<void> {
  try {
    const store = await cookies();
    const username = store.get("auth_user")?.value || "";
    const evt: AnalyticsEvent = {
      type,
      timestamp: new Date().toISOString(),
      username: username || undefined,
      props,
    };
    const line = JSON.stringify(evt) + "\n";
    const filePath = getLogFilePath();
    await fs.promises.appendFile(filePath, line, { encoding: "utf8" }).catch(() => {
      // If append fails (e.g., read-only FS), at least log to console
      console.log("[analytics]", line.trim());
    });
  } catch (err) {
    // Swallow to never break primary flows
    try {
      console.log("[analytics:error]", (err as Error)?.message);
    } catch {}
  }
}




