"use client";

import { useCallback } from "react";
import { useAppStore } from "../lib/store";

const dispatchMapEvent = (type: string, detail?: unknown) => {
  window.dispatchEvent(new CustomEvent(type, { detail }));
};

export const EditToolbar = () => {
  const editMode = useAppStore((state) => state.editMode);
  const setEditMode = useAppStore((state) => state.setEditMode);
  const activeOrgId = useAppStore((state) => state.activeOrgId);
  const activeLayerId = useAppStore((state) => state.activeLayerId);
  const drawDirty = useAppStore((state) => state.drawDirty);

  const toggleMode = useCallback(() => {
    setEditMode(editMode === "view" ? "edit" : "view");
  }, [editMode, setEditMode]);

  const disabled = !activeOrgId || !activeLayerId;

  return (
    <section aria-labelledby="edit-toolbar-heading">
      <h2 id="edit-toolbar-heading" style={{ margin: 0 }}>
        Edit Mode
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <button
          type="button"
          onClick={toggleMode}
          disabled={disabled}
          className="focus-ring"
          style={{
            padding: "0.5rem 0.75rem",
            borderRadius: "0.5rem",
            border: "1px solid rgba(255,255,255,0.2)",
            background: editMode === "edit" ? "#22c55e" : "transparent",
            color: editMode === "edit" ? "#022c22" : "inherit",
            cursor: disabled ? "not-allowed" : "pointer"
          }}
        >
          {editMode === "edit" ? "Switch to View" : "Switch to Edit"}
        </button>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "0.5rem"
          }}
        >
          <button
            type="button"
            onClick={() => dispatchMapEvent("map:draw:start", { mode: "draw_polygon" })}
            disabled={disabled || editMode !== "edit"}
          >
            Draw
          </button>
          <button
            type="button"
            onClick={() => dispatchMapEvent("map:draw:start", { mode: "direct_select" })}
            disabled={disabled || editMode !== "edit"}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => dispatchMapEvent("map:draw:delete")}
            disabled={disabled || editMode !== "edit"}
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => dispatchMapEvent("map:draw:cancel")}
            disabled={disabled || editMode !== "edit"}
          >
            Cancel
          </button>
        </div>
        <button
          type="button"
          onClick={() => dispatchMapEvent("map:draw:save")}
          disabled={disabled || editMode !== "edit" || !drawDirty}
          style={{
            padding: "0.5rem 0.75rem",
            borderRadius: "0.5rem",
            border: "1px solid rgba(34,197,94,0.6)",
            background: drawDirty ? "#22c55e" : "transparent",
            color: drawDirty ? "#022c22" : "inherit",
            cursor: disabled || editMode !== "edit" || !drawDirty ? "not-allowed" : "pointer"
          }}
        >
          Save Changes
        </button>
      </div>
    </section>
  );
};
