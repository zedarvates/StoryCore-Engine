import React from 'react';
import { ChevronDown, Play, Film, Clock } from 'lucide-react';
import { Scene } from '@/types/sequencePlan';
import './SceneSelector.css';

export interface SceneSelectorProps {
  scenes: Scene[];
  selectedSceneId: string | null;
  onSceneSelect: (sceneId: string) => void;
  className?: string;
}

export const SceneSelector: React.FC<SceneSelectorProps> = ({
  scenes,
  selectedSceneId,
  onSceneSelect,
  className = ''
}) => {
  const selectedScene = scenes.find(s => s.id === selectedSceneId);

  return (
    <div className={`scene-selector ${className}`}>
      <div className="selector-header">
        <div className="scene-info">
          <Film size={16} />
          <span className="scene-title">
            {selectedScene ? `Scène ${selectedScene.number}: ${selectedScene.title}` : 'Aucune scène sélectionnée'}
          </span>
        </div>

        <div className="scene-stats">
          <div className="stat-item">
            <Clock size={12} />
            <span>{selectedScene?.targetDuration || 0}s</span>
          </div>
        </div>
      </div>

      <div className="scenes-list">
        {scenes.map(scene => (
          <div
            key={scene.id}
            className={`scene-item ${selectedSceneId === scene.id ? 'selected' : ''}`}
            onClick={() => onSceneSelect(scene.id)}
          >
            <div className="scene-item-header">
              <div className="scene-number">{scene.number}</div>
              <div className="scene-details">
                <div className="scene-title">{scene.title}</div>
                <div className="scene-description">{scene.description}</div>
              </div>
              <div className="scene-duration">
                <Clock size={12} />
                {scene.targetDuration}s
              </div>
            </div>

            <div className="scene-shots">
              {scene.sceneIds?.length || 0} plans
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};