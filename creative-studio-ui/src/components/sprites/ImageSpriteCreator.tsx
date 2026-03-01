/**
 * Image Sprite Creator Component
 * 
 * Creates animated sprites from uploaded images using vision analysis.
 */

import React, { useState, useCallback, useRef } from 'react';
import { 
  Upload, 
  Layers, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Image as ImageIcon,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { AnimatedSprite, createEmptySprite, SpriteOrientation } from '@/types/sprite';
import './ImageSpriteCreator.css';

// ============================================================================
// Types
// ============================================================================

interface SpriteAnalysisResponse {
  success: boolean;
  description?: string;
  short_description?: string;
  suggested_name?: string;
  suggested_personality?: string[];
  suggested_role?: string;
  style_adaptations?: Record<string, string>;
  confidence?: number;
  error_message?: string;
}

// ============================================================================
// Component
// ============================================================================

interface ImageSpriteCreatorProps {
  onSpriteCreated?: (sprite: AnimatedSprite) => void;
  genre?: string;
  visualStyle?: string;
}

export function ImageSpriteCreator({
  onSpriteCreated,
  genre,
  visualStyle
}: ImageSpriteCreatorProps) {
  // State
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SpriteAnalysisResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'result'>('upload');
  
  // Form state
  const [spriteName, setSpriteName] = useState('');
  const [orientation, setOrientation] = useState<SpriteOrientation>('s');
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Store
  const project = useAppStore((state) => state.project);
  const projectGenre = genre || (project?.projectSetup?.genre?.[0] as string) || 'fantasy';
  const projectStyle = visualStyle || (project?.projectSetup?.visualStyle as string) || 'cinematic';
  
  // Handlers
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      setError('Veuillez sélectionner une image');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
      setImageFile(file);
      setError(null);
      setResult(null);
    };
    reader.readAsDataURL(file);
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      setError('Veuillez déposer une image');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
      setImageFile(file);
      setError(null);
      setResult(null);
    };
    reader.readAsDataURL(file);
  }, []);
  
  const handleCreateSprite = async () => {
    if (!image) {
      setError('Veuillez sélectionner une image');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const formData = new FormData();
      if (imageFile) {
        formData.append('file', imageFile);
      }
      formData.append('genre', projectGenre);
      formData.append('visual_style', projectStyle);
      
      const response = await fetch('/api/character/analyze-image', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Échec de l\'analyse');
      }
      
      const data: SpriteAnalysisResponse = await response.json();
      setResult(data);
      setActiveTab('result');
      
      if (data.suggested_name) setSpriteName(data.suggested_name);
      
      if (data.success) {
        const newSprite = createEmptySprite(
          `sprite_${Date.now()}`,
          data.suggested_name || spriteName || 'Nouveau Sprite'
        );
        newSprite.source = { 
          type: 'url', 
          url: image 
        };
        newSprite.thumbnail = image;
        newSprite.currentOrientation = orientation;
        newSprite.metadata.description = data.description;
        newSprite.metadata.tags = data.suggested_personality || [];
        
        if (onSpriteCreated) {
          onSpriteCreated(newSprite);
        }
      }
      
    } catch (err) {
      console.error('Failed to create sprite:', err);
      setError(err instanceof Error ? err.message : 'Échec de la création du sprite');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const reset = () => {
    setImage(null);
    setImageFile(null);
    setResult(null);
    setError(null);
    setSpriteName('');
    setActiveTab('upload');
  };
  
  return (
    <div className="image-sprite-creator">
      <div className="image-sprite-creator__header">
        <h3 className="image-sprite-creator__title">
          <Layers size={20} />
          Créer un Sprite via Vision
        </h3>
        <p className="image-sprite-creator__subtitle">
          Analysez une image pour générer un sprite animé prêt à l'emploi
        </p>
      </div>
      
      <div className="image-sprite-creator__tabs">
        <button
          className={`image-sprite-creator__tab ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          <Upload size={16} />
          Upload
        </button>
        <button
          className={`image-sprite-creator__tab ${activeTab === 'result' ? 'active' : ''}`}
          onClick={() => setActiveTab('result')}
          disabled={!result}
        >
          <CheckCircle size={16} />
          Analyse
        </button>
      </div>
      
      {activeTab === 'upload' && (
        <div className="image-sprite-creator__upload">
          <div
            className={`image-sprite-creator__dropzone ${image ? 'has-image' : ''}`}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
          >
            {image ? (
              <img src={image} alt="Sprite preview" className="image-sprite-creator__preview" />
            ) : (
              <div className="image-sprite-creator__dropzone-content">
                <ImageIcon size={48} />
                <p>Glissez une image ou cliquez pour parcourir</p>
                <span>JPG, PNG, WebP supportés</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
          
          <div className="image-sprite-creator__form">
            <div className="image-sprite-creator__field">
              <label>Nom du Sprite</label>
              <input
                type="text"
                value={spriteName}
                onChange={(e) => setSpriteName(e.target.value)}
                placeholder="Ex: Héros, Garde, Ennemi..."
              />
            </div>
            
            <div className="image-sprite-creator__field">
              <label>Orientation Initiale</label>
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value as SpriteOrientation)}
              >
                <option value="s">Sud (Face)</option>
                <option value="n">Nord (Dos)</option>
                <option value="e">Est (Droite)</option>
                <option value="w">Ouest (Gauche)</option>
                <option value="se">Sud-Est</option>
                <option value="sw">Sud-Ouest</option>
                <option value="ne">Nord-Est</option>
                <option value="nw">Nord-Ouest</option>
              </select>
            </div>
          </div>
          
          {error && (
            <div className="image-sprite-creator__error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
          
          <div className="image-sprite-creator__actions">
            <button className="image-sprite-creator__button image-sprite-creator__button--secondary" onClick={reset} disabled={!image}>
              <RefreshCw size={18} />
              Réinitialiser
            </button>
            <button
              className="image-sprite-creator__button image-sprite-creator__button--primary"
              onClick={handleCreateSprite}
              disabled={!image || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={18} className="spinner" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Analyser et Créer
                </>
              )}
            </button>
          </div>
        </div>
      )}
      
      {activeTab === 'result' && result && (
        <div className="image-sprite-creator__result">
          <div className="image-sprite-creator__success">
            <CheckCircle size={20} />
            Sprite créé avec succès !
            <span className="text-xs opacity-75">
              Confiance de l'IA: {Math.round((result.confidence || 0) * 100)}%
            </span>
          </div>
          
          <div className="mt-4 space-y-3">
            <div className="flex justify-between items-center p-2 bg-slate-800 rounded">
              <span className="text-xs text-slate-400">Nom suggéré</span>
              <span className="text-sm font-medium">{result.suggested_name}</span>
            </div>
            <div className="p-2 bg-slate-800 rounded">
              <span className="text-xs text-slate-400 block mb-1">Description</span>
              <p className="text-sm">{result.short_description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
