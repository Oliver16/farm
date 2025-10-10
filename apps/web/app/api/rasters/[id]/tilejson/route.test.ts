import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { registry } from "../../../../../lib/config";

vi.mock("../../../../../lib/supabase", () => ({
  createServiceRoleSupabaseClient: vi.fn()
}));

import { createServiceRoleSupabaseClient } from "../../../../../lib/supabase";
import { GET } from "./route";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("rasters tilejson proxy", () => {
  const maybeSingle = vi.fn();
  const query = { eq: vi.fn(), maybeSingle } as any;
  const select = vi.fn(() => query);
  const from = vi.fn(() => ({ select }));

  beforeEach(() => {
    mockFetch.mockReset();
    registry.env.GEO_API_KEY = undefined;
    query.eq.mockReset();
    query.eq.mockImplementation(() => query);
    maybeSingle.mockReset();
    select.mockReset();
    from.mockReset();
    select.mockReturnValue(query);
    from.mockReturnValue({ select });
    (createServiceRoleSupabaseClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      { from }
    );
  });

  it("fetches tilejson from titiler with geo key header", async () => {
    registry.env.GEO_API_KEY = "geo-secret";
    maybeSingle.mockResolvedValueOnce({
      data: { id: "ortho", key: "ortho/demo.tif", bucket: "rasters" },
      error: null
    });
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ tiles: ["https://tiles"] }), { status: 200 })
    );

    const request = new NextRequest(
      new Request("http://localhost/api/rasters/ortho/tilejson?org_id=test-org")
    );
    const response = await GET(request, { params: { id: "ortho" } });

    expect(response.status).toBe(200);
    expect(from).toHaveBeenCalledWith("rasters");
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain(encodeURIComponent("s3://rasters/ortho/demo.tif"));
    expect((init?.headers as Record<string, string>)["x-geo-key"]).toBe("geo-secret");
    expect(response.headers.get("Cache-Control")).toBe("max-age=30, s-maxage=60");
  });

  it("returns 404 when the raster is missing", async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const request = new NextRequest(
      new Request("http://localhost/api/rasters/ortho/tilejson?org_id=test-org")
    );
    const response = await GET(request, { params: { id: "ortho" } });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe("RASTER_NOT_FOUND");
  });
});
