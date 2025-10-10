export const errorMessages: Record<string, string> = {
  RLS_DENIED: "You don’t have permission to modify this organization’s data.",
  GEOM_INVALID: "Invalid geometry.",
  GEOM_INVALID_LARGE_FIX:
    "Geometry invalid and auto-fix changed shape >5%. Please correct.",
  PARENT_NOT_FOUND: "Linked parent does not exist.",
  VALIDATION_FAILED: "Missing required fields."
};
