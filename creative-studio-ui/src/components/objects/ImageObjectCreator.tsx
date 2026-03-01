/**
 * Image Object Creator Component
 * 
 * Creates objects/props from uploaded images with:
 * - Vision model analysis for object description
 * - Material and era identification
 * - Style integration with project genre
 * 
 * Requirements: Object Creation Enhancement from User Images
 */

import React, { useState, useCallback, useRef } from 'react';
import { 
  Upload, 
  Package, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  Copy,
  Layers,
  Tag,
  Hammer,
  History
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import './ImageObjectCreator.css';

// ============================================================================
// Types
// ============================================================================

interface ObjectAttributes {
  material?: string;
  category?: string;
  style?: string;
  era?: string;
  color?: string;
  condition?: string;
  size?: string;
  complexity?: string;
}

interface ObjectFromImageResponse {
  success: boolean;
  object_id?: string;
  name?: string;
  object_type?: string;
  category?: string;
  description?: string;
  short_description?: string;
  attributes?: ObjectAttributes;
  suggested_tags?: string[];
  hero_shot_prompt?: string;
  detail_shot_prompt?: string;
  context_shot_prompt?: string;
  style_adaptations?: Record<string, string>;
  confidence?: number;
  processing_time_ms?: number;
  error_message?: string;
}

// ============================================================================
// Component
// ============================================================================

export interface ImageObjectCreatorProps {
  onObjectCreated?: (object: ObjectFromImageResponse) => void;
  genre?: string;
  visualStyle?: string;
}

export function ImageObjectCreator({
  onObjectCreated,
  genre,
  visualStyle
}: ImageObjectCreatorProps) {
  // State
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ObjectFromImageResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'result' | 'prompts'>('upload');
  
  // Form state
  const [objectName, setObjectName] = useState('');
  const [objectCategory, setObjectCategory] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  
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
      setError('Please select an image file');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
      setImageFile(file);
      setError(null);
      setResult(null);
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsDataURL(file);
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      setError('Please drop an image file');
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
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);
  
  const handleCreateObject = async () => {
    if (!image) {
      setError('Please select an image first');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const formData = new FormData();
      if (imageFile) {
        formData.append('file', imageFile);
      }
      if (objectName) formData.append('name', objectName);
      if (objectCategory) formData.append('category', objectCategory);
      formData.append('genre', projectGenre);
      formData.append('visual_style', projectStyle);
      if (additionalContext) formData.append('additional_context', additionalContext);
      
      const response = await fetch('/api/locations_objects/object/from-image', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create object');
      }
      
      const data: ObjectFromImageResponse = await response.json();
      setResult(data);
      setActiveTab('result');
      
      if (data.name) setObjectName(data.name);
      if (data.category) setObjectCategory(data.category);
      
      if (data.success && onObjectCreated) {
        onObjectCreated(data);
      }
      
    } catch (err) {
      console.error('Failed to create object:', err);
      setError(err instanceof Error ? err.message : 'Failed to create object');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };
  
  const reset = () => {
    setImage(null);
    setImageFile(null);
    setResult(null);
    setError(null);
    setObjectName('');
    setObjectCategory('');
    setAdditionalContext('');
    setActiveTab('upload');
  };
  
  return (
    <div className="image-object-creator">
      {/* Header */}
      <div className="image-object-creator__header">
        <h3 className="image-object-creator__title">
          <Package size={20} />
          Create Object from Image
        </h3>
        <p className="image-object-creator__subtitle">
          Upload an image to identify materials and generate prop data
        </p>
      </div>
      
      {/* Tabs */}
      <div className="image-object-creator__tabs">
        <button
          className={`image-object-creator__tab ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          <Upload size={16} />
          Upload
        </button>
        <button
          className={`image-object-creator__tab ${activeTab === 'result' ? 'active' : ''}`}
          onClick={() => setActiveTab('result')}
          disabled={!result}
        >
          <Package size={16} />
          Result
        </button>
        <button
          className={`image-object-creator__tab ${activeTab === 'prompts' ? 'active' : ''}`}
          onClick={() => setActiveTab('prompts')}
          disabled={!result}
        >
          <Sparkles size={16} />
          Prompts
        </button>
      </div>
      
      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div className="image-object-creator__upload">
          {/* Drop Zone */}
          <div
            className={`image-object-creator__dropzone ${image ? 'has-image' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            {image ? (
              <img 
                src={image} 
                alt="Uploaded object" 
                className="image-object-creator__preview"
              />
            ) : (
              <div className="image-object-creator__dropzone-content">
                <ImageIcon size={48} />
                <p>Drag & drop an image or click to browse</p>
                <span>Identify materials, style, and era</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="image-object-creator__file-input"
            />
          </div>
          
          {/* Form Fields */}
          <div className="image-object-creator__form">
            <div className="image-object-creator__field">
              <label>Object Name (optional)</label>
              <input
                type="text"
                value={objectName}
                onChange={(e) => setObjectName(e.target.value)}
                placeholder="e.g. Ancient Sword, Futuristic Console"
              />
            </div>
            
            <div className="image-object-creator__field">
              <label>Category</label>
              <select
                value={objectCategory}
                onChange={(e) => setObjectCategory(e.target.value)}
              >
                <option value="">Auto-detected</option>
                <option value="weapon">Weapon</option>
                <option value="tool">Tool</option>
                <option value="furniture">Furniture</option>
                <option value="vehicle">Vehicle</option>
                <option value="artifact">Artifact</option>
                <option value="electronic">Electronic</option>
                <option value="clothing">Clothing Item</option>
              </select>
            </div>
            
            <div className="image-object-creator__field">
              <label>Additional Context</label>
              <textarea
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="Describe specific details about the object..."
                rows={2}
              />
            </div>
          </div>
          
          {/* Error */}
          {error && (
            <div className="image-object-creator__error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
          
          {/* Actions */}
          <div className="image-object-creator__actions">
            <button
              className="image-object-creator__button image-object-creator__button--secondary"
              onClick={reset}
              disabled={!image}
            >
              <RefreshCw size={18} />
              Reset
            </button>
            
            <button
              className="image-object-creator__button image-object-creator__button--primary"
              onClick={handleCreateObject}
              disabled={!image || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={18} className="spinner" />
                  Identifying...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Create Object
                </>
              )}
            </button>
          </div>
        </div>
      )}
      
      {/* Result Tab */}
      {activeTab === 'result' && result && (
        <div className="image-object-creator__result">
          {/* Success Status */}
          {result.success && (
            <div className="image-object-creator__success">
              <CheckCircle size={20} />
              Object data generated
              <span className="image-object-creator__confidence">
                Confidence: {Math.round((result.confidence || 0) * 100)}%
              </span>
            </div>
          )}
          
          <div className="image-object-creator__object-info">
            <div className="image-object-creator__info-row">
              <label>Name:</label>
              <span>{result.name || 'Unnamed Object'}</span>
            </div>
            
            <div className="image-object-creator__info-row">
              <label>Category:</label>
              <span className="badge">{result.category || 'Unknown'}</span>
            </div>
            
            {result.short_description && (
              <div className="image-object-creator__info-row">
                <label>Description:</label>
                <p>{result.short_description}</p>
              </div>
            )}

            {/* Attributes Grid */}
            {result.attributes && (
              <div className="image-object-creator__attributes">
                <h4>Physical Attributes</h4>
                <div className="image-object-creator__attributes-grid">
                  {result.attributes.material && (
                    <div className="image-object-creator__attribute">
                      <div className="attr-header">
                        <Hammer size={14} />
                        <span>Material</span>
                      </div>
                      <span className="value">{result.attributes.material}</span>
                    </div>
                  )}
                  {result.attributes.era && (
                    <div className="image-object-creator__attribute">
                      <div className="attr-header">
                        <History size={14} />
                        <span>Era</span>
                      </div>
                      <span className="value">{result.attributes.era}</span>
                    </div>
                  )}
                  {result.attributes.condition && (
                    <div className="image-object-creator__attribute">
                      <div className="attr-header">
                        <Layers size={14} />
                        <span>Condition</span>
                      </div>
                      <span className="value">{result.attributes.condition}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Suggested Tags */}
            {result.suggested_tags && result.suggested_tags.length > 0 && (
              <div className="image-object-creator__tags">
                <h4>Suggested Tags</h4>
                <div className="tags-list">
                  {result.suggested_tags.map((tag, idx) => (
                    <span key={idx} className="tag-item">
                      <Tag size={12} />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Style Adaptations */}
            {result.style_adaptations && Object.keys(result.style_adaptations).length > 0 && (
              <div className="image-object-creator__adaptations">
                <h4>Visual Adaptation ({projectGenre})</h4>
                <div className="adaptations-list">
                  {Object.entries(result.style_adaptations).map(([key, value]) => (
                    <div key={key} className="adaptation-item">
                      <span className="key">{key}:</span>
                      <span className="val">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Prompts Tab */}
      {activeTab === 'prompts' && result && (
        <div className="image-object-creator__prompts">
          <h4>Generated Prop Prompts</h4>
          <p className="image-object-creator__prompts-hint">
            Specific prompts for generating this asset in different contexts
          </p>
          
          <div className="prompt-cards">
            {result.hero_shot_prompt && (
              <div className="prompt-card">
                <div className="prompt-card-header">
                  <h5>Hero Shot / Studio</h5>
                  <button onClick={() => copyToClipboard(result.hero_shot_prompt!)}>
                    <Copy size={14} /> Copy
                  </button>
                </div>
                <p>{result.hero_shot_prompt}</p>
              </div>
            )}
            
            {result.detail_shot_prompt && (
              <div className="prompt-card">
                <div className="prompt-card-header">
                  <h5>Close-up / Texture Detail</h5>
                  <button onClick={() => copyToClipboard(result.detail_shot_prompt!)}>
                    <Copy size={14} /> Copy
                  </button>
                </div>
                <p>{result.detail_shot_prompt}</p>
              </div>
            )}
            
            {result.context_shot_prompt && (
              <div className="prompt-card">
                <div className="prompt-card-header">
                  <h5>In-World Context</h5>
                  <button onClick={() => copyToClipboard(result.context_shot_prompt!)}>
                    <Copy size={14} /> Copy
                  </button>
                </div>
                <p>{result.context_shot_prompt}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ImageObjectCreator;
