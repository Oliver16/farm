import { beforeEach, describe, expect, it, vi } from "vitest";

const getServerSessionMock = vi.fn();
const createClientMock = vi.fn();
const listAccessibleOrganizationsMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  getServerSession: () => getServerSessionMock()
}));

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleSupabaseClient: () => createClientMock()
}));

vi.mock("@/lib/orgs", () => ({
  listAccessibleOrganizations: (...args: unknown[]) =>
    listAccessibleOrganizationsMock(...args)
}));

import { GET } from "./route";

describe("org list route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClientMock.mockReturnValue({});
    getServerSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    listAccessibleOrganizationsMock.mockResolvedValue({
      orgs: [
        { id: "org-1", name: "Alpha", role: "owner" },
        { id: "org-2", name: "Beta", role: "editor" }
      ],
      isSuperuser: false
    });
  });

  it("returns organizations for authenticated user", async () => {
    const response = await GET();
    const body = (await response.json()) as { orgs: unknown[]; is_superuser: boolean };

    expect(response.status).toBe(200);
    expect(body.orgs).toHaveLength(2);
    expect(body.is_superuser).toBe(false);
    expect(listAccessibleOrganizationsMock).toHaveBeenCalledWith({}, "user-1");
  });

  it("rejects unauthenticated requests", async () => {
    getServerSessionMock.mockResolvedValueOnce(null);

    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("propagates supabase errors", async () => {
    listAccessibleOrganizationsMock.mockResolvedValueOnce({
      error: { code: "FAIL", message: "Nope", status: 500 },
      isSuperuser: false
    });

    const response = await GET();
    const body = (await response.json()) as { error?: { message?: string } };

    expect(response.status).toBe(500);
    expect(body.error?.message).toBe("Nope");
  });
});
