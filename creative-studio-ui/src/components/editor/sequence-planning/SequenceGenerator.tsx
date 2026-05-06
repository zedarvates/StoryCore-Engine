import { LegacyAny } from '@/types/legacy';
import React, { useState, FC } from 'react';
import { Pause, Square, CheckCircle, Clock, Image as ImageIcon, Video } from 'lucide-react';
import { SequencePlan, Scene } from '@/types/sequencePlan';
import { Button } from '@/components/ui/button';
import { ComfyUIService } from '@/services/comfyuiService';
import { imageGalleryService } from '@/services/ImageGalleryService';
import { toast } from '@/hooks/use-toast';

export interface SequenceGeneratorProps {
  sequencePlan: SequencePlan;
  onGenerationComplete?: (results: LegacyAny) => void;
  onSceneUpdate?: (sceneId: string, updates: Partial<Scene>) => void;
  onClose: () => void;
  className?: string;
}

export const SequenceGenerator: FC<SequenceGeneratorProps> = ({
  sequencePlan,
  onGenerationComplete,
  onSceneUpdate,
  onClose,
  className = ''
}) => {
  const [generationProgress, setGenerationProgress] = useState({
    currentScene: 0,
    totalScenes: sequencePlan.scenes.length,
    status: 'idle' as 'idle' | 'generating' | 'completed' | 'error',
    results: [] as unknown[]
  });

  const handleGenerateImages = async () => {
    setGenerationProgress(prev => ({ ...prev, status: 'generating', totalScenes: sequencePlan.scenes.length, currentScene: 0 }));

    try {
      let completed = 0;
      for (const scene of sequencePlan.scenes) {
        // Generate cover image for each scene
        if (scene.title) {
          const imageUrl = await ComfyUIService.getInstance().generateImage({
            prompt: scene.description || `Scene: ${scene.title}`,
            width: 1024,
            height: 576,
            steps: 20,
            cfgScale: 7.0,
            model: 'default',
            sampler: 'euler',
            scheduler: 'normal'
          });

          // Register in gallery service
          if (imageUrl) {
            imageGalleryService.addGeneratedImage(
              {
                id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                url: imageUrl,
                prompt: scene.description || `Scene: ${scene.title}`,
                model: 'ComfyUI (Flux/Turbo)',
                size: '1024x576',
                createdAt: new Date()
              },
              {
                type: 'scene',
                id: scene.id,
                name: scene.title,
                description: scene.description
              }
            );

            // Notify parent to update the scene with the new cover image
            if (onSceneUpdate) {
              onSceneUpdate(scene.id, { coverImage: imageUrl });
            }
          }
        }
        completed++;
        setGenerationProgress(prev => ({ ...prev, currentScene: completed }));
      }
      setGenerationProgress(prev => ({ ...prev, status: 'completed' }));
      
      if (onGenerationComplete) {
        onGenerationComplete({ status: 'success', scenesCount: sequencePlan.scenes.length });
      }
      
      toast({ title: "Génération terminée", description: "Toutes les images ont été générées et ajoutées à la galerie." });
    } catch (error) {
      console.error("Generation failed", error);
      setGenerationProgress(prev => ({ ...prev, status: 'error' }));
    }
  };

  const handleGenerateVideos = async () => {
    // Placeholder for video batch generation
    setGenerationProgress(prev => ({ ...prev, status: 'generating', totalScenes: sequencePlan.scenes.length, currentScene: 0 }));
    // Simulation/Implementation could go here calling videoEditorAPI
    // For now, let's just simulate or partial implement
    setTimeout(() => {
      setGenerationProgress(prev => ({ ...prev, status: 'completed' }));
      toast({ title: "Génération vidéo terminée", description: "Vidéos générées (simulation)." });
    }, 3000);
  };

  return (
    <div className={`sequence-generator ${className}`}>
      <div className="generator-header">
        <h3>Génération de Séquence</h3>
        <button className="close-btn" onClick={onClose}>
          <Square size={16} />
        </button>
      </div>

      <div className="generator-content">
        <div className="generation-overview">
          <div className="overview-item">
            <span className="label">Scènes:</span>
            <span className="value">{sequencePlan.scenes.length}</span>
          </div>
          <div className="overview-item">
            <span className="label">Plans:</span>
            <span className="value">{sequencePlan.shots.length}</span>
          </div>
          <div className="overview-item">
            <span className="label">Durée:</span>
            <span className="value">{sequencePlan.targetDuration}s</span>
          </div>
        </div>

        <div className="generation-progress">
          <div className="progress-header">
            <span>Progression</span>
            <span>{generationProgress.currentScene}/{generationProgress.totalScenes}</span>
          </div>

          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${(generationProgress.currentScene / generationProgress.totalScenes) * 100}%`
              }}
            />
          </div>

          {generationProgress.status === 'generating' && (
            <div className="current-scene">
              <Clock size={16} className="spinning" />
              Génération de la scène {generationProgress.currentScene}...
            </div>
          )}

          {generationProgress.status === 'completed' && (
            <div className="generation-complete">
              <CheckCircle size={16} />
              Génération terminée !
            </div>
          )}
        </div>

        <div className="generator-actions">
          {generationProgress.status === 'idle' && (
            <div className="flex gap-2 flex-col w-full">
              <Button className="start-btn w-full gap-2" onClick={handleGenerateImages}>
                <ImageIcon size={16} />
                Générer Images (Toutes Scènes)
              </Button>
              <Button className="start-btn w-full gap-2" variant="outline" onClick={handleGenerateVideos}>
                <Video size={16} />
                Générer Vidéos (Toutes Scènes)
              </Button>
            </div>
          )}

          {generationProgress.status === 'generating' && (
            <button className="pause-btn" onClick={() => setGenerationProgress(prev => ({ ...prev, status: 'idle' }))}>
              <Pause size={16} />
              Pause
            </button>
          )}

          {generationProgress.status === 'completed' && (
            <button className="complete-btn" onClick={onClose}>
              Terminer
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
