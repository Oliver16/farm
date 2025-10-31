"use client";

import { useEffect, useMemo, useState } from "react";
import { registry, type LayerId } from "../lib/config";
import { useAppStore } from "../lib/store";
import { useSupabase } from "./AppProviders";

type ForeignKeyField = "farm_id" | "building_id" | "greenhouse_id";

type SelectOption = { value: string; label: string };

type LayerField = {
  name: string;
  label: string;
  required?: boolean;
  input?: "text" | "select";
  optionKey?: ForeignKeyField;
  options?: SelectOption[];
  placeholder?: string;
};

const buildingTypeOptions: SelectOption[] = [
  { value: "barn", label: "Barn" },
  { value: "shop", label: "Shop" },
  { value: "shed", label: "Shed" },
  { value: "greenhouse", label: "Greenhouse" },
  { value: "house", label: "House" },
  { value: "other", label: "Other" }
];

const greenhouseAreaUseOptions: SelectOption[] = [
  { value: "bench", label: "Bench" },
  { value: "bed", label: "Bed" },
  { value: "aisle", label: "Aisle" },
  { value: "staging", label: "Staging" },
  { value: "other", label: "Other" }
];

const fieldsByLayer: Record<LayerId, LayerField[]> = {
  farms: [
    { name: "name", label: "Name", required: true }
  ],
  fields: [
    { name: "name", label: "Name" },
    { name: "crop", label: "Crop" },
    { name: "farm_id", label: "Farm", input: "select", optionKey: "farm_id" }
  ],
  buildings: [
    { name: "name", label: "Name" },
    {
      name: "btype",
      label: "Building Type",
      required: true,
      input: "select",
      options: buildingTypeOptions,
      placeholder: "Select a building type"
    }
  ],
  greenhouses: [
    { name: "name", label: "Name" },
    {
      name: "building_id",
      label: "Building",
      input: "select",
      optionKey: "building_id"
    }
  ],
  greenhouse_areas: [
    { name: "name", label: "Name" },
    {
      name: "use_type",
      label: "Use Type",
      required: true,
      input: "select",
      options: greenhouseAreaUseOptions,
      placeholder: "Select how this area is used"
    },
    { name: "bench_id", label: "Bench ID" },
    {
      name: "greenhouse_id",
      label: "Greenhouse",
      input: "select",
      optionKey: "greenhouse_id"
    }
  ]
};

interface ForeignKeyOption {
  id: string;
  name: string;
}

type ForeignKeyOptions = Record<ForeignKeyField, ForeignKeyOption[]>;

const emptyForeignKeyOptions: ForeignKeyOptions = {
  farm_id: [],
  building_id: [],
  greenhouse_id: []
};

const foreignKeyTableByField: Record<ForeignKeyField, "farms" | "buildings" | "greenhouses"> = {
  farm_id: "farms",
  building_id: "buildings",
  greenhouse_id: "greenhouses"
};

const dispatchAttributes = (payload: unknown) => {
  window.dispatchEvent(new CustomEvent("map:attributes:update", { detail: payload }));
};

