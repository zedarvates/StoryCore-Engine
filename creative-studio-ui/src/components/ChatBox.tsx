import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, AlertCircle, Download } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { checkOllamaStatus } from '@/services/ollamaConfig';
import type { ChatMessage } from '@/types';

interface ChatBoxProps {
  className?: string;
}

export const ChatBox: React.FC<ChatBoxProps> = ({ className = '' }) => {
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOllamaAvailable, setIsOllamaAvailable] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { chatMessages, addChatMessage, shots, addShot, updateShot } = useAppStore();

  // Check Ollama status on mount
  useEffect(() => {
    async function checkOllama() {
      const available = await checkOllamaStatus();
      setIsOllamaAvailable(available);
    }
    checkOllama();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    addChatMessage(userMessage);
    setInputValue('');
    setIsProcessing(true);

    // Simulate AI processing (in production, this would call an LLM API)
    setTimeout(() => {
      const response = generateAIResponse(userMessage.content, shots);
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        suggestions: response.suggestions,
      };

      addChatMessage(assistantMessage);

      // Execute any actions from the AI response
      if (response.actions) {
        response.actions.forEach((action) => {
          if (action.type === 'addShot') {
            addShot(action.shot);
          } else if (action.type === 'updateShot' && action.shotId) {
            updateShot(action.shotId, action.updates);
          }
        });
      }

      setIsProcessing(false);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    inputRef.current?.focus();
  };

  return (
    <div className={`flex flex-col h-full bg-background ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-border">
        <Sparkles className="w-5 h-5 text-purple-600" />
        <h2 className="text-lg font-semibold text-foreground">AI Assistant</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Ollama Warning Banner */}
        {isOllamaAvailable === false && (
          <div className="rounded-lg border-2 border-orange-200 bg-orange-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900 mb-1">
                  Ollama n'est pas détecté
                </h3>
                <p className="text-sm text-orange-800 mb-3">
                  L'assistant AI nécessite Ollama pour fonctionner. Veuillez installer ou démarrer Ollama pour utiliser les fonctionnalités d'intelligence artificielle.
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="https://ollama.com/download/windows"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-600 text-white text-sm rounded-md hover:bg-orange-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Télécharger Ollama
                  </a>
                  <button
                    onClick={async () => {
                      const available = await checkOllamaStatus();
                      setIsOllamaAvailable(available);
                      if (available) {
                        addChatMessage({
                          id: `msg-${Date.now()}`,
                          role: 'assistant',
                          content: '✅ Ollama est maintenant connecté! Je suis prêt à vous aider.',
                          timestamp: new Date(),
                        });
                      }
                    }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-white text-orange-600 text-sm rounded-md border border-orange-300 hover:bg-orange-50 transition-colors"
                  >
                    Vérifier à nouveau
                  </button>
                </div>
                <p className="text-xs text-orange-700 mt-3">
                  💡 Après installation, lancez Ollama et cliquez sur "Vérifier à nouveau"
                </p>
              </div>
            </div>
          </div>
        )}

        {chatMessages.length === 0 && (
          <div className="text-center text-muted-foreground mt-8">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-purple-400" />
            <p className="text-sm">
              Hi! I'm your AI assistant. I can help you create and edit your storyboard.
            </p>
            <p className="text-xs mt-2">Try asking me to:</p>
            <div className="mt-3 space-y-2">
              {[
                'Create a 3-shot sequence about a sunrise',
                'Add a dramatic transition between shots',
                'Suggest audio for my action scene',
              ].map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="block w-full text-left px-3 py-2 text-xs bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {chatMessages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-purple-600 text-white'
                  : 'bg-muted text-foreground'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              {message.suggestions && message.suggestions.length > 0 && (
                <div className="mt-3 space-y-1">
                  {message.suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="block w-full text-left px-2 py-1 text-xs bg-background/50 hover:bg-background/70 rounded transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to create..."
            className="flex-1 px-3 py-2 bg-background text-foreground border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-muted-foreground"
            rows={2}
            disabled={isProcessing}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isProcessing}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};

// Helper function to generate AI responses (mock implementation)
function generateAIResponse(
  userInput: string,
  currentShots: any[]
): {
  message: string;
  suggestions?: string[];
  actions?: Array<{ type: string; shot?: any; shotId?: string; updates?: any }>;
} {
  const input = userInput.toLowerCase();

  // Project creation request
  if (
    (input.includes('créer') || input.includes('creer') || input.includes('create') || input.includes('nouveau') || input.includes('new')) &&
    (input.includes('projet') || input.includes('project'))
  ) {
    return {
      message:
        "Pour créer un nouveau projet, utilisez le bouton 'New Project' sur la page d'accueil (Landing Page). Je peux vous aider à créer des shots, ajouter des transitions, et configurer l'audio une fois que votre projet est ouvert.",
      suggestions: [
        'Créer une séquence de 3 shots',
        'Ajouter des transitions entre les shots',
        'Suggérer de l\'audio pour mes scènes',
      ],
    };
  }

  // Project opening request
  if (
    (input.includes('ouvrir') || input.includes('open') || input.includes('charger') || input.includes('load')) &&
    (input.includes('projet') || input.includes('project'))
  ) {
    return {
      message:
        "Pour ouvrir un projet existant, utilisez le bouton 'Open Project' sur la page d'accueil ou sélectionnez un projet récent. Je suis là pour vous aider avec l'édition une fois le projet ouvert!",
      suggestions: [
        'Créer une séquence de shots',
        'Ajouter des effets visuels',
        'Configurer l\'audio',
      ],
    };
  }

  // Create shot sequence
  if (input.includes('create') || input.includes('add') || input.includes('shot')) {
    const shotCount = extractNumber(input) || 3;
    const theme = extractTheme(input);

    const newShots = [];
    for (let i = 0; i < shotCount; i++) {
      newShots.push({
        id: `shot-${Date.now()}-${i}`,
        title: `${theme} - Shot ${i + 1}`,
        description: `A ${theme} scene`,
        duration: 5,
        position: currentShots.length + i,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: [],
      });
    }

    return {
      message: `I've created ${shotCount} shots for your ${theme} sequence. You can now edit each shot's properties in the canvas.`,
      suggestions: [
        'Add transitions between these shots',
        'Suggest audio for this sequence',
        'Add text overlays to the shots',
      ],
      actions: newShots.map((shot) => ({ type: 'addShot', shot })),
    };
  }

  // Transition suggestions
  if (input.includes('transition')) {
    return {
      message:
        "I recommend using a 'fade' transition for smooth scene changes, or a 'wipe' for more dramatic cuts. You can adjust the transition duration in the Properties Panel.",
      suggestions: [
        'Apply fade transitions to all shots',
        'Use dramatic wipes for action scenes',
      ],
    };
  }

  // Audio suggestions
  if (input.includes('audio') || input.includes('sound') || input.includes('music')) {
    const sceneType = input.includes('action')
      ? 'action'
      : input.includes('dialogue')
        ? 'dialogue'
        : 'ambient';

    return {
      message: `For ${sceneType} scenes, I suggest using ${
        sceneType === 'action'
          ? 'intense orchestral music with surround sound positioning'
          : sceneType === 'dialogue'
            ? 'clear center-channel audio with voice clarity enhancement'
            : 'subtle ambient sounds with wide stereo imaging'
      }. You can configure this in the Audio Panel.`,
      suggestions: [
        'Add background music',
        'Generate voiceover narration',
        'Configure surround sound',
      ],
    };
  }

  // Default response
  return {
    message:
      "I can help you create shots, add transitions, suggest audio settings, and more. What would you like to do?",
    suggestions: [
      'Create a new shot sequence',
      'Add transitions between shots',
      'Suggest audio for my scenes',
    ],
  };
}

function extractNumber(text: string): number | null {
  const match = text.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

function extractTheme(text: string): string {
  const themes = ['sunrise', 'sunset', 'action', 'dialogue', 'landscape', 'portrait'];
  for (const theme of themes) {
    if (text.includes(theme)) return theme;
  }
  return 'scene';
}