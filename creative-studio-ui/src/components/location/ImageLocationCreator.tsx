/**
 * Image Location Creator Component
 * 
 * Creates locations from uploaded images with:
 * - Vision model analysis for location description
 * - Style integration with project genre
 * - Generation of multiple shot prompts
 * 
 * Requirements: Location Creation Enhancement from User Images
 */

import React, { useState, useCallback, useRef } from 'react';
import { 
  Upload, 
  MapPin, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  Copy,
  Sun,
  Cloud,
  Moon,
  Compass
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import './ImageLocationCreator.css';

// ============================================================================
// Types
// ============================================================================

interface LocationAttributes {
  atmosphere?: string;
  time_of_day?: string;
  weather?: string;
  season?: string;
  lighting?: string;
  architecture_style?: string;
  complexity?: string;
  indoor_outdoor?: string;
}

interface LocationFromImageResponse {
  success: boolean;
  location_id?: string;
  name?: string;
  location_type?: string;
  description?: string;
  short_description?: string;
  attributes?: LocationAttributes;
  narrative_purpose?: string;
  story_potential?: string[];
  wide_shot_prompt?: string;
  close_up_prompt?: string;
  atmospheric_prompt?: string;
  style_adaptations?: Record<string, string>;
  confidence?: number;
  processing_time_ms?: number;
  error_message?: string;
}

// ============================================================================
// Component
// ============================================================================

export interface ImageLocationCreatorProps {
  onLocationCreated?: (location: LocationFromImageResponse) => void;
  genre?: string;
  visualStyle?: string;
}

export function ImageLocationCreator({
  onLocationCreated,
  genre,
  visualStyle
}: ImageLocationCreatorProps) {
  // State
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LocationFromImageResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'result' | 'prompts'>('upload');
  
  // Form state
  const [locationName, setLocationName] = useState('');
  const [locationType, setLocationType] = useState('');
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
  
  const handleCreateLocation = async () => {
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
      if (locationName) formData.append('name', locationName);
      if (locationType) formData.append('location_type', locationType);
      formData.append('genre', projectGenre);
      formData.append('visual_style', projectStyle);
      if (additionalContext) formData.append('additional_context', additionalContext);
      
      const response = await fetch('/api/locations_objects/location/from-image', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create location');
      }
      
      const data: LocationFromImageResponse = await response.json();
      setResult(data);
      setActiveTab('result');
      
      if (data.name) setLocationName(data.name);
      if (data.location_type) setLocationType(data.location_type);
      
      if (data.success && onLocationCreated) {
        onLocationCreated(data);
      }
      
    } catch (err) {
      console.error('Failed to create location:', err);
      setError(err instanceof Error ? err.message : 'Failed to create location');
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
    setLocationName('');
    setLocationType('');
    setAdditionalContext('');
    setActiveTab('upload');
  };
  
  return (
    <div className="image-location-creator">
      {/* Header */}
      <div className="image-location-creator__header">
        <h3 className="image-location-creator__title">
          <MapPin size={20} />
          Create Location from Image
        </h3>
        <p className="image-location-creator__subtitle">
          Upload an image to analyze the atmosphere and generate location data
        </p>
      </div>
      
      {/* Tabs */}
      <div className="image-location-creator__tabs">
        <button
          className={`image-location-creator__tab ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          <Upload size={16} />
          Upload
        </button>
        <button
          className={`image-location-creator__tab ${activeTab === 'result' ? 'active' : ''}`}
          onClick={() => setActiveTab('result')}
          disabled={!result}
        >
          <Compass size={16} />
          Result
        </button>
        <button
          className={`image-location-creator__tab ${activeTab === 'prompts' ? 'active' : ''}`}
          onClick={() => setActiveTab('prompts')}
          disabled={!result}
        >
          <Sparkles size={16} />
          Prompts
        </button>
      </div>
      
      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div className="image-location-creator__upload">
          {/* Drop Zone */}
          <div
            className={`image-location-creator__dropzone ${image ? 'has-image' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            {image ? (
              <img 
                src={image} 
                alt="Uploaded location" 
                className="image-location-creator__preview"
              />
            ) : (
              <div className="image-location-creator__dropzone-content">
                <ImageIcon size={48} />
                <p>Drag & drop an image or click to browse</p>
                <span>Extract lighting, atmosphere, and architecture</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="image-location-creator__file-input"
            />
          </div>
          
          {/* Form Fields */}
          <div className="image-location-creator__form">
            <div className="image-location-creator__field">
              <label>Location Name (optional)</label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Mysterious Forest, Cyberpunk Alley"
              />
            </div>
            
            <div className="image-location-creator__field">
              <label>Location Type</label>
              <select
                value={locationType}
                onChange={(e) => setLocationType(e.target.value)}
              >
                <option value="">Auto-detected</option>
                <option value="interior">Interior</option>
                <option value="exterior">Exterior</option>
                <option value="landscape">Landscape</option>
                <option value="urban">Urban</option>
                <option value="natural">Natural</option>
                <option value="sci-fi">Sci-Fi / Futuristic</option>
                <option value="historic">Historic / Ancient</option>
              </select>
            </div>
            
            <div className="image-location-creator__field">
              <label>Additional Context</label>
              <textarea
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="Describe specific details you want the AI to notice..."
                rows={2}
              />
            </div>
          </div>
          
          {/* Error */}
          {error && (
            <div className="image-location-creator__error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
          
          {/* Actions */}
          <div className="image-location-creator__actions">
            <button
              className="image-location-creator__button image-location-creator__button--secondary"
              onClick={reset}
              disabled={!image}
            >
              <RefreshCw size={18} />
              Reset
            </button>
            
            <button
              className="image-location-creator__button image-location-creator__button--primary"
              onClick={handleCreateLocation}
              disabled={!image || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={18} className="spinner" />
                  Analyzing Scene...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Create Location
                </>
              )}
            </button>
          </div>
        </div>
      )}
      
      {/* Result Tab */}
      {activeTab === 'result' && result && (
        <div className="image-location-creator__result">
          {/* Success Status */}
          {result.success && (
            <div className="image-location-creator__success">
              <CheckCircle size={20} />
              Location analyzed successfully
              <span className="image-location-creator__confidence">
                Match: {Math.round((result.confidence || 0) * 100)}%
              </span>
            </div>
          )}
          
          <div className="image-location-creator__location-info">
            <div className="image-location-creator__info-row">
              <label>Name:</label>
              <span>{result.name || 'Unnamed Location'}</span>
            </div>
            
            <div className="image-location-creator__info-row">
              <label>Type:</label>
              <span className="badge">{result.location_type || 'Unknown'}</span>
            </div>
            
            {result.short_description && (
              <div className="image-location-creator__info-row">
                <label>Summary:</label>
                <p>{result.short_description}</p>
              </div>
            )}

            {/* Attributes Grid */}
            {result.attributes && (
              <div className="image-location-creator__attributes">
                <h4>Scene Attributes</h4>
                <div className="image-location-creator__attributes-grid">
                  {result.attributes.atmosphere && (
                    <div className="image-location-creator__attribute">
                      <div className="attr-header">
                        <Cloud size={14} />
                        <span>Atmosphere</span>
                      </div>
                      <span className="value">{result.attributes.atmosphere}</span>
                    </div>
                  )}
                  {result.attributes.time_of_day && (
                    <div className="image-location-creator__attribute">
                      <div className="attr-header">
                        {result.attributes.time_of_day.toLowerCase().includes('night') ? <Moon size={14} /> : <Sun size={14} />}
                        <span>Time</span>
                      </div>
                      <span className="value">{result.attributes.time_of_day}</span>
                    </div>
                  )}
                  {result.attributes.lighting && (
                    <div className="image-location-creator__attribute">
                      <div className="attr-header">
                        <Sparkles size={14} />
                        <span>Lighting</span>
                      </div>
                      <span className="value">{result.attributes.lighting}</span>
                    </div>
                  )}
                  {result.attributes.architecture_style && (
                    <div className="image-location-creator__attribute">
                      <div className="attr-header">
                        <Compass size={14} />
                        <span>Architecture</span>
                      </div>
                      <span className="value">{result.attributes.architecture_style}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Story Potential */}
            {result.story_potential && result.story_potential.length > 0 && (
              <div className="image-location-creator__narrative">
                <h4>Narrative Ideas</h4>
                <ul className="story-potential-list">
                  {result.story_potential.map((idea, idx) => (
                    <li key={idx}>{idea}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Style Adaptations */}
            {result.style_adaptations && Object.keys(result.style_adaptations).length > 0 && (
              <div className="image-location-creator__adaptations">
                <h4>Genre Adaptation ({projectGenre})</h4>
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
        <div className="image-location-creator__prompts">
          <h4>Generated Scene Prompts</h4>
          <p className="image-location-creator__prompts-hint">
            Optimized prompts for generating this location in {projectStyle} style
          </p>
          
          <div className="prompt-cards">
            {result.wide_shot_prompt && (
              <div className="prompt-card">
                <div className="prompt-card-header">
                  <h5>Wide Establishing Shot</h5>
                  <button onClick={() => copyToClipboard(result.wide_shot_prompt!)}>
                    <Copy size={14} /> Copy
                  </button>
                </div>
                <p>{result.wide_shot_prompt}</p>
              </div>
            )}
            
            {result.close_up_prompt && (
              <div className="prompt-card">
                <div className="prompt-card-header">
                  <h5>Detail / Close-up</h5>
                  <button onClick={() => copyToClipboard(result.close_up_prompt!)}>
                    <Copy size={14} /> Copy
                  </button>
                </div>
                <p>{result.close_up_prompt}</p>
              </div>
            )}
            
            {result.atmospheric_prompt && (
              <div className="prompt-card">
                <div className="prompt-card-header">
                  <h5>Atmospheric Mood</h5>
                  <button onClick={() => copyToClipboard(result.atmospheric_prompt!)}>
                    <Copy size={14} /> Copy
                  </button>
                </div>
                <p>{result.atmospheric_prompt}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ImageLocationCreator;
