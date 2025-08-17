import Link from "next/link";
import { cookies } from "next/headers";
import { lfAuthHeader, lfHost, lfJson } from "../../api/langfuse/_lib";
import { TagBubbles } from "./TagBubbles";
import { EditablePromptMount } from "./EditablePromptMount";
import UserMenuMount from "./UserMenuMount";
import { ImproveClientMount } from "./ImproveClientMount";
import { SharePromptButton } from "./SharePromptButton";
import { HeaderBanner } from "../../components/HeaderBanner";
import { Comments } from "./Comments";
import AudienceToneControls from "./AudienceToneControls";

function toWebhookUrl(promptText: string) {
  const base = "https://mac.broadbill-little.ts.net/webhook/prompt-optimizer";
  const qs = new URLSearchParams({ prompt: promptText }).toString();
  return `${base}?${qs}`;
}

export default async function PromptDetails({ params }: { params: Promise<{ name: string }> }) {
  const awaitedParams = await params;
  const decodedName = decodeURIComponent(awaitedParams.name);
  const url = `${lfHost()}/api/public/v2/prompts/${encodeURIComponent(decodedName)}?label=latest`;
  const data = await lfJson(url, { headers: { ...lfAuthHeader() }, cache: "no-store" });

  const promptContent = typeof data.prompt === "string" ? data.prompt : JSON.stringify(data.prompt);
  const webhookUrl = toWebhookUrl(promptContent);
  const langfuseHost = process.env.NEXT_PUBLIC_LANGFUSE_HOST ?? "https://cloud.langfuse.com";
  const langfuseProjectId = process.env.NEXT_PUBLIC_LANGFUSE_PROJECT_ID ?? "cme8h4vhc00hyad07zxdjl8yy";

  // Determine if current user submitted this prompt (case-insensitive)
  const store = await cookies();
  const currentUsername = (store.get("auth_user")?.value || "").trim().toLowerCase();
  const isSubmittedByUser = Array.isArray(data.tags) && data.tags.some((t: string) => {
    const [cat, val] = String(t).split('>').map((s) => s.trim());
    return cat === 'SubmittedBy' && String(val || '').trim().toLowerCase() === currentUsername;
  });

  const parts = decodedName.split('/');
  const title = parts[1] ? parts.slice(1).join('/') : decodedName;
  const subtitle = parts[1] ? parts[0] : undefined;

  // Track server-side view (username via cookie)
  try { await import("../../api/analytics/_server").then(m => m.logServerEvent("prompt_view", { name: decodedName })); } catch {}

  return (
    <div>
      <HeaderBanner title={title} subtitle={subtitle} />
      <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-start gap-3">
        <Link href="/prompts" className="px-3 py-1 border rounded brand-button">← Back</Link>
        <UserMenuMount areaOptions={Array.from(new Set((data.tags || []).map((t: string) => {
          const [cat, val] = String(t).split('>').map((s: string) => s.trim());
          return cat === 'Area_or_PG' ? val : '';
        }).filter(Boolean)))} languageOptions={["Deutsch","Englisch","Französisch","Spanisch","Italienisch"]} />
        <div className="ml-auto flex flex-col items-end gap-2">
          <Link href="/ranking" className="px-3 py-1 border rounded brand-button">User ranking</Link>
          <a
            className="px-3 py-1 border rounded brand-button"
            href={`${langfuseHost}/project/${langfuseProjectId}/prompts/${encodeURIComponent(decodedName)}`}
            target="_blank"
            rel="noreferrer"
          >
            Open in Langfuse
          </a>
          <details className="mt-1 w-full max-w-sm">
            <summary className="cursor-pointer text-sm">Raw prompt JSON</summary>
            <pre className="mt-2 p-2 bg-gray-50 border rounded text-xs overflow-auto max-h-64">
              {JSON.stringify(data, null, 2)}
            </pre>
          </details>
          <div className="text-xs text-[#003145]/70"><b>Labels:</b> {(data.labels || []).join(", ") || "—"}</div>
          <div className="text-xs text-[#003145]/70"><b>Version:</b> {data.version}</div>
        </div>
        {/* Use Prompt button intentionally hidden here per request */}
      </div>
      {/* Raw prompt JSON moved to top-right under Open in Langfuse */}

      {/* Audience & Tone controls (above prompt) */}
      <div className="mt-4">
        <AudienceToneControls name={decodedName} />
      </div>

      <div className="space-y-1">
        <div className="font-semibold text-[#003145]">Prompt</div>
        {isSubmittedByUser && (
          <div className="inline-flex items-center gap-2 text-[#FB5A17] text-sm" title="You submitted this">
            <span>★</span>
            <span>This prompt was submitted by you.</span>
          </div>
        )}
      </div>
      {/* Editable prompt sits directly below header; label shown above already */}
      <div className="mt-2">
        <EditablePromptMount name={decodedName} initialText={promptContent} hideLabel tags={data.tags || []} />
      </div>

      {/* Labels moved to the top-right stack */}

      <div className="flex items-start gap-2">
        <b className="mt-1">Tags:</b>
        <TagBubbles name={decodedName} initialTags={data.tags || []} />
      </div>

      {/* Public comments */}
      <Comments name={decodedName} />

      {/* Supporting agents section removed as buttons are moved up next to editor */}
      </div>
    </div>
  );
}
// client mount moved to separate file


