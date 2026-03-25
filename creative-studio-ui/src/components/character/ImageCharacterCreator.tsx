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
  Copy,
  ArrowRight
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
  productionMode?: string;
}

export function ImageCharacterCreator({
  onCharacterCreated,
  genre,
  visualStyle,
  initialImage,
  productionMode
}: ImageCharacterCreatorProps) {
  // State
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CharacterFromImageResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'result' | 'prompts'>('upload');
  const [providers, setProviders] = useState<ProvidersResponse | null>(null);

  // Result override state
  const [editableResult, setEditableResult] = useState<{
    name: string;
    role: string;
    gender: string;
    ageRange: string;
  }>({ name: '', role: '', gender: '', ageRange: '' });
  
  // Form state
  const [characterName, setCharacterName] = useState('');
  const [characterRole, setCharacterRole] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [extractFace, setExtractFace] = useState(true);
  const [analyzeImage, setAnalyzeImage] = useState(true);
  const [applyGenreAdaptations, setApplyGenreAdaptations] = useState(true);
  const [targetGender, setTargetGender] = useState<string>('');
  const [targetAge, setTargetAge] = useState<string>('');
  const [targetArchetype, setTargetArchetype] = useState<string>('Protagonist');
  const [targetEthnicity, setTargetEthnicity] = useState<string>('');
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Store
  const project = useAppStore((state) => state.project);
  const projectData = project as unknown as Record<string, unknown>;
  const projectGenre = genre || (projectData?.genre as string) || 'contemporary';
  const projectStyle = visualStyle || (projectData?.visualStyle as string) || 'cinematic';
  const projectProductionMode = productionMode || (projectData?.productionMode as string) || 'fiction';
  
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
      formData.append('production_mode', projectProductionMode);
      if (additionalContext) formData.append('additional_context', additionalContext);
      formData.append('extract_face', String(extractFace));
      formData.append('analyze_image', String(analyzeImage));
      formData.append('apply_genre_adaptations', String(applyGenreAdaptations));
      if (targetGender) formData.append('target_gender', targetGender);
      if (targetAge) formData.append('target_age', targetAge);
      if (targetEthnicity) formData.append('target_ethnicity', targetEthnicity);
      
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
      
      // Update form and editable result with suggested values
      if (data.suggested_name) setCharacterName(data.suggested_name);
      if (data.suggested_role) setCharacterRole(data.suggested_role);

      // Initialize editable result
      const converted = convertToCharacter(data);
      setEditableResult({
        name: converted.name || data.suggested_name || '',
        role: converted.role?.archetype || 'Protagonist',
        gender: converted.visual_identity?.gender || 'Other',
        ageRange: converted.visual_identity?.age_range || 'Adult (30-49)'
      });
      
      // Callback
      // Do NOT call callback immediately, let user review result in the tab
      // if (data.success && onCharacterCreated) {
      //   onCharacterCreated(convertToCharacter(data));
      // }
      
    } catch (err) {
      console.error('Failed to create character:', err);
      setError(err instanceof Error ? err.message : 'Failed to create character');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleConfirmResult = () => {
    if (result && onCharacterCreated) {
      const finalCharacter = convertToCharacter(result);
      // Apply overrides from manual edits
      if (finalCharacter.name) finalCharacter.name = editableResult.name;
      if (finalCharacter.role) finalCharacter.role.archetype = editableResult.role;
      if (finalCharacter.visual_identity) {
        finalCharacter.visual_identity.gender = editableResult.gender as import('@/types/character').Gender;
        finalCharacter.visual_identity.age_range = editableResult.ageRange;
      }
      
      onCharacterCreated(finalCharacter);
    }
  };

  const convertToCharacter = (data: CharacterFromImageResponse): Partial<Character> => {
    // Mapping to CHARACTER_ARCHETYPES from constants/characterOptions.ts
    const archetypeMapping: Record<string, string> = {
      'protagonist': 'Protagonist',
      'hero': 'Protagonist',
      'antagonist': 'Antagonist',
      'villain': 'Antagonist',
      'mentor': 'Mentor',
      'sidekick': 'Sidekick',
      'love_interest': 'Love Interest',
      'comic_relief': 'Trickster'
    };

    // Use user-provided archetype hint if available, otherwise map from AI role
    let archetype = targetArchetype || 'Protagonist';
    if (!targetArchetype || targetArchetype === '') {
      const roleString = (data.role || data.suggested_role || 'Protagonist').toLowerCase();
      archetype = archetypeMapping[roleString] || 'Protagonist';
    }

    // Map gender to GENDER_OPTIONS, respecting user hint if provided
    let gender: import('@/types/character').Gender = 'other';
    const genderHint = (targetGender || '').toLowerCase();
    
    if (genderHint.includes('female')) gender = 'female';
    else if (genderHint.includes('male')) gender = 'male';
    else if (genderHint.includes('non-binary')) gender = 'non-binary';
    
    if (!targetGender || targetGender === '') {
      const genderInput = (data.physical_attributes?.gender || '').toLowerCase();
      if (genderInput.includes('female')) gender = 'female';
      else if (genderInput.includes('male')) gender = 'male';
      else if (genderInput.includes('non-binary')) gender = 'non-binary';
    }

    // Map age to AGE_RANGES, respecting user hint if provided
    let ageRange = 'Adult (30-49)';
    const ageMap: Record<string, string> = {
      'child': 'Child (0-12)',
      'teen': 'Teenager (13-19)',
      'young_adult': 'Young Adult (20-29)',
      'adult': 'Adult (30-49)',
      'middle_aged': 'Middle-Aged (50-64)',
      'senior': 'Senior (65+)'
    };

    if (targetAge && ageMap[targetAge]) {
      ageRange = ageMap[targetAge];
    } else {
      const ageInput = (data.physical_attributes?.age_range || '').toLowerCase();
      if (ageInput.includes('child')) ageRange = 'Child (0-12)';
      else if (ageInput.includes('teen')) ageRange = 'Teenager (13-19)';
      else if (ageInput.includes('young')) ageRange = 'Young Adult (20-29)';
      else if (ageInput.includes('middle')) ageRange = 'Middle-Aged (50-64)';
      else if (ageInput.includes('senior') || ageInput.includes('old')) ageRange = 'Senior (65+)';
      else if (ageInput.includes('adult')) ageRange = 'Adult (30-49)';
    }

    return {
      character_id: data.character_id || crypto.randomUUID(),
      name: data.name || data.suggested_name || 'Unnamed Character',
      creation_method: 'ai_vision', 
      creation_timestamp: Date.now(),
      role: {
        archetype: archetype,
        narrative_function: data.role || 'Supporting Character',
        character_arc: 'positive'
      },
      description: data.description || '',
      visual_identity: {
        hair_color: data.physical_attributes?.hair_color || '',
        hair_style: data.physical_attributes?.hair_style || '',
        hair_length: data.physical_attributes?.hair_length || '',
        eye_color: data.physical_attributes?.eye_color || '',
        eye_shape: data.physical_attributes?.eye_shape || '',
        skin_tone: data.physical_attributes?.skin_tone || '',
        facial_structure: data.physical_attributes?.face_shape || '',
        distinctive_features: data.physical_attributes?.distinctive_features || [],
        age_range: ageRange,
        gender: gender,
        ethnicity: targetEthnicity || '',
        height: '',
        build: data.physical_attributes?.body_type || '',
        posture: '',
        clothing_style: data.physical_attributes?.clothing_style || '',
        color_palette: data.physical_attributes?.clothing_colors || [],
        reference_images: [],
        reference_sheet_images: []
      },
      personality: {
        traits: data.personality_traits || [],
        values: [],
        fears: [],
        desires: [],
        flaws: [],
        strengths: [],
        temperament: '',
        communication_style: ''
      },
      background: {
        origin: '',
        occupation: data.role || '',
        education: '',
        family: '',
        significant_events: [],
        current_situation: '',
        backstory: data.description || ''
      },
      relationships: [],
      prompts: [data.portrait_prompt || '', data.full_body_prompt || ''].filter(Boolean)
    } as Partial<Character>;
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
              id="character-image-upload"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="image-character-creator__file-input"
              title="Upload character image"
            />
          </div>
          
          {/* Form Fields */}
          <div className="image-character-creator__form">
            <div className="image-character-creator__field">
              <label htmlFor="character-name">Character Name (optional)</label>
              <input
                id="character-name"
                type="text"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                placeholder="Auto-generated if empty"
              />
            </div>
            
            <div className="image-character-creator__field">
              <label htmlFor="character-role">Character Role (optional)</label>
              <select
                id="character-role"
                value={characterRole}
                onChange={(e) => setCharacterRole(e.target.value)}
                title="Select suggested character role"
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
              <label htmlFor="character-archetype">Character Archetype (optional hint)</label>
              <select
                id="character-archetype"
                value={targetArchetype}
                onChange={(e) => setTargetArchetype(e.target.value)}
                title="Select character archetype"
              >
                <option value="">Auto-detected</option>
                <option value="Protagonist">Protagonist</option>
                <option value="Antagonist">Antagonist</option>
                <option value="Mentor">Mentor</option>
                <option value="Sidekick">Sidekick</option>
                <option value="Love Interest">Love Interest</option>
                <option value="Trickster">Trickster</option>
                <option value="Guardian">Guardian</option>
                <option value="Herald">Herald</option>
                <option value="Shapeshifter">Shapeshifter</option>
              </select>
            </div>

            <div className="image-character-creator__fields-row">
              <div className="image-character-creator__field">
                <label htmlFor="character-gender">Gender (optional hint)</label>
                <select
                  id="character-gender"
                  value={targetGender}
                  onChange={(e) => setTargetGender(e.target.value)}
                  title="Select character gender"
                  className="w-full bg-gray-50 dark:bg-gray-800 border-transparent focus:border-blue-500 rounded-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="">Auto-detected</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="non-binary">Non-binary</option>
                </select>
              </div>

              <div className="image-character-creator__field">
                <label htmlFor="character-age">Age Range (optional hint)</label>
                <select
                  id="character-age"
                  value={targetAge}
                  onChange={(e) => setTargetAge(e.target.value)}
                  title="Select character age range"
                  className="w-full bg-gray-50 dark:bg-gray-800 border-transparent focus:border-blue-500 rounded-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="">Auto-detected</option>
                  <option value="child">Child</option>
                  <option value="teen">Teen</option>
                  <option value="young_adult">Young Adult</option>
                  <option value="adult">Adult</option>
                  <option value="middle_aged">Middle Aged</option>
                  <option value="senior">Senior</option>
                </select>
              </div>

              <div className="image-character-creator__field">
                <label htmlFor="character-ethnicity">Ethnicity (optional hint)</label>
                <select
                  id="character-ethnicity"
                  value={targetEthnicity}
                  onChange={(e) => setTargetEthnicity(e.target.value)}
                  title="Select character ethnicity"
                  className="w-full bg-gray-50 dark:bg-gray-800 border-transparent focus:border-blue-500 rounded-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="">Auto-detected</option>
                  <option value="caucasian">Caucasian / Western</option>
                  <option value="asian">Asian / Eastern</option>
                  <option value="african">African / Black</option>
                  <option value="hispanic">Hispanic / Latino</option>
                  <option value="middle_eastern">Middle Eastern</option>
                  <option value="south_asian">South Asian (Indian)</option>
                  <option value="native_american">Native American</option>
                  <option value="pacific_islander">Pacific Islander</option>
                </select>
              </div>
            </div>
            
            <div className="image-character-creator__field">
              <label htmlFor="character-context">Additional Context</label>
              <textarea
                id="character-context"
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
          
          {/* Selection Actions */}
          <div className="flex gap-4 mb-6">
            <button
              className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all font-semibold text-sm"
              onClick={() => {
                setResult(null);
                setActiveTab('upload');
              }}
            >
              Start Over
            </button>
            <button
              className="flex-1 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 transition-all font-bold text-sm flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                handleConfirmResult();
              }}
            >
              Confirm and Edit Character
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>

          <div className="h-px bg-gray-100 dark:bg-gray-800 mb-6" />
          
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="image-character-creator__field">
                  <label>Name:</label>
                  <input
                    type="text"
                    value={editableResult.name}
                    onChange={(e) => setEditableResult({ ...editableResult, name: e.target.value })}
                    placeholder="Character Name"
                    className="w-full bg-gray-50 dark:bg-gray-800 border-transparent focus:border-blue-500 rounded-xl"
                  />
                </div>
                
                <div className="image-character-creator__field">
                  <label>Archetype:</label>
                  <select
                    value={editableResult.role}
                    onChange={(e) => setEditableResult({ ...editableResult, role: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border-transparent focus:border-blue-500 rounded-xl"
                    title="Edit character archetype"
                  >
                    <option value="Protagonist">Protagonist</option>
                    <option value="Antagonist">Antagonist</option>
                    <option value="Mentor">Mentor</option>
                    <option value="Sidekick">Sidekick</option>
                    <option value="Love Interest">Love Interest</option>
                    <option value="Trickster">Trickster</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Herald">Herald</option>
                    <option value="Shapeshifter">Shapeshifter</option>
                  </select>
                </div>

                <div className="image-character-creator__field">
                  <label>Gender:</label>
                  <select
                    value={editableResult.gender}
                    onChange={(e) => setEditableResult({ ...editableResult, gender: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border-transparent focus:border-blue-500 rounded-xl"
                    title="Edit character gender"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="image-character-creator__field">
                  <label>Age Range:</label>
                  <select
                    value={editableResult.ageRange}
                    onChange={(e) => setEditableResult({ ...editableResult, ageRange: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border-transparent focus:border-blue-500 rounded-xl"
                    title="Edit character age range"
                  >
                    <option value="Child (0-12)">Child (0-12)</option>
                    <option value="Teenager (13-19)">Teenager (13-19)</option>
                    <option value="Young Adult (20-29)">Young Adult (20-29)</option>
                    <option value="Adult (30-49)">Adult (30-49)</option>
                    <option value="Middle-Aged (50-64)">Middle-Aged (50-64)</option>
                    <option value="Senior (65+)">Senior (65+)</option>
                  </select>
                </div>
              </div>
              
              {result.short_description && (
                <div className="image-character-creator__info-row mb-6">
                  <label>Initial Analysis:</label>
                  <p className="text-sm text-gray-500 italic p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                    {result.short_description}
                  </p>
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