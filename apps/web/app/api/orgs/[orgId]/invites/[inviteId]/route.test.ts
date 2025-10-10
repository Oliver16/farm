import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const getServerSessionMock = vi.fn();
const createClientMock = vi.fn();
const ensureInviteManagerMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  getServerSession: () => getServerSessionMock()
}));

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleSupabaseClient: () => createClientMock()
}));

vi.mock("../utils", async () => {
  const actual = await vi.importActual<typeof import("../utils")>("../utils");
  return {
    ...actual,
    ensureInviteManager: (...args: unknown[]) => ensureInviteManagerMock(...args)
  };
});

import { DELETE } from "./route";

describe("delete invite route", () => {
  const client = { from: vi.fn() };
  const deleteMock = vi.fn();
  const deleteChain = {
    eq: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getServerSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    createClientMock.mockReturnValue(client);
    client.from.mockImplementation((table: string) => {
      if (table === "org_invitations") {
        return { delete: deleteMock };
      }
      throw new Error(`Unexpected table ${table}`);
    });
    deleteMock.mockReturnValue(deleteChain);
    deleteChain.eq.mockImplementation((column: string) => {
      if (column === "org_id") {
        return deleteChain;
      }
      if (column === "id") {
        return Promise.resolve({ error: null });
      }
      throw new Error("Unexpected column");
    });
    ensureInviteManagerMock.mockResolvedValue({ client, access: { isSuperuser: false, role: "owner" } });
  });

  it("revokes an invite", async () => {
    const response = await DELETE(new NextRequest(new Request("http://localhost")), {
      params: { orgId: "org-1", inviteId: "invite-1" }
    });

    expect(response.status).toBe(200);
    expect(deleteMock).toHaveBeenCalled();
    expect(deleteChain.eq).toHaveBeenCalledWith("org_id", "org-1");
    expect(deleteChain.eq).toHaveBeenCalledWith("id", "invite-1");
  });

  it("handles ensureInviteManager errors", async () => {
    ensureInviteManagerMock.mockResolvedValueOnce({
      error: NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 })
    });

    const response = await DELETE(new NextRequest(new Request("http://localhost")), {
      params: { orgId: "org-1", inviteId: "invite-1" }
    });

    expect(response.status).toBe(403);
  });

  it("requires authentication", async () => {
    getServerSessionMock.mockResolvedValueOnce(null);

    const response = await DELETE(new NextRequest(new Request("http://localhost")), {
      params: { orgId: "org-1", inviteId: "invite-1" }
    });

    expect(response.status).toBe(401);
  });
});
