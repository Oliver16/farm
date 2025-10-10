import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import { getOrgAccess, type OrgRole } from "@/lib/orgs";

export const errorResponse = (code: string, message: string, status = 400) =>
  NextResponse.json({ error: { code, message } }, { status });

export const ensureInviteManager = async (
  orgId: string,
  userId: string,
  client: ReturnType<typeof createServiceRoleSupabaseClient>
) => {
  const result = await getOrgAccess(client, orgId, userId);
  if (result.error) {
    return { error: errorResponse(result.error.code, result.error.message, result.error.status ?? 500) };
  }

  const access = result.access;
  if (!access) {
    return { error: errorResponse("NOT_MEMBER", "You do not belong to this organization", 403) };
  }

  if (!access.isSuperuser) {
    const allowed: OrgRole[] = ["owner", "admin"];
    if (!access.role || !allowed.includes(access.role)) {
      return { error: errorResponse("FORBIDDEN", "You need admin permissions to manage invites", 403) };
    }
  }

  return { client, access };
};
