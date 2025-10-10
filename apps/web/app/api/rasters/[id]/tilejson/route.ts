import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { PostgrestMaybeSingleResponse } from "@supabase/supabase-js";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import { isRasterId, registry } from "@/lib/config";
import { createCogTileJsonUrl } from "@/lib/config/rasters";

type RasterRow = {
  id: string;
  org_id: string;
  bucket?: string | null;
  key?: string | null;
  s3_url?: string | null;
};

const errorResponse = (status: number, code: string, message: string) =>
  NextResponse.json({ error: { code, message } }, { status });

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!isRasterId(id)) {
    return errorResponse(404, "RASTER_NOT_FOUND", "Unknown raster");
  }

  const orgId = request.nextUrl.searchParams.get("org_id");
  if (!orgId) {
    return errorResponse(400, "ORG_ID_REQUIRED", "org_id is required");
  }

  const client = createServiceRoleSupabaseClient();
  const {
    data: raster,
    error
  }: PostgrestMaybeSingleResponse<RasterRow> = await client
    .from("rasters")
    .select("id, org_id, bucket, key, s3_url")
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle<RasterRow>();

  if (error) {
    return errorResponse(500, "SUPABASE_ERROR", error.message ?? "Failed to load raster");
  }

  if (!raster) {
    return errorResponse(404, "RASTER_NOT_FOUND", "Raster not found");
  }

  const key = raster.key ?? undefined;
  const bucket = raster.bucket ?? "rasters";
  const s3Url = raster.s3_url ?? (key ? `s3://${bucket.replace(/\/$/, "")}/${key.replace(/^\//, "")}` : undefined);

  if (!s3Url) {
    return errorResponse(500, "RASTER_PATH_INVALID", "Raster key is missing");
  }

  const tilejsonUrl = createCogTileJsonUrl(s3Url);
  const headers: Record<string, string> = {};
  if (registry.env.GEO_API_KEY) {
    headers["x-geo-key"] = registry.env.GEO_API_KEY;
  }

  let upstream: Response;
  try {
    upstream = await fetch(tilejsonUrl, {
      headers,
      cache: "no-store"
    });
  } catch (error) {
    return errorResponse(502, "TITILER_UNAVAILABLE", (error as Error).message);
  }

  if (!upstream.ok) {
    return errorResponse(
      upstream.status,
      "TITILER_ERROR",
      "Raster unavailable."
    );
  }

  const tilejson = await upstream.json();
  return NextResponse.json(tilejson, {
    headers: {
      "Cache-Control": "max-age=30, s-maxage=60"
    }
  });
}
