import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { PostgrestMaybeSingleResponse } from "@supabase/supabase-js";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import { isRasterId, registry } from "@/lib/config";
import { createCogTileJsonUrl } from "@/lib/config/rasters";

type RasterRow = {
  id: string;
  org_id: string;
  type: string;
  cog_url: string | null;
  acquired_at: string | null;
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

  const directUrl = request.nextUrl.searchParams.get("url");

  const getCogUrl = async (): Promise<string> => {
    if (directUrl) {
      return directUrl;
    }

    const client = createServiceRoleSupabaseClient();
    const {
      data: raster,
      error
    }: PostgrestMaybeSingleResponse<RasterRow> = await client
      .from("rasters")
      .select("id, org_id, type, cog_url, acquired_at")
      .eq("org_id", orgId)
      .eq("type", id)
      .order("acquired_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle<RasterRow>();

    if (error) {
      throw new Error(error.message ?? "Failed to load raster");
    }

    if (!raster) {
      throw new Error("Raster not found");
    }

    if (!raster.cog_url) {
      throw new Error("Raster cog_url is missing");
    }

    return raster.cog_url;
  };

  let cogUrl: string;
  try {
    cogUrl = await getCogUrl();
  } catch (error) {
    const message = (error as Error).message;
    if (message === "Raster not found") {
      return errorResponse(404, "RASTER_NOT_FOUND", message);
    }

    if (message === "Raster cog_url is missing") {
      return errorResponse(500, "RASTER_PATH_INVALID", message);
    }

    return errorResponse(500, "SUPABASE_ERROR", message || "Failed to load raster");
  }

  const tilejsonUrl = createCogTileJsonUrl(cogUrl);
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
