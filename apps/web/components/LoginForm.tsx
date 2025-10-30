"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSupabase } from "./AppProviders";

export const LoginForm = () => {
  const supabase = useSupabase();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) {
        setStatus(error.message);
        return;
      }

      router.push("/");
    } catch (error) {
      console.error("Failed to sign in", error);
      setStatus(
        "Unable to reach the authentication service. Check your connection and Supabase configuration, then try again."
      );
    } finally {
      setIsSubmitting(false);
    }
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
        autoComplete="username"
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
      <label htmlFor="password">Password</label>
      <input
        id="password"
        type="password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="current-password"
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
          cursor: isSubmitting ? "not-allowed" : "pointer",
          opacity: isSubmitting ? 0.75 : 1
        }}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
      {status ? (
        <p style={{ margin: 0, fontSize: "0.9rem", textAlign: "center" }}>{status}</p>
      ) : null}
    </form>
  );
};
