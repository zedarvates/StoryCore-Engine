/**
 * StyleTransferPanel Component
 * 
 * UI component for extracting and applying visual styles between shots.
 * Allows users to:
 * - Extract style features from a source shot
 * - Apply style to target shot(s) or sequence
 * - Manage style presets
 * - Compare styles side-by-side
 * 
 * Features:
 * - Style extraction panel with feature display
 * - Style application panel with options
 * - Style presets browser
 * - Side-by-side style comparison
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Palette,
  Zap,
  Save,
  Trash2,
  Eye,
  Sliders,
  Image,
  Layers,
  Sparkles,
  ArrowRight,
  Check,
  X,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppStore } from '@/stores/useAppStore';
import { styleTransferService } from '@/services/styleTransferService';
import type {
  StyleFeatures,
  StyleTransferOptions,
  StylePreset,
  StyleDifference,
} from '@/services/styleTransferService';
import { cn } from '@/lib/utils';
import './StyleTransferPanel.css';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for StyleTransferPanel component
 */
export interface StyleTransferPanelProps {
  currentSequenceId: string;
  selectedShotId?: string;
  onStyleApplied: () => void;
  onClose: () => void;
}

/**
 * Style source type
 */
type StyleSource = 'shot' | 'preset';

/**
 * Target type for style application
 */
type TargetType = 'single' | 'sequence';

/**
 * State for extracted style
 */
interface ExtractedStyleState {
  shotId: string | null;
  features: StyleFeatures | null;
  isLoading: boolean;
}

/**
 * State for preset management
 */
interface PresetManagementState {
  isCreating: boolean;
  newPresetName: string;
  deletingPresetId: string | null;
}

// ============================================================================
// Utility Components
// ============================================================================

/**
 * Color palette display component
 */
function ColorPaletteDisplay({ colors }: { colors: string[] }) {
  return (
    <div className="color-palette">
      {colors.slice(0, 6).map((color, index) => (
        <div
          key={index}
          className="color-swatch"
          style={{ backgroundColor: color }}
          title={color}
        />
      ))}
    </div>
  );
}

/**
 * Style feature badge component
 */
function StyleFeatureBadge({ 
  icon: Icon, 
  label, 
  value,
  color 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string;
  color?: string;
}) {
  return (
    <div className="style-feature-badge" style={color ? { borderColor: color } : {}}>
      <Icon className="feature-icon w-4 h-4" />
      <div className="feature-info">
        <span className="feature-label">{label}</span>
        <span className="feature-value">{value}</span>
      </div>
    </div>
  );
}

/**
 * Similarity score display component
 */
