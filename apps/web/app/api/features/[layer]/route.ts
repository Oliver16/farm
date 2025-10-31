import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isLayerId, registry } from "@/lib/config";
import { getServerEnv } from "@/lib/config/env.server";

const ensureTrailingSlash = (value: string) => (value.endsWith("/") ? value : `${value}/`);
const bboxRegex = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/;
const clampLimit = (raw: string | null, max = 200) => {
  const parsed = raw ? Number(raw) : undefined;
  if (!parsed || !Number.isFinite(parsed) || parsed <= 0) {
    return max;
  }
  return Math.min(Math.floor(parsed), max);
};
export async function GET(request: NextRequest, { params }: { params: { layer: string } }) {
  const { layer } = params;

  const layerConfig = isLayerId(layer)
    ? registry.vectorLayers[layer]
    : registry.layerList.find((definition) => definition.collectionId === layer);

  if (!layerConfig) {
    return NextResponse.json(
      { error: { code: "LAYER_NOT_FOUND", message: "Unknown layer" } },
      { status: 404 }
    );
  }

  const orgId = request.nextUrl.searchParams.get("org_id");
  if (!orgId) {
    return NextResponse.json(
      { error: { code: "ORG_ID_REQUIRED", message: "org_id is required" } },
      { status: 400 }
    );
  }

  const bbox = request.nextUrl.searchParams.get("bbox");
  if (bbox && !bboxRegex.test(bbox)) {
    return NextResponse.json(
      { error: { code: "BBOX_INVALID", message: "bbox must be 'minX,minY,maxX,maxY'" } },
      { status: 400 }
    );
  }

  const limit = clampLimit(request.nextUrl.searchParams.get("limit"), 200);

  const targetUrl = new URL(
    `collections/${layerConfig.collectionId}/items`,
    ensureTrailingSlash(registry.env.FEATURESERV_BASE)
  );
  request.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });
  targetUrl.searchParams.set("org_id", orgId);
  targetUrl.searchParams.set("limit", String(limit));

  const bboxCrs = registry?.env?.FEATURESERV_BBOX_CRS;
  if (bboxCrs && !targetUrl.searchParams.has("bbox-crs")) {
    if (bboxCrs === "CRS84" || bboxCrs === "EPSG:4326") {
      targetUrl.searchParams.set("bbox-crs", bboxCrs);
    }
  }

  const headers: Record<string, string> = {};
  const { SUPABASE_SERVICE_ROLE_KEY } = getServerEnv();
  headers.apikey = SUPABASE_SERVICE_ROLE_KEY;
  headers.Authorization = `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
  if (registry.env.GEO_API_KEY) {
    headers["x-geo-key"] = registry.env.GEO_API_KEY;
  }

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl.toString(), {
      headers,
      cache: "no-store"
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "UPSTREAM_UNAVAILABLE",
          message: (error as Error).message || "Feature service unavailable"
        }
      },
      { status: 502 }
    );
  }

  if (upstream.status === 401 || upstream.status === 403) {
    return NextResponse.json(
      {
        error: {
          code: "NO_ACCESS",
          message: "No access for this organization."
        }
      },
      { status: upstream.status }
    );
  }

  if (!upstream.ok) {
    const bodyText = await upstream.text().catch(() => "");
    let body: unknown;
    try {
      body = JSON.parse(bodyText);
    } catch {
      body = { error: { code: "UPSTREAM_ERROR", message: bodyText || upstream.statusText } };
    }
    return NextResponse.json(body, { status: upstream.status });
  }

  const data = await upstream.json();
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "max-age=30, s-maxage=60"
    }
  });
}
