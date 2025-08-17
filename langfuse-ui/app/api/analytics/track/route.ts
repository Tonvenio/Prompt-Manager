import { NextRequest, NextResponse } from "next/server";
import { logServerEvent } from "../_server";

type IncomingEvent = {
  type: string;
  timestamp?: string;
  props?: Record<string, any>;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const events: IncomingEvent[] = Array.isArray(body?.events)
      ? body.events
      : (body?.type ? [body as IncomingEvent] : []);
    if (!events.length) {
      return new NextResponse("No events", { status: 400 });
    }
    await Promise.all(
      events.map(async (e) => {
        await logServerEvent(e.type, {
          ...(e.props || {}),
          _ts: e.timestamp || new Date().toISOString(),
          _ip: req.headers.get("x-forwarded-for") || req.ip || undefined,
          _ua: req.headers.get("user-agent") || undefined,
          _path: req.nextUrl?.pathname,
        });
      })
    );
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    return new NextResponse("Failed to record event", { status: 500 });
  }
}



