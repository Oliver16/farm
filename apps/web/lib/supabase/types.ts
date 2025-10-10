import type { SupabaseClient } from "@supabase/supabase-js";

// Without the generated Supabase types we fall back to the generic client.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TypedSupabaseClient = SupabaseClient<any, any, any>;
