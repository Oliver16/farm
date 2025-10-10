import type { TypedSupabaseClient } from "./supabase/types";

export type OrgRole = "owner" | "admin" | "editor" | "viewer";

interface SupabaseErrorDetails {
  code: string;
  message: string;
  status?: number;
}

export interface OrgAccess {
  orgId: string;
  userId: string;
  role: OrgRole | null;
  isSuperuser: boolean;
}

export interface OrgAccessResult {
  access?: OrgAccess;
  error?: SupabaseErrorDetails;
}

const normalizeError = (code: string | null, message: string | null, fallbackCode: string): SupabaseErrorDetails => ({
  code: code ?? fallbackCode,
  message: message ?? "Unexpected Supabase error",
  status: 500
});

export const checkSuperuser = async (
  client: TypedSupabaseClient,
  userId: string
): Promise<{ isSuperuser: boolean; error?: SupabaseErrorDetails }> => {
  const { data, error } = await client
    .from("superusers")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return {
      isSuperuser: false,
      error: normalizeError(error.code, error.message, "SUPERUSER_LOOKUP_FAILED")
    };
  }

  return { isSuperuser: Boolean(data) };
};

export const getOrgAccess = async (
  client: TypedSupabaseClient,
  orgId: string,
  userId: string
): Promise<OrgAccessResult> => {
  const superuserResult = await checkSuperuser(client, userId);
  if (superuserResult.error) {
    return { error: superuserResult.error };
  }

  if (superuserResult.isSuperuser) {
    return {
      access: {
        orgId,
        userId,
        role: "owner",
        isSuperuser: true
      }
    };
  }

  const { data, error } = await client
    .from("org_memberships")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return {
      error: normalizeError(error.code, error.message, "MEMBERSHIP_LOOKUP_FAILED")
    };
  }

  return {
    access: {
      orgId,
      userId,
      role: (data?.role as OrgRole | undefined) ?? null,
      isSuperuser: false
    }
  };
};

export interface OrganizationSummary {
  id: string;
  name: string;
  role: OrgRole | null;
}

export interface OrganizationListResult {
  orgs?: OrganizationSummary[];
  isSuperuser: boolean;
  error?: SupabaseErrorDetails;
}

export const listAccessibleOrganizations = async (
  client: TypedSupabaseClient,
  userId: string
): Promise<OrganizationListResult> => {
  const superuserResult = await checkSuperuser(client, userId);
  if (superuserResult.error) {
    return { isSuperuser: false, error: superuserResult.error };
  }

  if (superuserResult.isSuperuser) {
    const { data, error } = await client
      .from("organizations")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) {
      return {
        isSuperuser: true,
        error: normalizeError(error.code, error.message, "ORGANIZATION_LIST_FAILED")
      };
    }

    const rows = Array.isArray(data) ? data : [];
    return {
      isSuperuser: true,
      orgs: rows.map((row) => ({
        id: String((row as { id: unknown }).id),
        name: String((row as { name: unknown }).name ?? ""),
        role: "owner"
      }))
    };
  }

  const { data, error } = await client
    .from("org_memberships")
    .select("org_id, role, organizations(name)")
    .eq("user_id", userId);

  if (error) {
    return {
      isSuperuser: false,
      error: normalizeError(error.code, error.message, "ORGANIZATION_MEMBERSHIP_LIST_FAILED")
    };
  }

  const rows = Array.isArray(data) ? data : [];
  return {
    isSuperuser: false,
    orgs: rows.map((row) => {
      const record = row as {
        org_id: unknown;
        role?: OrgRole;
        organizations?: { name?: string } | null;
      };
      return {
        id: String(record.org_id ?? ""),
        name: record.organizations?.name ?? String(record.org_id ?? ""),
        role: record.role ?? null
      };
    })
  };
};

