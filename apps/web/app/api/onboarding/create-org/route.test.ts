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

describe("onboarding create org route", () => {
  const orgInsert = vi.fn();
  const orgSelect = vi.fn();
  const orgSingle = vi.fn();
  const orgDelete = vi.fn();
  const orgDeleteEq = vi.fn();
  const membershipInsert = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    getServerSessionMock.mockResolvedValue({ user: { id: "user-1" } });

    orgInsert.mockReturnValue({ select: orgSelect });
    orgSelect.mockReturnValue({ single: orgSingle });
    orgSingle.mockResolvedValue({ data: { id: "org-1" }, error: null });
    orgDelete.mockReturnValue({ eq: orgDeleteEq });
    orgDeleteEq.mockResolvedValue({});
    membershipInsert.mockResolvedValue({ error: null });

    createClientMock.mockReturnValue({
      from: (table: string) => {
        if (table === "organizations") {
          return {
            insert: orgInsert,
            delete: orgDelete
          };
        }
        if (table === "org_memberships") {
          return { insert: membershipInsert };
        }
        throw new Error(`Unexpected table ${table}`);
      }
    });
  });

  it("creates organization and membership", async () => {
    const request = new NextRequest(
      new Request("http://localhost/api/onboarding/create-org", {
        method: "POST",
        body: JSON.stringify({ org_name: "My Org" })
      })
    );

    const response = await POST(request);
    const body = (await response.json()) as { org_id: string };

    expect(response.status).toBe(200);
    expect(body.org_id).toBe("org-1");
    expect(orgInsert).toHaveBeenCalledWith({ name: "My Org" });
    expect(membershipInsert).toHaveBeenCalledWith({
      org_id: "org-1",
      user_id: "user-1",
      role: "owner"
    });
    expect(orgDelete).not.toHaveBeenCalled();
  });

  it("handles duplicate organization name", async () => {
    orgSingle.mockResolvedValueOnce({
      data: null,
      error: { code: "23505", message: "duplicate" }
    });

    const request = new NextRequest(
      new Request("http://localhost/api/onboarding/create-org", {
        method: "POST",
        body: JSON.stringify({ org_name: "Existing" })
      })
    );

    const response = await POST(request);
    expect(response.status).toBe(409);
    expect(membershipInsert).not.toHaveBeenCalled();
  });
});
