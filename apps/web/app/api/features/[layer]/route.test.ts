import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

vi.stubGlobal("fetch", vi.fn());

const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;

describe("features proxy", () => {
  it("forwards org_id and bbox to featureserv", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ features: [] }), { status: 200 })
    );

    const request = new NextRequest(
      new Request("http://localhost/api/features/farms?org_id=test-org&bbox=1,2,3,4")
    );
    const response = await GET(request, { params: { layer: "farms" } });

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = new URL(mockFetch.mock.calls[0][0] as string);
    expect(url.searchParams.get("org_id")).toBe("test-org");
    expect(url.searchParams.get("bbox")).toBe("1,2,3,4");
  });
});
