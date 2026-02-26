import React from 'react';
import './speech-bubble.css';

export interface SpeechBubbleProps {
  /** Le contenu textuel de la bulle */
  content: string;
  /** Le rôle de l'émetteur (assistant, utilisateur ou système) */
  role: 'user' | 'assistant' | 'system';
  /** Indique si le message est en cours de streaming */
  isStreaming?: boolean;
  /** Indique si le streaming est terminé */
  streamComplete?: boolean;
  /** Horodatage du message */
  timestamp?: Date;
  /** Classe CSS supplémentaire */
  className?: string;
  /** Suggestions associées au message */
  suggestions?: string[];
  /** Callback quand une suggestion est cliquée */
  onSuggestionClick?: (suggestion: string) => void;
  /** Pièces jointes */
  attachments?: string[];
  /** Boutons de création */
  creationButtons?: Array<{
    id: string;
    type: string;
    label: string;
    icon: string;
    data: Record<string, unknown>;
  }>;
  /** Callback pour les actions de création */
  onCreation?: (type: string, data: Record<string, unknown>) => void;
  /** Indique si une création est en cours */
  isCreating?: boolean;
  /** Le type de création en cours */
  creatingType?: string | null;
  /** Résultats de la création */
  creationResult?: {
    success: boolean;
    type: string;
    entity: Record<string, unknown>;
  } | null;
  /** Message d'erreur */
  error?: {
    message: string;
    code?: string;
    retryable?: boolean;
  } | null;
  /** Composants enfants personnalisés */
  children?: React.ReactNode;
}

/**
 * SpeechBubble - Composant de bulle de conversation style BD
 * 
 * Affiche les messages dans des bulles style bande dessinée:
 * - Bulles de l'utilisateur à droite
 * - Bulles de l'assistant à gauche avec effet glow
 */
export const SpeechBubble: React.FC<SpeechBubbleProps> = ({
  content,
  role,
  isStreaming = false,
  streamComplete = false,
  timestamp,
  className = '',
  suggestions = [],
  onSuggestionClick,
  attachments = [],
  creationButtons = [],
  onCreation,
  isCreating = false,
  creatingType = null,
  creationResult = null,
  error = null,
  children,
}) => {
  const isUser = role === 'user';
  const isAssistant = role === 'assistant' || role === 'system';

  const formatTime = (date?: Date) => {
    if (!date) return null;
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className={`speech-bubble-container ${isUser ? 'speech-bubble-user' : 'speech-bubble-assistant'} ${className}`}
    >
      {/* Avatar pour l'assistant */}
      {isAssistant && (
        <div className="speech-bubble-avatar">
          <div className="speech-bubble-avatar-inner">
            <svg 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              className="w-4 h-4"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          </div>
        </div>
      )}

      {/* Bulle principale */}
      <div
        className={`speech-bubble ${isUser ? 'speech-bubble-right' : 'speech-bubble-left'} ${isAssistant ? 'speech-bubble-glow' : ''}`}
      >
        {/* Queue de la bulle (style BD) */}
        <div className="speech-bubble-tail" />
        
        {/* Contenu */}
        <div className="speech-bubble-content">
          {/* Indicateur de rôle pour l'assistant */}
          {isAssistant && (
            <div className="speech-bubble-role">
              <span className="speech-bubble-role-icon">✨</span>
              <span className="speech-bubble-role-text">Assistant</span>
              {isStreaming && (
                <span className="speech-bubble-typing">
                  <span className="speech-bubble-dot"></span>
                  <span className="speech-bubble-dot"></span>
                  <span className="speech-bubble-dot"></span>
                </span>
              )}
            </div>
          )}

          {/* Texte du message */}
          {content && (
            <p className="speech-bubble-text">
              {content}
              {isStreaming && !streamComplete && (
                <span className="speech-bubble-cursor">▊</span>
              )}
            </p>
          )}

          {/* Children content */}
          {children}

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="speech-bubble-attachments">
              {attachments.map((attachment, idx) => (
                <div key={idx} className="speech-bubble-attachment">
                  <span className="speech-bubble-attachment-icon">📎</span>
                  <span className="speech-bubble-attachment-name">{attachment}</span>
                </div>
              ))}
            </div>
          )}

          {/* Creation Buttons */}
          {role === 'assistant' && creationButtons.length > 0 && !creationResult && (
            <div className="speech-bubble-actions">
              <div className="speech-bubble-actions-header">
                <span className="speech-bubble-actions-icon">🪄</span>
                <span className="speech-bubble-actions-text">Actions de création</span>
              </div>
              <div className="speech-bubble-buttons">
                {creationButtons.map((btn) => (
                  <button
                    key={btn.id}
                    onClick={() => onCreation?.(btn.type, btn.data)}
                    disabled={isCreating}
                    className="speech-bubble-action-btn"
                  >
                    {isCreating && creatingType === btn.type ? (
                      <span className="speech-bubble-loading-spinner" />
                    ) : (
                      <span className="speech-bubble-btn-icon">{btn.icon}</span>
                    )}
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Creation Result */}
          {creationResult && creationResult.success && (
            <div className="speech-bubble-result">
              <span className="speech-bubble-result-icon">✅</span>
              <span className="speech-bubble-result-text">
                {creationResult.type} créé avec succès
              </span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="speech-bubble-error">
              <span className="speech-bubble-error-icon">⚠️</span>
              <span className="speech-bubble-error-text">{error.message}</span>
            </div>
          )}

          {/* Horodatage */}
          {(!isStreaming || streamComplete) && timestamp && (
            <span className="speech-bubble-timestamp">
              {formatTime(timestamp)}
            </span>
          )}

          {/* Suggestions */}
          {streamComplete && suggestions.length > 0 && (
            <div className="speech-bubble-suggestions">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => onSuggestionClick?.(suggestion)}
                  className="speech-bubble-suggestion"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Avatar pour l'utilisateur */}
      {isUser && (
        <div className="speech-bubble-avatar speech-bubble-avatar-user">
          <div className="speech-bubble-avatar-inner">
            <svg 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              className="w-4 h-4"
            >
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpeechBubble;

