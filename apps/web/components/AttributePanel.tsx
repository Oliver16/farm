"use client";

import { useEffect, useMemo, useState } from "react";
import { registry, type LayerId } from "../lib/config";
import { useAppStore } from "../lib/store";

type LayerField = {
  name: string;
  label: string;
  required?: boolean;
};

const fieldsByLayer: Record<LayerId, LayerField[]> = {
  farms: [
    { name: "name", label: "Name", required: true }
  ],
  fields: [
    { name: "name", label: "Name" },
    { name: "crop", label: "Crop" },
    { name: "farm_id", label: "Farm ID" }
  ],
  buildings: [
    { name: "name", label: "Name" },
    { name: "btype", label: "Building Type", required: true }
  ],
  greenhouses: [
    { name: "name", label: "Name" },
    { name: "building_id", label: "Building ID" }
  ],
  greenhouse_areas: [
    { name: "name", label: "Name" },
    { name: "use_type", label: "Use Type", required: true },
    { name: "bench_id", label: "Bench ID" },
    { name: "greenhouse_id", label: "Greenhouse ID" }
  ]
};

const dispatchAttributes = (payload: unknown) => {
  window.dispatchEvent(new CustomEvent("map:attributes:update", { detail: payload }));
};

export const AttributePanel = () => {
  const activeLayerId = useAppStore((state) => state.activeLayerId);
  const selectedFeature = useAppStore((state) => state.selectedFeature);
  const editMode = useAppStore((state) => state.editMode);
  const activeOrgId = useAppStore((state) => state.activeOrgId);
  const [formState, setFormState] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!selectedFeature) {
      setFormState({});
      return;
    }
    const properties = (selectedFeature.properties ?? {}) as Record<string, string>;
    setFormState(properties);
  }, [selectedFeature]);

  useEffect(() => {
    if (activeOrgId) {
      setFormState((prev) => ({ ...prev, org_id: activeOrgId }));
    }
  }, [activeOrgId]);

  const fields = useMemo(() => {
    if (!activeLayerId) return [];
    return fieldsByLayer[activeLayerId];
  }, [activeLayerId]);

  const handleChange = (name: string, value: string) => {
    setFormState((prev) => {
      const next = { ...prev, [name]: value };
      dispatchAttributes(next);
      return next;
    });
  };

  const handleSave = () => {
    window.dispatchEvent(new CustomEvent("map:draw:save"));
  };

  if (!activeLayerId) {
    return <p>Select a layer to see attributes.</p>;
  }

  const layer = registry.vectorLayers[activeLayerId];

  const renderField = (field: LayerField) => (
    <label key={field.name} style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      <span>
        {field.label}
        {field.required ? " *" : ""}
      </span>
      <input
        type="text"
        value={formState[field.name] ?? ""}
        onChange={(event) => handleChange(field.name, event.target.value)}
        disabled={editMode !== "edit"}
        style={{
          padding: "0.5rem",
          borderRadius: "0.5rem",
          border: "1px solid rgba(255,255,255,0.2)",
          background: "rgba(6, 17, 24, 0.6)",
          color: "inherit"
        }}
      />
    </label>
  );

  const currentFeatureId = (selectedFeature?.properties as Record<string, string> | undefined)?.id;

  return (
    <section aria-labelledby="attribute-panel-heading">
      <h2 id="attribute-panel-heading" style={{ marginTop: 0 }}>
        {layer.title} Attributes
      </h2>
      {currentFeatureId ? (
        <p style={{ fontSize: "0.75rem", opacity: 0.7 }}>Editing feature {currentFeatureId}</p>
      ) : null}
      <form
        style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        onSubmit={(event) => {
          event.preventDefault();
          handleSave();
        }}
      >
        <input type="hidden" name="org_id" value={formState.org_id ?? activeOrgId ?? ""} />
        {fields.map(renderField)}
        <button
          type="submit"
          disabled={editMode !== "edit"}
          style={{
            padding: "0.5rem 0.75rem",
            borderRadius: "0.5rem",
            border: "1px solid rgba(34,197,94,0.6)",
            background: editMode === "edit" ? "#22c55e" : "transparent",
            color: editMode === "edit" ? "#022c22" : "inherit",
            cursor: editMode !== "edit" ? "not-allowed" : "pointer"
          }}
        >
          Save Attributes
        </button>
      </form>
    </section>
  );
};
