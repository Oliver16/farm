import { createClient } from "@supabase/supabase-js";
import {
  createBrowserClient,
  createServerClient
} from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { registry } from "./config";

export type TypedSupabaseClient = SupabaseClient<any>;

export const createBrowserSupabaseClient = () =>
  createBrowserClient(registry.env.NEXT_PUBLIC_SUPABASE_URL, registry.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const createServerSupabaseClient = () => {
  const cookieStore = cookies();

  return createServerClient(
    registry.env.NEXT_PUBLIC_SUPABASE_URL,
    registry.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: Record<string, unknown>) {
          cookieStore.delete({ name, ...options });
        }
      }
    }
  );
};

export const createServiceRoleSupabaseClient = () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for service RPC calls");
  }

  return createClient(
    registry.env.NEXT_PUBLIC_SUPABASE_URL,
    key,
    {
      auth: {
        persistSession: false
      }
    }
  );
};
