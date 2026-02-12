import React, { useState } from 'react';
import { FileText, Edit3, ChevronDown, ChevronUp, Trash2, Eye, Copy, Check } from 'lucide-react';
import type { StoryPart, StoryPartType } from '@/types/story';
import { cn } from '@/lib/utils';
import './StoryPartCard.css';

interface StoryPartCardProps {
  part: StoryPart;
  storyTitle: string;
  partNumber?: number;
  totalParts?: number;
  onEdit?: (part: StoryPart) => void;
  onDelete?: (partId: string) => void;
  onPreview?: (part: StoryPart) => void;
  onQuickEdit?: (part: StoryPart, newContent: string) => void;
  isExpanded?: boolean;
  className?: string;
}

// Configuration des types de parties
const PART_TYPE_CONFIG: Record<StoryPartType, { 
  label: string; 
  icon: string; 
  color: string;
  colorBg: string;
}> = {
  intro: { 
    label: 'Introduction', 
    icon: '📖',
    color: 'var(--intro-color, #3b82f6)',
    colorBg: 'var(--intro-bg, #eff6ff)',
  },
  chapter: { 
    label: 'Chapter', 
    icon: '📑',
    color: 'var(--chapter-color, #8b5cf6)',
    colorBg: 'var(--chapter-bg, #f5f3ff)',
  },
  ending: { 
    label: 'Ending', 
    icon: '🎬',
    color: 'var(--ending-color, #10b981)',
    colorBg: 'var(--ending-bg, #ecfdf5)',
  },
};

