import { env } from "./env";

export type RasterId = "ortho" | "dem_hillshade";

export interface RasterDefinition {
  id: RasterId;
  title: string;
  tilejsonRoute: string;
  resampling: "linear" | "nearest";
  opacity: number;
}

export const rasters: Record<RasterId, RasterDefinition> = {
  ortho: {
    id: "ortho",
    title: "Orthophoto",
    tilejsonRoute: "/api/rasters/ortho/tilejson",
    resampling: "linear",
    opacity: 0.85
  },
  dem_hillshade: {
    id: "dem_hillshade",
    title: "DEM Hillshade",
    tilejsonRoute: "/api/rasters/dem_hillshade/tilejson",
    resampling: "nearest",
    opacity: 0.8
  }
};

export const isRasterId = (value: string): value is RasterId =>
  Object.prototype.hasOwnProperty.call(rasters, value);

export const createCogTileJsonUrl = (s3Url: string) => {
  const base = env.TITILER_BASE.replace(/\/$/, "");
  return `${base}/cog/tilejson.json?url=${encodeURIComponent(s3Url)}`;
};
