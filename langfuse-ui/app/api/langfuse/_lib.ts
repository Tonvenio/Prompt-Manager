// Server-only helpers for Langfuse API calls (Basic Auth)
export function lfAuthHeader() {
  const pub = process.env.LANGFUSE_PUBLIC_KEY!;
  const sec = process.env.LANGFUSE_SECRET_KEY!;
  const token = Buffer.from(`${pub}:${sec}`).toString("base64");
  return { Authorization: `Basic ${token}` };
}

export function lfHost() {
  return process.env.LANGFUSE_HOST ?? "https://cloud.langfuse.com";
}

export async function lfJson(input: RequestInfo, init?: RequestInit) {
  const res = await fetch(input, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Langfuse ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}


