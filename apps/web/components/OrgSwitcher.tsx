"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useAppStore } from "../lib/store";
import { jsonFetcher } from "@/lib/fetcher";

interface OrgRecord {
  id: string;
  name: string;
}

interface OrgListResponse {
  orgs: OrgRecord[];
}

export const OrgSwitcher = () => {
  const activeOrgId = useAppStore((state) => state.activeOrgId);
  const setActiveOrgId = useAppStore((state) => state.setActiveOrgId);
  const pushToast = useAppStore((state) => state.pushToast);
  const router = useRouter();
  const [orgs, setOrgs] = useState<OrgRecord[]>([]);
  const { data, error, isLoading } = useSWR<OrgListResponse>("/api/orgs", jsonFetcher);

  useEffect(() => {
    const stored = window.localStorage.getItem("activeOrgId");
    if (stored) {
      setActiveOrgId(stored);
    }
  }, [setActiveOrgId]);

  useEffect(() => {
    if (error) {
      pushToast({ type: "error", message: error.message });
      setOrgs([]);
      return;
    }

    if (!data?.orgs) {
      return;
    }

    setOrgs(data.orgs);

    if (data.orgs.length === 0) {
      if (activeOrgId) {
        setActiveOrgId(undefined);
      }
      return;
    }

    const hasActiveOrg = activeOrgId
      ? data.orgs.some((org) => org.id === activeOrgId)
      : false;

    if (!activeOrgId || !hasActiveOrg) {
      setActiveOrgId(data.orgs[0].id);
    }
  }, [data, error, activeOrgId, setActiveOrgId, pushToast]);

  useEffect(() => {
    if (activeOrgId) {
      window.localStorage.setItem("activeOrgId", activeOrgId);
    } else {
      window.localStorage.removeItem("activeOrgId");
    }
  }, [activeOrgId]);

  const loading = isLoading && orgs.length === 0;

  if (!loading && orgs.length === 0) {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.75rem"
        }}
      >
        <span style={{ fontSize: "0.9rem", opacity: 0.85 }}>
          No organizations yet
        </span>
        <button
          type="button"
          onClick={() => router.push("/onboarding")}
          className="focus-ring"
          style={{
            padding: "0.5rem 0.75rem",
            borderRadius: "0.65rem",
            border: "1px solid rgba(125, 211, 252, 0.4)",
            background: "rgba(14, 116, 144, 0.6)",
            color: "inherit",
            cursor: "pointer"
          }}
        >
          Create organization
        </button>
      </div>
    );
  }

  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem"
      }}
    >
      <span style={{ fontSize: "0.9rem", opacity: 0.85 }}>Organization</span>
      <select
        value={activeOrgId ?? ""}
        onChange={(event) => setActiveOrgId(event.target.value || undefined)}
        disabled={loading || orgs.length === 0}
        style={{
          padding: "0.5rem 0.75rem",
          borderRadius: "0.5rem",
          background: "rgba(6, 17, 24, 0.8)",
          color: "inherit",
          border: "1px solid rgba(125, 211, 252, 0.4)",
          minWidth: "12rem"
        }}
      >
        <option value="" disabled>
          {loading ? "Loading..." : "Select organization"}
        </option>
        {orgs.map((org) => (
          <option key={org.id} value={org.id}>
            {org.name || org.id}
          </option>
        ))}
      </select>
    </label>
  );
};
