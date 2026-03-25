/* cspell:ignore upscaler upscaling tabular-nums */
/**
 * WizardVoiceAssistant
 * =====================
 * Panneau assistant IA vocal/textuel pour les wizards StoryCore.
 *
 * Intégration dans un wizard step :
 *
 *   import { WizardVoiceAssistant } from '@/components/wizard/WizardVoiceAssistant';
 *
 *   // Dans Step2PhysicalAppearance :
 *   <WizardVoiceAssistant
 *     entityType="character"
 *     onFieldChange={(section, field, value) =>
 *       updateVisualIdentity({ [field]: value })
 *     }
 *     onTabChange={(tab) => setActiveStep(tab)}
 *     onGenerateSection={(section) => handleGenerateAppearance()}
 *   />
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useWizardVoiceAssistant } from '@/hooks/useWizardVoiceAssistant';
import { WizardEntityType, FieldPatch } from '@/services/WizardFieldIntelligence';
import './WizardVoiceAssistant.css';

// ============================================================================
// PROPS
// ============================================================================

export interface WizardVoiceAssistantProps {
  /** Type d'entité dans ce wizard */
  entityType?: WizardEntityType;

  /** Applique un patch champ — sera appelé pour chaque champ modifié */
  onFieldChange: (section: string | null, field: string, value: unknown) => void;

  /** Navigation vers un onglet */
  onTabChange?: (tabId: string) => void;

  /** Génération IA d'une section */
  onGenerateSection?: (sectionName: string, prompt: string) => void;

  /** Remplir les champs vides */
  onFillMissing?: () => void;

  /** Naviguer vers le dashboard */
  onDashboard?: () => void;

  /** Callback pour chaque patch appliqué avec succès */
  onPatchApplied?: (patch: FieldPatch) => void;

  /** Callback pour upscaler un média */
  onUpscale?: (resolution: string) => void;

  /** Callback pour changer le format/résolution */
  onSetResolution?: (ratio: string) => void;

  /** Position du widget : 'bottom-right' | 'bottom-left' | 'inline' */
  position?: 'bottom-right' | 'bottom-left' | 'inline';

  /** Classe CSS additionnelle */
  className?: string;

  /** Label du bouton d'ouverture */
  triggerLabel?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const WizardVoiceAssistant: React.FC<WizardVoiceAssistantProps> = ({
  entityType = 'character',
  onFieldChange,
  onTabChange,
  onGenerateSection,
  onFillMissing,
  onDashboard,
  onPatchApplied,
  onUpscale,
  onSetResolution,
  position = 'inline',
  className = '',
  triggerLabel,
}) => {
  const [isExpanded, setIsExpanded] = useState(position === 'inline');
  const [inputText, setInputText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const assistant = useWizardVoiceAssistant({
    entityType,
    onFieldChange,
    onTabChange,
    onGenerateSection,
    onFillMissing,
    onDashboard,
    onPatchApplied,
    onUpscale,
    onSetResolution,
  });

  const [prevTranscript, setPrevTranscript] = useState(assistant.transcript);

  // Sync transcript vocal → input (pattern derivation d'état recommandé par React)
  useEffect(() => {
    if (assistant.isListening && assistant.transcript !== prevTranscript) {
      setPrevTranscript(assistant.transcript);
      // On ne met à jour l'input que si différent du transcript actuel
      if (assistant.transcript !== inputText) {
        setInputText(assistant.transcript);
      }
    }
  }, [assistant.isListening, assistant.transcript, prevTranscript, inputText]);

  const handleSubmit = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    assistant.handleCommand(text);
    setInputText('');
    setShowSuggestions(false);
  }, [inputText, assistant]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setShowSuggestions(false);
    assistant.handleCommand(suggestion);
  };

  const entityEmoji = { character: '👤', location: '📍', object: '📦', unknown: '❓' }[entityType];
  const entityLabel = { character: 'Personnage', location: 'Lieu', object: 'Objet', unknown: 'Entité' }[entityType];

  // ── Mode flottant (bottom-right / bottom-left) ─────────────────────────
  if (position !== 'inline') {
    return (
      <div className={`wva-floating wva-floating--${position} ${className}`}>
        {/* Trigger button */}
        {isExpanded ? (
          <button
            type="button"
            className={`wva-float-btn ${assistant.isListening ? 'wva-float-btn--active' : ''}`}
            onClick={() => setIsExpanded(false)}
            title={`Assistant vocal ${entityLabel}`}
            aria-label="Assistant commandes vocales wizard"
            aria-expanded="true"
          >
            {assistant.isListening ? '🎤' : '✨'}
            {triggerLabel && <span className="wva-float-label">{triggerLabel}</span>}
            {assistant.isListening && <span className="wva-float-ripple" />}
          </button>
        ) : (
          <button
            type="button"
            className={`wva-float-btn ${assistant.isListening ? 'wva-float-btn--active' : ''}`}
            onClick={() => setIsExpanded(true)}
            title={`Assistant vocal ${entityLabel}`}
            aria-label="Assistant commandes vocales wizard"
            aria-expanded="false"
          >
            {assistant.isListening ? '🎤' : '✨'}
            {triggerLabel && <span className="wva-float-label">{triggerLabel}</span>}
            {assistant.isListening && <span className="wva-float-ripple" />}
          </button>
        )}

        {/* Panel */}
        {isExpanded && (
          <div className={`wva-panel wva-panel--floating wva-panel--${position}`}>
            <WizardAssistantContent
              entityEmoji={entityEmoji}
              entityLabel={entityLabel}
              entityType={entityType}
              assistant={assistant}
              inputText={inputText}
              setInputText={setInputText}
              showSuggestions={showSuggestions}
              setShowSuggestions={setShowSuggestions}
              inputRef={inputRef}
              handleSubmit={handleSubmit}
              handleKeyDown={handleKeyDown}
              handleSuggestionClick={handleSuggestionClick}
            />
          </div>
        )}
      </div>
    );
  }

  // ── Mode inline ────────────────────────────────────────────────────────

  return (
    <div className={`wva-root ${className}`}>
      {/* Header toggle */}
      {isExpanded ? (
        <button
          type="button"
          className="wva-header"
          onClick={() => setIsExpanded(false)}
          aria-expanded="true"
        >
          <span className="wva-header-icon">{assistant.isListening ? '🎤' : '✨'}</span>
          <span className="wva-header-label">Assistant vocal — {entityLabel}</span>
          <span className="wva-header-chevron">▲</span>
        </button>
      ) : (
        <button
          type="button"
          className="wva-header"
          onClick={() => setIsExpanded(true)}
          aria-expanded="false"
        >
          <span className="wva-header-icon">{assistant.isListening ? '🎤' : '✨'}</span>
          <span className="wva-header-label">Assistant vocal — {entityLabel}</span>
          <span className="wva-header-chevron">▼</span>
        </button>
      )}

      {isExpanded && (
        <div className="wva-panel wva-panel--inline">
          <WizardAssistantContent
            entityEmoji={entityEmoji}
            entityLabel={entityLabel}
            entityType={entityType}
            assistant={assistant}
            inputText={inputText}
            setInputText={setInputText}
            showSuggestions={showSuggestions}
            setShowSuggestions={setShowSuggestions}
            inputRef={inputRef}
            handleSubmit={handleSubmit}
            handleKeyDown={handleKeyDown}
            handleSuggestionClick={handleSuggestionClick}
          />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// CONTENT (partagé entre les modes)
// ============================================================================

interface WizardAssistantContentProps {
  entityEmoji: string;
  entityLabel: string;
  entityType: WizardEntityType;
  assistant: ReturnType<typeof useWizardVoiceAssistant>;
  inputText: string;
  setInputText: (v: string) => void;
  showSuggestions: boolean;
  setShowSuggestions: (v: boolean | ((prev: boolean) => boolean)) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  handleSubmit: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  handleSuggestionClick: (s: string) => void;
}

const WizardAssistantContent: React.FC<WizardAssistantContentProps> = ({
  entityEmoji,
  entityLabel,
  entityType,
  assistant,
  inputText,
  setInputText,
  showSuggestions,
  setShowSuggestions,
  inputRef,
  handleSubmit,
  handleKeyDown,
  handleSuggestionClick,
}) => {
  return (
    <>
      {/* Barre principale */}
      <div className={`wva-bar ${assistant.isListening ? 'wva-bar--listening' : ''}`}>
        {/* Bouton micro */}
        <button
          type="button"
          className={`wva-mic ${assistant.isListening ? 'wva-mic--active' : ''} ${!assistant.isVoiceSupported ? 'wva-mic--disabled' : ''}`}
          onClick={assistant.toggleListening}
          disabled={!assistant.isVoiceSupported}
          title={assistant.isListening ? 'Arrêter l\'écoute' : 'Commande vocale'}
          aria-label={assistant.isListening ? 'Stop' : 'Micro'}
        >
          {assistant.isListening ? <MicActiveIcon /> : <MicIcon />}
          {assistant.isListening && <span className="wva-ripple" />}
        </button>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          className="wva-input"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={
            assistant.isListening
              ? '🎤 Dites votre commande…'
              : `${entityEmoji} Ex: "Mets les yeux en vert", "Génère un physique"…`
          }
          autoComplete="off"
          spellCheck={false}
        />

        {/* Bouton suggestions */}
        {showSuggestions ? (
          <button
            className="wva-action-btn"
            onClick={() => setShowSuggestions(false)}
            title="Masquer les exemples"
            aria-label="Suggestions"
            aria-expanded="true"
          >💡</button>
        ) : (
          <button
            className="wva-action-btn"
            onClick={() => setShowSuggestions(true)}
            title="Voir les exemples"
            aria-label="Suggestions"
            aria-expanded="false"
          >💡</button>
        )}

        {/* Bouton envoi */}
        <button
          className="wva-send-btn"
          onClick={handleSubmit}
          disabled={!inputText.trim()}
          title="Exécuter (Entrée)"
        >
          <SendIcon />
        </button>
      </div>

      {/* Indicateur écoute */}
      {assistant.isListening && (
        <div className="wva-listening">
          <span className="wva-pulse" />
          <span>Écoute active…</span>
          {assistant.transcript && (
            <span className="wva-transcript">&ldquo;{assistant.transcript}&rdquo;</span>
          )}
        </div>
      )}

      {/* Feedback commande */}
      {assistant.lastFeedback && (
        <div className={`wva-feedback wva-feedback--${assistant.lastFeedback.type}`}>
          <span className="wva-feedback-text">{assistant.lastFeedback.message}</span>
          <button className="wva-feedback-close" onClick={assistant.clearFeedback}>×</button>
        </div>
      )}

      {/* Raccourcis rapides */}
      <div className="wva-quick-actions">
        <button className="wva-quick-btn" onClick={() => assistant.handleCommand(`Génère ${entityLabel} physique`)}>
          🤖 Générer
        </button>
        <button className="wva-quick-btn" onClick={() => assistant.handleCommand('Remplis les champs manquants')}>
          ✨ Compléter
        </button>
        {entityType === 'character' && (
          <>
            <button className="wva-quick-btn" onClick={() => assistant.handleCommand('Mets les yeux en vert')}>
              👁️ Yeux verts
            </button>
            <button className="wva-quick-btn" onClick={() => assistant.handleCommand('Va sur l\'onglet physique')}>
              📋 Physique
            </button>
          </>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && (
        <div className="wva-suggestions">
          <div className="wva-suggestions-title">💡 Commandes disponibles pour {entityLabel}</div>
          
          {/* Dashboard Entry Point as requested by user */}
          <div 
            className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5 mb-2 group"
            onMouseDown={() => assistant.onDashboard()}
          >
            <div className="flex items-center gap-3">
               <span className="text-lg group-hover:scale-110 transition-transform">📊</span>
               <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-primary">Dashboard Hub</div>
                  <div className="text-[9px] text-white/40 font-bold uppercase tracking-tight italic">Quitter le wizard et revenir à la vue globale</div>
               </div>
            </div>
          </div>

          {assistant.suggestions.map((s, i) => (
            <button
              key={i}
              className="wva-suggestion-item"
              onMouseDown={() => handleSuggestionClick(s)}
            >
              <span className="wva-suggestion-arrow">→</span>
              {s}
            </button>
          ))}
          <div className="wva-suggestions-footer">
            Astuce : Parlez naturellement en français ou anglais
          </div>
        </div>
      )}

      {/* Historique compact */}
      {assistant.commandHistory.length > 0 && (
        <div className="wva-history">
          {assistant.commandHistory.slice(0, 3).map((cmd, i) => (
            <div key={i} className={`wva-history-item wva-history-item--${cmd.type}`}>
              {cmd.message.split('\n')[0]}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

// ============================================================================
// ICONS
// ============================================================================

const MicIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);

const MicActiveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" fill="none" strokeWidth="2"/>
    <line x1="12" y1="19" x2="12" y2="23" strokeWidth="2"/>
    <line x1="8" y1="23" x2="16" y2="23" strokeWidth="2"/>
  </svg>
);

const SendIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

export default WizardVoiceAssistant;
