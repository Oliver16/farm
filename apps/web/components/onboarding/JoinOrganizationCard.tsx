"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface JoinResponse {
  ok: boolean;
  org_id?: string;
  error?: { message?: string };
}

export const JoinOrganizationCard = () => {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!inviteCode.trim()) {
      setError("Invite code is required");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/onboarding/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ invite_code: inviteCode.trim() })
      });

      const body = (await response.json().catch(() => ({}))) as JoinResponse;
      if (!response.ok || !body.ok) {
        setError(body?.error?.message ?? "Unable to join organization");
        return;
      }

      if (body.org_id) {
        window.localStorage.setItem("activeOrgId", body.org_id);
      }

      router.push("/");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      style={{
        background: "rgba(4, 12, 19, 0.85)",
        padding: "1.5rem",
        borderRadius: "1rem",
        border: "1px solid rgba(148, 163, 184, 0.25)",
        display: "flex",
        flexDirection: "column",
        gap: "1rem"
      }}
    >
      <div>
        <h2 style={{ margin: 0 }}>Join an organization</h2>
        <p style={{ margin: "0.25rem 0 0", opacity: 0.8 }}>
          Enter the invite code shared with you to join an existing team.
        </p>
      </div>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ fontSize: "0.9rem" }}>Invite code</span>
          <input
            type="text"
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value)}
            placeholder="e.g. FARM-123-XYZ"
            style={{
              padding: "0.65rem 0.75rem",
              borderRadius: "0.65rem",
              border: "1px solid rgba(148, 163, 184, 0.35)",
              background: "rgba(15, 23, 42, 0.6)",
              color: "inherit"
            }}
          />
        </label>
        {error ? (
          <p style={{ color: "#f87171", margin: 0 }}>{error}</p>
        ) : null}
        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: "0.65rem 0.75rem",
            borderRadius: "0.75rem",
            border: "none",
            background: submitting ? "rgba(34,197,94,0.4)" : "#22c55e",
            color: "#022c22",
            cursor: submitting ? "not-allowed" : "pointer",
            fontWeight: 600
          }}
        >
          {submitting ? "Joining…" : "Join organization"}
        </button>
      </form>
    </section>
  );
};
