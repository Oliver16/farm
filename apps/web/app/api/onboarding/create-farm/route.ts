import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "@/lib/auth";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import { onboardingCreateFarmSchema } from "@/lib/validation.onboarding";

const errorResponse = (code: string, message: string, status = 400) =>
  NextResponse.json({ ok: false, error: { code, message } }, { status });

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return errorResponse("UNAUTHORIZED", "You must be signed in", 401);
  }

  const payload = await request.json().catch(() => null);
  if (!payload) {
    return errorResponse("INVALID_JSON", "Request body must be valid JSON");
  }

  const parseResult = onboardingCreateFarmSchema.safeParse(payload);
  if (!parseResult.success) {
    return errorResponse("VALIDATION_FAILED", parseResult.error.message);
  }

  const client = createServiceRoleSupabaseClient();
  const rpcPayload = {
    feature_json: parseResult.data.feature,
    props_json: {
      org_id: parseResult.data.org_id,
      name: parseResult.data.name
    }
  };

  const { data, error } = await client.rpc("farms_upsert", rpcPayload);

  if (error) {
    return errorResponse(error.code ?? "FARM_CREATE_FAILED", error.message ?? "Farm creation failed", 500);
  }

  return NextResponse.json({ ok: true, feature: data ?? parseResult.data.feature });
}
