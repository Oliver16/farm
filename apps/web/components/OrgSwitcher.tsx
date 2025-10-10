"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "./AppProviders";
import { useAppStore } from "../lib/store";

interface OrgRecord {
  org_id: string;
  organizations: {
    name: string;
  } | null;
}

export const OrgSwitcher = () => {
  const supabase = useSupabase();
  const activeOrgId = useAppStore((state) => state.activeOrgId);
  const setActiveOrgId = useAppStore((state) => state.setActiveOrgId);
  const pushToast = useAppStore((state) => state.pushToast);
  const [orgs, setOrgs] = useState<OrgRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("activeOrgId");
    if (stored) {
      setActiveOrgId(stored);
    }
  }, [setActiveOrgId]);

  useEffect(() => {
    const fetchOrgs = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("org_memberships")
        .select("org_id, organizations(name)");

      if (error) {
        pushToast({ type: "error", message: error.message });
      } else {
        setOrgs(data ?? []);
        if (!activeOrgId && data && data.length > 0) {
          setActiveOrgId(data[0].org_id);
        }
      }
      setLoading(false);
    };

    fetchOrgs();
  }, [supabase, setActiveOrgId, activeOrgId, pushToast]);

  useEffect(() => {
    if (activeOrgId) {
      window.localStorage.setItem("activeOrgId", activeOrgId);
    }
  }, [activeOrgId]);

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
          <option key={org.org_id} value={org.org_id}>
            {org.organizations?.name ?? org.org_id}
          </option>
        ))}
      </select>
    </label>
  );
};
