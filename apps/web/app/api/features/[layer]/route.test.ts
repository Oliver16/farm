import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { registry } from "../../../../lib/config";
import { GET } from "./route";

vi.stubGlobal("fetch", vi.fn());

const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
const SERVICE_ROLE_KEY = "service-role";
const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

beforeAll(() => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_ROLE_KEY;
});

afterAll(() => {
  if (originalServiceRoleKey === undefined) {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  } else {
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
  }
});

describe("features proxy", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    registry.env.GEO_API_KEY = undefined;
    process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_ROLE_KEY;
  });

  it("forwards org_id, bbox and clamps limit", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ features: [] }), { status: 200 })
    );

    const request = new NextRequest(
      new Request(
        "http://localhost/api/features/public.farms?org_id=test-org&bbox=1,2,3,4&limit=5000"
      )
    );
    const response = await GET(request, { params: { layer: "public.farms" } });

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const parsed = new URL(url);
    expect(parsed.searchParams.get("org_id")).toBe("test-org");
    expect(parsed.searchParams.get("bbox")).toBe("1,2,3,4");
    expect(parsed.searchParams.get("limit")).toBe("200");
    expect(init?.headers).not.toBeUndefined();
  });

  it("rejects invalid bbox values", async () => {
    const request = new NextRequest(
      new Request(
        "http://localhost/api/features/public.farms?org_id=test-org&bbox=bad-bbox"
      )
    );
    const response = await GET(request, { params: { layer: "public.farms" } });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("BBOX_INVALID");
  });

  it("adds geo api key header when configured", async () => {
    registry.env.GEO_API_KEY = "geo-secret";
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ features: [] }), { status: 200 })
    );

    const request = new NextRequest(
      new Request("http://localhost/api/features/public.farms?org_id=test-org")
    );
    await GET(request, { params: { layer: "public.farms" } });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((init?.headers as Record<string, string>)["x-geo-key"]).toBe("geo-secret");
  });

  it("includes service role authorization headers", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ features: [] }), { status: 200 })
    );

    const request = new NextRequest(
      new Request("http://localhost/api/features/public.farms?org_id=test-org")
    );
    await GET(request, { params: { layer: "public.farms" } });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${SERVICE_ROLE_KEY}`);
    expect(headers.apikey).toBe(SERVICE_ROLE_KEY);
  });

  it("returns a friendly message on authorization failures", async () => {
    mockFetch.mockResolvedValueOnce(new Response("Forbidden", { status: 403 }));

    const request = new NextRequest(
      new Request("http://localhost/api/features/public.farms?org_id=test-org")
    );
    const response = await GET(request, { params: { layer: "public.farms" } });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.message).toBe("No access for this organization.");
  });

  it("accepts layer ids for backwards compatibility", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ features: [] }), { status: 200 })
    );

    const request = new NextRequest(
      new Request("http://localhost/api/features/farms?org_id=test-org")
    );
    const response = await GET(request, { params: { layer: "farms" } });
    expect(response.status).toBe(200);
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain("/collections/public.farms/items");
  });
});
