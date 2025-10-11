import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleSupabaseClient: vi.fn()
}));

import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import { GET } from "./route";

describe("rasters catalog", () => {
  const limit = vi.fn();
  const query = {
    eq: vi.fn(),
    not: vi.fn(),
    order: vi.fn(),
    limit
  } as {
    eq: ReturnType<typeof vi.fn>;
    not: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
  };
  const select = vi.fn(() => query);
  const from = vi.fn(() => ({ select }));

  beforeEach(() => {
    query.eq.mockReset();
    query.eq.mockImplementation(() => query);
    query.not.mockReset();
    query.not.mockImplementation(() => query);
    query.order.mockReset();
    query.order.mockImplementation(() => query);
    limit.mockReset();
    select.mockReset();
    from.mockReset();
    select.mockReturnValue(query);
    from.mockReturnValue({ select });
    (createServiceRoleSupabaseClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      { from }
    );
  });

  it("requires an org id", async () => {
    const request = new NextRequest(new Request("http://localhost/api/rasters"));
    const response = await GET(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("ORG_ID_REQUIRED");
  });

  it("returns available rasters grouped by type", async () => {
    limit.mockResolvedValueOnce({
      data: [
        {
          type: "ortho",
          acquired_at: "2024-02-02T00:00:00Z",
          cog_url: "s3://bucket/ortho-new.tif"
        },
        {
          type: "dem_hillshade",
          acquired_at: null,
          cog_url: "s3://bucket/dem.tif"
        },
        {
          type: "ortho",
          acquired_at: "2023-01-01T00:00:00Z",
          cog_url: "s3://bucket/ortho-old.tif"
        },
        {
          type: "custom",
          acquired_at: "2024-01-01T00:00:00Z",
          cog_url: "s3://bucket/custom.tif"
        }
      ],
      error: null
    });

    const request = new NextRequest(
      new Request("http://localhost/api/rasters?org_id=test-org")
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(from).toHaveBeenCalledWith("rasters");
    expect(query.eq).toHaveBeenCalledWith("org_id", "test-org");
    expect(query.not).toHaveBeenCalledWith("cog_url", "is", null);
    expect(query.order).toHaveBeenCalledWith("acquired_at", {
      ascending: false,
      nullsFirst: false
    });
    expect(limit).toHaveBeenCalledWith(1000);

    const body = await response.json();
    expect(body.rasters).toEqual([
      expect.objectContaining({
        id: "ortho",
        title: "Orthophoto",
        tilejsonUrl: "/api/rasters/ortho/tilejson",
        acquiredAt: "2024-02-02T00:00:00Z"
      }),
      expect.objectContaining({
        id: "dem_hillshade",
        title: "DEM Hillshade",
        tilejsonUrl: "/api/rasters/dem_hillshade/tilejson",
        acquiredAt: null
      })
    ]);
  });

  it("handles supabase errors", async () => {
    limit.mockResolvedValueOnce({ data: null, error: { message: "Boom" } });

    const request = new NextRequest(
      new Request("http://localhost/api/rasters?org_id=test-org")
    );
    const response = await GET(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe("SUPABASE_ERROR");
  });
});
