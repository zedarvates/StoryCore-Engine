/**
 * Image Character Creator Component
 * 
 * Creates characters from uploaded images with:
 * - Face extraction for face swapping
 * - Vision model analysis for character description
 * - Style integration with project genre
 * 
 * Requirements: Character Creation Enhancement from User Images
 */

import React, { useState, useCallback, useRef } from 'react';
import { 
  Upload, 
  User, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  Copy
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import type { Character } from '@/types/character';
import './ImageCharacterCreator.css';

// ============================================================================
// Types
// ============================================================================

interface PhysicalAttributes {
  gender?: string;
  age_range?: string;
  face_shape?: string;
  eye_color?: string;
  eye_shape?: string;
  hair_color?: string;
  hair_style?: string;
  hair_length?: string;
  skin_tone?: string;
  body_type?: string;
  facial_hair?: string;
  glasses?: string;
  accessories?: string[];
  distinctive_features?: string[];
  clothing_style?: string;
  clothing_colors?: string[];
  expression?: string;
  mood_hint?: string;
}

interface CharacterFromImageResponse {
  success: boolean;
  character_id?: string;
  name?: string;
  role?: string;
  description?: string;
  short_description?: string;
  physical_attributes?: PhysicalAttributes;
  personality_traits?: string[];
  face_extracted?: boolean;
  face_image_base64?: string;
  face_angle?: string;
  face_expression?: string;
  portrait_prompt?: string;
  full_body_prompt?: string;
  style_adaptations?: Record<string, string>;
  confidence?: number;
  processing_time_ms?: number;
  error_message?: string;
  suggested_name?: string;
  suggested_role?: string;
}

interface VisionProvider {
  name: string;
  available: boolean;
  configured: boolean;
  model: string;
}

interface ProvidersResponse {
  providers: Record<string, VisionProvider>;
  default: string | null;
}

// ============================================================================
// Component
// ============================================================================

interface ImageCharacterCreatorProps {
  onCharacterCreated?: (character: Partial<Character>) => void;
  genre?: string;
  visualStyle?: string;
  initialImage?: File;
}

export function ImageCharacterCreator({
  onCharacterCreated,
  genre,
  visualStyle,
  initialImage
}: ImageCharacterCreatorProps) {
  // State
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CharacterFromImageResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'result' | 'prompts'>('upload');
  const [providers, setProviders] = useState<ProvidersResponse | null>(null);
  
  // Form state
  const [characterName, setCharacterName] = useState('');
  const [characterRole, setCharacterRole] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [extractFace, setExtractFace] = useState(true);
  const [analyzeImage, setAnalyzeImage] = useState(true);
  const [applyGenreAdaptations, setApplyGenreAdaptations] = useState(true);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Store
  const project = useAppStore((state) => state.project);
  const projectData = project as unknown as Record<string, unknown>;
  const projectGenre = genre || (projectData?.genre as string) || 'fantasy';
  const projectStyle = visualStyle || (projectData?.visualStyle as string) || 'cinematic';
  
  // Fetch providers and handle initial image on mount
  React.useEffect(() => {
    fetchProviders();
    
    if (initialImage) {
      setImageFile(initialImage);
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(initialImage);
    }
  }, [initialImage]);
  
  const fetchProviders = async () => {
    try {
      const response = await fetch('/api/character/providers');
      if (response.ok) {
        const data = await response.json();
        setProviders(data);
      }
    } catch (err) {
      console.error('Failed to fetch providers:', err);
    }
  };
  
  // Handlers
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    
    // Read file
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
  
  const handleCreateCharacter = async () => {
    if (!image) {
      setError('Please select an image first');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // Create form data
      const formData = new FormData();
      if (imageFile) {
        formData.append('file', imageFile);
      }
      if (characterName) formData.append('name', characterName);
      if (characterRole) formData.append('role', characterRole);
      formData.append('genre', projectGenre);
      formData.append('visual_style', projectStyle);
      if (additionalContext) formData.append('additional_context', additionalContext);
      formData.append('extract_face', String(extractFace));
      formData.append('analyze_image', String(analyzeImage));
      formData.append('apply_genre_adaptations', String(applyGenreAdaptations));
      
      // Call API
      const response = await fetch('/api/character/from-image', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create character');
      }
      
      const data: CharacterFromImageResponse = await response.json();
      setResult(data);
      setActiveTab('result');
      
      // Update form with suggested values
      if (data.suggested_name) setCharacterName(data.suggested_name);
      if (data.suggested_role) setCharacterRole(data.suggested_role);
      
      // Callback
      if (data.success && onCharacterCreated) {
        onCharacterCreated(convertToCharacter(data));
      }
      
    } catch (err) {
      console.error('Failed to create character:', err);
      setError(err instanceof Error ? err.message : 'Failed to create character');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const convertToCharacter = (data: CharacterFromImageResponse): Partial<Character> => {
    return {
      character_id: data.character_id,
      name: data.name || 'Unnamed Character',
      role: data.role || 'character',
      description: data.description || '',
      visual_description: data.short_description || '',
      personality_traits: data.personality_traits || [],
      visual_identity: data.physical_attributes as unknown as Character['visual_identity'],
      prompts: {
        portrait: data.portrait_prompt,
        full_body: data.full_body_prompt
      },
      face_extracted: data.face_extracted,
      face_image_base64: data.face_image_base64,
      style_adaptations: data.style_adaptations
    } as unknown as Partial<Character>;
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };
  
  const reset = () => {
    setImage(null);
    setImageFile(null);
    setResult(null);
    setError(null);
    setCharacterName('');
    setCharacterRole('');
    setAdditionalContext('');
    setActiveTab('upload');
  };
  
  // Render
  return (
    <div className="image-character-creator">
      {/* Header */}
      <div className="image-character-creator__header">
        <h3 className="image-character-creator__title">
          <User size={20} />
          Create Character from Image
        </h3>
        <p className="image-character-creator__subtitle">
          Upload an image to extract face and generate character description
        </p>
      </div>
      
      {/* Provider Status */}
      {providers && (
        <div className="image-character-creator__providers">
          <span className="image-character-creator__providers-label">Vision Provider:</span>
          <span className="image-character-creator__providers-value">
            {providers.default ? (
              <>
                <CheckCircle size={14} />
                {providers.providers[providers.default]?.name || providers.default}
              </>
            ) : (
              <>
                <AlertCircle size={14} />
                No provider available
              </>
            )}
          </span>
        </div>
      )}
      
      {/* Tabs */}
      <div className="image-character-creator__tabs">
        <button
          className={`image-character-creator__tab ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          <Upload size={16} />
          Upload
        </button>
        <button
          className={`image-character-creator__tab ${activeTab === 'result' ? 'active' : ''}`}
          onClick={() => setActiveTab('result')}
          disabled={!result}
        >
          <User size={16} />
          Result
        </button>
        <button
          className={`image-character-creator__tab ${activeTab === 'prompts' ? 'active' : ''}`}
          onClick={() => setActiveTab('prompts')}
          disabled={!result}
        >
          <Sparkles size={16} />
          Prompts
        </button>
      </div>
      
      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div className="image-character-creator__upload">
          {/* Drop Zone */}
          <div
            className={`image-character-creator__dropzone ${image ? 'has-image' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            {image ? (
              <img 
                src={image} 
                alt="Uploaded character" 
                className="image-character-creator__preview"
              />
            ) : (
              <div className="image-character-creator__dropzone-content">
                <ImageIcon size={48} />
                <p>Drag & drop an image or click to browse</p>
                <span>Supports JPG, PNG, WebP</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="image-character-creator__file-input"
            />
          </div>
          
          {/* Form Fields */}
          <div className="image-character-creator__form">
            <div className="image-character-creator__field">
              <label>Character Name (optional)</label>
              <input
                type="text"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                placeholder="Auto-generated if empty"
              />
            </div>
            
            <div className="image-character-creator__field">
              <label>Character Role (optional)</label>
              <select
                value={characterRole}
                onChange={(e) => setCharacterRole(e.target.value)}
              >
                <option value="">Auto-detected</option>
                <option value="protagonist">Protagonist</option>
                <option value="antagonist">Antagonist</option>
                <option value="mentor">Mentor</option>
                <option value="sidekick">Sidekick</option>
                <option value="love_interest">Love Interest</option>
                <option value="comic_relief">Comic Relief</option>
              </select>
            </div>
            
            <div className="image-character-creator__field">
              <label>Additional Context</label>
              <textarea
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="Any additional context for character creation..."
                rows={2}
              />
            </div>
            
            {/* Options */}
            <div className="image-character-creator__options">
              <label className="image-character-creator__checkbox">
                <input
                  type="checkbox"
                  checked={extractFace}
                  onChange={(e) => setExtractFace(e.target.checked)}
                />
                <span>Extract face for face swapping</span>
              </label>
              
              <label className="image-character-creator__checkbox">
                <input
                  type="checkbox"
                  checked={analyzeImage}
                  onChange={(e) => setAnalyzeImage(e.target.checked)}
                />
                <span>Analyze with vision model</span>
              </label>
              
              <label className="image-character-creator__checkbox">
                <input
                  type="checkbox"
                  checked={applyGenreAdaptations}
                  onChange={(e) => setApplyGenreAdaptations(e.target.checked)}
                />
                <span>Apply genre adaptations ({projectGenre})</span>
              </label>
            </div>
          </div>
          
          {/* Error */}
          {error && (
            <div className="image-character-creator__error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
          
          {/* Actions */}
          <div className="image-character-creator__actions">
            <button
              className="image-character-creator__button image-character-creator__button--secondary"
              onClick={reset}
              disabled={!image}
            >
              <RefreshCw size={18} />
              Reset
            </button>
            
            <button
              className="image-character-creator__button image-character-creator__button--primary"
              onClick={handleCreateCharacter}
              disabled={!image || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={18} className="spinner" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Create Character
                </>
              )}
            </button>
          </div>
        </div>
      )}
      
      {/* Result Tab */}
      {activeTab === 'result' && result && (
        <div className="image-character-creator__result">
          {/* Status */}
          {result.success ? (
            <div className="image-character-creator__success">
              <CheckCircle size={20} />
              Character created successfully
              <span className="image-character-creator__confidence">
                Confidence: {Math.round((result.confidence || 0) * 100)}%
              </span>
            </div>
          ) : (
            <div className="image-character-creator__error">
              <AlertCircle size={20} />
              {result.error_message || 'Failed to create character'}
            </div>
          )}
          
          {/* Face Preview */}
          {result.face_extracted && result.face_image_base64 && (
            <div className="image-character-creator__face-preview">
              <h4>Extracted Face</h4>
              <img 
                src={`data:image/png;base64,${result.face_image_base64}`}
                alt="Extracted face"
              />
              <div className="image-character-creator__face-meta">
                <span>Angle: {result.face_angle || 'Unknown'}</span>
                <span>Expression: {result.face_expression || 'Unknown'}</span>
              </div>
            </div>
          )}
          
          {/* Character Info */}
          {result.success && (
            <div className="image-character-creator__character-info">
              <div className="image-character-creator__info-row">
                <label>Name:</label>
                <span>{result.name || 'Not specified'}</span>
              </div>
              
              <div className="image-character-creator__info-row">
                <label>Role:</label>
                <span>{result.role || 'Not specified'}</span>
              </div>
              
              {result.short_description && (
                <div className="image-character-creator__info-row">
                  <label>Description:</label>
                  <p>{result.short_description}</p>
                </div>
              )}
              
              {/* Physical Attributes */}
              {result.physical_attributes && (
                <div className="image-character-creator__attributes">
                  <h4>Physical Attributes</h4>
                  <div className="image-character-creator__attributes-grid">
                    {result.physical_attributes.gender && (
                      <div className="image-character-creator__attribute">
                        <span className="label">Gender</span>
                        <span className="value">{result.physical_attributes.gender}</span>
                      </div>
                    )}
                    {result.physical_attributes.age_range && (
                      <div className="image-character-creator__attribute">
                        <span className="label">Age</span>
                        <span className="value">{result.physical_attributes.age_range}</span>
                      </div>
                    )}
                    {result.physical_attributes.hair_color && (
                      <div className="image-character-creator__attribute">
                        <span className="label">Hair</span>
                        <span className="value">
                          {result.physical_attributes.hair_color}
                          {result.physical_attributes.hair_style && ` ${result.physical_attributes.hair_style}`}
                        </span>
                      </div>
                    )}
                    {result.physical_attributes.eye_color && (
                      <div className="image-character-creator__attribute">
                        <span className="label">Eyes</span>
                        <span className="value">{result.physical_attributes.eye_color}</span>
                      </div>
                    )}
                    {result.physical_attributes.skin_tone && (
                      <div className="image-character-creator__attribute">
                        <span className="label">Skin</span>
                        <span className="value">{result.physical_attributes.skin_tone}</span>
                      </div>
                    )}
                    {result.physical_attributes.body_type && (
                      <div className="image-character-creator__attribute">
                        <span className="label">Build</span>
                        <span className="value">{result.physical_attributes.body_type}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Accessories */}
                  {result.physical_attributes.accessories && result.physical_attributes.accessories.length > 0 && (
                    <div className="image-character-creator__info-row">
                      <label>Accessories:</label>
                      <span>{result.physical_attributes.accessories.join(', ')}</span>
                    </div>
                  )}
                  
                  {/* Distinctive Features */}
                  {result.physical_attributes.distinctive_features && result.physical_attributes.distinctive_features.length > 0 && (
                    <div className="image-character-creator__info-row">
                      <label>Distinctive Features:</label>
                      <span>{result.physical_attributes.distinctive_features.join(', ')}</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Personality Traits */}
              {result.personality_traits && result.personality_traits.length > 0 && (
                <div className="image-character-creator__traits">
                  <h4>Suggested Personality</h4>
                  <div className="image-character-creator__traits-list">
                    {result.personality_traits.map((trait, idx) => (
                      <span key={idx} className="image-character-creator__trait">
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Style Adaptations */}
              {result.style_adaptations && Object.keys(result.style_adaptations).length > 0 && (
                <div className="image-character-creator__adaptations">
                  <h4>Style Adaptations ({projectGenre})</h4>
                  {Object.entries(result.style_adaptations).map(([key, value]) => (
                    <div key={key} className="image-character-creator__adaptation">
                      <label>{key}:</label>
                      <span>{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Prompts Tab */}
      {activeTab === 'prompts' && result && (
        <div className="image-character-creator__prompts">
          <h4>Generated Prompts</h4>
          <p className="image-character-creator__prompts-hint">
            Use these prompts for image generation in ComfyUI
          </p>
          
          {/* Portrait Prompt */}
          {result.portrait_prompt && (
            <div className="image-character-creator__prompt">
              <div className="image-character-creator__prompt-header">
                <h5>Portrait Prompt</h5>
                <button
                  className="image-character-creator__copy-button"
                  onClick={() => copyToClipboard(result.portrait_prompt!)}
                >
                  <Copy size={14} />
                  Copy
                </button>
              </div>
              <p>{result.portrait_prompt}</p>
            </div>
          )}
          
          {/* Full Body Prompt */}
          {result.full_body_prompt && (
            <div className="image-character-creator__prompt">
              <div className="image-character-creator__prompt-header">
                <h5>Full Body Prompt</h5>
                <button
                  className="image-character-creator__copy-button"
                  onClick={() => copyToClipboard(result.full_body_prompt!)}
                >
                  <Copy size={14} />
                  Copy
                </button>
              </div>
              <p>{result.full_body_prompt}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ImageCharacterCreator;