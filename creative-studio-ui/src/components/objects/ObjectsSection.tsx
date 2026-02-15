/**
 * ObjectsSection Component
 * 
 * Displays story objects (props, items, artifacts) in the project dashboard.
 * Integrated with the new objectStore for file-based persistence.
 */

import React, { useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { useObjectStore } from '@/stores/objectStore';
import { Package, Plus, Sparkles, Zap, Shield, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import './ObjectsSection.css';
import { StoryObject } from '@/types/object';

export interface ObjectsSectionProps {
  onCreateObject?: () => void;
  onObjectClick?: (objectId: string) => void;
}

export function ObjectsSection({
  onCreateObject,
  onObjectClick,
}: ObjectsSectionProps) {
  const project = useAppStore((state) => state.project);
  const { objects, fetchProjectObjects, isLoading } = useObjectStore();

  // Load objects on mount
  useEffect(() => {
    if (project) {
      const projectId = project?.path ? project.path.split(/[/\\]/).pop() || project.id : project.id;
      fetchProjectObjects(projectId);
    }
  }, [project, fetchProjectObjects]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'weapon': return <Zap size={16} />;
      case 'armor': return <Shield size={16} />;
      case 'artifact': return <Sparkles size={16} />;
      case 'treasure': return <Crown size={16} />;
      default: return <Package size={16} />;
    }
  };

  const getRarityClass = (rarity: string) => {
    switch (rarity) {
      case 'uncommon': return 'rarity-uncommon';
      case 'rare': return 'rarity-rare';
      case 'epic': return 'rarity-epic';
      case 'legendary': return 'rarity-legendary';
      case 'mythical': return 'rarity-mythical';
      default: return 'rarity-common';
    }
  };

  return (
    <div className="objects-section dashboard-card">
      <div className="section-header">
        <div className="section-title">
          <Package className="section-icon" />
          <h3>Objects & Props</h3>
          <span className="count-badge">{objects.length}</span>
        </div>
        <button
          className="create-button"
          onClick={onCreateObject}
          title="Create new object"
        >
          <Plus size={16} />
          <span>New Object</span>
        </button>
      </div>

      <div className="objects-grid">
        {isLoading && objects.length === 0 ? (
          <div className="loading-state py-10 text-center text-gray-400">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
            <p>Loading objects...</p>
          </div>
        ) : objects.length === 0 ? (
          <div className="empty-state">
            <Package size={48} className="empty-icon" />
            <p className="empty-title">No objects yet</p>
            <p className="empty-description">
              Create objects, props, and artifacts for your story
            </p>
            <button className="empty-action-button" onClick={onCreateObject}>
              <Plus size={16} />
              Create First Object
            </button>
          </div>
        ) : (
          objects.map((object: StoryObject) => (
            <div
              key={object.id}
              className={`object-card ${getRarityClass(object.rarity)}`}
              onClick={() => onObjectClick?.(object.id)}
            >
              <div className="object-header">
                <div className="object-icon-wrapper">
                  {getTypeIcon(object.type)}
                </div>
                <div className="object-meta">
                  <h4 className="object-name truncate">{object.name}</h4>
                  <div className="flex items-center gap-1">
                    <span className="object-type-badge">{object.type}</span>
                    {object.power && (
                      <span className="object-power-badge">Pwr {object.power}</span>
                    )}
                  </div>
                </div>
              </div>

              <p className="object-description line-clamp-2">
                {object.description}
              </p>

              {object.tags && object.tags.length > 0 && (
                <div className="object-tags mt-2 flex flex-wrap gap-1">
                  {object.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="tag-pill text-[9px]">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Add RefreshCw import that was missed above
import { RefreshCw } from 'lucide-react';

export default ObjectsSection;
