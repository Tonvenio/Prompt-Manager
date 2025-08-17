import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const store = await cookies();
    const username = store.get("auth_user")?.value || "";

    // Expected username format: First.Last
    let firstName = "";
    let lastName = "";
    if (username) {
      const parts = username.split(".");
      firstName = parts[0] || "";
      lastName = parts.slice(1).join(".") || "";
    }

    const url = new URL("https://mac.broadbill-little.ts.net/webhook/oc-context-personalizer");
    url.searchParams.set("firstName", firstName);
    url.searchParams.set("lastName", lastName);

    const res = await fetch(url.toString(), { method: "POST" });

    if (!res.ok) {
      return NextResponse.json({ error: "personalizer_failed" }, { status: 502 });
    }

    const raw = await res.text();
    let context = raw;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null) {
        const obj = parsed as Record<string, unknown>;
        const candidate = obj.output ?? obj.result ?? obj.text;
        if (typeof candidate === "string") {
          context = candidate;
        }
      } else if (typeof parsed === "string") {
        context = parsed;
      }
    } catch {
      // not JSON, keep raw text
    }
    return NextResponse.json({ context });
  } catch {
    return NextResponse.json({ error: "unexpected_error" }, { status: 500 });
  }
}