export const AttributePanel = () => {
  const supabase = useSupabase();
  const activeLayerId = useAppStore((state) => state.activeLayerId);
  const selectedFeature = useAppStore((state) => state.selectedFeature);
  const editMode = useAppStore((state) => state.editMode);
  const activeOrgId = useAppStore((state) => state.activeOrgId);
  const [formState, setFormState] = useState<Record<string, string>>({});
  const [foreignKeyOptions, setForeignKeyOptions] = useState<ForeignKeyOptions>(
    emptyForeignKeyOptions
  );
  const [loadingForeignKeys, setLoadingForeignKeys] = useState(false);
  const pushToast = useAppStore((state) => state.pushToast);

  useEffect(() => {
    if (!selectedFeature) {
      setFormState({});
      dispatchAttributes({});
      return;
    }
    const properties = (selectedFeature.properties ?? {}) as Record<string, string>;
    setFormState(properties);
    dispatchAttributes(properties);
  }, [selectedFeature]);

  useEffect(() => {
    setFormState((prev) => {
      if (activeOrgId) {
        if (prev.org_id === activeOrgId) return prev;
        const next = { ...prev, org_id: activeOrgId };
        dispatchAttributes(next);
        return next;
      }

      if (!prev.org_id) return prev;
      const next = { ...prev };
      delete next.org_id;
      dispatchAttributes(next);
      return next;
    });
  }, [activeOrgId]);

  useEffect(() => {
    let cancelled = false;
    if (!activeOrgId) {
      setForeignKeyOptions(emptyForeignKeyOptions);
      return () => {
        cancelled = true;
      };
    }

    const loadForeignKeys = async () => {
      setLoadingForeignKeys(true);
      const entries = Object.entries(foreignKeyTableByField) as [
        ForeignKeyField,
        (typeof foreignKeyTableByField)[ForeignKeyField]
      ][];

      const nextOptions: ForeignKeyOptions = {
        farm_id: [],
        building_id: [],
        greenhouse_id: []
      };

      try {
        for (const [field, table] of entries) {
          const { data, error } = await supabase
            .from(table)
            .select("id, name")
            .eq("org_id", activeOrgId)
            .order("name", { ascending: true });

          if (error) {
            pushToast({
              type: "error",
              message: `Failed to load ${field.replace("_id", " options")}: ${error.message}`
            });
            nextOptions[field] = [];
            continue;
          }

          const rows = (data ?? []) as { id: string; name: string | null }[];
          nextOptions[field] = rows.map((row) => ({
            id: row.id,
            name: row.name ?? row.id
          }));
        }

        if (!cancelled) {
          setForeignKeyOptions(nextOptions);
        }
      } finally {
        if (!cancelled) {
          setLoadingForeignKeys(false);
        }
      }
    };

    void loadForeignKeys();

    return () => {
      cancelled = true;
    };
  }, [activeOrgId, supabase, pushToast]);

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

  const effectiveOrgId = formState.org_id ?? activeOrgId ?? "";

  const hasMissingRequiredFields = fields.some((field) => {
    if (!field.required) return false;
    const rawValue = formState[field.name];
    if (typeof rawValue !== "string") return true;
    return rawValue.trim().length === 0;
  });

  const isSaveDisabled =
    editMode !== "edit" ||
    !selectedFeature ||
    hasMissingRequiredFields ||
    effectiveOrgId.trim().length === 0;

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
      {field.input === "select" ? (
        <select
          value={formState[field.name] ?? ""}
          onChange={(event) => handleChange(field.name, event.target.value)}
          disabled={
            editMode !== "edit" || (field.optionKey ? loadingForeignKeys : false)
          }
          required={field.required}
          style={{
            padding: "0.5rem",
            borderRadius: "0.5rem",
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(6, 17, 24, 0.6)",
            color: "inherit"
          }}
        >
          <option value="" disabled={field.required}>
            {field.optionKey
              ? loadingForeignKeys
                ? "Loading…"
                : field.placeholder ?? "Select"
              : field.placeholder ?? "Select"}
          </option>
          {field.optionKey
            ? (() => {
                const options = foreignKeyOptions[field.optionKey] ?? [];
                const currentValue = formState[field.name];
                const enrichedOptions =
                  currentValue && !options.some((option) => option.id === currentValue)
                    ? [...options, { id: currentValue, name: currentValue }]
                    : options;
                return enrichedOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ));
              })()
            : (field.options ?? []).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
        </select>
      ) : (
        <input
          type="text"
          value={formState[field.name] ?? ""}
          onChange={(event) => handleChange(field.name, event.target.value)}
          disabled={editMode !== "edit"}
          placeholder={field.placeholder}
          required={field.required}
          style={{
            padding: "0.5rem",
            borderRadius: "0.5rem",
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(6, 17, 24, 0.6)",
            color: "inherit"
          }}
        />
      )}
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
          if (isSaveDisabled) {
            if (!selectedFeature) {
              pushToast({ type: "info", message: "Draw or select a feature to save." });
            }
            return;
          }
          handleSave();
        }}
      >
        <input type="hidden" name="org_id" value={formState.org_id ?? activeOrgId ?? ""} />
        {fields.map(renderField)}
        {editMode === "edit" && !selectedFeature ? (
          <p style={{ fontSize: "0.75rem", color: "#fca5a5", margin: 0 }}>
            Select a feature on the map before saving.
          </p>
        ) : null}
        {editMode === "edit" && hasMissingRequiredFields ? (
          <p style={{ fontSize: "0.75rem", color: "#fca5a5", margin: 0 }}>
            Please complete all required fields marked with an asterisk (*).
          </p>
        ) : null}
        <button
          type="submit"
          disabled={isSaveDisabled}
          style={{
            padding: "0.5rem 0.75rem",
            borderRadius: "0.5rem",
            border: "1px solid rgba(34,197,94,0.6)",
            background: !isSaveDisabled ? "#22c55e" : "transparent",
            color: !isSaveDisabled ? "#022c22" : "inherit",
            cursor: isSaveDisabled ? "not-allowed" : "pointer"
          }}
        >
          Save Attributes
        </button>
      </form>
    </section>
  );
};
