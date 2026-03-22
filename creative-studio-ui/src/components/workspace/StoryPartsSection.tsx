import React, { useState, useMemo, useCallback } from 'react';
import { BookOpen, Plus, RefreshCw, FileText, X } from 'lucide-react';
import { useStore } from '@/store';
import { useAppStore } from '@/stores/useAppStore';
import { StoryPartCard } from './StoryPartCard';
import { saveStoryToDisk } from '@/utils/storyFileIO';
import type { StoryPart } from '@/types/story';
import './StoryPartsSection.css';

interface StoryPartsSectionProps {
  storyId: string;
  onClose?: () => void;
}

export function StoryPartsSection({ storyId, onClose }: StoryPartsSectionProps) {
  const stories = useStore((state) => state.stories);
  const updateStory = useStore((state) => state.updateStory);
  const project = useAppStore((state) => state.project);
  
  const story = useMemo(() => stories.find((s) => s.id === storyId), [stories, storyId]);
  
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Séparer les parties par type
  const storyParts = useMemo(() => {
    if (!story || !story.parts) return { intro: null, chapters: [] as StoryPart[], ending: null };
    
    return {
      intro: story.parts.find((p) => p.type === 'intro') as StoryPart | undefined,
      chapters: story.parts.filter((p) => p.type === 'chapter').sort((a, b) => (a.order || 0) - (b.order || 0)) as StoryPart[],
      ending: story.parts.find((p) => p.type === 'ending') as StoryPart | undefined,
    };
  }, [story]);

  // Handler pour la mise à jour rapide (édition en ligne)
  const handleQuickEdit = useCallback(async (part: StoryPart, newContent: string) => {
    if (!story) return;

    const updatedParts = (story.parts || []).map((p) => 
      p.id === part.id ? { ...p, content: newContent } : p
    );

    try {
      updateStory(story.id, { parts: updatedParts });

      // Sauvegarder sur le disque
      const projectPath = project?.metadata?.path as string | undefined;
      if (projectPath && window.electronAPI?.fs) {
        await saveStoryToDisk(projectPath, {
          ...story,
          parts: updatedParts,
        });
      }
    } catch (error) {
      console.error('Failed to update story part:', error);
    }
  }, [story, project, updateStory]);

  const handleDeletePart = useCallback(async (partId: string) => {
    if (!story || !window.confirm('Êtes-vous sûr de vouloir supprimer cette partie ?')) return;

    const updatedParts = (story.parts || []).filter((p) => p.id !== partId);

    try {
      updateStory(story.id, { parts: updatedParts });

      // Sauvegarder sur le disque
      const projectPath = project?.metadata?.path as string | undefined;
      if (projectPath && window.electronAPI?.fs) {
        await saveStoryToDisk(projectPath, {
          ...story,
          parts: updatedParts,
        });
      }
    } catch (error) {
      console.error('Failed to delete story part:', error);
    }
  }, [story, project, updateStory]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simuler un rafraîchissement
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const stats = useMemo(() => {
    if (!story) return { totalParts: 0, totalWords: 0, chaptersCount: 0 };
    
    const totalWords = story.parts?.reduce(
      (acc: number, p: StoryPart) => acc + (p.content?.split(/\s+/).length || 0), 
      0
    ) || 0;

    return {
      totalParts: story?.parts?.length || 0,
      totalWords,
      chaptersCount: storyParts?.chapters?.length || 0,
    };
  }, [story, storyParts]);

  if (!storyId) {
    return (
      <div className="story-parts-empty">
        <BookOpen className="w-12 h-12 opacity-20 mb-4" />
        <div className="flex flex-col items-center">
          <p>Sélectionnez une histoire pour voir ses parties.</p>
          {onClose && (
            <button onClick={onClose} className="mt-4 text-sm text-primary hover:underline">
              Fermer la vue
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="story-parts-empty">
        <X className="w-12 h-12 text-rose-500 opacity-20 mb-4" />
        <div className="flex flex-col items-center">
          <p>Histoire non trouvée.</p>
          {onClose && (
            <button onClick={onClose} className="mt-4 text-sm text-primary hover:underline">
              Retour
            </button>
          )}
        </div>
      </div>
    );
  }

  // Liste plate de toutes les parties pour l'affichage en tuiles
  const allParts = [
    ...(storyParts.intro ? [storyParts.intro] : []),
    ...storyParts.chapters,
    ...(storyParts.ending ? [storyParts.ending] : []),
  ];

  return (
    <div className="story-parts-section story-parts-section--expanded">
      <header className="story-parts-section__header">
        <div className="story-parts-section__header-left">
          <div className="story-parts-section__icon">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="story-parts-section__info">
            <h2 className="story-parts-section__title">{story.title}</h2>
            <div className="story-parts-section__meta">
              <span>
                <strong>{stats.totalParts}</strong> parties
              </span>
              <span>
                <strong>{stats.chaptersCount}</strong> chapitres
              </span>
              <span>
                <strong>{stats.totalWords.toLocaleString()}</strong> mots
              </span>
            </div>
          </div>
        </div>
        
        <div className="story-parts-section__header-right">
          <button 
            className={`story-parts-section__action-btn ${isRefreshing ? 'animate-spin' : ''}`}
            onClick={handleRefresh}
            title="Actualiser"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button 
            className="story-parts-section__action-btn story-parts-section__action-btn--primary"
            title="Nouveau Chapitre"
          >
            <Plus className="w-4 h-4" />
          </button>
          {onClose && (
            <button 
              className="story-parts-section__action-btn"
              onClick={onClose}
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      <div className="story-parts-section__content">
        {allParts.length > 0 ? (
          <div className="story-parts-section__parts-grid">
            {allParts.map((part, index) => (
              <StoryPartCard
                key={part.id}
                part={part}
                storyTitle={story.title}
                partNumber={part.type === 'chapter' ? storyParts.chapters.indexOf(part) + 1 : undefined}
                totalParts={storyParts.chapters.length}
                onDelete={handleDeletePart}
                onQuickEdit={handleQuickEdit}
                isExpanded={index === 0} // Étendre la première partie par défaut
              />
            ))}
          </div>
        ) : (
          <div className="story-parts-section--empty">
            <FileText className="story-parts-section__empty-icon mb-4" />
            <p>Cette histoire n'a pas encore de contenu.</p>
            <button className="mt-4 px-4 py-2 bg-primary text-white rounded-md text-sm font-medium">
              Générer l'introduction
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
