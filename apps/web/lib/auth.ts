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
  const { data, error } = await supabase
    .from("farms")
    .select("org_id");

  if (error) {
    throw error;
  }

  type FarmRow = { org_id: string | null };
  const farms = (data ?? []) as FarmRow[];
  const orgIds = new Set<string>();

  for (const farm of farms) {
    if (typeof farm.org_id === "string" && farm.org_id.length > 0) {
      orgIds.add(farm.org_id);
    }
  }

  if (orgIds.size > 0 || !userId) {
    return orgIds.size;
  }

  const serviceClient = createServiceRoleSupabaseClient();
  const superuserResult = await checkSuperuser(serviceClient, userId);

  if (superuserResult.error) {
    throw new Error(superuserResult.error.message);
  }

  if (superuserResult.isSuperuser) {
    return 1;
  }

  return 0;
};
