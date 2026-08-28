const PUBLIC_FAILURE_NAMES = new Set([
  "runtime",
  "permission",
  "quota",
  "provider",
  "timeout",
  "parse",
  "storage",
  "unknown",
]);

export function publicFailureName(message, category) {
  const stableCategory = String(category || "unknown").toLowerCase();
  if (stableCategory !== "contract") {
    return PUBLIC_FAILURE_NAMES.has(stableCategory) ? stableCategory : "unknown";
  }

  const value = String(message || "").toLowerCase();
  if (value.includes("unterminated string") || value.includes("json parse failed")) {
    return "json_invalid";
  }
  if (value.includes("severity must be")) return "warning_severity_invalid";
  if (
    value.includes("references unknown") ||
    value.includes("unknown scene") ||
    value.includes("unknown character") ||
    value.includes("not listed in the parent scene")
  ) {
    return "reference_invalid";
  }
  if (value.includes("duration")) return "duration_invalid";
  if (value.includes("schemaversion must be") || value.includes("project.format is unsupported")) {
    return "schema_invalid";
  }
  if (value.includes("iso-compatible date-time")) return "timestamp_invalid";
  if (value.includes("duplicate")) return "duplicate_invalid";
  if (value.includes("must be a positive integer")) return "ordering_invalid";
  if (value.includes("continuityreport.score")) return "continuity_score_invalid";
  if (value.includes("required") || value.includes("must contain") || value.includes("must be a string")) {
    return "required_field_invalid";
  }
  if (value.includes("must be an array") || value.includes("must be an object")) {
    return "structure_invalid";
  }
  return "contract_invalid";
}
