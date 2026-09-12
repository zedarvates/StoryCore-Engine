export function createRepairPrompt(input, errors) {
  // Parser diagnostics and reference IDs can quote untrusted model output.
  // Rebuild from the source input using only fixed, deduplicated categories.
  const validationErrors = [...new Set(errors.map(error => (
    typeof error === "string" && error.startsWith("JSON parse failed:")
      ? "json_invalid"
      : "contract_invalid"
  )))];
  return JSON.stringify({
    task: "Rebuild a complete StoryCore Harbour production package from the source input.",
    input,
    validationErrors,
    constraints: {
      jsonOnly: true,
      maxCharacters: 12_000,
      scenes: 3,
      shotsPerScene: 1,
      characters: "1-3",
      locations: "1-3",
      synopsisMaxWords: 80,
      descriptionMaxWords: 40,
      generationPromptMaxWords: 60,
      discardPreviousResponse: true,
    },
  });
}
