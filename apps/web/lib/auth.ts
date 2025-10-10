import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "./supabase/server";
import { createServiceRoleSupabaseClient } from "./supabase/service-role";
import { checkSuperuser } from "./orgs";

export interface SessionUser {
  id: string;
  email?: string;
}

export const getServerSession = async () => {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
};

export const requireSession = async () => {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }
  return session;
};

// Returns the number of organizations the current user can access that have at
// least one farm defined. Users without a farm should remain in the onboarding
// flow.
export const getUserOrgCount = async () => {
  const supabase = createServerSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) {
    return 0;
  }

  const serviceClient = createServiceRoleSupabaseClient();
  const superuserResult = await checkSuperuser(serviceClient, userId);

  if (superuserResult.error) {
    throw new Error(superuserResult.error.message);
  }

  type OrgIdRow = { id?: string | null; org_id?: string | null };
  let orgIds: string[] = [];

  if (superuserResult.isSuperuser) {
    const { data, error } = await serviceClient
      .from("organizations")
      .select("id");

    if (error) {
      throw error;
    }

    orgIds = ((data ?? []) as OrgIdRow[])
      .map((row) => row.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
  } else {
    const { data, error } = await serviceClient
      .from("org_memberships")
      .select("org_id")
      .eq("user_id", userId);

    if (error) {
      throw error;
    }

    orgIds = ((data ?? []) as OrgIdRow[])
      .map((row) => row.org_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
  }

  if (orgIds.length === 0) {
    return 0;
  }

  const { data: farmData, error: farmError } = await serviceClient
    .from("farms")
    .select("org_id")
    .in("org_id", orgIds);

  if (farmError) {
    throw farmError;
  }

  type FarmRow = { org_id: string | null };
  const farms = (farmData ?? []) as FarmRow[];
  const accessibleOrgIds = new Set<string>();

  for (const farm of farms) {
    if (typeof farm.org_id === "string" && farm.org_id.length > 0) {
      accessibleOrgIds.add(farm.org_id);
    }
  }

  return accessibleOrgIds.size;
};
