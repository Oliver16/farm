import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { customAlphabet } from "nanoid";
import { getServerSession } from "@/lib/auth";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import { createInviteSchema } from "@/lib/validation.orgs";
import { ensureInviteManager, errorResponse } from "./utils";

const generateInviteCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);

export async function GET(
  _request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  const session = await getServerSession();
  const userId = session?.user?.id;
  if (!userId) {
    return errorResponse("UNAUTHORIZED", "You must be signed in", 401);
  }

  const { orgId } = params;
  if (!orgId) {
    return errorResponse("ORG_REQUIRED", "Organization ID is required");
  }

  const client = createServiceRoleSupabaseClient();
  const permission = await ensureInviteManager(orgId, userId, client);
  if (permission.error) {
    return permission.error;
  }

  const { data, error } = await client
    .from("org_invitations")
    .select("id, token, email, role, single_use, used_at, expires_at, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    return errorResponse(error.code ?? "INVITE_LIST_FAILED", error.message ?? "Unable to load invites", 500);
  }

  return NextResponse.json({ invites: data ?? [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  const session = await getServerSession();
  const userId = session?.user?.id;
  if (!userId) {
    return errorResponse("UNAUTHORIZED", "You must be signed in", 401);
  }

  const { orgId } = params;
  if (!orgId) {
    return errorResponse("ORG_REQUIRED", "Organization ID is required");
  }

  const payload = await request.json().catch(() => null);
  if (!payload) {
    return errorResponse("INVALID_JSON", "Request body must be valid JSON");
  }

  const parseResult = createInviteSchema.safeParse(payload);
  if (!parseResult.success) {
    return errorResponse("VALIDATION_FAILED", parseResult.error.message);
  }

  const client = createServiceRoleSupabaseClient();
  const permission = await ensureInviteManager(orgId, userId, client);
  if (permission.error) {
    return permission.error;
  }

  const input = parseResult.data;

  const attemptInsert = async () => {
    const token = `FARM-${generateInviteCode()}`;
    const { data, error } = await client
      .from("org_invitations")
      .insert({
        org_id: orgId,
        token,
        role: input.role ?? "viewer",
        email: input.email,
        single_use: input.single_use ?? true,
        expires_at: input.expires_at ?? null,
        created_by: userId
      })
      .select("id, token, email, role, single_use, used_at, expires_at, created_at")
      .single();

    return { data, error, token };
  };

  let lastError: { code?: string; message?: string } | null = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = await attemptInsert();
    if (!result.error) {
      return NextResponse.json({ invite: result.data });
    }

    lastError = result.error;
    if (result.error.code !== "23505") {
      break;
    }
  }

  return errorResponse(
    lastError?.code ?? "INVITE_CREATE_FAILED",
    lastError?.message ?? "Unable to create invite",
    500
  );
}
