import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { registry, type RasterId, isRasterId } from "@/lib/config";

const rastersMetadata: Record<RasterId, { path: string; format: string }> = {
  ortho: {
    path: `${registry.env.PMTILES_BASE}/ortho.tif`,
    format: "png"
  },
  dem_hillshade: {
    path: `${registry.env.PMTILES_BASE}/dem_hillshade.tif`,
    format: "png"
  }
};

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  if (!isRasterId(id)) {
    return NextResponse.json(
      { error: { code: "RASTER_NOT_FOUND", message: "Unknown raster" } },
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

  const raster = rastersMetadata[id];
  const tileUrl = `${registry.env.TITILER_BASE}/cog/tiles/{z}/{x}/{y}.${raster.format}?url=${encodeURIComponent(
    raster.path
  )}`;

  const tilejson = {
    tilejson: "3.0.0",
    name: id,
    tiles: [tileUrl],
    minzoom: 0,
    maxzoom: 22
  };

  return NextResponse.json(tilejson, {
    headers: {
      "Cache-Control": "max-age=30, s-maxage=60"
    }
  });
}
