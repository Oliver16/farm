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
  availableRasters: RasterWithMetadata[];
  setAvailableRasters: (rasters: { id: RasterId; acquiredAt: string | null }[]) => void;
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

type RasterWithMetadata = (typeof registry.rasterList)[number] & {
  acquiredAt: string | null;
};

const buildRasterVisibility = (
  rasters: RasterWithMetadata[],
  previous: Partial<Record<RasterId, boolean>>,
  fallback: (id: RasterId) => boolean
) =>
  rasters.reduce(
    (acc, raster) => ({
      ...acc,
      [raster.id]: previous[raster.id] ?? fallback(raster.id)
    }),
    {} as Record<RasterId, boolean>
  );

const initialRasterVisibility = {} as Record<RasterId, boolean>;

export const useAppStore = create<AppState>((set) => ({
  activeLayerId: registry.layerList[0]?.id ?? null,
  setActiveLayerId: (id) => set({ activeLayerId: id }),
  layerVisibility: initialLayerVisibility,
  toggleLayerVisibility: (id) =>
    set((state) => ({
      layerVisibility: { ...state.layerVisibility, [id]: !state.layerVisibility[id] }
    })),
  availableRasters: [],
  setAvailableRasters: (rasters) =>
    set((state) => {
      const enriched = rasters
        .map((raster) => {
          const definition = registry.rasters[raster.id];
          if (!definition) return null;
          return { ...definition, acquiredAt: raster.acquiredAt } as RasterWithMetadata;
        })
        .filter((value): value is RasterWithMetadata => Boolean(value));

      const fallback = (id: RasterId) => registry.rasters[id]?.defaultVisible ?? false;
      const visibility = buildRasterVisibility(enriched, state.rasterVisibility, fallback);

      return {
        availableRasters: enriched,
        rasterVisibility: visibility
      };
    }),
  rasterVisibility: initialRasterVisibility,
  toggleRasterVisibility: (id) =>
    set((state) => {
      if (!state.availableRasters.some((raster) => raster.id === id)) {
        return state;
      }

      return {
        rasterVisibility: {
          ...state.rasterVisibility,
          [id]: !state.rasterVisibility[id]
        }
      };
    }),
  setAllRastersVisibility: (visible) =>
    set((state) => ({
      rasterVisibility: state.availableRasters.reduce(
        (acc, raster) => ({
          ...acc,
          [raster.id]: visible
        }),
        {} as Record<RasterId, boolean>
      )
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
