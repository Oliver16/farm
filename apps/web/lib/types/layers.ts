export type VectorLayerId =
  | "farms"
  | "fields"
  | "buildings"
  | "greenhouses"
  | "greenhouse_areas";

export interface VectorLayerConfig {
  id: VectorLayerId;
  title: string;
  minzoom: number;
  maxzoom: number;
  tilesUrlTemplate: string;
  editable: boolean;
  // optional UI flags
  defaultVisible?: boolean;
}

export interface RasterConfig {
  id: "ortho" | "dem_hillshade" | string;
  title: string;
  // a DB-driven identifier you already have; not strictly required for typing here
  rasterId?: string;
  // function or string the app uses to get TileJSON
  tilejsonUrl?: string;
  defaultVisible?: boolean;
}
