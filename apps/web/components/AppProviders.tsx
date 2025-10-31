"use client";

import { SWRConfig } from "swr";
import type { ReactNode } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { createContext, useContext, useMemo, useState } from "react";
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
  const [{ client: supabase, error: supabaseError }] = useState(() => {
    try {
      return { client: createBrowserSupabaseClient(), error: null } as const;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to initialize Supabase client due to a configuration error.";
      console.error("Failed to create Supabase client", error);
      return { client: null, error: message } as const;
    }
  });

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

  return (
    <SupabaseContext.Provider value={supabase}>
      <SWRConfig value={swrConfig}>{children}</SWRConfig>
    </SupabaseContext.Provider>
  );
};
