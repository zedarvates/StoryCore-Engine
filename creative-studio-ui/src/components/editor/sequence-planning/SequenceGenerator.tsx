import React from 'react';
import { Play, Pause, Square, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { SequencePlan } from '@/types/sequencePlan';

export interface SequenceGeneratorProps {
  sequencePlan: SequencePlan;
  onGenerationComplete: (results: unknown) => void;
  onClose: () => void;
  className?: string;
}

export const SequenceGenerator: React.FC<SequenceGeneratorProps> = ({
  sequencePlan,
  onGenerationComplete,
  onClose,
  className = ''
}) => {
  const [generationProgress, setGenerationProgress] = React.useState({
    currentScene: 0,
    totalScenes: sequencePlan.scenes.length,
    status: 'idle' as 'idle' | 'generating' | 'completed' | 'error',
    results: [] as any[]
  });

  const handleStartGeneration = () => {
    setGenerationProgress(prev => ({ ...prev, status: 'generating' }));

    // Mock generation process
    let currentScene = 0;
    const interval = setInterval(() => {
      currentScene++;
      setGenerationProgress(prev => ({
        ...prev,
        currentScene
      }));

      if (currentScene >= sequencePlan.scenes.length) {
        clearInterval(interval);
        setGenerationProgress(prev => ({
          ...prev,
          status: 'completed'
        }));
        onGenerationComplete({ success: true });
      }
    }, 2000);
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
            <button className="start-btn" onClick={handleStartGeneration}>
              <Play size={16} />
              Démarrer la Génération
            </button>
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
