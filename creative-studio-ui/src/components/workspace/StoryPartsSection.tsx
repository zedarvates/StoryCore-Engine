import React, { useState, useMemo, useCallback } from 'react';
import { BookOpen, Plus, RefreshCw, Edit3, Trash2, ChevronDown, ChevronRight, FileText, X } from 'lucide-react';
import { useStore } from '@/store';
import { useAppStore } from '@/stores/useAppStore';
import { StoryPartCard } from './StoryPartCard';
import type { Story, StoryPart } from '@/types/story';
import { saveStoryToDisk } from '@/utils/storyFileIO';
import { toast } from '@/utils/toast';
import { logger } from '@/utils/logging';
import './StoryPartsSection.css';

interface StoryPartsSectionProps {
  story?: Story | null;
  onPartsUpdated?: (parts: StoryPart[]) => void;
  onClose?: () => void;
  className?: string;
}

export function StoryPartsSection({ story, onPartsUpdated, onClose, className }: StoryPartsSectionProps) {
  const updateStory = useStore((state) => state.updateStory);
  const project = useAppStore((state) => state.project);
  
  const [isExpanded, setIsExpanded] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Organiser les parties par type
  const storyParts = useMemo(() => {
    if (!story?.parts || story.parts.length === 0) return null;

    const intro = story.parts.find(p => p.type === 'intro');
    const chapters = story.parts.filter(p => p.type === 'chapter').sort((a, b) => a.order - b.order);
    const ending = story.parts.find(p => p.type === 'ending');
    const summary = story.summary;

    return { intro, chapters, ending, summary };
  }, [story]);

  // Sauvegarder les modifications rapides
  const handleQuickEdit = useCallback(async (part: StoryPart, newContent: string) => {
    if (!story) return;

    try {
      const updatedParts = story.parts?.map(p => 
        p.id === part.id ? { ...p, content: newContent, updatedAt: new Date() } : p
      ) || [];

      updateStory(story.id, { parts: updatedParts });

      // Sauvegarder sur le disque
      if (project?.metadata?.path && window.electronAPI?.fs) {
        await saveStoryToDisk(project.metadata.path, {
          ...story,
          parts: updatedParts,
        });
      }

      toast.success('Partie sauvegardée', 'Vos modifications ont été enregistrées.');
      setEditingPartId(null);
      
      if (onPartsUpdated) {
        onPartsUpdated(updatedParts);
      }
    } catch (error) {
      logger.error('Failed to save part:', error);
      toast.error('Erreur', 'Impossible de sauvegarder les modifications.');
    }
  }, [story, updateStory, project, onPartsUpdated]);

  // Supprimer une partie
  const handleDeletePart = useCallback(async (partId: string) => {
    if (!story) return;

    try {
      const updatedParts = story.parts?.filter(p => p.id !== partId) || [];
      updateStory(story.id, { parts: updatedParts });

      // Sauvegarder sur le disque
      if (project?.metadata?.path && window.electronAPI?.fs) {
        await saveStoryToDisk(project.metadata.path, {
          ...story,
          parts: updatedParts,
        });
      }

      toast.success('Partie supprimée', 'La partie a été supprimée.');
      
      if (onPartsUpdated) {
        onPartsUpdated(updatedParts);
      }
    } catch (error) {
      logger.error('Failed to delete part:', error);
      toast.error('Erreur', 'Impossible de supprimer la partie.');
    }
  }, [story, updateStory, project, onPartsUpdated]);

  // Rafraîchir depuis les fichiers
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
    toast.info('Actualisé', 'Les parties ont été actualisées.');
  };

  // Calculer les statistiques
  const stats = useMemo(() => {
    if (!storyParts) return null;

    const totalWords = story.parts?.reduce((sum, part) => 
      sum + (part.content.split(/\s+/).filter(Boolean).length), 0
    ) || 0;

    return {
      totalParts: story.parts?.length || 0,
      totalWords,
      chaptersCount: storyParts.chapters.length,
    };
  }, [story, storyParts]);

  if (!story) {
    return (
      <div className={`story-parts-section story-parts-section--empty ${className || ''}`}>
        <div className="story-parts-section__empty-state">
          <BookOpen className="story-parts-section__empty-icon" />
          <h3>Aucun story créée</h3>
          <p>Créez d'abord une histoire avec le Storyteller Wizard.</p>
        </div>
      </div>
    );
  }

  if (!storyParts) {
    return (
      <div className={`story-parts-section story-parts-section--loading ${className || ''}`}>
        <div className="story-parts-section__loading">
          <FileText className="story-parts-section__loading-icon" />
          <p>En attente des parties d'histoire...</p>
          <span className="story-parts-section__loading-hint">
            Utilisez le Storyteller Wizard pour générer votre histoire.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`story-parts-section ${isExpanded ? 'story-parts-section--expanded' : ''} ${className || ''}`}>
      {/* Header */}
      <div 
        className="story-parts-section__header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="story-parts-section__header-left">
          <BookOpen className="story-parts-section__icon" />
          <div className="story-parts-section__info">
            <h3 className="story-parts-section__title">{story.title}</h3>
            <div className="story-parts-section__meta">
              {stats && (
                <>
                  <span>{stats.totalParts} parties</span>
                  <span>•</span>
                  <span>{stats.totalWords.toLocaleString()} mots</span>
                  <span>•</span>
                  <span>{stats.chaptersCount} chapitres</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="story-parts-section__header-right">
          <button 
            className="story-parts-section__action-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleRefresh();
            }}
            title="Actualiser"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          {onClose && (
            <button 
              className="story-parts-section__action-btn story-parts-section__action-btn--close"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button className="story-parts-section__expand-btn">
            {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Contenu étendu */}
      {isExpanded && (
        <div className="story-parts-section__content">
          {/* Résumé global */}
          {storyParts.summary && (
            <div className="story-parts-section__section">
              <div className="story-parts-section__section-header">
                <FileText className="w-4 h-4" />
                <h4>Résumé Global</h4>
              </div>
              <div className="story-parts-section__summary-card">
                <p>{storyParts.summary}</p>
              </div>
            </div>
          )}

          {/* Introduction */}
          {storyParts.intro && (
            <div className="story-parts-section__section">
              <div className="story-parts-section__section-header">
                <span className="story-parts-section__section-icon">📖</span>
                <h4>Introduction</h4>
              </div>
              <StoryPartCard
                part={storyParts.intro}
                storyTitle={story.title}
                onEdit={(part) => {
                  setEditingPartId(part.id);
                  setEditContent(part.content);
                }}
                onDelete={handleDeletePart}
              />
            </div>
          )}

          {/* Chapitres */}
          {storyParts.chapters.length > 0 && (
            <div className="story-parts-section__section">
              <div className="story-parts-section__section-header">
                <span className="story-parts-section__section-icon">📑</span>
                <h4>Chapitres ({storyParts.chapters.length})</h4>
              </div>
              <div className="story-parts-section__parts-grid">
                {storyParts.chapters.map((chapter, index) => (
                  <StoryPartCard
                    key={chapter.id}
                    part={chapter}
                    storyTitle={story.title}
                    partNumber={index + 1}
                    totalParts={storyParts.chapters.length}
                    onEdit={(part) => {
                      setEditingPartId(part.id);
                      setEditContent(part.content);
                    }}
                    onDelete={handleDeletePart}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Conclusion */}
          {storyParts.ending && (
            <div className="story-parts-section__section">
              <div className="story-parts-section__section-header">
                <span className="story-parts-section__section-icon">🎬</span>
                <h4>Conclusion</h4>
              </div>
              <StoryPartCard
                part={storyParts.ending}
                storyTitle={story.title}
                onEdit={(part) => {
                  setEditingPartId(part.id);
                  setEditContent(part.content);
                }}
                onDelete={handleDeletePart}
              />
            </div>
          )}

          {/* Actions additionnelles */}
          <div className="story-parts-section__actions">
            <button 
              className="story-parts-section__add-btn"
              onClick={() => {
                toast.info('Fonction à venir', 'Ajout de parties bientôt disponible.');
              }}
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter un chapitre</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

