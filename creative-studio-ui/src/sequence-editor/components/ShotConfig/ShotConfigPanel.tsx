/**
 * Shot Configuration Panel Component
 * 
 * Displays and edits configuration for the selected shot including:
 * - Reference images grid
 * - Inherited references from master/sequence
 * - Consistency indicators
 * - Prompt editor
 * - Generation parameters
 * - Apply/Revert buttons
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { useToast } from '@/hooks/use-toast';
import { updateShot } from '../../store/slices/timelineSlice';
import { ShotConfigDropTarget } from './ShotConfigDropTarget';
import { StyleControls } from './StyleControls';
import type { ReferenceImage, Shot } from '../../types';
import { referenceInheritanceService } from '../../../services/referenceInheritanceService';
import { consistencyEngine } from '../../../services/consistencyEngine';
import type { ConsistencyIssue, ConsistencyScore } from '../../../services/consistencyEngine';
import type { CharacterAppearanceSheet, LocationAppearanceSheet } from '../../../types/reference';
import { Image as ImageIcon, Video as VideoIcon, Volume2 as AudioIcon } from 'lucide-react';
import './shotConfigPanel.css';

// ============================================================================
// Types
// ============================================================================

interface ShotModifications {
  prompt?: string;
  referenceImages?: ReferenceImage[];
  seed?: number;
  denoising?: number;
  steps?: number;
  guidance?: number;
}

interface InheritedReference {
  id: string;
  name: string;
  type: 'character' | 'location' | 'style';
  source: 'master' | 'sequence';
  thumbnail?: string;
}

// ============================================================================
// Component
// ============================================================================

export const ShotConfigPanel: React.FC = () => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  // Redux state
  const { shots, selectedElements, sequences, currentSequenceId } = useAppSelector((state) => state.timeline);

  // Get selected shot
  const selectedShot = shots.find((shot: Shot) => selectedElements.includes(shot.id));

  // Local state
  const [modifications, setModifications] = useState<ShotModifications>({});
  const [hasModifications, setHasModifications] = useState(false);
  const [inheritedReferences, setInheritedReferences] = useState<InheritedReference[]>([]);
  const [consistencyIssues, setConsistencyIssues] = useState<ConsistencyIssue[]>([]);
  const [consistencyScore, setConsistencyScore] = useState<ConsistencyScore | null>(null);
  const [useInherited, setUseInherited] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  // State for conversion process
  const [isConverting, setIsConverting] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);

  // Handler to convert shot to puppet
  const handleConvertToPuppet = async () => {
    if (!selectedShot) return;
    setIsConverting(true);
    try {
      const response = await fetch('/api/rigging/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shotId: selectedShot.id,
          sheet: selectedShot.sheet,
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Conversion failed: ${errorText}`);
      }
      const data = await response.json();
      const rigPath = data?.rigPath;
      if (rigPath) {
        // Update the shot with the new rig
        // Update the shot with the new rig metadata returned from the backend
        const boneCount = data?.boneCount;
        const hash = data?.hash;
        dispatch(
          updateShot({
            id: selectedShot.id,
            updates: {
              rigPath,
              boneCount,
              hash,
            },
          })
        );
        toast({
          title: 'Rig generated',
          description: 'Rig successfully created and loaded.',
          variant: 'default',
        });
      } else {
        throw new Error('No rigPath returned from backend');
      }
    } catch (error) {
      console.error(error);
      toast({
        title: 'Conversion error',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsConverting(false);
    }
  };

  const handleGenerateImage = useCallback(async () => {
    if (!selectedShot) return;
    setIsGeneratingImage(true);
    try {
      // TODO: Implement actual API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast({ title: 'Image Generation', description: 'Reference image generation started.' });
      handleApply(); // Save changes first just in case
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to generate image', variant: 'destructive' });
    } finally {
      setIsGeneratingImage(false);
    }
  }, [selectedShot, toast]);

  const handleGenerateVideo = useCallback(async () => {
    if (!selectedShot) return;
    setIsGeneratingVideo(true);
    try {
      // TODO: Implement actual API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast({ title: 'Video Generation', description: 'Video generation started.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to generate video', variant: 'destructive' });
    } finally {
      setIsGeneratingVideo(false);
    }
  }, [selectedShot, toast]);

  const handleGenerateAudio = useCallback(async () => {
    if (!selectedShot) return;
    setIsGeneratingAudio(true);
    try {
      // TODO: Implement actual API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast({ title: 'Audio Generation', description: 'Audio generation started.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to generate audio', variant: 'destructive' });
    } finally {
      setIsGeneratingAudio(false);
    }
  }, [selectedShot, toast]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load inherited references when shot changes
  useEffect(() => {
    if (selectedShot && currentSequenceId) {
      loadInheritedReferences();
      loadConsistencyInfo();
    }
  }, [selectedShot?.id, currentSequenceId]);

  // Load inherited references
  const loadInheritedReferences = async () => {
    if (!selectedShot) return;

    setIsLoading(true);
    try {
      const result = await referenceInheritanceService.getInheritedReferencesForShot(selectedShot.id);

      const refs: InheritedReference[] = [];

      // Add master references
      for (const item of result.fromMaster) {
        if ('characterName' in item) {
          const charSheet = item as CharacterAppearanceSheet;
          refs.push({
            id: charSheet.id,
            name: charSheet.characterName,
            type: 'character',
            source: 'master',
            thumbnail: charSheet.appearanceImages[0]?.url,
          });
        } else if ('locationName' in item) {
          const locSheet = item as LocationAppearanceSheet;
          refs.push({
            id: locSheet.id,
            name: locSheet.locationName,
            type: 'location',
            source: 'master',
            thumbnail: locSheet.referenceImages[0]?.url,
          });
        }
      }

      // Add sequence references
      if (result.fromSequence) {
        refs.push({
          id: result.fromSequence.id,
          name: `Sequence Style`,
          type: 'style',
          source: 'sequence',
        });
      }

      setInheritedReferences(refs);
    } catch (error) {
      console.error('Failed to load inherited references:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load consistency info
  const loadConsistencyInfo = async () => {
    if (!selectedShot) return;

    try {
      const characterIssues = consistencyEngine.validateCharacterConsistency(selectedShot.id);
      const locationIssues = consistencyEngine.validateLocationConsistency(selectedShot.id);
      const styleIssues = consistencyEngine.validateStyleConsistency(selectedShot.id);
      const issues = [...characterIssues, ...locationIssues, ...styleIssues];
      setConsistencyIssues(issues);

      // Calculate overall score
      if (issues.length === 0) {
        setConsistencyScore({
          overallScore: 100,
          characterScore: 100,
          styleScore: 100,
          colorScore: 100,
          compositionScore: 100,
        });
      } else {
        const avgScore = 100 - (issues.reduce((sum: number, i: ConsistencyIssue) => {
          const severityMap: Record<string, number> = { critical: 30, high: 20, medium: 10, low: 5 };
          return sum + (severityMap[i.severity] || 0);
        }, 0) / Math.max(issues.length, 1));

        setConsistencyScore({
          overallScore: Math.max(0, avgScore),
          characterScore: avgScore,
          styleScore: avgScore,
          colorScore: avgScore,
          compositionScore: avgScore,
        });
      }
    } catch (error) {
      console.error('Failed to load consistency info:', error);
    }
  };

  // Apply inherited references
  const handleApplyInherited = useCallback(() => {
    if (!selectedShot || inheritedReferences.length === 0) return;

    // Convert inherited references to reference images
    const inheritedImages: ReferenceImage[] = inheritedReferences
      .filter(ref => ref.thumbnail)
      .map(ref => ({
        id: `inherited-${ref.id}`,
        url: ref.thumbnail!,
        weight: 1.0,
        source: 'library' as const,
      }));

    setModifications((prev) => ({
      ...prev,
      referenceImages: [...(prev.referenceImages || []), ...inheritedImages],
    }));
    setHasModifications(true);
  }, [selectedShot, inheritedReferences]);

  // Initialize modifications when shot changes
  useEffect(() => {
    if (selectedShot) {
      setModifications({
        prompt: selectedShot.prompt,
        referenceImages: selectedShot.referenceImages || [],
        seed: selectedShot.parameters.seed,
        denoising: selectedShot.parameters.denoising,
        steps: selectedShot.parameters.steps,
        guidance: selectedShot.parameters.guidance,
      });
      setHasModifications(false);
    }
  }, [selectedShot?.id, selectedShot?.prompt, selectedShot?.referenceImages]);

  // Handle prompt change
  const handlePromptChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newPrompt = e.target.value;
    setModifications((prev) => ({ ...prev, prompt: newPrompt }));
    setHasModifications(true);
  }, []);

  // Handle parameter change
  const handleParameterChange = useCallback((
    param: 'seed' | 'denoising' | 'steps' | 'guidance',
    value: number
  ) => {
    setModifications((prev) => ({ ...prev, [param]: value }));
    setHasModifications(true);
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages: ReferenceImage[] = [];

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        newImages.push({
          id: `uploaded-${Date.now()}-${Math.random()}`,
          url,
          weight: 1.0,
          source: 'upload',
        });

        if (newImages.length === files.length) {
          setModifications((prev) => ({
            ...prev,
            referenceImages: [...(prev.referenceImages || []), ...newImages],
          }));
          setHasModifications(true);
        }
      };
      reader.readAsDataURL(file);
    });
  }, []);

  // Handle remove reference image
  const handleRemoveImage = useCallback((imageId: string) => {
    setModifications((prev) => ({
      ...prev,
      referenceImages: (prev.referenceImages || []).filter((img) => img.id !== imageId),
    }));
    setHasModifications(true);
  }, []);

  // Handle apply changes
  const handleApply = useCallback(() => {
    if (!selectedShot) return;

    dispatch(updateShot({
      id: selectedShot.id,
      updates: {
        prompt: modifications.prompt,
        referenceImages: modifications.referenceImages,
        parameters: {
          ...selectedShot.parameters,
          seed: modifications.seed ?? selectedShot.parameters.seed,
          denoising: modifications.denoising ?? selectedShot.parameters.denoising,
          steps: modifications.steps ?? selectedShot.parameters.steps,
          guidance: modifications.guidance ?? selectedShot.parameters.guidance,
        },
      },
    }));

    setHasModifications(false);
  }, [selectedShot, modifications, dispatch]);

  // Handle revert changes
  const handleRevert = useCallback(() => {
    if (!selectedShot) return;

    setModifications({
      prompt: selectedShot.prompt,
      referenceImages: selectedShot.referenceImages || [],
      seed: selectedShot.parameters.seed,
      denoising: selectedShot.parameters.denoising,
      steps: selectedShot.parameters.steps,
      guidance: selectedShot.parameters.guidance,
    });

    setHasModifications(false);
  }, [selectedShot]);

  // Handle drag over for file drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Handle drop for file upload
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    // Simulate file input change
    const input = fileInputRef.current;
    if (input) {
      const dataTransfer = new DataTransfer();
      Array.from(files).forEach((file) => dataTransfer.items.add(file));
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, []);

  // Get source label
  const getSourceLabel = (source: 'master' | 'sequence') => {
    return source === 'master' ? 'Master' : 'Sequence';
  };

  // Get consistency badge class
  const getConsistencyBadgeClass = (score: number) => {
    if (score >= 80) return 'consistency-good';
    if (score >= 60) return 'consistency-warning';
    return 'consistency-bad';
  };

  if (!selectedShot) {
    return (
      <ShotConfigDropTarget shot={null}>
        <div className="shot-config-panel empty">
          <div className="empty-state">
            <div className="empty-icon">🎬</div>
            <h3>No Shot Selected</h3>
            <p>Select a shot from the timeline to edit its configuration</p>
          </div>
        </div>
      </ShotConfigDropTarget>
    );
  }

  const referenceImages = modifications.referenceImages || [];
  const promptLength = modifications.prompt?.length || 0;

  return (
    <ShotConfigDropTarget shot={selectedShot}>
      <div className="shot-config-panel">
        {/* Header */}
        <div className="shot-config-header">
          <h3 className="shot-name">{selectedShot.name}</h3>
          {hasModifications && (
            <span className="modified-indicator" title="Unsaved changes">●</span>
          )}
        </div>

        {/* Inherited References Section */}
        {inheritedReferences.length > 0 && (
          <div className="config-section inherited-references-section">
            <div className="section-header">
              <h4 className="section-title">Inherited References</h4>
              <label className="toggle-inherited">
                <input
                  type="checkbox"
                  checked={useInherited}
                  onChange={(e) => setUseInherited(e.target.checked)}
                />
                Use Inherited
              </label>
            </div>

            <div className="inherited-references-grid">
              {inheritedReferences.map((ref) => (
                <div key={ref.id} className="inherited-reference-item">
                  {ref.thumbnail ? (
                    <img src={ref.thumbnail} alt={ref.name} className="inherited-thumbnail" />
                  ) : (
                    <div className="inherited-thumbnail placeholder">
                      {ref.type[0].toUpperCase()}
                    </div>
                  )}
                  <div className="inherited-info">
                    <span className="inherited-name">{ref.name}</span>
                    <span className={`inherited-source source-${ref.source}`}>
                      {getSourceLabel(ref.source)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {useInherited && (
              <button
                className="apply-inherited-btn"
                onClick={handleApplyInherited}
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Apply Inherited References'}
              </button>
            )}
          </div>
        )}

        {/* Consistency Indicators */}
        {consistencyScore && (
          <div className="config-section consistency-section">
            <h4 className="section-title">Consistency</h4>

            <div className="consistency-score">
              <div className={`consistency-badge ${getConsistencyBadgeClass(consistencyScore.overallScore)}`}>
                {consistencyScore.overallScore}%
              </div>
              <span className="consistency-label">Overall Score</span>
            </div>

            <div className="consistency-breakdown">
              <div className="consistency-item">
                <span>Character</span>
                <div className="consistency-bar">
                  <div
                    className={`consistency-fill ${getConsistencyBadgeClass(consistencyScore.characterScore)}`}
                    style={{ width: `${consistencyScore.characterScore}%` }}
                  />
                </div>
              </div>
              <div className="consistency-item">
                <span>Style</span>
                <div className="consistency-bar">
                  <div
                    className={`consistency-fill ${getConsistencyBadgeClass(consistencyScore.styleScore)}`}
                    style={{ width: `${consistencyScore.styleScore}%` }}
                  />
                </div>
              </div>
              <div className="consistency-item">
                <span>Color</span>
                <div className="consistency-bar">
                  <div
                    className={`consistency-fill ${getConsistencyBadgeClass(consistencyScore.colorScore)}`}
                    style={{ width: `${consistencyScore.colorScore}%` }}
                  />
                </div>
              </div>
              <div className="consistency-item">
                <span>Composition</span>
                <div className="consistency-bar">
                  <div
                    className={`consistency-fill ${getConsistencyBadgeClass(consistencyScore.compositionScore)}`}
                    style={{ width: `${consistencyScore.compositionScore}%` }}
                  />
                </div>
              </div>
            </div>

            {consistencyIssues.length > 0 && (
              <div className="consistency-issues">
                <h5>Issues ({consistencyIssues.length})</h5>
                <ul className="issues-list">
                  {consistencyIssues.slice(0, 3).map((issue) => (
                    <li key={issue.id} className={`issue-item severity-${issue.severity}`}>
                      <div className="issue-content">
                        <span className="issue-type">{issue.type}</span>
                        <span className="issue-description">{issue.description}</span>
                      </div>
                    </li>
                  ))}
                </ul>
                {consistencyIssues.length > 3 && (
                  <p className="more-issues">+{consistencyIssues.length - 3} more issues</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Reference Images Grid */}
        <div className="config-section">
          <h4 className="section-title">Reference Images</h4>

          <div
            className="reference-images-grid"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {referenceImages.map((image) => (
              <div key={image.id} className="reference-image-item">
                <img src={image.url} alt={`Reference ${image.id}`} className="reference-image" />
                <button
                  className="remove-image-btn"
                  onClick={() => handleRemoveImage(image.id)}
                  title="Remove image"
                >
                  ×
                </button>
                <div className="image-type-badge">{image.source}</div>
              </div>
            ))}

            {/* Upload Button */}
            <div
              className="upload-image-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="upload-icon">+</div>
              <div className="upload-text">Add Image</div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            aria-label="Upload reference images"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />

          <p className="section-hint">
            Drag and drop images here or click to upload
          </p>
        </div>

        {/* Prompt Editor */}
        <div className="config-section">
          <div className="section-header">
            <h4 className="section-title">Prompt</h4>
            <span className="char-count">{promptLength} characters</span>
          </div>

          <textarea
            className="prompt-editor"
            value={modifications.prompt || ''}
            onChange={handlePromptChange}
            placeholder="Describe the shot in detail..."
            rows={6}
          />
        </div>

        {/* Visual Style Controls */}
        <StyleControls shot={selectedShot} />

        {/* Generation Parameters */}
        <div className="config-section">
          <h4 className="section-title">Generation Parameters</h4>

          <div className="parameters-grid">
            {/* Seed */}
            <div className="parameter-control">
              <label htmlFor="seed-input">
                Seed
                <span className="param-hint" title="Random seed for reproducibility">ⓘ</span>
              </label>
              <input
                id="seed-input"
                type="number"
                value={modifications.seed || 0}
                onChange={(e) => handleParameterChange('seed', parseInt(e.target.value))}
                min={0}
                max={999999}
              />
            </div>

            {/* Denoising */}
            <div className="parameter-control">
              <label htmlFor="denoising-input">
                Denoising
                <span className="param-hint" title="Strength of denoising (0.0-1.0)">ⓘ</span>
              </label>
              <input
                id="denoising-input"
                type="number"
                value={modifications.denoising || 0.75}
                onChange={(e) => handleParameterChange('denoising', parseFloat(e.target.value))}
                min={0}
                max={1}
                step={0.05}
              />
            </div>

            {/* Steps */}
            <div className="parameter-control">
              <label htmlFor="steps-input">
                Steps
                <span className="param-hint" title="Number of diffusion steps (10-100)">ⓘ</span>
              </label>
              <input
                id="steps-input"
                type="number"
                value={modifications.steps || 30}
                onChange={(e) => handleParameterChange('steps', parseInt(e.target.value))}
                min={10}
                max={100}
              />
            </div>

            {/* Guidance */}
            <div className="parameter-control">
              <label htmlFor="guidance-input">
                Guidance
                <span className="param-hint" title="Classifier-free guidance scale (1-20)">ⓘ</span>
              </label>
              <input
                id="guidance-input"
                type="number"
                value={modifications.guidance || 7.5}
                onChange={(e) => handleParameterChange('guidance', parseFloat(e.target.value))}
                min={1}
                max={20}
                step={0.5}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="config-actions">
          <div className="generation-actions" style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #333', paddingBottom: '16px', width: '100%' }}>
            <button
              className="action-btn"
              onClick={handleGenerateImage}
              disabled={isGeneratingImage}
              title="Generate Reference Image"
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '8px', background: '#252530', border: '1px solid #333', borderRadius: '4px', cursor: 'pointer' }}
            >
              <ImageIcon size={16} />
              <span style={{ fontSize: '10px' }}>Image</span>
            </button>
            <button
              className="action-btn"
              onClick={handleGenerateVideo}
              disabled={isGeneratingVideo}
              title="Generate Video"
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '8px', background: '#252530', border: '1px solid #333', borderRadius: '4px', cursor: 'pointer' }}
            >
              <VideoIcon size={16} />
              <span style={{ fontSize: '10px' }}>Video</span>
            </button>
            <button
              className="action-btn"
              onClick={handleGenerateAudio}
              disabled={isGeneratingAudio}
              title="Generate Audio"
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '8px', background: '#252530', border: '1px solid #333', borderRadius: '4px', cursor: 'pointer' }}
            >
              <AudioIcon size={16} />
              <span style={{ fontSize: '10px' }}>Audio</span>
            </button>
          </div>
          {/* New button to convert shot to puppet */}
          <button
            className="convert-puppet-btn"
            onClick={handleConvertToPuppet}
            disabled={isConverting}
            title="Convertir en marionnette"
          >
            {isConverting ? 'Conversion...' : 'Convertir en marionnette'}
          </button>
          <button
            className="revert-btn"
            onClick={handleRevert}
            disabled={!hasModifications}
          >
            Revert
          </button>
          <button
            className="apply-btn"
            onClick={handleApply}
            disabled={!hasModifications}
          >
            Apply Changes
          </button>
        </div>
      </div>
    </ShotConfigDropTarget>
  );
};

export default ShotConfigPanel;
