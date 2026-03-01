/**
 * ObjectsSection Component
 * 
 * Displays story objects (props, items, artifacts) in the project dashboard.
 * Integrated with the new objectStore for file-based persistence.
 */

import React, { useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { useObjectStore } from '@/stores/objectStore';
import { Package, Plus, Sparkles, Zap, Shield, Crown, X, RefreshCw } from 'lucide-react';
import { ImageObjectCreator } from './ImageObjectCreator';
import './ObjectsSection.css';
import { StoryObject, ObjectType } from '@/types/object';

export interface ObjectsSectionProps {
  onCreateObject?: () => void;
  onObjectClick?: (objectId: string) => void;

  /** Whether to hide the section header */
  hideHeader?: boolean;

  /** Optional className */
  className?: string;

  /** Optional style */
  style?: React.CSSProperties;
}

export function ObjectsSection({
  onCreateObject,
  onObjectClick,
  hideHeader = false,
  className = '',
  style = {},
}: ObjectsSectionProps) {
  const project = useAppStore((state) => state.project);
  const projectId = project?.path ? project.path.split(/[/\\]/).pop() || project.id : project.id || 'default';
  const { objects, fetchProjectObjects, isLoading, addObject } = useObjectStore();
  const [showImageCreator, setShowImageCreator] = React.useState(false);

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
    <div className={`objects-section dashboard-card ${className}`} style={style}>
      {!hideHeader && (
        <div className="section-header">
          <div className="section-title">
            <Package className="section-icon" />
            <h3>Objects & Props</h3>
            <span className="count-badge">{objects.length}</span>
          </div>
          <div className="section-actions flex items-center gap-2">
            <button
              className="image-button flex items-center gap-1 px-3 py-1.5 rounded-md bg-purple-600/20 text-purple-400 border border-purple-500/30 hover:bg-purple-600/30 transition-all text-xs font-bold"
              onClick={() => setShowImageCreator(true)}
              title="Create from image"
            >
              <Sparkles size={14} />
              <span>From Image</span>
            </button>
            <button
              className="create-button"
              onClick={onCreateObject}
              title="Create new object"
            >
              <Plus size={16} />
              <span>New Object</span>
            </button>
          </div>
        </div>
      )}

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

      {/* Image Creator Modal */}
      {showImageCreator && (
        <div className="objects-section__modal-overlay fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="objects-section__modal bg-[#111] border border-[#333] rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="objects-section__modal-header flex items-center justify-between p-4 border-b border-[#333]">
              <h3 className="objects-section__modal-title text-emerald-500 font-bold flex items-center gap-2">
                <Package size={20} />
                Create Object from Image
              </h3>
              <button 
                className="objects-section__modal-close text-gray-500 hover:text-white transition-colors" 
                onClick={() => setShowImageCreator(false)} 
                title="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <ImageObjectCreator
                onObjectCreated={(objData) => {
                  if (addObject && projectId) {
                     const storyObject: StoryObject = {
                       id: objData.object_id || crypto.randomUUID(),
                       name: objData.name || 'New Object',
                       type: (objData.object_type || objData.category || 'prop') as ObjectType,
                       rarity: 'common',
                       description: objData.description || objData.short_description || '',
                       properties: {
                         material: objData.attributes?.material,
                         size: objData.attributes?.size,
                         color: objData.attributes?.color,
                       },
                       prompts: objData.hero_shot_prompt ? [objData.hero_shot_prompt] : [],
                       generatedBy: 'ai_vision',
                       createdAt: Date.now(),
                       updatedAt: Date.now(),
                       tags: objData.suggested_tags || [],
                     };
                     addObject(projectId, storyObject);
                  }
                  setShowImageCreator(false);
                }}
                genre={(project?.projectSetup?.genre?.[0] as string) || 'fantasy'}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default ObjectsSection;
