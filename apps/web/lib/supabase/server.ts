import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { registry } from "../config";
import type { TypedSupabaseClient } from "./types";

export const createServerSupabaseClient = (): TypedSupabaseClient => {
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