export function StoryPartCard({
  part,
  storyTitle,
  partNumber,
  totalParts,
  onEdit,
  onDelete,
  onPreview,
  onQuickEdit,
  isExpanded: defaultExpanded = false,
  className,
}: StoryPartCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(part.content);
  const [copied, setCopied] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const config = PART_TYPE_CONFIG[part.type] || PART_TYPE_CONFIG.chapter;

  // Tronquer le contenu pour l'affichage
  const truncatedContent = part.content.length > 200 
    ? part.content.substring(0, 200) + '...' 
    : part.content;

  // Tronquer le résumé pour l'affichage
  const truncatedSummary = part.summary.length > 100 
    ? part.summary.substring(0, 100) + '...' 
    : part.summary;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(part.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleQuickEditSave = () => {
    if (onQuickEdit) {
      onQuickEdit(part, editContent);
    }
    setIsEditing(false);
  };

  const handleQuickEditCancel = () => {
    setEditContent(part.content);
    setIsEditing(false);
  };

  return (
    <div 
      className={cn(
        'story-part-card',
        `story-part-card--${part.type}`,
        isExpanded && 'story-part-card--expanded',
        className
      )}
      style={{ '--part-color': config.color, '--part-bg': config.colorBg } as React.CSSProperties}
    >
      {/* Header */}
      <div className="story-part-card__header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="story-part-card__header-left">
          <span className="story-part-card__icon">{config.icon}</span>
          <div className="story-part-card__info">
            <h4 className="story-part-card__title">
              {part.title}
              {partNumber && totalParts && part.type === 'chapter' && (
                <span className="story-part-card__chapter-badge">
                  Chapter {partNumber}/{totalParts}
                </span>
              )}
              {part.type === 'intro' && (
                <span className="story-part-card__type-badge">Introduction</span>
              )}
              {part.type === 'ending' && (
                <span className="story-part-card__type-badge">Conclusion</span>
              )}
            </h4>
            <p className="story-part-card__story-title">{storyTitle}</p>
          </div>
        </div>
        
        <div className="story-part-card__header-right">
          {/* Actions rapides */}
          <div className="story-part-card__quick-actions" onClick={(e) => e.stopPropagation()}>
            {onPreview && (
              <button
                className="story-part-card__action-btn"
                onClick={() => onPreview(part)}
                title="Aperçu"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
            <button
              className="story-part-card__action-btn"
              onClick={handleCopy}
              title="Copier le contenu"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
            {onEdit && (
              <button
                className="story-part-card__action-btn story-part-card__action-btn--primary"
                onClick={() => onEdit(part)}
                title="Éditer"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                className="story-part-card__action-btn story-part-card__action-btn--danger"
                onClick={() => setShowConfirmDelete(true)}
                title="Supprimer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <button className="story-part-card__expand-btn">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Contenu étendu */}
      {isExpanded && (
        <div className="story-part-card__content">
          {/* Résumé pour le contexte LLM */}
          <div className="story-part-card__summary">
            <h5 className="story-part-card__summary-title">
              <FileText className="w-4 h-4" />
              Résumé pour la suite
            </h5>
            <p className="story-part-card__summary-text">{truncatedSummary}</p>
          </div>

          {/* Contenu principal */}
          <div className="story-part-card__main-content">
            {isEditing ? (
              <div className="story-part-card__editor">
                <textarea
                  id={`story-part-content-${part.id}`}
                  aria-label="Part content editor"
                  title="Enter the story part content"
                  placeholder="Write your story part content here..."
                  className="story-part-card__textarea"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={10}
                  autoFocus
                />
                <div className="story-part-card__editor-actions">
                  <button 
                    className="story-part-card__editor-btn story-part-card__editor-btn--cancel"
                    onClick={handleQuickEditCancel}
                  >
                    Annuler
                  </button>
                  <button 
                    className="story-part-card__editor-btn story-part-card__editor-btn--save"
                    onClick={handleQuickEditSave}
                  >
                    Sauvegarder
                  </button>
                </div>
              </div>
            ) : (
              <div className="story-part-card__text">
                <pre className="story-part-card__pre">{truncatedContent}</pre>
                {part.content.length > 200 && (
                  <button 
                    className="story-part-card__read-more"
                    onClick={() => onEdit && onEdit(part)}
                  >
                    Lire la suite...
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Score de révision */}
          {part.reviewScore && (
            <div className="story-part-card__review-scores">
              <div className="story-part-card__score">
                <span className="story-part-card__score-label">Tension</span>
                <div className="story-part-card__score-bar">
                  <div 
                    className="story-part-card__score-fill" 
                    style={{ width: `${part.reviewScore.tension}%` }}
                  />
                </div>
                <span className="story-part-card__score-value">{part.reviewScore.tension}</span>
              </div>
              <div className="story-part-card__score">
                <span className="story-part-card__score-label">Drame</span>
                <div className="story-part-card__score-bar">
                  <div 
                    className="story-part-card__score-fill story-part-card__score-fill--drama" 
                    style={{ width: `${part.reviewScore.drama}%` }}
                  />
                </div>
                <span className="story-part-card__score-value">{part.reviewScore.drama}</span>
              </div>
              <div className="story-part-card__score">
                <span className="story-part-card__score-label">Cohérence</span>
                <div className="story-part-card__score-bar">
                  <div 
                    className="story-part-card__score-fill story-part-card__score-fill--sense" 
                    style={{ width: `${part.reviewScore.sense}%` }}
                  />
                </div>
                <span className="story-part-card__score-value">{part.reviewScore.sense}</span>
              </div>
              <div className="story-part-card__score">
                <span className="story-part-card__score-label">Émotion</span>
                <div className="story-part-card__score-bar">
                  <div 
                    className="story-part-card__score-fill story-part-card__score-fill--emotion" 
                    style={{ width: `${part.reviewScore.emotion}%` }}
                  />
                </div>
                <span className="story-part-card__score-value">{part.reviewScore.emotion}</span>
              </div>
              <div className="story-part-card__score story-part-card__score--overall">
                <span className="story-part-card__score-label">Note</span>
                <div className="story-part-card__score-bar story-part-card__score-bar--overall">
                  <div 
                    className="story-part-card__score-fill story-part-card__score-fill--overall" 
                    style={{ width: `${part.reviewScore.overall * 10}%` }}
                  />
                </div>
                <span className="story-part-card__score-value">{part.reviewScore.overall}/10</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation de suppression */}
      {showConfirmDelete && (
        <div className="story-part-card__confirm-delete" onClick={(e) => e.stopPropagation()}>
          <div className="story-part-card__confirm-dialog">
            <p>Supprimer « {part.title} » ?</p>
            <div className="story-part-card__confirm-actions">
              <button 
                className="story-part-card__confirm-btn story-part-card__confirm-btn--cancel"
                onClick={() => setShowConfirmDelete(false)}
              >
                Annuler
              </button>
              <button 
                className="story-part-card__confirm-btn story-part-card__confirm-btn--delete"
                onClick={() => {
                  onDelete && onDelete(part.id);
                  setShowConfirmDelete(false);
                }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