function SimilarityScore({ score }: { score: number }) {
  const percentage = Math.round(score * 100);
  const color = percentage >= 80 ? 'text-green-500' : 
                percentage >= 60 ? 'text-yellow-500' : 
                'text-red-500';
  
  return (
    <div className="similarity-score">
      <Progress value={percentage} className="similarity-progress" />
      <span className={cn('similarity-value', color)}>{percentage}%</span>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function StyleTransferPanel({
  currentSequenceId,
  selectedShotId,
  onStyleApplied,
  onClose,
}: StyleTransferPanelProps) {
  // Store state
  const project = useAppStore((state) => state.project);
  const shots = useAppStore((state) => state.shots);
  
  // =========================================================================
  // Local State - Source Panel
  // =========================================================================
  
  const [sourceShotId, setSourceShotId] = useState<string>(selectedShotId || '');
  const [extractedStyle, setExtractedStyle] = useState<ExtractedStyleState>({
    shotId: null,
    features: null,
    isLoading: false,
  });
  
  // =========================================================================
  // Local State - Application Panel
  // =========================================================================
  
  const [targetType, setTargetType] = useState<TargetType>('single');
  const [targetShotIds, setTargetShotIds] = useState<string[]>([]);
  const [styleSource, setStyleSource] = useState<StyleSource>('shot');
  const [sourcePresetId, setSourcePresetId] = useState<string>('');
  const [transferOptions, setTransferOptions] = useState<StyleTransferOptions>({
    preserveContent: true,
    intensity: 0.8,
    blendWithOriginal: false,
  });
  const [isApplying, setIsApplying] = useState(false);
  
  // =========================================================================
  // Local State - Presets
  // =========================================================================
  
  const [presets, setPresets] = useState<StylePreset[]>([]);
  const [presetManagement, setPresetManagement] = useState<PresetManagementState>({
    isCreating: false,
    newPresetName: '',
    deletingPresetId: null,
  });
  
  // =========================================================================
  // Local State - Comparison
  // =========================================================================
  
  const [compareShotId, setCompareShotId] = useState<string>('');
  const [comparisonResult, setComparisonResult] = useState<StyleDifference | null>(null);
  const [targetStyleFeatures, setTargetStyleFeatures] = useState<StyleFeatures | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  
  // =========================================================================
  // Data Loading
  // =========================================================================
  
  /**
   * Load presets from service
   */
  const loadPresets = useCallback(() => {
    const allPresets = styleTransferService.getStylePresets();
    setPresets(allPresets);
  }, []);
  
  useEffect(() => {
    loadPresets();
  }, [loadPresets]);
  
  /**
   * Extract style from source shot
   */
  const extractStyle = useCallback(async (shotId: string) => {
    if (!shotId) return;
    
    setExtractedStyle(prev => ({ ...prev, isLoading: true }));
    
    try {
      const features = styleTransferService.extractStyleFeatures(shotId);
      setExtractedStyle({
        shotId,
        features,
        isLoading: false,
      });
    } catch (error) {
      console.error('[StyleTransferPanel] Error extracting style:', error);
      setExtractedStyle(prev => ({ ...prev, isLoading: false }));
    }
  }, []);
  
  /**
   * Handle source shot selection change
   */
  const handleSourceShotChange = useCallback((shotId: string) => {
    setSourceShotId(shotId);
    if (shotId) {
      extractStyle(shotId);
    } else {
      setExtractedStyle({ shotId: null, features: null, isLoading: false });
    }
  }, [extractStyle]);
  
  // =========================================================================
  // Style Application
  // =========================================================================
  
  /**
   * Apply style to target
   */
  const applyStyle = useCallback(async () => {
    setIsApplying(true);
    
    try {
      if (styleSource === 'shot' && sourceShotId) {
        if (targetType === 'single') {
          for (const shotId of targetShotIds) {
            styleTransferService.applyStyleToShot(sourceShotId, shotId, transferOptions);
          }
        } else {
          styleTransferService.applyStyleToSequence(
            sourceShotId,
            currentSequenceId,
            transferOptions
          );
        }
      } else if (styleSource === 'preset' && sourcePresetId) {
        if (targetType === 'single') {
          for (const shotId of targetShotIds) {
            styleTransferService.applyPreset(sourcePresetId, shotId);
          }
        } else {
          // Apply preset to first available shot
          const firstShot = shots.find(s => s.id === targetShotIds[0]);
          if (firstShot) {
            styleTransferService.applyPreset(sourcePresetId, firstShot.id);
          }
        }
      }
      
      onStyleApplied();
    } catch (error) {
      console.error('[StyleTransferPanel] Error applying style:', error);
    } finally {
      setIsApplying(false);
    }
  }, [
    styleSource, sourceShotId, sourcePresetId, targetType, targetShotIds,
    transferOptions, currentSequenceId, shots, onStyleApplied,
  ]);
  
  /**
   * Add target shot
   */
  const addTargetShot = useCallback((shotId: string) => {
    if (shotId && !targetShotIds.includes(shotId)) {
      setTargetShotIds(prev => [...prev, shotId]);
    }
  }, [targetShotIds]);
  
  /**
   * Remove target shot
   */
  const removeTargetShot = useCallback((shotId: string) => {
    setTargetShotIds(prev => prev.filter(id => id !== shotId));
  }, []);
  
  // =========================================================================
  // Preset Management
  // =========================================================================
  
  /**
   * Save extracted style as preset
   */
  const saveAsPreset = useCallback(() => {
    if (!extractedStyle.features || !presetManagement.newPresetName) return;
    
    const preset = styleTransferService.createStylePreset(
      presetManagement.newPresetName,
      extractedStyle.features
    );
    
    setPresets(prev => [...prev, preset]);
    setPresetManagement({ isCreating: false, newPresetName: '', deletingPresetId: null });
  }, [extractedStyle.features, presetManagement.newPresetName]);
  
  /**
   * Delete a preset
   */
  const deletePreset = useCallback((presetId: string) => {
    styleTransferService.deletePreset(presetId);
    setPresets(prev => prev.filter(p => p.id !== presetId));
    setPresetManagement(prev => ({ ...prev, deletingPresetId: null }));
  }, []);
  
  /**
   * Apply preset to current shot
   */
  const applyPresetToShot = useCallback((preset: StylePreset) => {
    if (!selectedShotId) return;
    
    styleTransferService.applyPreset(preset.id, selectedShotId);
    onStyleApplied();
  }, [selectedShotId, onStyleApplied]);
  
  // =========================================================================
  // Style Comparison
  // =========================================================================
  
  /**
   * Compare styles
   */
  const compareStyles = useCallback(() => {
    if (!extractedStyle.features || !compareShotId) return;
    
    const targetFeatures = styleTransferService.extractStyleFeatures(compareShotId);
    const comparison = styleTransferService.compareStyles(
      extractedStyle.features,
      targetFeatures
    );
    
    setTargetStyleFeatures(targetFeatures);
    setComparisonResult(comparison);
    setShowComparison(true);
  }, [extractedStyle.features, compareShotId]);
  
  // =========================================================================
  // Render Helpers
  // =========================================================================
  
  /**
   * Get shot name by ID
   */
  const getShotName = useCallback((shotId: string) => {
    const shot = shots.find(s => s.id === shotId);
    return shot?.title || `Shot ${(shot?.position ?? 0) + 1}`;
  }, [shots]);
  
  // =========================================================================
  // Render
  // =========================================================================
  
  const filteredPresets = presets.filter(p => {
    if (presetManagement.newPresetName) {
      return p.name.toLowerCase().includes(presetManagement.newPresetName.toLowerCase());
    }
    return true;
  });
  
  // All shots for dropdowns
  const allShots = shots;
  
  return (
    <div className="style-transfer-panel">
      <div className="panel-header">
        <div className="header-title">
          <Sparkles className="header-icon w-5 h-5" />
          <h2>Style Transfer</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      <Tabs defaultValue="transfer" className="panel-tabs">
        <TabsList className="tabs-list">
          <TabsTrigger value="transfer" className="tab-trigger">
            <Zap className="w-4 h-4 mr-2" />
            Transfer
          </TabsTrigger>
          <TabsTrigger value="presets" className="tab-trigger">
            <Palette className="w-4 h-4 mr-2" />
            Presets
          </TabsTrigger>
          <TabsTrigger value="compare" className="tab-trigger">
            <Layers className="w-4 h-4 mr-2" />
            Compare
          </TabsTrigger>
        </TabsList>
        
        {/* Transfer Tab */}
        <TabsContent value="transfer" className="tab-content">
          <div className="transfer-columns">
            {/* Source Column */}
            <div className="transfer-column source-column">
              <h3 className="column-title">
                <Image className="w-4 h-4" />
                Extract from Shot
              </h3>
              
              <div className="column-content">
                {/* Source Shot Selection */}
                <div className="shot-selector">
                  <Label>Source Shot</Label>
                  <Select value={sourceShotId} onValueChange={handleSourceShotChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a shot" />
                    </SelectTrigger>
                    <SelectContent>
                      {allShots.map(shot => (
                        <SelectItem key={shot.id} value={shot.id}>
                          {shot.title || `Shot ${(shot.position ?? 0) + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Extracted Style Display */}
                {extractedStyle.isLoading ? (
                  <div className="style-preview loading">
                    <div className="loading-spinner" />
                    <span>Extracting style...</span>
                  </div>
                ) : extractedStyle.features ? (
                  <div className="style-preview">
                    <div className="preview-section">
                      <Label>Color Palette</Label>
                      <ColorPaletteDisplay colors={extractedStyle.features.colorPalette} />
                    </div>
                    
                    <div className="preview-section">
                      <Label>Style Features</Label>
                      <div className="feature-badges">
                        <StyleFeatureBadge
                          icon={Zap}
                          label="Lighting"
                          value={extractedStyle.features.lightingStyle}
                        />
                        <StyleFeatureBadge
                          icon={Layers}
                          label="Composition"
                          value={extractedStyle.features.compositionStyle}
                        />
                        <StyleFeatureBadge
                          icon={Palette}
                          label="Art Style"
                          value={extractedStyle.features.artStyle}
                        />
                        <StyleFeatureBadge
                          icon={Eye}
                          label="Mood"
                          value={extractedStyle.features.mood}
                        />
                      </div>
                    </div>
                    
                    <div className="preview-section">
                      <Label>Attributes</Label>
                      <div className="attribute-badges">
                        <Badge variant="outline">
                          Contrast: {extractedStyle.features.contrast}
                        </Badge>
                        <Badge variant="outline">
                          Saturation: {extractedStyle.features.saturation}
                        </Badge>
                        <Badge variant="outline">
                          Temperature: {extractedStyle.features.temperature}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Save as Preset */}
                    <div className="preset-actions">
                      {presetManagement.isCreating ? (
                        <div className="create-preset-form">
                          <Input
                            placeholder="Preset name"
                            value={presetManagement.newPresetName}
                            onChange={(e) => setPresetManagement(prev => ({
                              ...prev,
                              newPresetName: e.target.value
                            }))}
                            className="preset-name-input"
                          />
                          <div className="preset-form-actions">
                            <Button
                              size="sm"
                              onClick={saveAsPreset}
                              disabled={!presetManagement.newPresetName}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setPresetManagement(prev => ({
                                ...prev,
                                isCreating: false,
                                newPresetName: ''
                              }))}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPresetManagement(prev => ({
                            ...prev,
                            isCreating: true
                          }))}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Save as Preset
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="style-preview empty">
                    <Palette className="empty-icon w-8 h-8" />
                    <span>Select a shot to extract style</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Arrow */}
            <div className="transfer-arrow">
              <ArrowRight className="w-6 h-6" />
            </div>
            
            {/* Target Column */}
            <div className="transfer-column target-column">
              <h3 className="column-title">
                <Target className="w-4 h-4" />
                Apply to Shot
              </h3>
              
              <div className="column-content">
                {/* Target Type Selection */}
                <div className="target-type-selector">
                  <Label>Target</Label>
                  <Select
                    value={targetType}
                    onValueChange={(v) => setTargetType(v as TargetType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single Shot</SelectItem>
                      <SelectItem value="sequence">Entire Sequence</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Target Shot Selection (for single mode) */}
                {targetType === 'single' && (
                  <div className="target-shot-selector">
                    <Label>Target Shot(s)</Label>
                    <Select
                      value=""
                      onValueChange={addTargetShot}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Add target shot" />
                      </SelectTrigger>
                      <SelectContent>
                        {allShots
                          .filter(s => s.id !== sourceShotId)
                          .filter(s => !targetShotIds.includes(s.id))
                          .map(shot => (
                            <SelectItem key={shot.id} value={shot.id}>
                              {shot.title || `Shot ${(shot.position ?? 0) + 1}`}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    
                    {/* Selected Targets */}
                    {targetShotIds.length > 0 && (
                      <div className="selected-targets">
                        {targetShotIds.map(shotId => (
                          <Badge key={shotId} variant="secondary" className="target-badge">
                            {getShotName(shotId)}
                            <button
                              className="remove-target"
                              onClick={() => removeTargetShot(shotId)}
                              aria-label={`Remove ${getShotName(shotId)}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Style Source Selection */}
                <div className="style-source-selector">
                  <Label>Style Source</Label>
                  <Select
                    value={styleSource}
                    onValueChange={(v) => setStyleSource(v as StyleSource)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shot">From Shot</SelectItem>
                      <SelectItem value="preset">From Preset</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Preset Selection */}
                {styleSource === 'preset' && (
                  <div className="preset-selector">
                    <Label>Select Preset</Label>
                    <Select
                      value={sourcePresetId}
                      onValueChange={setSourcePresetId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a preset" />
                      </SelectTrigger>
                      <SelectContent>
                        {presets.map(preset => (
                          <SelectItem key={preset.id} value={preset.id}>
                            {preset.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {/* Transfer Options */}
                <div className="transfer-options">
                  <Label>Transfer Options</Label>
                  
                  <div className="option-slider">
                    <div className="slider-header">
                      <span>Intensity</span>
                      <span className="slider-value">{Math.round(transferOptions.intensity * 100)}%</span>
                    </div>
                    <Slider
                      value={[transferOptions.intensity]}
                      onValueChange={([value]) => setTransferOptions(prev => ({
                        ...prev,
                        intensity: value
                      }))}
                      min={0}
                      max={1}
                      step={0.1}
                    />
                  </div>
                  
                  <div className="option-toggle">
                    <Label>Preserve Content</Label>
                    <Button
                      variant={transferOptions.preserveContent ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTransferOptions(prev => ({
                        ...prev,
                        preserveContent: !prev.preserveContent
                      }))}
                    >
                      {transferOptions.preserveContent ? (
                        <>
                          <Check className="w-4 h-4 mr-1" /> On
                        </>
                      ) : (
                        <>
                          <X className="w-4 h-4 mr-1" /> Off
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <div className="option-toggle">
                    <Label>Blend with Original</Label>
                    <Button
                      variant={transferOptions.blendWithOriginal ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTransferOptions(prev => ({
                        ...prev,
                        blendWithOriginal: !prev.blendWithOriginal
                      }))}
                    >
                      {transferOptions.blendWithOriginal ? (
                        <>
                          <Check className="w-4 h-4 mr-1" /> On
                        </>
                      ) : (
                        <>
                          <X className="w-4 h-4 mr-1" /> Off
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                
                {/* Apply Button */}
                <Button
                  className="apply-button"
                  onClick={applyStyle}
                  disabled={
                    isApplying ||
                    (styleSource === 'shot' && !sourceShotId) ||
                    (styleSource === 'preset' && !sourcePresetId) ||
                    (targetType === 'single' && targetShotIds.length === 0)
                  }
                >
                  {isApplying ? (
                    <>
                      <div className="loading-spinner w-4 h-4 mr-2" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Apply Style
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
        
        {/* Presets Tab */}
        <TabsContent value="presets" className="tab-content">
          <div className="presets-browser">
            <div className="presets-header">
              <Input
                placeholder="Search presets..."
                value={presetManagement.newPresetName}
                onChange={(e) => setPresetManagement(prev => ({
                  ...prev,
                  newPresetName: e.target.value
                }))}
                className="preset-search"
              />
              <Badge variant="outline">
                {filteredPresets.length} preset{filteredPresets.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            
            <ScrollArea className="presets-grid-scroll">
              <div className="presets-grid">
                {filteredPresets.length === 0 ? (
                  <div className="presets-empty">
                    <Palette className="empty-icon w-8 h-8" />
                    <span>No presets saved</span>
                    <span className="empty-hint">Extract a style and save it to create a preset</span>
                  </div>
                ) : (
                  filteredPresets.map(preset => (
                    <div
                      key={preset.id}
                      className={cn(
                        'preset-card',
                        presetManagement.deletingPresetId === preset.id && 'deleting'
                      )}
                    >
                      {/* Preset Thumbnail */}
                      <div 
                        className="preset-thumbnail"
                        style={{
                          background: preset.thumbnail 
                            ? `url(${preset.thumbnail})` 
                            : `linear-gradient(135deg, ${preset.style.colorPalette[0] || '#6366f1'}, ${preset.style.colorPalette[1] || '#8b5cf6'})`
                        }}
                      >
                        <div className="preset-overlay">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => applyPresetToShot(preset)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Apply
                          </Button>
                        </div>
                      </div>
                      
                      {/* Preset Info */}
                      <div className="preset-info">
                        <h4 className="preset-name">{preset.name}</h4>
                        <div className="preset-meta">
                          <span className="preset-date">
                            {new Date(preset.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        
                        {/* Style Preview */}
                        <div className="preset-style-preview">
                          <ColorPaletteDisplay colors={preset.style.colorPalette.slice(0, 5)} />
                        </div>
                        
                        {/* Preset Actions */}
                        <div className="preset-card-actions">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="delete-btn"
                            onClick={() => setPresetManagement(prev => ({
                              ...prev,
                              deletingPresetId: preset.id
                            }))}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Delete Confirmation */}
                      {presetManagement.deletingPresetId === preset.id && (
                        <div className="delete-confirmation">
                          <span>Delete preset?</span>
                          <div className="delete-actions">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deletePreset(preset.id)}
                            >
                              Delete
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setPresetManagement(prev => ({
                                ...prev,
                                deletingPresetId: null
                              }))}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>
        
        {/* Compare Tab */}
        <TabsContent value="compare" className="tab-content">
          <div className="comparison-view">
            <div className="comparison-controls">
              <div className="comparison-select">
                <Label>Source Style</Label>
                <div className="source-indicator">
                  {extractedStyle.features ? (
                    <Badge variant="default">
                      {sourceShotId ? getShotName(sourceShotId) : 'Extracted'}
                    </Badge>
                  ) : (
                    <Badge variant="outline">None</Badge>
                  )}
                </div>
              </div>
              
              <ArrowRight className="comparison-arrow w-5 h-5" />
              
              <div className="comparison-select">
                <Label>Compare with</Label>
                <Select
                  value={compareShotId}
                  onValueChange={setCompareShotId}
                >
                  <SelectTrigger className="compare-select-trigger">
                    <SelectValue placeholder="Select shot to compare" />
                  </SelectTrigger>
                  <SelectContent>
                    {allShots
                      .filter(s => s.id !== sourceShotId)
                      .map(shot => (
                        <SelectItem key={shot.id} value={shot.id}>
                          {shot.title || `Shot ${(shot.position ?? 0) + 1}`}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button
                onClick={compareStyles}
                disabled={!extractedStyle.features || !compareShotId}
              >
                <Layers className="w-4 h-4 mr-2" />
                Compare
              </Button>
            </div>
            
            {showComparison && comparisonResult && extractedStyle.features && targetStyleFeatures && (
              <div className="comparison-results">
                <div className="similarity-display">
                  <Label>Overall Similarity</Label>
                  <SimilarityScore score={comparisonResult.overallSimilarity} />
                </div>
                
                <div className="comparison-details">
                  <div className="detail-row">
                    <span>Color Difference</span>
                    <Progress 
                      value={comparisonResult.colorDifference * 100} 
                      className="detail-progress"
                    />
                    <span className="detail-value">
                      {Math.round(comparisonResult.colorDifference * 100)}%
                    </span>
                  </div>
                  
                  <div className="detail-row">
                    <span>Lighting Difference</span>
                    <Progress 
                      value={comparisonResult.lightingDifference * 100} 
                      className="detail-progress"
                    />
                    <span className="detail-value">
                      {Math.round(comparisonResult.lightingDifference * 100)}%
                    </span>
                  </div>
                  
                  <div className="detail-row">
                    <span>Composition Difference</span>
                    <Progress 
                      value={comparisonResult.compositionDifference * 100} 
                      className="detail-progress"
                    />
                    <span className="detail-value">
                      {Math.round(comparisonResult.compositionDifference * 100)}%
                    </span>
                  </div>
                </div>
                
                <div className="styles-side-by-side">
                  <div className="style-side">
                    <Label>Source Style</Label>
                    <ColorPaletteDisplay colors={extractedStyle.features.colorPalette} />
                    <div className="style-details">
                      <Badge variant="outline">{extractedStyle.features.lightingStyle}</Badge>
                      <Badge variant="outline">{extractedStyle.features.artStyle}</Badge>
                    </div>
                  </div>
                  
                  <div className="style-side">
                    <Label>Target Style</Label>
                    <ColorPaletteDisplay colors={targetStyleFeatures.colorPalette} />
                    <div className="style-details">
                      <Badge variant="outline">{targetStyleFeatures.lightingStyle}</Badge>
                      <Badge variant="outline">{targetStyleFeatures.artStyle}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {!showComparison && (
              <div className="comparison-placeholder">
                <Layers className="placeholder-icon w-8 h-8" />
                <span>Extract a style and select a shot to compare</span>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// Icon Components
// ============================================================================

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

export default StyleTransferPanel;
