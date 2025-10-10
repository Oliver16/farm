import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getServerSessionMock = vi.fn();
const createClientMock = vi.fn();
const createServerClientMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  getServerSession: () => getServerSessionMock()
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: () => createServerClientMock()
}));

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleSupabaseClient: () => createClientMock()
}));

import { POST } from "./route";

describe("onboarding create farm route", () => {
  const rpcMock = vi.fn();
  const membershipMaybeSingleMock = vi.fn();
  const membershipEqMock = vi.fn();
  const membershipSelectMock = vi.fn();
  const membershipFromMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    getServerSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    rpcMock.mockResolvedValue({ data: { type: "Feature" }, error: null });
    createClientMock.mockReturnValue({ rpc: rpcMock });
    membershipMaybeSingleMock.mockResolvedValue({ data: { org_id: "org-1" }, error: null });
    membershipEqMock.mockReturnValue({ eq: membershipEqMock, maybeSingle: membershipMaybeSingleMock });
    membershipSelectMock.mockReturnValue({ eq: membershipEqMock, maybeSingle: membershipMaybeSingleMock });
    membershipFromMock.mockReturnValue({ select: membershipSelectMock });
    createServerClientMock.mockReturnValue({ from: membershipFromMock });
  });

  it("invokes farms_upsert rpc", async () => {
    const feature = {
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
      properties: {}
    };

    const request = new NextRequest(
      new Request("http://localhost/api/onboarding/create-farm", {
        method: "POST",
        body: JSON.stringify({
          org_id: "11111111-1111-1111-1111-111111111111",
          name: "Farm",
          feature
        })
      })
    );

    const response = await POST(request);
    const body = (await response.json()) as { ok: boolean };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(rpcMock).toHaveBeenCalledWith("farms_upsert", {
      feature_json: feature,
      props_json: { org_id: "11111111-1111-1111-1111-111111111111", name: "Farm" }
    });
  });

  it("rejects requests for orgs without membership", async () => {
    membershipMaybeSingleMock.mockResolvedValue({ data: null, error: null });

    const request = new NextRequest(
      new Request("http://localhost/api/onboarding/create-farm", {
        method: "POST",
        body: JSON.stringify({
          org_id: "11111111-1111-1111-1111-111111111111",
          name: "Farm",
          feature: {
            type: "Feature",
            geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
            properties: {}
          }
        })
      })
    );

    const response = await POST(request);
    expect(response.status).toBe(403);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("validates payload", async () => {
    const request = new NextRequest(
      new Request("http://localhost/api/onboarding/create-farm", {
        method: "POST",
        body: JSON.stringify({ org_id: "org-1", name: "Farm" })
      })
    );

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
