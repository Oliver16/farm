"use client";

import { useMapController } from "./useMapController";

export const MapCanvas = () => {
  const { containerRef } = useMapController();
  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%" }}
      aria-label="Map canvas"
    />
  );
};
