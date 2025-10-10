"use client";

import { SWRConfig } from "swr";
import type { ReactNode } from "react";
import { createBrowserSupabaseClient } from "../lib/supabase";
import { createContext, useContext, useMemo, useState } from "react";
import type { TypedSupabaseClient } from "../lib/supabase";

const SupabaseContext = createContext<TypedSupabaseClient | null>(null);

export const useSupabase = () => {
  const client = useContext(SupabaseContext);
  if (!client) {
    throw new Error("Supabase client not available in context");
  }
  return client;
};

export const AppProviders = ({ children }: { children: ReactNode }) => {
  const [supabase] = useState(() => createBrowserSupabaseClient());

  const swrConfig = useMemo(
    () => ({
      suspense: false,
      revalidateOnFocus: false
    }),
    []
  );

  return (
    <SupabaseContext.Provider value={supabase}>
      <SWRConfig value={swrConfig}>{children}</SWRConfig>
    </SupabaseContext.Provider>
  );
};
