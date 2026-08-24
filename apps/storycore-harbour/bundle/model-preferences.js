const MODEL_HINT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,79}$/;

export function modelPreferencesForHint(value) {
  const hint = String(value || "").trim();
  if (!MODEL_HINT_PATTERN.test(hint)) return undefined;
  return { hints: [{ name: hint }] };
}
