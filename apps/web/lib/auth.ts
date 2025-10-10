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

export const getUserOrgCount = async () => {
  const supabase = createServerSupabaseClient();
  const { count, error } = await supabase
    .from("org_memberships")
    .select("org_id", { count: "exact", head: true });

  if (error) {
    throw error;
  }

  return count ?? 0;
};
