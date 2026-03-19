import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, AlertCircle, Download, Zap, Undo2 } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { checkOllamaStatus } from '@/services/ollamaConfig';
import { promptOptimizer } from '@/services/ai/PromptOptimizationService';
import { llmService, type LLMProvider } from '@/services/llmService';
import type { ChatMessage, Shot } from '@/types';
import { SpeechBubble } from './ui/SpeechBubble';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';

interface ChatBoxProps {
  className?: string;
}

export const ChatBox: React.FC<ChatBoxProps> = ({ className = '' }) => {
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [undoValue, setUndoValue] = useState<string | null>(null);
  const [isOllamaAvailable, setIsOllamaAvailable] = useState<boolean | null>(null);
  const [selectedProvider] = useState<LLMProvider>('openrouter');
  const [selectedModel, setSelectedModel] = useState<string>('meta-llama/llama-3.1-8b-instruct');
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
     
    // Intentionally run only on mount - Ollama status check is a one-time operation
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle send message with specific text (for voice input) - defined before use
  const handleSendMessageWithText = React.useCallback(async (text: string) => {
    if (!text.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    addChatMessage(userMessage);
    setInputValue('');
    setIsProcessing(true);

    try {
      const prompt = `Project State: ${shots.length} shots.
Context: ${text}
Please provide a narrative response and any JSON actions for shot management.
Format actions like: ACTION: {"type": "addShot", "shot": {...}} or ACTION: {"type": "updateShot", "shotId": "...", "updates": {...}}`;

      const responseText = await llmService.generate(prompt, {
        provider: selectedProvider as any,
        model: selectedModel
      });

      // Extract JSON actions if present
      const actionMatch = responseText.match(/ACTION: (\{.*?\})/);
      const actions: any[] = [];
      const cleanMessage = responseText.replace(/ACTION: \{.*?\}/g, '').trim();

      if (actionMatch) {
        try {
          const action = JSON.parse(actionMatch[1]);
          actions.push(action);
        } catch (e) {
          console.error("Failed to parse action JSON", e);
        }
      }

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: cleanMessage,
        timestamp: new Date(),
      };

      addChatMessage(assistantMessage);

      // Execute any actions from the AI response
      actions.forEach((action) => {
        if (action.type === 'addShot' && action.shot) {
          addShot(action.shot as Shot);
        } else if (action.type === 'updateShot' && action.shotId) {
          updateShot(action.shotId, action.updates as Partial<Shot>);
        }
      });
    } catch (error) {
      console.error("LLM Generation failed", error);
      addChatMessage({
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${(error as Error).message}`,
        timestamp: new Date(),
      });
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, shots, addChatMessage, addShot, updateShot, selectedProvider, selectedModel]);

  // Listen for voice input events and auto-send
  useEffect(() => {
    const handleVoiceInput = (event: CustomEvent<{ transcript: string; confidence: number; language: string }>) => {
      const { transcript } = event.detail;
      if (transcript.trim()) {
        // Set the input value and auto-send
        setInputValue(transcript.trim());
        // Send the message directly
        handleSendMessageWithText(transcript.trim());
      }
    };

    window.addEventListener('storycore:voice-input', handleVoiceInput as EventListener);
    
    return () => {
      window.removeEventListener('storycore:voice-input', handleVoiceInput as EventListener);
    };
  }, [handleSendMessageWithText]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;
    await handleSendMessageWithText(inputValue.trim());
  };

  const handleOptimizePrompt = async () => {
    if (!inputValue.trim() || isProcessing || isOptimizing) return;
    
    setUndoValue(inputValue);
    setIsOptimizing(true);
    try {
      const optimized = await promptOptimizer.balancePrompt(inputValue);
      if (optimized && optimized !== inputValue) {
        setInputValue(optimized);
        // Add a specialized hint message
        addChatMessage({
          id: `hint-${Date.now()}`,
          role: 'assistant',
          content: '✨ J\'ai optimisé votre prompt selon la méthodologie GDPval. Vous pouvez l\'éditer, l\'envoyer ou annuler.',
          timestamp: new Date(),
        });
      }
    } catch (error) {
       console.error('Failed to optimize prompt:', error);
       setUndoValue(null);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleUndo = () => {
    if (undoValue !== null) {
      setInputValue(undoValue);
      setUndoValue(null);
    }
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
    <div className={`flex flex-col h-full rounded-[28px] overflow-hidden backdrop-blur-2xl backdrop-saturate-200 bg-white/70 dark:bg-slate-900/70 border border-white/25 dark:border-slate-700/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] ${className}`}>
      {/* Header */}
      <div className="flex flex-col border-b border-white/20 dark:border-slate-700/30 bg-white/40 dark:bg-slate-800/40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">StoryCore Assistant</h2>
          </div>
          
          <div className="flex items-center gap-2">
            {['meta-llama/llama-3.1-8b-instruct', 'openai/gpt-4o'].map(m => (
              <Badge 
                key={m}
                onClick={() => setSelectedModel(m)}
                className={cn(
                  "cursor-pointer text-[8px] py-0 px-2 border-primary/20 hover:bg-primary/20 transition-all",
                  selectedModel === m ? "bg-primary/30 border-primary text-primary" : "text-white/40"
                )}
              >
                {m.split('/').pop()?.split('-')[0]}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Ollama Warning Banner */}
        {isOllamaAvailable === false && (
          <div className="rounded-lg border-2 border-orange-600 bg-orange-900/20 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-300 mb-1">
                  Ollama n'est pas détecté
                </h3>
                <p className="text-sm text-orange-200 mb-3">
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
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-800 text-orange-100 text-sm rounded-md border border-orange-600 hover:bg-orange-700 transition-colors"
                  >
                    Vérifier à nouveau
                  </button>
                </div>
                <p className="text-xs text-orange-300 mt-3">
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
          <SpeechBubble
            key={message.id}
            content={message.content}
            role={message.role}
            timestamp={message.timestamp}
            suggestions={message.suggestions}
            onSuggestionClick={handleSuggestionClick}
          />
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
      <div className="pt-4 px-4 pb-2 bg-transparent border-t border-white/20 dark:border-slate-700/30">
        <div className="flex items-end gap-2 p-1.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md rounded-[24px] border border-white/40 dark:border-slate-600/40 shadow-sm focus-within:ring-2 focus-within:ring-purple-500/50 transition-all">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Décrivez ce que vous souhaitez créer..."
            className="flex-1 min-h-[44px] max-h-[150px] p-2 bg-transparent text-slate-800 dark:text-white placeholder:text-slate-500 border-none resize-none shadow-none focus-visible:ring-0 focus-visible:outline-none focus:ring-0"
            rows={1}
            disabled={isProcessing}
          />
          <button
            onClick={handleOptimizePrompt}
            disabled={!inputValue.trim() || isProcessing || isOptimizing}
            className={`p-3 mb-0.5 rounded-full transition-all shadow-sm ${
              isOptimizing 
                ? 'bg-amber-100 text-amber-600 animate-pulse' 
                : 'bg-white/80 dark:bg-slate-700 text-amber-500 hover:bg-amber-50 dark:hover:bg-slate-600'
            }`}
            title="Optimiser (GDPval Engine)"
          >
            {isOptimizing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
          </button>
          {undoValue !== null && (
            <button
              onClick={handleUndo}
              disabled={isProcessing || isOptimizing}
              className="p-3 mb-0.5 rounded-full bg-white/80 dark:bg-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-600 transition-all shadow-sm"
              title="Annuler l'optimisation"
            >
              <Undo2 className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isProcessing || isOptimizing}
            className="p-3 mb-0.5 rounded-full bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400 transition-all shadow-sm"
            aria-label="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-[10px] text-slate-500 mt-1 ml-1">
          Appuyez sur Entrée pour envoyer • Shift+Entrée pour une nouvelle ligne
        </p>
      </div>
    </div>
  );
};
