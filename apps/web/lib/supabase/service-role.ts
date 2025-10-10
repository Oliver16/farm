import { createClient } from "@supabase/supabase-js";
import { registry } from "../config";
import type { TypedSupabaseClient } from "./types";

export const createServiceRoleSupabaseClient = (): TypedSupabaseClient => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? registry.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for service RPC calls");
  }

  return createClient(registry.env.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: {
      persistSession: false
    }
  });
};
