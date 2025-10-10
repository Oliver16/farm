"use client";

import { useCallback } from "react";
import { useAppStore } from "../lib/store";
import styles from "./EditToolbar.module.css";

const dispatchMapEvent = (type: string, detail?: unknown) => {
  window.dispatchEvent(new CustomEvent(type, { detail }));
};

const actionButtons = [
  {
    label: "Draw",
    onClick: () => dispatchMapEvent("map:draw:start", { mode: "draw_polygon" })
  },
  {
    label: "Edit",
    onClick: () => dispatchMapEvent("map:draw:start", { mode: "direct_select" })
  },
  {
    label: "Delete",
    onClick: () => dispatchMapEvent("map:draw:delete")
  },
  {
    label: "Cancel",
    onClick: () => dispatchMapEvent("map:draw:cancel")
  }
];

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
  const isEditMode = editMode === "edit";
  const saveDisabled = disabled || !isEditMode || !drawDirty;

  return (
    <section className={styles.section} aria-labelledby="edit-toolbar-heading">
      <h2 id="edit-toolbar-heading" className={styles.heading}>
        Edit Mode
      </h2>
      <div className={styles.controls}>
        <button
          type="button"
          onClick={toggleMode}
          disabled={disabled}
          role="switch"
          aria-checked={isEditMode}
          aria-label={isEditMode ? "Switch to view mode" : "Switch to edit mode"}
          className={`${styles.modeToggle} focus-ring`}
          data-state={isEditMode ? "edit" : "view"}
        >
          <span className={styles.modeToggleLabel}>
            {isEditMode ? "Editing" : "Viewing"}
            <span>{isEditMode ? "Tap to exit" : "Tap to start"}</span>
          </span>
          <span className={styles.modeToggleIndicator} aria-hidden="true">
            <span className={styles.modeToggleThumb} />
          </span>
        </button>

        <div className={styles.actionGrid}>
          {actionButtons.map(({ label, onClick }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              disabled={disabled || !isEditMode}
              className={`${styles.toolbarButton} focus-ring`}
            >
              {label}
            </button>
          ))}
        </div>

        <div>
          <button
            type="button"
            onClick={() => dispatchMapEvent("map:draw:save")}
            disabled={saveDisabled}
            className={`${styles.toolbarButton} focus-ring`}
            data-variant="primary"
            data-state={drawDirty ? "active" : "inactive"}
          >
            Save Changes
          </button>
          <p className={styles.helperText}>
            {saveDisabled
              ? "Changes become available once you have edits to review."
              : "Ready to publish your latest field updates."}
          </p>
        </div>
      </div>
    </section>
  );
};
