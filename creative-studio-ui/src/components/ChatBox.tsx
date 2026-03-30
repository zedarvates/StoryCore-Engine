import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, Loader2, AlertCircle, Zap, Undo2, Thermometer, List } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { checkOllamaStatus } from '@/services/ollamaConfig';
import { llmService, type LLMProvider } from '@/services/llmService';
import { useWeightedPrompt } from '@/hooks/useWeightedPrompt';
import { WeightedTermChip } from './prompt-composer/WeightedTermChip';
import type { ChatMessage, Shot } from '@/types';
import { SpeechBubble } from './ui/SpeechBubble';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import './prompt-composer/prompt-composer.css';

interface ChatBoxProps {
  className?: string;
}

export const ChatBox: React.FC<ChatBoxProps> = ({ className = '' }) => {
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [undoValue, setUndoValue] = useState<string | null>(null);
  const [isOllamaAvailable, setIsOllamaAvailable] = useState<boolean | null>(null);
  const [selectedProvider] = useState<LLMProvider>('local'); // Default to local for weighting
  const [selectedModel, setSelectedModel] = useState<string>('qwen3-vl:4b');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { chatMessages, addChatMessage, shots, addShot, updateShot } = useAppStore();
  
  // Hook de pondération sémantique
  const { 
    pep, isAnalyzing, analyze, updateWeight, updateColorData, 
    updateGlobalTone, updateOutputDetail, buildFinalPrompt, reset,
    hasWeightedTerms, lastCompliance, analyzeCompliance 
  } = useWeightedPrompt();

  // Check Ollama status on mount
  useEffect(() => {
    async function checkOllama() {
      const available = await checkOllamaStatus();
      setIsOllamaAvailable(available);
    }
    checkOllama();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Envoi du message (avec PEP si actif)
  const handleSendMessageWithText = useCallback(async (text: string, isEnriched = false) => {
    if (!text.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: pep?.rawText || text.trim(), // On montre le texte brut à l'utilisateur
      timestamp: new Date(),
    };

    addChatMessage(userMessage);
    setInputValue('');
    setIsProcessing(true);
    
    // Si on a un PEP, on utilise le prompt construit (caché), sinon le texte brut
    const finalPromptForLLM = isEnriched ? (buildFinalPrompt() || text) : text;

    try {
      const prompt = `Assistant System Prompt:
- You are StoryCore AI. You help manage movie projects.
- You can trigger actions by returning: ACTION: {"type": "addCharacter", "character": {"name": "..", "role": ".."}}
- You can trigger: addLocation {"location": {"name": ".."}}, addObject {"object": {"name": ".."}}, addShot {"shot": {...}}
- Context: ${finalPromptForLLM}
- Project State: ${shots.length} shots.
Please provide a narrative response and any JSON actions.`;

      const responseText = await llmService.generate(prompt, {
        provider: selectedProvider,
        model: selectedModel
      });

      // Analyse de conformité post-réponse (Sprint 4)
      if (isEnriched) {
        await analyzeCompliance(responseText);
      }

      // Extraction des actions JSON
      const actionMatch = responseText.match(/ACTION: (\{.*?\})/);
      const cleanMessage = responseText.replace(/ACTION: \{.*?\}/g, '').trim();

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: cleanMessage,
        timestamp: new Date(),
      };

      addChatMessage(assistantMessage);

      if (actionMatch) {
        try {
          // Execute any actions from the AI response
          const action = JSON.parse(actionMatch[1]); // Assuming actionMatch[1] is a single JSON object
          if (action.type === 'addShot' && action.shot) {
            addShot(action.shot as Shot);
          } else if (action.type === 'updateShot' && action.shotId) {
            updateShot(action.shotId, action.updates as Partial<Shot>);
          } else if (action.type === 'addCharacter') {
            // Ouvre le wizard personnage avec les données suggérées
            const { name, role } = action.character || {};
            useAppStore.getState().setShowCharacterWizard(true, { name, role });
            addChatMessage({
              id: `sys-${Date.now()}`,
              role: 'assistant',
              content: `✨ J'ai préparé la fiche pour "${name || 'le nouveau personnage'}". Vous pouvez la finaliser dans le panneau qui vient de s'ouvrir.`,
              timestamp: new Date()
            });
          } else if (action.type === 'addLocation') {
            // Ouvre le wizard de lieu
            useAppStore.getState().setShowLocationWizard(true, { sceneId: action.location?.name });
          } else if (action.type === 'addObject') {
            useAppStore.getState().setShowObjectWizard(true, { name: action.object?.name });
          }
        } catch (e) {
          console.error("Failed to parse action JSON", e);
        }
      }
      
      reset(); // Nettoyer le PEP après envoi réussi
    } catch (error) {
      console.error("LLM Generation failed", error);
      addChatMessage({
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: `Désolé, une erreur est survenue : ${(error as Error).message}. Vérifiez qu'Ollama est bien lancé.`,
        timestamp: new Date(),
      });
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, shots, addChatMessage, addShot, updateShot, selectedProvider, selectedModel, pep, buildFinalPrompt, reset, analyzeCompliance]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;
    await handleSendMessageWithText(inputValue.trim(), !!pep);
  };

  // ⚡ Déclencher l'analyse sémantique
  const handleOptimizePrompt = async () => {
    if (!inputValue.trim() || isProcessing || isAnalyzing) return;
    setUndoValue(inputValue);
    await analyze(inputValue);
  };

  const handleUndo = () => {
    if (undoValue !== null) {
      setInputValue(undoValue);
      setUndoValue(null);
      reset();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={`flex flex-col h-full rounded-[28px] overflow-hidden backdrop-blur-2xl backdrop-saturate-200 bg-white/70 dark:bg-slate-900/70 border border-white/25 dark:border-slate-700/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] ${className}`}>
      
      {/* Header avec sélection de modèle */}
      <div className="flex flex-col border-b border-white/20 dark:border-slate-700/30 bg-white/40 dark:bg-slate-800/40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">StoryCore Intelligence</h2>
          </div>
          <div className="flex items-center gap-2">
            {['qwen3-vl:4b', 'phi3'].map(m => (
              <Badge 
                key={m}
                onClick={() => setSelectedModel(m)}
                className={cn(
                  "cursor-pointer text-[9px] py-0.5 px-2 border-primary/20 hover:bg-primary/20 transition-all",
                  selectedModel === m ? "bg-primary/30 border-primary text-primary" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                )}
              >
                {m}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Zone des messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isOllamaAvailable === false && (
          <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-3 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800/50 dark:text-orange-200">
             <div className="flex gap-2">
               <AlertCircle className="w-5 h-5 flex-shrink-0" />
               <p className="text-sm">Ollama n'est pas détecté. Lancez-le pour utiliser l'IA locale.</p>
             </div>
          </div>
        )}

        {chatMessages.map((message) => (
          <SpeechBubble
            key={message.id}
            content={message.content}
            role={message.role}
            timestamp={message.timestamp}
          />
        ))}

        {isProcessing && (
          <div className="flex justify-start animate-pulse">
            <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* CONTRÔLES DE PONDÉRATION (PEP UI) */}
      {pep && (
        <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-900/80 border-t border-white/20 dark:border-slate-700/30 animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          {/* Sliders globaux */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                <span className="flex items-center gap-1"><Thermometer className="w-3 h-3"/> Narrativité</span>
                <span className={pep.globalTone > 70 ? "text-orange-500" : "text-blue-400"}>
                  {pep.globalTone > 70 ? 'CÉLESTE 🔥' : pep.globalTone < 30 ? 'CONCIS ❄️' : 'ÉQUILIBRÉ'}
                </span>
              </div>
              <input 
                type="range" min="0" max="100" value={pep.globalTone} 
                onChange={(e) => updateGlobalTone(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                aria-label="Narrativité"
                title="Narrativité"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                <span className="flex items-center gap-1"><List className="w-3 h-3"/> Précision / Longueur</span>
                <span className="text-purple-500">{pep.outputDetail}%</span>
              </div>
              <input 
                type="range" min="0" max="100" value={pep.outputDetail} 
                onChange={(e) => updateOutputDetail(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                aria-label="Précision / Longueur"
                title="Précision / Longueur"
              />
            </div>
          </div>

          {/* Chips de mots-clés */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mr-1">Termes :</span>
            {pep.weightedTerms.map(term => (
              <WeightedTermChip 
                key={term.word} 
                term={term} 
                onWeightChange={updateWeight}
                onColorChange={updateColorData}
              />
            ))}
            {isAnalyzing && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
          </div>
        </div>
      )}

      {/* COMPLIANCE BADGE (Sprint 4) */}
      {lastCompliance && (
        <div className="mx-4 mb-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-between animate-in zoom-in-95 duration-500">
           <span className="text-[10px] text-green-600 dark:text-green-400 font-bold flex items-center gap-1">
             <Sparkles className="w-3 h-3"/> INTELLIGIBILITÉ : {Math.round(lastCompliance.globalScore)}%
           </span>
           <button onClick={() => reset()} className="text-[10px] text-slate-400 hover:text-slate-600 underline">Masquer l'analyse</button>
        </div>
      )}

      {/* Input Area */}
      <div className="pt-2 px-4 pb-4 bg-transparent">
        <div className="flex items-end gap-2 p-1.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md rounded-[24px] border border-white/40 dark:border-slate-600/40 shadow-sm focus-within:ring-2 focus-within:ring-purple-500/50 transition-all">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isAnalyzing ? "Analyse sémantique en cours..." : "Décrivez votre scène (ex: un désert bleu avec un vent violent)..."}
            className="flex-1 min-h-[44px] max-h-[150px] p-2 bg-transparent text-slate-800 dark:text-white placeholder:text-slate-500 border-none resize-none shadow-none focus-visible:ring-0 focus-visible:outline-none focus:ring-0 text-sm"
            rows={1}
            disabled={isProcessing || isAnalyzing}
          />
          
          <div className="flex items-center gap-1 mb-0.5 mr-1">
            <button
              onClick={handleOptimizePrompt}
              disabled={!inputValue.trim() || isProcessing || isAnalyzing}
              className={cn(
                "p-2.5 rounded-full transition-all shadow-sm",
                hasWeightedTerms 
                  ? "bg-purple-100 text-purple-600 ring-2 ring-purple-600 ring-offset-2 dark:ring-offset-slate-900" 
                  : "bg-amber-100 text-amber-600 hover:bg-amber-200"
              )}
              title="Analyser & Pondérer (Intelligence Sémantique)"
            >
              {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
            </button>
            
            {undoValue !== null && (
              <button
                onClick={handleUndo}
                className="p-2.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all shadow-sm"
                title="Annuler"
              >
                <Undo2 className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isProcessing || isAnalyzing}
              className="p-2.5 rounded-full bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:bg-slate-200 transition-all shadow-sm"
              aria-label="Send message"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-2 px-2 flex justify-between">
          <span>Shift+Enter pour nouvelle ligne</span>
          <span className="font-bold text-purple-400 opacity-60">STORYCORE GDPval v4.2</span>
        </p>
      </div>
    </div>
  );
};
