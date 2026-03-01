/**
 * Fallback responses for the StoryCore assistant.
 * Used when the LLM service is unavailable or in offline mode.
 */

export function generateAssistantResponse(input: string): string {
  const lowerInput = input.toLowerCase();
  
  if (lowerInput.includes('bonjour') || lowerInput.includes('hello') || lowerInput.includes('salut')) {
    return "Bonjour ! Je suis l'assistant StoryCore. Comment puis-je vous aider dans votre projet créatif aujourd'hui ?";
  }
  
  if (lowerInput.includes('projet') || lowerInput.includes('project')) {
    return "Pour créer un projet, vous pouvez utiliser le bouton 'Nouveau Projet' ou simplement me décrire ce que vous voulez réaliser.";
  }
  
  if (lowerInput.includes('personnage') || lowerInput.includes('character')) {
    return "Je peux vous aider à concevoir des personnages profonds. Voulez-vous que nous commencions par son archétype ou son apparence visuelle ?";
  }
  
  if (lowerInput.includes('monde') || lowerInput.includes('world')) {
    return "La création d'univers est ma spécialité. Quel genre d'univers imaginez-vous ? (Fantasy, Science-Fiction, Historique...)";
  }
  
  if (lowerInput.includes('aide') || lowerInput.includes('help')) {
    return "Je suis là pour vous accompagner dans toutes les étapes de votre création : personnages, mondes, scénarios, et même la génération d'assets visuels et sonores.";
  }

  return "Je comprends votre demande. En mode hors ligne, mes capacités sont limitées, mais je peux vous guider dans l'utilisation de l'interface. Pour une expérience optimale, n'oubliez pas de configurer votre service LLM (Ollama ou API distante).";
}
