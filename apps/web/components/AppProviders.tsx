"use client";

import { SWRConfig } from "swr";
import type { ReactNode } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { TypedSupabaseClient } from "@/lib/supabase/types";

const SupabaseContext = createContext<TypedSupabaseClient | null>(null);

export const useSupabase = () => {
  const client = useContext(SupabaseContext);
  if (!client) {
    throw new Error("Supabase client not available in context");
  }
  return client;
};

export const AppProviders = ({ children }: { children: ReactNode }) => {
  // IMPORTANT: don't create the browser client during render/SSR
  const [supabase, setSupabase] = useState<TypedSupabaseClient | null>(null);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setSupabase(createBrowserSupabaseClient());
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to initialize Supabase client due to a configuration error.";
      console.error("Failed to create Supabase client", error);
      setSupabaseError(message);
    }
  }, []);

  const swrConfig = useMemo(
    () => ({
      suspense: false,
      revalidateOnFocus: false
    }),
    []
  );

  if (supabaseError) {
    return (
      <div
        role="alert"
        style={{
          margin: "2rem auto",
          maxWidth: "420px",
          padding: "1.5rem",
          borderRadius: "0.75rem",
          border: "1px solid rgba(248, 113, 113, 0.4)",
          background: "rgba(15, 23, 42, 0.8)",
          color: "inherit",
          textAlign: "center",
          lineHeight: 1.5
        }}
      >
        <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>Configuration error</h2>
        <p style={{ margin: 0 }}>
          {supabaseError}
          <br />
          Set the Supabase environment variables and redeploy the application.
        </p>
      </div>
    );
  }

  // Render nothing until we’re mounted and the client exists. Prevents SSR crash.
  if (!supabase) return null;

  return (
    <SupabaseContext.Provider value={supabase}>
      <SWRConfig value={swrConfig}>{children}</SWRConfig>
    </SupabaseContext.Provider>
  );
};
