import { createClient } from "@supabase/supabase-js";
import { registry } from "../config";
import { serverEnv } from "../config/env.server";
import type { TypedSupabaseClient } from "./types";

export const createServiceRoleSupabaseClient = (): TypedSupabaseClient => {
  const key = serverEnv.SUPABASE_SERVICE_ROLE_KEY;

  return createClient(registry.env.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: {
      persistSession: false
    }
  });
};
