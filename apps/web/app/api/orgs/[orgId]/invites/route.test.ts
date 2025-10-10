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

vi.mock("./utils", async () => {
  const actual = await vi.importActual<typeof import("./utils")>("./utils");
  return {
    ...actual,
    ensureInviteManager: (...args: unknown[]) => ensureInviteManagerMock(...args)
  };
});

import { GET, POST } from "./route";

describe("org invite route", () => {
  const client = { from: vi.fn() };
  const selectMock = vi.fn();
  const eqMock = vi.fn();
  const orderMock = vi.fn();
  const insertMock = vi.fn();
  const selectAfterInsertMock = vi.fn();
  const singleMock = vi.fn();
  const tableMock = {
    select: selectMock,
    eq: eqMock,
    order: orderMock,
    insert: insertMock
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getServerSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    createClientMock.mockReturnValue(client);
    client.from.mockImplementation((table: string) => {
      if (table === "org_invitations") {
        return tableMock;
      }
      throw new Error(`Unexpected table ${table}`);
    });
    ensureInviteManagerMock.mockResolvedValue({
      client,
      access: { isSuperuser: false, role: "owner" }
    });

    selectMock.mockReturnValue(tableMock);
    eqMock.mockReturnValue(tableMock);
    orderMock.mockResolvedValue({ data: [], error: null });
    selectAfterInsertMock.mockReturnValue({ single: singleMock });
    insertMock.mockReturnValue({ select: selectAfterInsertMock });
    singleMock.mockImplementation(async () => ({
      data: {
        id: "invite-1",
        token: "FARM-ABCDEFGH",
        email: "test@example.com",
        role: "editor",
        single_use: false,
        used_at: null,
        expires_at: null,
        created_at: "2024-01-01T00:00:00Z"
      },
      error: null
    }));
  });

  it("lists invites for authorized users", async () => {
    orderMock.mockResolvedValueOnce({
      data: [
        {
          id: "invite-1",
          token: "FARM-ABCDEFGH",
          email: null,
          role: "viewer",
          single_use: true,
          used_at: null,
          expires_at: null,
          created_at: "2024-01-01T00:00:00Z"
        }
      ],
      error: null
    });

    const response = await GET(new NextRequest(new Request("http://localhost")), {
      params: { orgId: "org-1" }
    });

    const body = (await response.json()) as { invites: unknown[] };
    expect(response.status).toBe(200);
    expect(body.invites).toHaveLength(1);
    expect(selectMock).toHaveBeenCalled();
    expect(eqMock).toHaveBeenCalledWith("org_id", "org-1");
  });

  it("creates invites and returns token", async () => {
    const request = new NextRequest(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com", role: "editor", single_use: false })
      })
    );

    const response = await POST(request, { params: { orgId: "org-1" } });
    const body = (await response.json()) as { invite?: { token: string } };

    expect(response.status).toBe(200);
    expect(body.invite?.token).toMatch(/^FARM-/);
    const inserted = insertMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(inserted).toMatchObject({
      org_id: "org-1",
      role: "editor",
      email: "test@example.com",
      single_use: false,
      expires_at: null,
      created_by: "user-1"
    });
    expect(inserted?.token).toMatch(/^FARM-/);
  });

  it("rejects unauthorized access", async () => {
    getServerSessionMock.mockResolvedValueOnce(null);
    const request = new NextRequest(new Request("http://localhost", { method: "POST", body: "{}" }));
    const response = await POST(request, { params: { orgId: "org-1" } });
    expect(response.status).toBe(401);
  });

  it("returns error responses from ensureInviteManager", async () => {
    ensureInviteManagerMock.mockResolvedValueOnce({
      error: NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 })
    });

    const request = new NextRequest(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ role: "viewer" })
      })
    );

    const response = await POST(request, { params: { orgId: "org-1" } });
    expect(response.status).toBe(403);
  });
});
