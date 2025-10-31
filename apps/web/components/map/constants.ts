export const errorMessages: Record<string, string> = {
  RLS_DENIED: "You don’t have permission to modify this organization’s data.",
  GEOM_INVALID: "Invalid geometry.",
  GEOM_INVALID_LARGE_FIX:
    "Geometry invalid and auto-fix changed shape >5%. Please correct.",
  PARENT_NOT_FOUND: "Linked parent does not exist.",
  VALIDATION_FAILED: "Missing required fields.",
  FEATURE_JSON_REQUIRED: "Draw or select a feature before saving.",
  "feature_json is required": "Draw or select a feature before saving.",
  PROPS_JSON_REQUIRED: "No attributes provided to save.",
  "props_json is required": "No attributes provided to save.",
  ORG_ID_REQUIRED: "Select an organization before saving.",
  "org_id is required": "Select an organization before saving.",
  BTYPE_REQUIRED: "Choose a building type before saving.",
  "btype is required": "Choose a building type before saving.",
  USE_TYPE_REQUIRED: "Choose how the greenhouse area is used before saving.",
  "use_type is required": "Choose how the greenhouse area is used before saving."
};
