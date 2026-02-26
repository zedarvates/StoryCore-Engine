/**
 * VoiceCommandBar
 * ================
 * Barre de commandes vocales/textuelles universelle.
 *
 * Peut être intégrée dans n'importe quel addon ou panneau global.
 * Gère le micro, le texte libre, et affiche les suggestions de commandes.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAddonVoiceCommands, useVoiceInput } from '@/hooks/useAddonVoiceCommands';
import { AddonId, AddonCommandContext, VoiceCommandResult } from '@/services/AddonVoiceCommandRouter';
import './VoiceCommandBar.css';

// ============================================================================
// SUGGESTIONS PAR ADDON
// ============================================================================

const ADDON_SUGGESTIONS: Record<string, string[]> = {
  'grok-imagine': [
    'Génère un personnage avec Grok',
    'Régénère cette image',
    'Corriger les mains avec Grok',
    'Édite le fond avec Grok',
  ],
  'stable-diffusion': [
    'Générer avec Stable Diffusion',
    'Régénérer en local',
    'Inpainting sur cette zone',
    'Nouveau style manga',
  ],
  'seedance': [
    'Générer une vidéo avec Seedance',
    'Animer ce personnage',
    'Régénérer la vidéo',
    'Générer vidéo en slow motion',
  ],
  'comic-generator': [
    'Générer une page BD manga',
    'Exporter la BD en PDF',
    'Continuer au chapitre suivant',
    'Régénérer ce panel',
  ],
  'recap-engine': [
    'Générer le recap',
    'Générer recap avec Edge TTS',
    'Exporter recap MP4',
    'Continuer l\'histoire',
    'Extraire les personnages',
  ],
  'asset-creator': [
    'Génère un nouveau personnage',
    'Crée un décor de science-fiction',
    'Régénère le dernier objet',
  ],
  'cinematic-editor': [
    'Bascule sur l\'onglet beats',
    'Montre le rythme de la séquence',
    'Sélectionne le plan 3',
    'Mets ce plan en mode épique',
    'Lecture de la séquence',
    'Pause',
  ],
  'system': [
    'Annule la dernière action',
    'Refais l\'action',
    'Sauvegarde le projet',
    'Va sur le dashboard',
    'Ouvre les paramètres',
  ],
};

// ============================================================================
// PROPS
// ============================================================================

interface VoiceCommandBarProps {
  /** Addon courant (pour les suggestions contextuelles) */
  addonId?: AddonId;

  /** Contexte du projet actif */
  context?: Partial<AddonCommandContext>;

  /** Placeholder du champ texte */
  placeholder?: string;

  /** Mode compact (juste le bouton micro) */
  compact?: boolean;

  /** Callback quand une commande est exécutée */
  onCommand?: (result: VoiceCommandResult) => void;

  /** Classe CSS additionnelle */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const VoiceCommandBar: React.FC<VoiceCommandBarProps> = ({
  addonId = 'grok-imagine',
  context,
  placeholder = 'Commande vocale ou textuelle… ex: "Génère un samouraï avec Grok"',
  compact = false,
  onCommand,
  className = '',
}) => {
  const [inputText, setInputText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [lastResult, setLastResult] = useState<VoiceCommandResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { route, updateContext } = useAddonVoiceCommands({ addonId, context });

  const { isListening, isSupported, transcript, toggleListening } = useVoiceInput({
    onCommand: (result) => {
      setLastResult(result);
      onCommand?.(result);
    },
    onTranscriptChange: (t) => setInputText(t),
  });

  // Mettre à jour contexte si changement
  useEffect(() => {
    if (context) updateContext(context);
  }, [context, updateContext]);

  // Réflection du transcript vocal dans le champ texte
  useEffect(() => {
    if (transcript && inputRef.current) {
      // Defer state update to avoid cascading renders lint error
      const timer = setTimeout(() => {
        setInputText(transcript);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [transcript]);

  const handleSubmit = useCallback(async () => {
    const text = inputText.trim();
    if (!text) return;
    const result = await route(text);
    setLastResult(result);
    onCommand?.(result);
    if (result.handled) {
      setInputText('');
      setShowSuggestions(false);
    }
  }, [inputText, route, onCommand]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') setShowSuggestions(false);
  };

  const handleSuggestionClick = async (suggestion: string) => {
    setInputText(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
    // Auto-submit les suggestions
    const result = await route(suggestion);
    setLastResult(result);
    onCommand?.(result);
    setInputText('');
  };

  const suggestions = ADDON_SUGGESTIONS[addonId] ?? [];

  if (compact) {
    return (
      <div className={`vcb-compact ${className}`}>
        <button
          className={`vcb-mic-btn ${isListening ? 'vcb-mic-active' : ''} ${!isSupported ? 'vcb-mic-disabled' : ''}`}
          onClick={toggleListening}
          title={isListening ? 'Arrêter l\'écoute' : 'Commande vocale (cliquer ou Alt+Espace)'}
          aria-label="Commande vocale"
          disabled={!isSupported}
        >
          {isListening ? (
            <MicActiveIcon />
          ) : (
            <MicIcon />
          )}
          {isListening && <span className="vcb-ripple" />}
        </button>
      </div>
    );
  }

  return (
    <div className={`vcb-root ${className}`}>
      {/* Barre principale */}
      <div className={`vcb-bar ${isListening ? 'vcb-bar--listening' : ''}`}>

        {/* Bouton micro */}
        <button
          className={`vcb-mic-btn ${isListening ? 'vcb-mic-active' : ''} ${!isSupported ? 'vcb-mic-disabled' : ''}`}
          onClick={toggleListening}
          title={
            !isSupported
              ? 'Reconnaissance vocale non supportée'
              : isListening
                ? 'Arrêter l\'écoute (cliquer)'
                : 'Démarrer la commande vocale (Alt+Espace)'
          }
          disabled={!isSupported}
          aria-label={isListening ? 'Arrêter écoute' : 'Commande vocale'}
        >
          {isListening ? <MicActiveIcon /> : <MicIcon />}
          {isListening && <span className="vcb-ripple" />}
        </button>

        {/* Champ texte */}
        <input
          ref={inputRef}
          type="text"
          className="vcb-input"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={isListening ? '🎤 Parlez maintenant…' : placeholder}
          aria-label="Commande vocale ou textuelle"
          spellCheck={false}
          autoComplete="off"
        />

        {/* Bouton suggustions */}
        <button
          className="vcb-suggestions-btn"
          onClick={() => setShowSuggestions(v => !v)}
          title="Voir les exemples de commandes"
          aria-label="Suggestions de commandes"
        >
          <LightbulbIcon />
        </button>

        {/* Bouton envoi */}
        <button
          className="vcb-send-btn"
          onClick={handleSubmit}
          disabled={!inputText.trim()}
          title="Exécuter la commande (Entrée)"
          aria-label="Exécuter la commande"
        >
          <SendIcon />
        </button>
      </div>

      {/* Indicateur écoute */}
      {isListening && (
        <div className="vcb-listening-indicator">
          <span className="vcb-pulse" />
          <span>Écoute en cours… dites votre commande</span>
          <span className="vcb-transcript-preview">{transcript}</span>
        </div>
      )}

      {/* Résultat de la dernière commande */}
      {lastResult && (
        <div className={`vcb-result ${lastResult.handled ? 'vcb-result--success' : 'vcb-result--warning'}`}>
          {lastResult.handled ? '✅' : '⚠️'} {lastResult.message}
        </div>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="vcb-suggestions">
          <div className="vcb-suggestions-header">
            <span>💡 Exemples de commandes</span>
          </div>
          <ul className="vcb-suggestions-list">
            {suggestions.map((s, i) => (
              <li key={i}>
                <button
                  className="vcb-suggestion-item"
                  onMouseDown={() => handleSuggestionClick(s)}
                >
                  <span className="vcb-suggestion-icon">→</span>
                  {s}
                </button>
              </li>
            ))}
          </ul>
          <div className="vcb-suggestions-footer">
            Tous les addons : Grok • Stable Diffusion • Seedance • BD • Recap
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// ICONS
// ============================================================================

const MicIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);

const MicActiveIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" fill="currentColor"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" fill="none" strokeWidth="2"/>
    <line x1="12" y1="19" x2="12" y2="23" strokeWidth="2"/>
    <line x1="8" y1="23" x2="16" y2="23" strokeWidth="2"/>
  </svg>
);

const LightbulbIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="9" y1="18" x2="15" y2="18"/>
    <line x1="10" y1="22" x2="14" y2="22"/>
    <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
  </svg>
);

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

export default VoiceCommandBar;
