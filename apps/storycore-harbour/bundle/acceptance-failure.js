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
  if (value.includes("references unknown") || value.includes("unknown scene") || value.includes("unknown character")) {
    return "reference_invalid";
  }
  if (value.includes("duration")) return "duration_invalid";
  if (value.includes("required") || value.includes("must contain") || value.includes("must be a string")) {
    return "required_field_invalid";
  }
  return "contract_invalid";
}
