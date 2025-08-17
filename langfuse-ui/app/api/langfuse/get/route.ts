import { NextRequest, NextResponse } from "next/server";
import { lfAuthHeader, lfHost, lfJson } from "../_lib";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const promptName = searchParams.get("promptName");
  const label = searchParams.get("label");   // optional
  const version = searchParams.get("version"); // optional

  if (!promptName) {
    return new NextResponse("Missing promptName", { status: 400 });
  }

  const qs = new URLSearchParams();
  if (version) {
    qs.set("version", version);
  } else {
    qs.set("label", label ?? "latest");
  }

  const url = `${lfHost()}/api/public/v2/prompts/${encodeURIComponent(promptName)}${qs.size ? `?${qs.toString()}` : ""}`;
  const data = await lfJson(url, { headers: { ...lfAuthHeader() }, cache: "no-store" });
  return NextResponse.json(data);
}


