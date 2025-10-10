import { createBrowserClient } from "@supabase/ssr";
import { registry } from "../config";
import type { TypedSupabaseClient } from "./types";

export const createBrowserSupabaseClient = (): TypedSupabaseClient =>
  createBrowserClient(
    registry.env.NEXT_PUBLIC_SUPABASE_URL,
    registry.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
