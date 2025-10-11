import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { PostgrestResponse } from "@supabase/supabase-js";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import { isRasterId, registry, type RasterId } from "@/lib/config";

const errorResponse = (status: number, code: string, message: string) =>
  NextResponse.json({ error: { code, message } }, { status });

type RasterRow = {
  type: string;
  acquired_at: string | null;
  cog_url: string | null;
};

type RasterSummary = {
  id: RasterId;
  acquiredAt: string | null;
};

type RasterWithMetadata = (typeof registry.rasterList)[number] & {
  acquiredAt: string | null;
};

export async function GET(request: NextRequest) {
  const orgId = request.nextUrl.searchParams.get("org_id");
  if (!orgId) {
    return errorResponse(400, "ORG_ID_REQUIRED", "org_id is required");
  }

  const client = createServiceRoleSupabaseClient();
  const { data, error }: PostgrestResponse<RasterRow> = await client
    .from("rasters")
    .select("type, acquired_at, cog_url")
    .eq("org_id", orgId)
    .not("cog_url", "is", null)
    .order("acquired_at", { ascending: false, nullsFirst: false })
    .limit(1000);

  if (error) {
    return errorResponse(500, "SUPABASE_ERROR", error.message ?? "Failed to load rasters");
  }

  const summaries: RasterSummary[] = [];
  const seen = new Set<RasterId>();
  for (const row of data ?? []) {
    if (!row.type || !isRasterId(row.type)) {
      continue;
    }
    if (seen.has(row.type)) {
      continue;
    }
    seen.add(row.type);
    summaries.push({ id: row.type, acquiredAt: row.acquired_at ?? null });
  }

  const rasters: RasterWithMetadata[] = summaries
    .map((summary) => {
      const definition = registry.rasters[summary.id];
      if (!definition) return null;
      return {
        id: definition.id,
        title: definition.title,
        tilejsonUrl: definition.tilejsonUrl,
        defaultVisible: definition.defaultVisible ?? false,
        resampling: definition.resampling,
        opacity: definition.opacity,
        acquiredAt: summary.acquiredAt
      };
    })
    .filter((value): value is RasterWithMetadata => Boolean(value));

  return NextResponse.json({ rasters });
}
