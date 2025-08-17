import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AnalyticsClient from "./AnalyticsClient";

const ALLOWED = new Set<string>([
  "marc.ohrendorf",
  "gereon.abendroth",
  "christian.braun",
  "alexander.lilienthal",
]);

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

export default async function AnalyticsPage() {
  const store = await cookies();
  const user = store.get("auth_user")?.value || "";
  if (!ALLOWED.has(user)) {
    redirect("/prompts");
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold text-[#003145]">Analytics</h1>
      <AnalyticsClient initialDays={30} />
    </div>
  );
}


