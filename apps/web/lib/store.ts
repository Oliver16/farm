"use client";

import { create } from "zustand";
import type { Feature } from "geojson";
import { nanoid } from "nanoid";
import { registry, type LayerId, type RasterId } from "./config";

type EditMode = "view" | "edit";

type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface AppState {
  activeOrgId?: string;
  setActiveOrgId: (id: string | undefined) => void;
  activeLayerId: LayerId | null;
  setActiveLayerId: (id: LayerId | null) => void;
  layerVisibility: Record<LayerId, boolean>;
  toggleLayerVisibility: (id: LayerId) => void;
  rasterVisibility: Record<RasterId, boolean>;
  toggleRasterVisibility: (id: RasterId) => void;
  setAllRastersVisibility: (visible: boolean) => void;
  editMode: EditMode;
  setEditMode: (mode: EditMode) => void;
  selectedFeature?: Feature;
  setSelectedFeature: (feature: Feature | undefined) => void;
  drawDirty: boolean;
  setDrawDirty: (dirty: boolean) => void;
  toasts: ToastMessage[];
  pushToast: (toast: Omit<ToastMessage, "id"> & { id?: string }) => void;
  dismissToast: (id: string) => void;
}

const initialLayerVisibility = registry.layerList.reduce(
  (acc, layer) => ({
    ...acc,
    [layer.id]: layer.defaultVisible ?? true
  }),
  {} as Record<LayerId, boolean>
);

const buildRasterVisibility = (visible: boolean) =>
  registry.rasterList.reduce(
    (acc, raster) => ({
      ...acc,
      [raster.id]: visible
    }),
    {} as Record<RasterId, boolean>
  );

const initialRasterVisibility = registry.rasterList.reduce(
  (acc, raster) => ({
    ...acc,
    [raster.id]: raster.defaultVisible ?? false
  }),
  {} as Record<RasterId, boolean>
);

export const useAppStore = create<AppState>((set) => ({
  activeLayerId: registry.layerList[0]?.id ?? null,
  setActiveLayerId: (id) => set({ activeLayerId: id }),
  layerVisibility: initialLayerVisibility,
  toggleLayerVisibility: (id) =>
    set((state) => ({
      layerVisibility: { ...state.layerVisibility, [id]: !state.layerVisibility[id] }
    })),
  rasterVisibility: initialRasterVisibility,
  toggleRasterVisibility: (id) =>
    set((state) => ({
      rasterVisibility: {
        ...state.rasterVisibility,
        [id]: !state.rasterVisibility[id]
      }
    })),
  setAllRastersVisibility: (visible) =>
    set(() => ({
      rasterVisibility: buildRasterVisibility(visible)
    })),
  editMode: "view",
  setEditMode: (mode) => set({ editMode: mode }),
  selectedFeature: undefined,
  setSelectedFeature: (feature) => set({ selectedFeature: feature }),
  drawDirty: false,
  setDrawDirty: (dirty) => set({ drawDirty: dirty }),
  activeOrgId: undefined,
  setActiveOrgId: (id) => set({ activeOrgId: id }),
  toasts: [],
  pushToast: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        { id: toast.id ?? nanoid(), type: toast.type, message: toast.message }
      ]
    })),
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }))
}));
