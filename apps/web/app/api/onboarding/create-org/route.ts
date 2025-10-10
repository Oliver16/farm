import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "@/lib/auth";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import { onboardingCreateOrgSchema } from "@/lib/validation.onboarding";

const errorResponse = (code: string, message: string, status = 400) =>
  NextResponse.json({ error: { code, message } }, { status });

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

  const parseResult = onboardingCreateOrgSchema.safeParse(payload);
  if (!parseResult.success) {
    return errorResponse("VALIDATION_FAILED", parseResult.error.message);
  }

  const client = createServiceRoleSupabaseClient();
  const { data: org, error: orgError } = await client
    .from("organizations")
    .insert({ name: parseResult.data.org_name })
    .select("id")
    .single();

  if (orgError || !org) {
    if (orgError?.code === "23505") {
      return errorResponse("ORG_NAME_TAKEN", "Organization name already exists", 409);
    }
    return errorResponse(
      orgError?.code ?? "ORG_CREATE_FAILED",
      orgError?.message ?? "Failed to create organization",
      500
    );
  }

  const { error: membershipError } = await client.from("org_memberships").insert({
    org_id: org.id,
    user_id: userId,
    role: "owner"
  });

  if (membershipError) {
    await client.from("organizations").delete().eq("id", org.id);
    return errorResponse(
      membershipError.code ?? "MEMBERSHIP_CREATE_FAILED",
      membershipError.message ?? "Failed to assign ownership",
      500
    );
  }

  return NextResponse.json({ org_id: org.id });
}
