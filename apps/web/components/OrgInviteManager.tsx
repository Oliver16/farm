"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { jsonFetcher } from "@/lib/fetcher";
import { useAppStore } from "@/lib/store";
import type { OrgRole } from "@/lib/orgs";

interface InviteRecord {
  id: string;
  token: string;
  email: string | null;
  role: OrgRole;
  single_use: boolean;
  used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

interface InviteListResponse {
  invites: InviteRecord[];
}

const formatDate = (value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleDateString();
};

export const OrgInviteManager = () => {
  const activeOrgId = useAppStore((state) => state.activeOrgId);
  const pushToast = useAppStore((state) => state.pushToast);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgRole>("viewer");
  const [singleUse, setSingleUse] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { data, error, isLoading, mutate } = useSWR<InviteListResponse>(
    activeOrgId ? `/api/orgs/${activeOrgId}/invites` : null,
    jsonFetcher
  );

  useEffect(() => {
    if (error) {
      setLoadError(error.message);
    } else {
      setLoadError(null);
    }
  }, [error]);

  const invites = useMemo(() => data?.invites ?? [], [data]);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeOrgId) {
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        role,
        single_use: singleUse
      };

      if (email.trim().length > 0) {
        payload.email = email.trim();
      }

      const response = await fetch(`/api/orgs/${activeOrgId}/invites`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });

      const body = (await response.json().catch(() => ({}))) as {
        invite?: InviteRecord;
        error?: { message?: string };
      };

      if (!response.ok || !body.invite) {
        throw new Error(body.error?.message ?? "Unable to create invite");
      }

      setEmail("");
      setSingleUse(true);
      await mutate();
      pushToast({ type: "success", message: "Invite created" });
    } catch (err) {
      pushToast({ type: "error", message: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (inviteId: string) => {
    if (!activeOrgId) return;
    try {
      const response = await fetch(`/api/orgs/${activeOrgId}/invites/${inviteId}`, {
        method: "DELETE"
      });

      const body = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: { message?: string };
      };

      if (!response.ok || !body.ok) {
        throw new Error(body.error?.message ?? "Unable to revoke invite");
      }

      await mutate();
      pushToast({ type: "success", message: "Invite revoked" });
    } catch (err) {
      pushToast({ type: "error", message: (err as Error).message });
    }
  };

  const handleCopy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      pushToast({ type: "success", message: "Invite code copied" });
    } catch (err) {
      pushToast({ type: "error", message: (err as Error).message });
    }
  };

  if (!activeOrgId) {
    return null;
  }

  return (
    <section
      style={{
        background: "rgba(4, 12, 19, 0.85)",
        padding: "1.25rem",
        borderRadius: "1rem",
        border: "1px solid rgba(148, 163, 184, 0.25)",
        display: "flex",
        flexDirection: "column",
        gap: "1rem"
      }}
    >
      <header style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Team invites</h2>
        <p style={{ margin: 0, opacity: 0.75 }}>
          Create single-use invites or share a reusable code so teammates can join your farm.
        </p>
      </header>
      {loadError ? (
        <p style={{ color: "#f87171", margin: 0 }}>{loadError}</p>
      ) : (
        <>
          <form
            onSubmit={handleCreate}
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.9rem" }}>Invite by email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="person@example.com"
                style={{
                  padding: "0.65rem 0.75rem",
                  borderRadius: "0.65rem",
                  border: "1px solid rgba(148, 163, 184, 0.35)",
                  background: "rgba(15, 23, 42, 0.6)",
                  color: "inherit"
                }}
                disabled={submitting}
              />
            </label>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", minWidth: "8rem" }}>
                <span style={{ fontSize: "0.9rem" }}>Role</span>
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value as OrgRole)}
                  disabled={submitting}
                  style={{
                    padding: "0.6rem 0.75rem",
                    borderRadius: "0.65rem",
                    border: "1px solid rgba(148, 163, 184, 0.35)",
                    background: "rgba(15, 23, 42, 0.6)",
                    color: "inherit"
                  }}
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </select>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  checked={singleUse}
                  onChange={(event) => setSingleUse(event.target.checked)}
                  disabled={submitting}
                />
                <span style={{ fontSize: "0.9rem" }}>Single-use invite</span>
              </label>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="focus-ring"
              style={{
                padding: "0.7rem 0.85rem",
                borderRadius: "0.75rem",
                border: "none",
                background: submitting ? "rgba(34,197,94,0.4)" : "#22c55e",
                color: "#022c22",
                cursor: submitting ? "not-allowed" : "pointer",
                fontWeight: 600
              }}
            >
              {submitting ? "Sending invite…" : "Send invite"}
            </button>
          </form>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <h3 style={{ margin: 0, fontSize: "1rem" }}>Existing invite codes</h3>
            {isLoading && !data ? (
              <p style={{ opacity: 0.75, margin: 0 }}>Loading invites…</p>
            ) : invites.length === 0 ? (
              <p style={{ opacity: 0.75, margin: 0 }}>No invites yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {invites.map((invite) => {
              const expires = formatDate(invite.expires_at);
              const used = formatDate(invite.used_at);
              return (
                <div
                  key={invite.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                    padding: "0.75rem",
                    borderRadius: "0.75rem",
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(148, 163, 184, 0.2)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <strong style={{ fontSize: "0.95rem" }}>{invite.token}</strong>
                      <span style={{ fontSize: "0.85rem", opacity: 0.75 }}>
                        {invite.email ? `Email: ${invite.email}` : "Shareable code"}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        type="button"
                        onClick={() => handleCopy(invite.token)}
                        className="focus-ring"
                        style={{
                          padding: "0.35rem 0.65rem",
                          borderRadius: "0.65rem",
                          border: "1px solid rgba(125, 211, 252, 0.4)",
                          background: "rgba(14, 116, 144, 0.4)",
                          color: "inherit",
                          cursor: "pointer"
                        }}
                      >
                        Copy
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRevoke(invite.id)}
                        className="focus-ring"
                        style={{
                          padding: "0.35rem 0.65rem",
                          borderRadius: "0.65rem",
                          border: "1px solid rgba(248, 113, 113, 0.4)",
                          background: "rgba(185, 28, 28, 0.35)",
                          color: "inherit",
                          cursor: "pointer"
                        }}
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: "0.8rem", opacity: 0.8, display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    <span>Role: {invite.role}</span>
                    <span>Type: {invite.single_use ? "Single-use" : "Reusable"}</span>
                    {used ? <span>Used: {used}</span> : <span>Status: Pending</span>}
                    {expires ? <span>Expires: {expires}</span> : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
        </>
      )}
    </section>
  );
};
