import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isLayerId, registry } from "@/lib/config";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import { getServerSession } from "@/lib/auth";
import { payloadSchema } from "@/lib/validation";

const errorResponse = (code: string, message: string, status = 400) =>
  NextResponse.json({ error: { code, message } }, { status });

const ensureOrgMembership = async (
  client: ReturnType<typeof createServiceRoleSupabaseClient>,
  orgId: string,
  userId: string
) => {
  const { data, error } = await client
    .from("org_memberships")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return errorResponse(
      error.code ?? "MEMBERSHIP_CHECK_FAILED",
      error.message ?? "Unable to verify organization membership",
      500
    );
  }

  if (!data) {
    return errorResponse("RLS_DENIED", "User not in org", 403);
  }

  return null;
};

export async function POST(request: NextRequest, { params }: { params: { layer: string } }) {
  const { layer } = params;

  if (!isLayerId(layer)) {
    return errorResponse("LAYER_NOT_FOUND", "Unknown layer", 404);
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return errorResponse("INVALID_JSON", "Request body must be JSON");
  }

  const parseResult = payloadSchema.safeParse(body);
  if (!parseResult.success) {
    return errorResponse("VALIDATION_FAILED", parseResult.error.message);
  }

  const session = await getServerSession();
  const userId = session?.user?.id;
  if (!userId) {
    return errorResponse("UNAUTHORIZED", "You must be signed in", 401);
  }

  const client = createServiceRoleSupabaseClient();
  const layerConfig = registry.vectorLayers[layer];

  const membershipError = await ensureOrgMembership(
    client,
    parseResult.data.properties.org_id,
    userId
  );

  if (membershipError) {
    return membershipError;
  }

  const { data, error } = await client.rpc(layerConfig.rpcUpsert, {
    feature_json: parseResult.data.feature,
    props_json: parseResult.data.properties
  });

  if (error) {
    return errorResponse(error.code ?? "RPC_ERROR", error.message ?? "RPC failed", 400);
  }

  return NextResponse.json(data ?? parseResult.data.feature);
}

export async function DELETE(request: NextRequest, { params }: { params: { layer: string } }) {
  const { layer } = params;

  if (!isLayerId(layer)) {
    return errorResponse("LAYER_NOT_FOUND", "Unknown layer", 404);
  }

  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");
  const orgId = searchParams.get("org_id");

  if (!id || !orgId) {
    return errorResponse("VALIDATION_FAILED", "id and org_id are required");
  }

  const session = await getServerSession();
  const userId = session?.user?.id;
  if (!userId) {
    return errorResponse("UNAUTHORIZED", "You must be signed in", 401);
  }

  const client = createServiceRoleSupabaseClient();
  const layerConfig = registry.vectorLayers[layer];

  const membershipError = await ensureOrgMembership(client, orgId, userId);
  if (membershipError) {
    return membershipError;
  }

  const { error } = await client.rpc(layerConfig.rpcDelete, {
    rid: id,
    org_id: orgId
  });

  if (error) {
    return errorResponse(error.code ?? "RPC_ERROR", error.message ?? "RPC failed", 400);
  }

  return NextResponse.json({ ok: true });
}
