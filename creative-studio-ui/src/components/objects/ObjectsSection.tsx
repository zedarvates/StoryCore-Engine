/**
 * ObjectsSection Component
 * 
 * Displays story objects (props, items, artifacts) in the project dashboard.
 * Integrated with the new objectStore for file-based persistence.
 */

import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { useObjectStore } from '@/stores/objectStore';
import { Loader2, Package, Plus, Image as ImageIcon, Sparkles, RefreshCw, Zap, Shield, Crown, Box, X, CheckCircle2 } from 'lucide-react';
import { ImageObjectCreator } from './ImageObjectCreator';
import './ObjectsSection.css';
import { StoryObject, ObjectType, ObjectSize } from '@/types/object';
import { ComfyUIService } from '@/services/comfyuiService';
import { downloadAndSaveImage } from '@/services/imageStorageService';
import { logger } from '@/utils/logger';
import { devLog } from '@/utils/devOnly';

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
  
  const { objects, fetchProjectObjects, isLoading, addObject, updateObject } = useObjectStore();
  const [showImageCreator, setShowImageCreator] = React.useState(false);
  const [generatingIds, setGeneratingIds] = React.useState<Set<string>>(new Set());
  const comfyuiService = ComfyUIService.getInstance();

  const [generating3DIds, setGenerating3DIds] = useState<Set<string>>(new Set());

  const resolveImageUrl = (path: string | undefined) => {
    if (!path) return undefined;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    // Local path needs the media-raw API
    return `/api/video-editor/projects/${project?.id}/media-raw?path=${path}`;
  };

  const buildObjectPrompt = (object: StoryObject): string => {
    const visualStyle = project?.projectSetup?.visualStyle || 'realistic';
    const parts: string[] = [visualStyle];
    parts.push(`${object.type}: ${object.name}`);
    if (object.description) parts.push(object.description);
    if (object.properties?.material) parts.push(`made of ${object.properties.material}`);
    if (object.properties?.color) parts.push(`color: ${object.properties.color}`);
    parts.push('high quality', 'detailed', 'studio lighting', 'isolated on white background', 'object shot');
    return parts.join(', ');
  };

  const handleGenerateObjectImage = async (e: React.MouseEvent, object: StoryObject) => {
    e.stopPropagation();
    if (generatingIds.has(object.id)) return;

    setGeneratingIds(prev => new Set(prev).add(object.id));
    
    try {
      const prompt = buildObjectPrompt(object);
      const negativePrompt = 'blurry, low quality, distorted, watermark, text, signature, people, person';

      devLog('🎨 [ObjectsSection] Generating image for object:', object.name);

      const imageUrl = await comfyuiService.generateImage({
        prompt,
        negativePrompt,
        width: 1024,
        height: 1024,
        steps: 4,
        cfgScale: 1,
        seed: Math.floor(Math.random() * 1000000),
        model: 'z_image_turbo_bf16.safetensors',
        sampler: 'res_multistep',
        scheduler: 'simple',
      });

      // Save locally
      const projectPath = project?.metadata?.path as string | undefined;
      let finalUrl = imageUrl;

      if (projectPath) {
        // Sanitize object name for folder path (must match objectStorage.ts)
        const sanitizedName = object.name
          .trim()
          // eslint-disable-next-line no-control-regex
          .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
          .replace(/\s+/g, '_')
          .substring(0, 100);
        
        const subDir = `objects/${sanitizedName}/images`;
        
        const saveResult = await downloadAndSaveImage(
          imageUrl,
          `obj_${object.id}`,
          projectPath,
          subDir
        );
        if (saveResult.success && saveResult.localPath) {
          finalUrl = saveResult.localPath;
        }
      }

      // Update object in store
      await updateObject(resolvedProjectId, {
        ...object,
        imageUrl: finalUrl,
        imagePrompt: prompt,
        updatedAt: Date.now()
      });

      devLog('✅ [ObjectsSection] Image generated and saved for:', object.name);
    } catch (err) {
      logger.error('❌ [ObjectsSection] Image generation failed:', err);
    } finally {
      setGeneratingIds(prev => {
        const next = new Set(prev);
        next.delete(object.id);
        return next;
      });
    }
  };

  const handleGenerate3DModel = async (e: React.MouseEvent, object: StoryObject) => {
    e.stopPropagation();
    if (generating3DIds.has(object.id)) return;

    setGenerating3DIds(prev => new Set(prev).add(object.id));
    
    try {
      devLog('🧊 [ObjectsSection] Generating 3D model for object:', object.name);
      
      // Simulate 3D generation for now - in production this would call a real 3D generation service
      // that converts the 2D isometry image to a .gbl textured model
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // For now, we simulate success by setting a mock modelUrl
      // This prepares the UI for the actual 3D pipeline integration
      const mockModelUrl = `objects/models/obj_${object.id}.glb`;
      
      await updateObject(resolvedProjectId, {
        ...object,
        modelUrl: mockModelUrl,
        updatedAt: Date.now()
      });

      devLog('✅ [ObjectsSection] 3D model forged for:', object.name);
      // Optional: show a notification instead of alert if possible
    } catch (err) {
      logger.error('❌ [ObjectsSection] 3D generation failed:', err);
    } finally {
      setGenerating3DIds(prev => {
        const next = new Set(prev);
        next.delete(object.id);
        return next;
      });
    }
  };

  // Load objects on mount
  useEffect(() => {
    if (project) {
      fetchProjectObjects(resolvedProjectId);
    }
  }, [project, fetchProjectObjects, resolvedProjectId]);

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
            <div
              key={object.id}
              className={`object-card ${getRarityClass(object.rarity)}`}
              onClick={() => onObjectClick?.(object.id)}
            >
              <div className="object-card__thumbnail">
                {object.imageUrl ? (
                  <img src={resolveImageUrl(object.imageUrl)} alt={object.name} className="object-card__image" />
                ) : (
                  <div className="object-card__placeholder">
                    {!generatingIds.has(object.id) ? (
                      <button 
                        className="object-card__generate-button"
                        onClick={(e) => handleGenerateObjectImage(e, object)}
                        title="Generate object image"
                      >
                        <ImageIcon size={18} />
                        <span>Generate Object</span>
                      </button>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="animate-spin text-emerald-500" size={24} />
                        <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Forging...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

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

              <div className="p-3">
                <p className="object-description line-clamp-2">
                  {object.description}
                </p>

                {object.tags && object.tags.length > 0 && (
                  <div className="object-tags mt-2 flex flex-wrap gap-1 border-b border-white/5 pb-2">
                    {object.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="tag-pill text-[9px]">{tag}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Generate image button - consistent with character/location cards */}
              <div className="object-card__generate px-3 pb-3">
                {object.imageUrl ? (
                  <button
                    className="object-card__regenerate-button"
                    onClick={(e) => handleGenerateObjectImage(e, object)}
                    title="Regenerate object image with ComfyUI"
                    aria-label={`Regenerate image for ${object.name}`}
                    disabled={generatingIds.has(object.id)}
                  >
                    <RefreshCw size={14} className={generatingIds.has(object.id) ? 'animate-spin' : ''} />
                    {generatingIds.has(object.id) ? <span>Forging...</span> : <span>Reforge Object</span>}
                  </button>
                ) : (
                  !generatingIds.has(object.id) && (
                    <button
                      className="object-card__generate-button"
                      onClick={(e) => handleGenerateObjectImage(e, object)}
                      title="Generate object image with ComfyUI"
                      aria-label={`Generate image for ${object.name}`}
                    >
                      <ImageIcon size={18} />
                      <span>Generate Object</span>
                    </button>
                  )
                )}
                {generatingIds.has(object.id) && !object.imageUrl && (
                  <div className="object-card__generating flex items-center justify-center gap-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-400">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Forging...</span>
                  </div>
                )}

                {/* New 3D Forging Button */}
                {object.imageUrl && !generatingIds.has(object.id) && (
                  <button
                    className={`object-card__3d-button mt-2 w-full flex items-center justify-center gap-2 py-2 px-3 rounded text-xs font-bold transition-all ${
                      generating3DIds.has(object.id) 
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                        : object.modelUrl
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                          : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-900/20'
                    }`}
                    onClick={(e) => !object.modelUrl && handleGenerate3DModel(e, object)}
                    disabled={generating3DIds.has(object.id)}
                  >
                    {generating3DIds.has(object.id) ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Forging 3D...</span>
                      </>
                    ) : object.modelUrl ? (
                      <>
                        <CheckCircle2 size={14} className="text-emerald-400" />
                        <span>3D Asset Ready (.glb)</span>
                      </>
                    ) : (
                      <>
                        <Box size={14} />
                        <span>Forge 3D Asset (.gbl)</span>
                      </>
                    )}
                  </button>
                )}
              </div>
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
