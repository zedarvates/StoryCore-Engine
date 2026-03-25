/**
 * ObjectsSection Component
 * 
 * Displays story objects (props, items, artifacts) in the project dashboard.
 * Integrated with the new objectStore for file-based persistence.
 */

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { useObjectStore } from '@/stores/objectStore';
import { Package, Plus, RefreshCw, X, Sparkles } from 'lucide-react';
import { ImageObjectCreator } from './ImageObjectCreator';
import { ObjectCard } from './ObjectCard';
import './ObjectsSection.css';
import { StoryObject, ObjectType, ObjectSize } from '@/types/object';
import { useNotifications } from '@/components/NotificationSystem';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export interface ObjectsSectionProps {
  onCreateObject?: () => void;
  onObjectClick?: (objectId: string) => void;

  /** Whether to hide the section header */
  hideHeader?: boolean;

  /** Optional className */
  className?: string;
}

export function ObjectsSection({
  onCreateObject,
  onObjectClick,
  hideHeader = false,
  className = '',
}: ObjectsSectionProps) {
  const project = useAppStore((state) => state.project);
  
  // Resolve project path/ID for storage
  // Prefer project.path (absolute) if available, otherwise fallback to project.id (UUID)
  const resolvedProjectId = project?.path || project?.id || 'default';
  
  const { objects, fetchProjectObjects, isLoading, addObject, updateObject, removeObject } = useObjectStore();
  const [showImageCreator, setShowImageCreator] = useState(false);
  const [editingObject, setEditingObject] = useState<StoryObject | null>(null);
  const { showSuccess, showError } = useNotifications();

  // Load objects on mount
  useEffect(() => {
    if (project) {
      fetchProjectObjects(resolvedProjectId);
    }
  }, [project, fetchProjectObjects, resolvedProjectId]);

  const handleEditObject = (object: StoryObject) => {
    setEditingObject({ ...object });
  };

  const handleDeleteObject = async (objectId: string) => {
    if (!resolvedProjectId) return;
    
    if (window.confirm('Are you sure you want to delete this object?')) {
      try {
        await removeObject(resolvedProjectId, objectId);
        showSuccess('Object deleted successfully');
      } catch (_err) {
        showError('Failed to delete object');
      }
    }
  };

  const handleUpdateObject = async (objectId: string, updates: Partial<StoryObject>) => {
    if (!resolvedProjectId) return;
    try {
      const object = objects.find(o => o.id === objectId);
      if (object) {
        await updateObject(resolvedProjectId, { ...object, ...updates });
      }
    } catch (_err) {
      showError('Failed to update object');
    }
  };

  const handleSaveEditedObject = async (object: StoryObject) => {
    if (!resolvedProjectId) return;
    try {
      await updateObject(resolvedProjectId, { ...object, updatedAt: Date.now() });
      setEditingObject(null);
      showSuccess('Object updated');
    } catch (_err) {
      showError('Failed to save object');
    }
  };


  return (
    <div className={`objects-section dashboard-card ${className}`}>
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
            <ObjectCard
              key={object.id}
              object={object}
              projectId={resolvedProjectId}
              onClick={() => onObjectClick?.(object.id)}
              onEdit={() => handleEditObject(object)}
              onDelete={() => handleDeleteObject(object.id)}
              onUpdate={(updates) => handleUpdateObject(object.id, updates)}
            />
          ))
        )}
      </div>

      {/* Object Editor Modal */}
      {editingObject && (
        <Dialog open={!!editingObject} onOpenChange={() => setEditingObject(null)}>
          <DialogContent className="max-w-2xl bg-[#111] border border-[#333] p-0 overflow-hidden text-white">
            <DialogHeader className="p-6 bg-[#0a0a0a] border-b border-[#222]">
              <DialogTitle className="text-emerald-500 font-bold flex items-center gap-2">
                <Package size={20} />
                Edit Object: {editingObject.name}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto max-h-[70vh]">
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Name</label>
                    <Input 
                      className="bg-black/50 border-[#333] text-white" 
                      value={editingObject.name} 
                      onChange={e => setEditingObject({ ...editingObject, name: e.target.value })} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Type</label>
                    <select
                      className="w-full h-10 px-3 rounded-md border border-[#333] bg-black/50 text-white text-sm"
                      value={editingObject.type}
                      onChange={e => setEditingObject({ ...editingObject, type: e.target.value as ObjectType })}
                      title="Object Category"
                    >
                      <option value="prop">Prop</option>
                      <option value="weapon">Weapon</option>
                      <option value="armor">Armor</option>
                      <option value="artifact">Artifact</option>
                      <option value="consumable">Consumable</option>
                      <option value="tool">Tool</option>
                      <option value="treasure">Treasure</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Description</label>
                  <Textarea 
                    className="bg-black/50 border-[#333] text-white min-h-[100px]" 
                    value={editingObject.description} 
                    onChange={e => setEditingObject({ ...editingObject, description: e.target.value })} 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Rarity</label>
                    <select
                      className="w-full h-10 px-3 rounded-md border border-[#333] bg-black/50 text-white text-sm"
                      value={editingObject.rarity}
                      onChange={e => setEditingObject({ ...editingObject, rarity: e.target.value as StoryObject['rarity'] })}
                      title="Object Rarity"
                    >
                      <option value="common">Common</option>
                      <option value="uncommon">Uncommon</option>
                      <option value="rare">Rare</option>
                      <option value="epic">Epic</option>
                      <option value="legendary">Legendary</option>
                      <option value="mythical">Mythical</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Power (0-100)</label>
                    <Input 
                      type="number" 
                      className="bg-black/50 border-[#333] text-white" 
                      value={editingObject.power || 0} 
                      onChange={e => setEditingObject({ ...editingObject, power: parseInt(e.target.value) || 0 })} 
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Properties (Materials, etc.)</label>
                  <div className="grid grid-cols-2 gap-4">
                    <Input 
                      placeholder="Material"
                      className="bg-black/50 border-[#333] text-white" 
                      value={editingObject.properties?.material || ''} 
                      onChange={e => setEditingObject({ 
                        ...editingObject, 
                        properties: { ...(editingObject.properties || {}), material: e.target.value }
                      })} 
                    />
                    <Input 
                      placeholder="Color"
                      className="bg-black/50 border-[#333] text-white" 
                      value={editingObject.properties?.color || ''} 
                      onChange={e => setEditingObject({ 
                        ...editingObject, 
                        properties: { ...(editingObject.properties || {}), color: e.target.value }
                      })} 
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[#222] flex justify-end gap-3 bg-[#0a0a0a]">
              <Button variant="outline" className="border-[#333] text-gray-400 hover:text-white" onClick={() => setEditingObject(null)}>
                Cancel
              </Button>
              <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8" onClick={() => handleSaveEditedObject(editingObject)}>
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
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
                  if (addObject && resolvedProjectId) {
                     const storyObject: StoryObject = {
                       id: objData.object_id || crypto.randomUUID(),
                       name: objData.name || 'New Object',
                       type: (objData.object_type || objData.category || 'prop') as ObjectType,
                       rarity: 'common',
                       description: objData.description || objData.short_description || '',
                       properties: {
                         material: objData.attributes?.material,
                         size: objData.attributes?.size as ObjectSize | undefined,
                         color: objData.attributes?.color,
                       },
                       prompts: objData.hero_shot_prompt ? [objData.hero_shot_prompt] : [],
                       generatedBy: 'ai_vision',
                       createdAt: Date.now(),
                       updatedAt: Date.now(),
                       tags: objData.suggested_tags || [],
                     };
                     addObject(resolvedProjectId, storyObject);
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
