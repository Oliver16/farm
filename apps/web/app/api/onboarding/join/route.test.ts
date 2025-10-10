import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getServerSessionMock = vi.fn();
const createClientMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  getServerSession: () => getServerSessionMock()
}));

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleSupabaseClient: () => createClientMock()
}));

import { POST } from "./route";

describe("onboarding join route", () => {
  const invitationQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    update: vi.fn()
  };
  const invitationUpdateEq = vi.fn();
  const membershipInsert = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    invitationQuery.select.mockReturnValue(invitationQuery);
    invitationQuery.eq.mockReturnValue(invitationQuery);
    invitationQuery.maybeSingle.mockResolvedValue({ data: null, error: null });
    invitationQuery.update.mockReturnValue({ eq: invitationUpdateEq });
    invitationUpdateEq.mockResolvedValue({});
    membershipInsert.mockResolvedValue({ error: null });

    createClientMock.mockReturnValue({
      from: (table: string) => {
        if (table === "org_invitations") {
          return invitationQuery;
        }
        if (table === "org_memberships") {
          return { insert: membershipInsert };
        }
        throw new Error(`Unexpected table ${table}`);
      }
    });

    getServerSessionMock.mockResolvedValue({ user: { id: "user-1" } });
  });

  it("joins organization when invite is valid", async () => {
    invitationQuery.maybeSingle.mockResolvedValueOnce({
      data: {
        id: "invite-1",
        org_id: "org-1",
        role: "editor",
        single_use: true,
        used_at: null,
        expires_at: null
      },
      error: null
    });

    const request = new NextRequest(
      new Request("http://localhost/api/onboarding/join", {
        method: "POST",
        body: JSON.stringify({ invite_code: "ABC" })
      })
    );

    const response = await POST(request);
    const body = (await response.json()) as { ok: boolean; org_id?: string };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.org_id).toBe("org-1");
    expect(membershipInsert).toHaveBeenCalledWith({
      org_id: "org-1",
      user_id: "user-1",
      role: "editor"
    });
    expect(invitationQuery.update).toHaveBeenCalledWith({ used_at: expect.any(String) });
  });

  it("rejects when invite missing", async () => {
    invitationQuery.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const request = new NextRequest(
      new Request("http://localhost/api/onboarding/join", {
        method: "POST",
        body: JSON.stringify({ invite_code: "missing" })
      })
    );

    const response = await POST(request);
    expect(response.status).toBe(404);
    expect(membershipInsert).not.toHaveBeenCalled();
  });
});
