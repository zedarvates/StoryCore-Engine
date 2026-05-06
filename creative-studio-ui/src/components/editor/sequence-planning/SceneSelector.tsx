import React from 'react';
import { _ChevronDown, _Play, Film, Clock, GripVertical } from 'lucide-react';
import { Scene } from '@/types/sequencePlan';
import { Reorder, _motion, AnimatePresence } from 'framer-motion';
import './SceneSelector.css';

export interface SceneSelectorProps {
  scenes: Scene[];
  selectedSceneId: string | null;
  onSceneSelect: (sceneId: string) => void;
  onScenesReorder?: (updatedScenes: Scene[]) => void;
  className?: string;
}

export const SceneSelector: React.FC<SceneSelectorProps> = ({
  scenes,
  selectedSceneId,
  onSceneSelect,
  onScenesReorder,
  className = ''
}) => {
  const selectedScene = scenes.find(s => s.id === selectedSceneId);

  const handleReorder = (newOrder: Scene[]) => {
    if (onScenesReorder) {
      onScenesReorder(newOrder);
    }
  };

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

      <Reorder.Group
        axis="x"
        values={scenes}
        onReorder={handleReorder}
        className="scenes-list"
        as="div"
      >
        <AnimatePresence initial={false}>
          {scenes.map(scene => (
            <Reorder.Item
              key={scene.id}
              value={scene}
              className={`scene-item ${selectedSceneId === scene.id ? 'selected' : ''}`}
              onClick={() => onSceneSelect(scene.id)}
              whileDrag={{ scale: 1.05, boxShadow: "0 8px 30px rgba(0,0,0,0.3)" }}
            >
              <div className="scene-item-content">
                <div className="scene-thumbnail">
                  {scene.coverImage ? (
                    <img src={scene.coverImage} alt={scene.title} />
                  ) : (
                    <div className="thumbnail-placeholder">
                      <Film size={24} />
                    </div>
                  )}
                  <div className="scene-number-badge">{scene.number}</div>
                  <div className="drag-handle">
                    <GripVertical size={14} />
                  </div>
                </div>

                <div className="scene-item-details">
                  <div className="scene-title-row">
                    <div className="scene-title-text">{scene.title}</div>
                    <div className="scene-duration-text">
                      <Clock size={10} />
                      {scene.targetDuration}s
                    </div>
                  </div>
                  <div className="scene-description-text">{scene.description}</div>
                </div>
              </div>
            </Reorder.Item>
          ))}
        </AnimatePresence>
      </Reorder.Group>
    </div>
  );
};
