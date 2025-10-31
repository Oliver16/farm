import { createClient } from "@supabase/supabase-js";
import { registry } from "../config";
import { getServerEnv } from "../config/env.server";
import type { TypedSupabaseClient } from "./types";

export const createServiceRoleSupabaseClient = (): TypedSupabaseClient => {
  const { SUPABASE_SERVICE_ROLE_KEY } = getServerEnv();

  return createClient(registry.env.NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false
    }
  });
};
