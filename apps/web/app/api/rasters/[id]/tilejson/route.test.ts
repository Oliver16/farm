import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { registry } from "@/lib/config";

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleSupabaseClient: vi.fn()
}));

import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import { GET } from "./route";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("rasters tilejson proxy", () => {
  const maybeSingle = vi.fn();
  const query = {
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle
  } as {
    eq: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
    maybeSingle: ReturnType<typeof vi.fn>;
  };
  const select = vi.fn(() => query);
  const from = vi.fn(() => ({ select }));

  beforeEach(() => {
    mockFetch.mockReset();
    registry.env.GEO_API_KEY = undefined;
    query.eq.mockReset();
    query.eq.mockImplementation(() => query);
    query.order.mockReset();
    query.order.mockImplementation(() => query);
    query.limit.mockReset();
    query.limit.mockImplementation(() => query);
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
      data: {
        id: "some-uuid",
        org_id: "test-org",
        type: "ortho",
        cog_url: "s3://rasters/ortho/demo.tif",
        acquired_at: "2024-01-01T00:00:00Z"
      },
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
    expect(query.eq).toHaveBeenCalledWith("org_id", "test-org");
    expect(query.eq).toHaveBeenCalledWith("type", "ortho");
    expect(query.order).toHaveBeenCalledWith("acquired_at", { ascending: false, nullsFirst: false });
    expect(query.limit).toHaveBeenCalledWith(1);
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
