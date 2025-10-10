import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { registry } from "../../../../lib/config";

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const upstreamUrl = new URL(registry.env.TILESERV_BASE);
  const path = params.path.join("/");
  upstreamUrl.pathname = `${upstreamUrl.pathname.replace(/\/$/, "")}/${path}`;
  request.nextUrl.searchParams.forEach((value, key) => {
    upstreamUrl.searchParams.set(key, value);
  });

  const headers: Record<string, string> = {};
  if (registry.env.GEO_API_KEY) {
    headers["x-geo-key"] = registry.env.GEO_API_KEY;
  }

  const response = await fetch(upstreamUrl.toString(), {
    headers
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  const headersInit: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headersInit[key] = value;
  });

  return new NextResponse(buffer, {
    status: response.status,
    headers: headersInit
  });
}
