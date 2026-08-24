export function createRepairPrompt(input, errors) {
  return JSON.stringify({
    task: "Rebuild a complete StoryCore Harbour production package from the source input.",
    input,
    validationErrors: errors,
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
