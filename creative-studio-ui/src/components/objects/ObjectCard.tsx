import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Image as ImageIcon, 
  Loader2, 
  RefreshCw, 
  Edit2, 
  Trash2, 
  Zap, 
  Shield, 
  Sparkles, 
  Crown, 
  Box, 
  CheckCircle2,
  Info
} from 'lucide-react';
import type { StoryObject } from '@/types/object';
import { ComfyUIService } from '@/services/comfyuiService';
import { useAppStore } from '@/stores/useAppStore';
import { downloadAndSaveImage, getImageDisplayUrl } from '@/services/imageStorageService';
import { videoEditorAPI } from '@/services/videoEditorAPI';
import { useNotifications } from '@/components/NotificationSystem';
import { devLog } from '@/utils/devOnly';
import { logger } from '@/utils/logger';
import './ObjectCard.css';

export interface ObjectCardProps {
  object: StoryObject;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onUpdate?: (updates: Partial<StoryObject>) => Promise<void>;
  projectId: string;
}

export const ObjectCard = React.memo<ObjectCardProps>(({
  object,
  onClick,
  onEdit,
  onDelete,
  onUpdate,
  projectId
}) => {
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isForging3D, setIsForging3D] = useState(false);
  const [displayImageUrl, setDisplayImageUrl] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  const comfyuiService = ComfyUIService.getInstance();
  const project = useAppStore((state) => state.project);
  const { showSuccess, showError } = useNotifications();

  // Load display URL
  useEffect(() => {
    const loadDisplayUrl = async () => {
      if (object.imageUrl) {
        const url = await getImageDisplayUrl(
          object.imageUrl,
          project?.metadata?.path as string | undefined || project?.path
        );
        if (url) {
          setDisplayImageUrl(url);
          return;
        }
      }
      setDisplayImageUrl(null);
    };

    loadDisplayUrl();
  }, [object.imageUrl, project?.metadata?.path, project?.path]);

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

  const buildObjectPrompt = (): string => {
    const visualStyle = project?.projectSetup?.visualStyle || 'realistic';
    const parts: string[] = [visualStyle];
    parts.push(`${object.type}: ${object.name}`);
    if (object.description) parts.push(object.description);
    if (object.properties?.material) parts.push(`made of ${object.properties.material}`);
    if (object.properties?.color) parts.push(`color: ${object.properties.color}`);
    parts.push('high quality', 'detailed', 'studio lighting', 'isolated on white background', 'object shot');
    return parts.join(', ');
  };

  const handleGenerateImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isGeneratingImage) return;

    setIsGeneratingImage(true);
    
    try {
      const prompt = buildObjectPrompt();
      const negativePrompt = 'blurry, low quality, distorted, watermark, text, signature, people, person';

      devLog('🎨 [ObjectCard] Generating image for object:', object.name);

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
      const projectPath = project?.metadata?.path as string | undefined || project?.path;
      let finalUrl = imageUrl;

      if (projectPath) {
        const sanitizedName = object.name
          .trim()
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

      if (onUpdate) {
        await onUpdate({
          imageUrl: finalUrl,
          imagePrompt: prompt,
          updatedAt: Date.now()
        });
      }

      devLog('✅ [ObjectCard] Image generated and saved for:', object.name);
    } catch (err) {
      logger.error('❌ [ObjectCard] Image generation failed:', err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleGenerate3DModel = async () => {
    if (!object.imageUrl || isForging3D) return;

    setIsForging3D(true);
    devLog('🧊 [ObjectCard] Starting 3D Forge for:', object.name);

    try {
      const response = await videoEditorAPI.forge3DAsset({
        projectId: projectId,
        objectId: object.id,
        imagePath: object.imageUrl,
        mode: 'feedforward' // Faster mode by default
      });

      if (response.status === 'success' && response.modelPath) {
        devLog('✅ [ObjectCard] 3D Forge successful:', response.modelPath);
        onUpdate?.({
          modelUrl: response.modelPath,
          updatedAt: Date.now()
        });
        showSuccess(`3D model for ${object.name} forged successfully!`);
      } else {
        throw new Error(response.error || 'Unknown error');
      }
    } catch (err) {
      console.error('❌ [ObjectCard] 3D Forge failed:', err);
      showError(`Failed to forge 3D model: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsForging3D(false);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) onEdit();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete();
  };

  const togglePrompt = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPrompt(!showPrompt);
  };

  return (
    <div
      className={`object-card ${getRarityClass(object.rarity)}`}
      onClick={onClick}
    >
      <div className="object-card__thumbnail">
        {displayImageUrl ? (
          <img src={displayImageUrl} alt={object.name} className="object-card__image" />
        ) : (
          <div className="object-card__placeholder">
            {!isGeneratingImage ? (
              <button 
                className="object-card__generate-button"
                onClick={handleGenerateImage}
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

        {/* Action buttons (Edit/Delete) overlay */}
        <div className="object-card__actions-overlay">
          <button 
            type="button"
            className="action-btn edit-btn" 
            onClick={handleEdit}
            title="Edit Object"
          >
            <Edit2 size={14} />
          </button>
          <button 
            type="button"
            className="action-btn delete-btn" 
            onClick={handleDelete}
            title="Delete Object"
          >
            <Trash2 size={14} />
          </button>
        </div>
        
        {/* Info/Prompt button */}
        {(object.imagePrompt || isGeneratingImage) && (
          <button 
            type="button"
            className={`action-btn info-btn ${showPrompt ? 'active' : ''}`}
            onClick={togglePrompt}
            title="Show Prompt"
          >
            <Info size={14} />
          </button>
        )}
      </div>

      {/* Prompt Display Overlay */}
      {showPrompt && (
        <div className="object-card__prompt-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="prompt-content">
            <div className="prompt-header">
              <span>Generation Prompt</span>
              <button type="button" onClick={() => setShowPrompt(false)}>×</button>
            </div>
            <p className="prompt-text">{object.imagePrompt || "No prompt available"}</p>
          </div>
        </div>
      )}

      <div className="object-header">
        <div className="object-icon-wrapper">
          {getTypeIcon(object.type)}
        </div>
        <div className="object-meta">
          <h4 className="object-name truncate" title={object.name}>{object.name}</h4>
          <div className="flex items-center gap-1">
            <span className="object-type-badge">{object.type}</span>
            {object.power && (
              <span className="object-power-badge">Pwr {object.power}</span>
            )}
          </div>
        </div>
      </div>

      <div className="p-3 pb-0">
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

      <div className="object-card__footer px-3 pb-3 mt-auto">
        {displayImageUrl ? (
          <button
            type="button"
            className="object-card__regenerate-button"
            onClick={handleGenerateImage}
            title="Regenerate object image with ComfyUI"
            disabled={isGeneratingImage}
          >
            <RefreshCw size={14} className={isGeneratingImage ? 'animate-spin' : ''} />
            {isGeneratingImage ? <span>Forging...</span> : <span>Reforge Object</span>}
          </button>
        ) : (
          !isGeneratingImage && (
            <button
              type="button"
              className="object-card__generate-button"
              onClick={handleGenerateImage}
              title="Generate object image with ComfyUI"
            >
              <ImageIcon size={18} />
              <span>Generate Object</span>
            </button>
          )
        )}
        
        {isGeneratingImage && !displayImageUrl && (
          <div className="object-card__generating flex items-center justify-center gap-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-400">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Forging...</span>
          </div>
        )}

        {/* 3D Forging Button */}
        {displayImageUrl && !isGeneratingImage && (
          <button
            type="button"
            className={`object-card__3d-button mt-2 w-full flex items-center justify-center gap-2 py-2 px-3 rounded text-xs font-bold transition-all ${
              isForging3D 
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                : object.modelUrl
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-900/20'
            }`}
            onClick={handleGenerate3DModel}
            disabled={isForging3D}
          >
            {isForging3D ? (
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
  );
});

ObjectCard.displayName = 'ObjectCard';
