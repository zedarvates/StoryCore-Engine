export const MAX_MODEL_RESPONSE_CHARS = 28_000;

export function parseModelJson(text) {
  let value = String(text || "").trim();
  if (value.length > MAX_MODEL_RESPONSE_CHARS) {
    throw new Error(`The model response exceeded ${MAX_MODEL_RESPONSE_CHARS.toLocaleString()} characters.`);
  }
  value = stripOptionalJsonFence(value);

  try {
    return JSON.parse(value);
  } catch (directError) {
    const candidates = extractCompleteObjects(value);
    if (candidates.length === 1) return candidates[0];
    if (candidates.length > 1) {
      throw new Error("The model response contained multiple JSON objects.");
    }
    throw directError;
  }
}

function stripOptionalJsonFence(value) {
  if (!value.startsWith("```") || !value.endsWith("```")) return value;
  const firstLineEnd = value.indexOf("\n");
  if (firstLineEnd < 0) return value;

  const openingFence = value.slice(0, firstLineEnd).trim().toLowerCase();
  if (openingFence !== "```" && openingFence !== "```json") return value;
  return value.slice(firstLineEnd + 1, -3).trim();
}

function extractCompleteObjects(value) {
  const candidates = [];
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (start < 0) {
      if (character === "{") {
        start = index;
        depth = 1;
        inString = false;
        escaped = false;
      }
      continue;
    }

    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }

    if (character === '"') inString = true;
    else if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        const candidateText = value.slice(start, index + 1);
        try {
          const candidate = JSON.parse(candidateText);
          if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
            candidates.push(candidate);
          }
        } catch {
          // Invalid balanced fragments remain model prose, never executable data.
        }
        start = -1;
      }
    }
  }
  return candidates;
}
