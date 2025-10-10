import { beforeEach, describe, expect, it, vi } from "vitest";

const createServerClientMock = vi.fn();
const createServiceClientMock = vi.fn();

vi.mock("./supabase/server", () => ({
  createServerSupabaseClient: () => createServerClientMock()
}));

vi.mock("./supabase/service-role", () => ({
  createServiceRoleSupabaseClient: () => createServiceClientMock()
}));

import { getUserOrgCount } from "./auth";

describe("getUserOrgCount", () => {
  const getUserMock = vi.fn();
  const superuserMaybeSingle = vi.fn();
  const membershipEq = vi.fn();
  const organizationsSelect = vi.fn();
  const farmsIn = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    createServerClientMock.mockReturnValue({
      auth: {
        getUser: getUserMock
      }
    });

    createServiceClientMock.mockReturnValue({
      from: (table: string) => {
        if (table === "superusers") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: superuserMaybeSingle
              })
            })
          };
        }

        if (table === "org_memberships") {
          return {
            select: () => ({
              eq: membershipEq
            })
          };
        }

        if (table === "organizations") {
          return {
            select: organizationsSelect
          };
        }

        if (table === "farms") {
          return {
            select: () => ({
              in: farmsIn
            })
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }
    });

    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    superuserMaybeSingle.mockResolvedValue({ data: null, error: null });
    membershipEq.mockResolvedValue({ data: [], error: null });
    organizationsSelect.mockResolvedValue({ data: [], error: null });
    farmsIn.mockResolvedValue({ data: [], error: null });
  });

  it("returns 0 when user is not logged in", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null } });

    await expect(getUserOrgCount()).resolves.toBe(0);
    expect(createServiceClientMock).not.toHaveBeenCalled();
  });

  it("returns count of organizations with farms for a member", async () => {
    membershipEq.mockResolvedValueOnce({
      data: [
        { org_id: "org-1" },
        { org_id: "org-2" },
        { org_id: "" }
      ],
      error: null
    });

    farmsIn.mockResolvedValueOnce({
      data: [
        { org_id: "org-1" },
        { org_id: "org-1" },
        { org_id: "org-2" }
      ],
      error: null
    });

    await expect(getUserOrgCount()).resolves.toBe(2);
    expect(farmsIn).toHaveBeenCalledWith("org_id", ["org-1", "org-2"]);
  });

  it("returns 0 when member organizations do not have farms", async () => {
    membershipEq.mockResolvedValueOnce({
      data: [{ org_id: "org-1" }],
      error: null
    });

    farmsIn.mockResolvedValueOnce({ data: [], error: null });

    await expect(getUserOrgCount()).resolves.toBe(0);
  });

  it("uses all organizations for superusers", async () => {
    superuserMaybeSingle.mockResolvedValueOnce({ data: { user_id: "user-1" }, error: null });

    organizationsSelect.mockResolvedValueOnce({
      data: [{ id: "org-1" }, { id: "org-2" }, { id: null }],
      error: null
    });

    farmsIn.mockResolvedValueOnce({
      data: [{ org_id: "org-2" }],
      error: null
    });

    await expect(getUserOrgCount()).resolves.toBe(1);
    expect(membershipEq).not.toHaveBeenCalled();
  });

  it("returns 0 for superusers when no organizations exist", async () => {
    superuserMaybeSingle.mockResolvedValueOnce({ data: { user_id: "user-1" }, error: null });
    organizationsSelect.mockResolvedValueOnce({ data: [], error: null });

    await expect(getUserOrgCount()).resolves.toBe(0);
    expect(farmsIn).not.toHaveBeenCalled();
  });
});

