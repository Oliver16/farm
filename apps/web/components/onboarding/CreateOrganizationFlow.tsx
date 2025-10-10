"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { FarmDrawMap } from "./FarmDrawMap";

interface CreateOrgResponse {
  org_id: string;
}

interface CreateFarmResponse {
  ok: boolean;
  feature?: Feature<Polygon | MultiPolygon>;
  error?: { message?: string };
}

export const CreateOrganizationFlow = () => {
  const router = useRouter();
  const [orgName, setOrgName] = useState("");
  const [farmName, setFarmName] = useState("");
  const [feature, setFeature] = useState<Feature<Polygon | MultiPolygon> | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgError, setOrgError] = useState<string | null>(null);
  const [farmError, setFarmError] = useState<string | null>(null);
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [creatingFarm, setCreatingFarm] = useState(false);

  const isFarmStep = useMemo(() => Boolean(orgId), [orgId]);

  const handleOrgSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setOrgError(null);
    setFarmError(null);

    if (!orgName.trim()) {
      setOrgError("Organization name is required");
      return;
    }

    setCreatingOrg(true);
    try {
      const response = await fetch("/api/onboarding/create-org", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ org_name: orgName.trim() })
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
        setOrgError(body?.error?.message ?? "Unable to create organization");
        return;
      }

      const body = (await response.json()) as CreateOrgResponse;
      setOrgId(body.org_id);
    } catch (error) {
      setOrgError((error as Error).message);
    } finally {
      setCreatingOrg(false);
    }
  };

  const handleFarmSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFarmError(null);

    if (!orgId) {
      setFarmError("Organization missing");
      return;
    }
    if (!farmName.trim()) {
      setFarmError("Farm name is required");
      return;
    }
    if (!feature) {
      setFarmError("Draw the farm boundary before continuing");
      return;
    }

    setCreatingFarm(true);
    try {
      const response = await fetch("/api/onboarding/create-farm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ org_id: orgId, name: farmName.trim(), feature })
      });

      const body = (await response.json().catch(() => ({}))) as CreateFarmResponse;
      if (!response.ok || !body.ok) {
        setFarmError(body?.error?.message ?? "Unable to save farm");
        return;
      }

      window.localStorage.setItem("activeOrgId", orgId);
      router.push("/");
    } catch (error) {
      setFarmError((error as Error).message);
    } finally {
      setCreatingFarm(false);
    }
  };

  return (
    <section
      style={{
        background: "rgba(8, 18, 26, 0.9)",
        padding: "1.75rem",
        borderRadius: "1rem",
        border: "1px solid rgba(94, 234, 212, 0.2)",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
        width: "100%"
      }}
    >
      <div>
        <h2 style={{ margin: 0 }}>Create a new organization</h2>
        <p style={{ margin: "0.25rem 0 0", opacity: 0.8 }}>
          Set up a workspace for your farm team and invite collaborators later.
        </p>
      </div>

      {!isFarmStep ? (
        <form onSubmit={handleOrgSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <span style={{ fontSize: "0.9rem" }}>Organization name</span>
            <input
              type="text"
              value={orgName}
              onChange={(event) => setOrgName(event.target.value)}
              placeholder="Acme Farms Cooperative"
              style={{
                padding: "0.65rem 0.75rem",
                borderRadius: "0.65rem",
                border: "1px solid rgba(148, 163, 184, 0.35)",
                background: "rgba(15, 23, 42, 0.6)",
                color: "inherit"
              }}
            />
          </label>
          {orgError ? <p style={{ color: "#f87171", margin: 0 }}>{orgError}</p> : null}
          <button
            type="submit"
            disabled={creatingOrg}
            style={{
              padding: "0.65rem 0.75rem",
              borderRadius: "0.75rem",
              border: "none",
              background: creatingOrg ? "rgba(59,130,246,0.4)" : "#3b82f6",
              color: "#f8fafc",
              cursor: creatingOrg ? "not-allowed" : "pointer",
              fontWeight: 600
            }}
          >
            {creatingOrg ? "Creating…" : "Create organization"}
          </button>
        </form>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <h3 style={{ margin: 0 }}>Step 2 · Draw your first farm</h3>
            <p style={{ margin: "0.25rem 0 0", opacity: 0.8 }}>
              Name the farm and digitize its boundary. You can add more details later.
            </p>
          </div>
          <form onSubmit={handleFarmSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.9rem" }}>Farm name</span>
              <input
                type="text"
                value={farmName}
                onChange={(event) => setFarmName(event.target.value)}
                placeholder="North Valley Farm"
                style={{
                  padding: "0.65rem 0.75rem",
                  borderRadius: "0.65rem",
                  border: "1px solid rgba(148, 163, 184, 0.35)",
                  background: "rgba(15, 23, 42, 0.6)",
                  color: "inherit"
                }}
              />
            </label>
            <FarmDrawMap onFeatureChange={setFeature} />
            <p style={{ fontSize: "0.85rem", margin: 0, opacity: 0.75 }}>
              Use the polygon tool to sketch the farm boundary. Keep it to a single polygon.
            </p>
            {farmError ? <p style={{ color: "#f87171", margin: 0 }}>{farmError}</p> : null}
            <button
              type="submit"
              disabled={creatingFarm || !feature || !farmName.trim()}
              style={{
                padding: "0.65rem 0.75rem",
                borderRadius: "0.75rem",
                border: "none",
                background:
                  creatingFarm || !feature || !farmName.trim()
                    ? "rgba(34,197,94,0.35)"
                    : "#22c55e",
                color: "#022c22",
                cursor:
                  creatingFarm || !feature || !farmName.trim()
                    ? "not-allowed"
                    : "pointer",
                fontWeight: 600
              }}
            >
              {creatingFarm ? "Saving…" : "Create farm and finish"}
            </button>
          </form>
        </div>
      )}
    </section>
  );
};
