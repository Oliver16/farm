"use client";

import { useState } from "react";
import { useSupabase } from "./AppProviders";

export const LoginForm = () => {
  const supabase = useSupabase();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus("Check your inbox for the magic link.");
  };

  return (
    <form
      onSubmit={onSubmit}
      style={{
        width: "min(320px, 100%)",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        background: "rgba(11, 29, 38, 0.75)",
        padding: "2rem",
        borderRadius: "0.75rem",
        border: "1px solid rgba(125, 211, 252, 0.3)"
      }}
    >
      <h2 style={{ margin: 0, fontSize: "1.5rem", textAlign: "center" }}>Sign in</h2>
      <label htmlFor="email">Work email</label>
      <input
        id="email"
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        style={{
          padding: "0.5rem",
          borderRadius: "0.5rem",
          border: "1px solid rgba(255,255,255,0.2)",
          background: "rgba(6, 17, 24, 0.7)",
          color: "inherit"
        }}
      />
      <button
        type="submit"
        className="focus-ring"
        style={{
          padding: "0.75rem",
          borderRadius: "0.5rem",
          border: "none",
          background: "#22c55e",
          color: "#022c22",
          fontWeight: 600,
          cursor: "pointer"
        }}
      >
        Send magic link
      </button>
      {status ? (
        <p style={{ margin: 0, fontSize: "0.9rem", textAlign: "center" }}>{status}</p>
      ) : null}
    </form>
  );
};
