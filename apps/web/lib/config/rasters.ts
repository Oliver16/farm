export type RasterId = "ortho" | "dem_hillshade";

export interface RasterDefinition {
  id: RasterId;
  title: string;
  tilejsonRoute: string;
}

export const rasters: Record<RasterId, RasterDefinition> = {
  ortho: {
    id: "ortho",
    title: "Orthophoto",
    tilejsonRoute: "/api/rasters/ortho/tilejson"
  },
  dem_hillshade: {
    id: "dem_hillshade",
    title: "DEM Hillshade",
    tilejsonRoute: "/api/rasters/dem_hillshade/tilejson"
  }
};

export const isRasterId = (value: string): value is RasterId =>
  Object.prototype.hasOwnProperty.call(rasters, value);
