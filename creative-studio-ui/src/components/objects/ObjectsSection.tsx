/**
 * ObjectsSection Component
 * 
 * Displays story objects (props, items, artifacts) in the project dashboard
 */

import React from 'react';
import { useStore } from '@/store';
import { Package, Plus } from 'lucide-react';
import './ObjectsSection.css';

export interface ObjectsSectionProps {
  onCreateObject?: () => void;
  onObjectClick?: (objectId: string) => void;
}

export function ObjectsSection({
  onCreateObject,
  onObjectClick,
}: ObjectsSectionProps) {
  // Get objects from store with safe fallback
  const objects = useStore((state) => {
    try {
      return state.objects || [];
    } catch (error) {
      console.warn('Failed to get objects from store:', error);
      return [];
    }
  });

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
        {objects.length === 0 ? (
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
          objects.map((object: unknown) => (
            <div
              key={object.id}
              className="object-card"
              onClick={() => onObjectClick?.(object.id)}
            >
              <div className="object-image">
                {object.image ? (
                  <img src={object.image} alt={object.name} />
                ) : (
                  <div className="object-placeholder">
                    <Package size={32} />
                  </div>
                )}
              </div>
              <div className="object-info">
                <h4 className="object-name">{object.name}</h4>
                {object.type && (
                  <span className="object-type">{object.type}</span>
                )}
                {object.description && (
                  <p className="object-description">{object.description}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ObjectsSection;

