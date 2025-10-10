import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "./supabase/server";

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

  const { data: memberships, error: membershipError } = await supabase
    .from("org_memberships")
    .select("org_id");

  if (membershipError) {
    throw membershipError;
  }

  type OrgMembershipRow = { org_id: string | null };
  const orgIds = new Set<string>(
    (memberships ?? [])
      .map((row) => row as OrgMembershipRow)
      .filter((row) => typeof row.org_id === "string" && row.org_id.length > 0)
      .map((row) => row.org_id as string),
  );

  if (orgIds.size === 0) {
    return 0;
  }

  const { data: farms, error: farmsError } = await supabase
    .from("farms")
    .select("org_id")
    .in("org_id", Array.from(orgIds));

  if (farmsError) {
    throw farmsError;
  }

  type FarmRow = { org_id: string | null };
  const farmOrgIds = new Set<string>();

  for (const farm of (farms ?? []) as FarmRow[]) {
    if (typeof farm.org_id === "string" && farm.org_id.length > 0) {
      farmOrgIds.add(farm.org_id);
    }
  }

  return farmOrgIds.size;
};
