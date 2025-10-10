import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "@/lib/auth";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import { errorResponse, ensureInviteManager } from "../utils";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { orgId: string; inviteId: string } }
) {
  const session = await getServerSession();
  const userId = session?.user?.id;
  if (!userId) {
    return errorResponse("UNAUTHORIZED", "You must be signed in", 401);
  }

  const { orgId, inviteId } = params;
  if (!orgId || !inviteId) {
    return errorResponse("MISSING_PARAMS", "Organization and invite IDs are required");
  }

  const client = createServiceRoleSupabaseClient();
  const permission = await ensureInviteManager(orgId, userId, client);
  if (permission.error) {
    return permission.error;
  }

  const { error } = await client
    .from("org_invitations")
    .delete()
    .eq("org_id", orgId)
    .eq("id", inviteId);

  if (error) {
    return errorResponse(error.code ?? "INVITE_DELETE_FAILED", error.message ?? "Unable to delete invite", 500);
  }

  return NextResponse.json({ ok: true });
}
