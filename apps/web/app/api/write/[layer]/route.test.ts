import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const rpcMock = vi.fn();
const client = { rpc: rpcMock };

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleSupabaseClient: vi.fn(() => client)
}));

import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import { DELETE, POST } from "./route";

describe("write route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invokes RPC on POST", async () => {
    const clientInstance = createServiceRoleSupabaseClient() as unknown as { rpc: ReturnType<typeof vi.fn> };
    clientInstance.rpc.mockResolvedValueOnce({ data: { type: "Feature" }, error: null });

    const body = {
      feature: { type: "Feature", geometry: { type: "MultiPolygon", coordinates: [] } },
      properties: { org_id: "11111111-1111-1111-1111-111111111111", name: "Test" }
    };

    const request = new NextRequest(
      new Request("http://localhost/api/write/farms", {
        method: "POST",
        body: JSON.stringify(body)
      })
    );
    const response = await POST(request, { params: { layer: "farms" } });

    expect(clientInstance.rpc).toHaveBeenCalledWith("farms_upsert", {
      feature_json: body.feature,
      props_json: body.properties
    });
    expect(response.status).toBe(200);
  });

  it("sends delete RPC", async () => {
    const clientInstance = createServiceRoleSupabaseClient() as unknown as { rpc: ReturnType<typeof vi.fn> };
    clientInstance.rpc.mockResolvedValueOnce({ error: null });

    const request = new NextRequest(
      new Request("http://localhost/api/write/farms?id=123&org_id=456", { method: "DELETE" })
    );
    const response = await DELETE(request, { params: { layer: "farms" } });

    expect(clientInstance.rpc).toHaveBeenCalledWith("farms_delete", { rid: "123", org_id: "456" });
    expect(response.status).toBe(200);
  });
});
