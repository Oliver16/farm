import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const rpcMock = vi.fn();
const membershipQuery = {
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn()
};
membershipQuery.select.mockReturnValue(membershipQuery);
membershipQuery.eq.mockReturnValue(membershipQuery);

const fromMock = vi.fn(() => membershipQuery);
const client = { rpc: rpcMock, from: fromMock };

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleSupabaseClient: vi.fn(() => client)
}));

vi.mock("@/lib/auth", () => ({
  getServerSession: vi.fn()
}));

import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import { getServerSession } from "@/lib/auth";
import { DELETE, POST } from "./route";

describe("write route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    membershipQuery.select.mockReturnValue(membershipQuery);
    membershipQuery.eq.mockReturnValue(membershipQuery);
    membershipQuery.maybeSingle.mockResolvedValue({ data: { user_id: "user" }, error: null });
    fromMock.mockReturnValue(membershipQuery);
    (getServerSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: "user" }
    });
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
    expect(fromMock).toHaveBeenCalledWith("org_memberships");
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
    expect(fromMock).toHaveBeenCalledWith("org_memberships");
  });

  it("returns 403 when membership check fails", async () => {
    membershipQuery.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

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
    expect(response.status).toBe(403);
    const payload = await response.json();
    expect(payload.error.code).toBe("RLS_DENIED");
  });
});
