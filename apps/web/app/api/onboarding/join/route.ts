import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "@/lib/auth";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import { onboardingJoinSchema } from "@/lib/validation.onboarding";

const errorResponse = (code: string, message: string, status = 400) =>
  NextResponse.json({ ok: false, error: { code, message } }, { status });

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  const userId = session?.user?.id;

  if (!userId) {
    return errorResponse("UNAUTHORIZED", "You must be signed in", 401);
  }

  const payload = await request.json().catch(() => null);
  if (!payload) {
    return errorResponse("INVALID_JSON", "Request body must be valid JSON");
  }

  const parseResult = onboardingJoinSchema.safeParse(payload);
  if (!parseResult.success) {
    return errorResponse("VALIDATION_FAILED", parseResult.error.message);
  }

  const client = createServiceRoleSupabaseClient();

  const { data: invite, error: inviteError } = await client
    .from("org_invitations")
    .select("id, org_id, role, single_use, used_at, expires_at")
    .eq("token", parseResult.data.invite_code)
    .maybeSingle();

  if (inviteError) {
    return errorResponse("INVITE_LOOKUP_FAILED", inviteError.message, 500);
  }

  if (!invite) {
    return errorResponse("INVITE_NOT_FOUND", "Invite code not found", 404);
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return errorResponse("INVITE_EXPIRED", "Invite code has expired", 410);
  }

  if (invite.single_use && invite.used_at) {
    return errorResponse("INVITE_USED", "Invite code has already been used", 409);
  }

  const { error: membershipError } = await client.from("org_memberships").insert({
    org_id: invite.org_id,
    user_id: userId,
    role: invite.role ?? "viewer"
  });

  if (membershipError) {
    if (membershipError.code === "23505") {
      return errorResponse("ALREADY_MEMBER", "You already belong to this organization", 409);
    }
    return errorResponse(
      membershipError.code ?? "MEMBERSHIP_INSERT_FAILED",
      membershipError.message ?? "Failed to join organization",
      500
    );
  }

  if (invite.single_use) {
    await client
      .from("org_invitations")
      .update({ used_at: new Date().toISOString() })
      .eq("id", invite.id);
  }

  return NextResponse.json({ ok: true, org_id: invite.org_id });
}
