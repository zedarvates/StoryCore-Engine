/**
 * CrossShotReferencePicker Component
 * 
 * UI component for borrowing references from other shots in the sequence.
 * Allows users to browse shots, preview references, and select references
 * to add to the current shot.
 * 
 * Features:
 * - Shot reference browser with thumbnails
 * - Filter by character/location/style references
 * - Search by shot name or reference type
 * - Multi-reference selection with preview
 * - Quick borrow actions (previous, next, all characters)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Users,
  MapPin,
  Palette,
  Check,
  X,
  Image,
  Layers,
  ArrowLeftRight,
  Download,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { useAppStore } from '@/stores/useAppStore';
import { referenceInheritanceService } from '@/services/referenceInheritanceService';
import { referenceSheetService } from '@/services/referenceSheetService';
import type {
  ReferenceImage,
  ShotReference,
  CharacterAppearanceSheet,
  LocationAppearanceSheet,
} from '@/types/reference';
import { cn } from '@/lib/utils';
import './CrossShotReferencePicker.css';

// ============================================================================
// Types
// ============================================================================

/**
 * Summary of references available in a shot
 */
export interface ShotReferenceSummary {
  shotId: string;
  shotName: string;
  thumbnailUrl: string;
  referenceCount: number;
  characterRefs: string[];
  locationRefs: string[];
  styleRefs: string[];
}

/**
 * Individual reference item for display
 */
interface ReferenceItem {
  id: string;
  url: string;
  source: ReferenceImage['source'];
  sourceId: string;
  sourceName: string;
  shotId: string;
  shotName: string;
  type: 'character' | 'location' | 'style';
}

/**
 * Props for CrossShotReferencePicker component
 */
export interface CrossShotPickerProps {
  currentShotId: string;
  sequenceId: string;
  onSelect: (references: ReferenceImage[]) => void;
  onClose: () => void;
}

/**
 * Filter type for references
 */
type ReferenceFilter = 'all' | 'character' | 'location' | 'style';

// ============================================================================
// Component
// ============================================================================

export function CrossShotReferencePicker({
  currentShotId,
  sequenceId,
  onSelect,
  onClose,
}: CrossShotPickerProps) {
  // Store state
  const project = useAppStore((state) => state.project);
  const shots = useAppStore((state) => state.shots);
  
  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<ReferenceFilter>('all');
  const [shotSummaries, setShotSummaries] = useState<ShotReferenceSummary[]>([]);
  const [selectedReferences, setSelectedReferences] = useState<Map<string, ReferenceItem>>(new Map());
  const [previewReference, setPreviewReference] = useState<ReferenceItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedShots, setExpandedShots] = useState<Set<string>>(new Set());
  
  // ============================================================================
  // Data Loading
  // ============================================================================
  
  /**
   * Load shot reference summaries
   */
  const loadShotSummaries = useCallback(async () => {
    if (!project || !shots.length) return;
    
    setIsLoading(true);
    try {
      const summaries: ShotReferenceSummary[] = [];
      
      for (const shot of shots) {
        // Skip the current shot
        if (shot.id === currentShotId) continue;
        
        const effectiveRefs = await referenceInheritanceService.getEffectiveReferencesForShot(shot.id);
        
        // Extract reference types
        const characterRefs: string[] = [];
        const locationRefs: string[] = [];
        const styleRefs: string[] = [];
        
        for (const ref of effectiveRefs.effective) {
          switch (ref.source) {
            case 'character':
              characterRefs.push(ref.id);
              break;
            case 'environment':
              locationRefs.push(ref.id);
              break;
            case 'visual-style':
              styleRefs.push(ref.id);
              break;
          }
        }
        
        summaries.push({
          shotId: shot.id,
          shotName: shot.name || `Shot ${shot.orderIndex + 1}`,
          thumbnailUrl: shot.thumbnailUrl || '',
          referenceCount: effectiveRefs.effective.length,
          characterRefs,
          locationRefs,
          styleRefs,
        });
      }
      
      setShotSummaries(summaries);
    } catch (error) {
      console.error('[CrossShotReferencePicker] Error loading shot summaries:', error);
    } finally {
      setIsLoading(false);
    }
  }, [project, shots, currentShotId]);
  
  useEffect(() => {
    loadShotSummaries();
  }, [loadShotSummaries]);
  
  // ============================================================================
  // Reference Loading for Expanded Shot
  // ============================================================================
  
  /**
   * Get references for a specific shot
   */
  const getShotReferences = useCallback(async (shotId: string): Promise<ReferenceItem[]> => {
    const items: ReferenceItem[] = [];
    
    try {
      const effectiveRefs = await referenceInheritanceService.getEffectiveReferencesForShot(shotId);
      const shot = shots.find(s => s.id === shotId);
      
      if (!shot) return items;
      
      // Get character details
      const masterSheet = await referenceSheetService.getMasterReferenceSheetByProject(project?.id);
      if (masterSheet) {
        for (const ref of effectiveRefs.inherited) {
          if (ref.source === 'character') {
            const charSheet = masterSheet.characterSheets.find(
              (c: CharacterAppearanceSheet) => c.appearanceImages.some(ai => ai.id === ref.id)
            );
            if (charSheet) {
              items.push({
                id: ref.id,
                url: ref.url,
                source: ref.source,
                sourceId: charSheet.id,
                sourceName: charSheet.characterName,
                shotId,
                shotName: shot.name || `Shot ${shot.orderIndex + 1}`,
                type: 'character',
              });
            }
          } else if (ref.source === 'environment') {
            const locSheet = masterSheet.locationSheets.find(
              (l: LocationAppearanceSheet) => l.referenceImages.some(ri => ri.id === ref.id)
            );
            if (locSheet) {
              items.push({
                id: ref.id,
                url: ref.url,
                source: ref.source,
                sourceId: locSheet.id,
                sourceName: locSheet.locationName,
                shotId,
                shotName: shot.name || `Shot ${shot.orderIndex + 1}`,
                type: 'location',
              });
            }
          }
        }
      }
      
      // Add local references
      for (const ref of effectiveRefs.local) {
        items.push({
          id: ref.id,
          url: ref.url,
          source: ref.source,
          sourceId: ref.id,
          sourceName: 'Local Reference',
          shotId,
          shotName: shot.name || `Shot ${shot.orderIndex + 1}`,
          type: ref.source === 'character' ? 'character' : ref.source === 'environment' ? 'location' : 'style',
        });
      }
    } catch (error) {
      console.error('[CrossShotReferencePicker] Error getting shot references:', error);
    }
    
    return items;
  }, [project, shots]);
  
  // ============================================================================
  // Filtering
  // ============================================================================
  
  /**
   * Filter shots based on search query and filter type
   */
  const getFilteredShots = useCallback(() => {
    return shotSummaries.filter(summary => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = summary.shotName.toLowerCase().includes(query);
        const matchesCharacter = summary.characterRefs.some(r => r.toLowerCase().includes(query));
        const matchesLocation = summary.locationRefs.some(r => r.toLowerCase().includes(query));
        const matchesStyle = summary.styleRefs.some(r => r.toLowerCase().includes(query));
        
        if (!matchesName && !matchesCharacter && !matchesLocation && !matchesStyle) {
          return false;
        }
      }
      
      // Type filter
      if (filter !== 'all') {
        switch (filter) {
          case 'character':
            return summary.characterRefs.length > 0;
          case 'location':
            return summary.locationRefs.length > 0;
          case 'style':
            return summary.styleRefs.length > 0;
        }
      }
      
      return true;
    });
  }, [shotSummaries, searchQuery, filter]);
  
  // ============================================================================
  // Selection
  // ============================================================================
  
  /**
   * Toggle reference selection
   */
  const toggleReference = useCallback((reference: ReferenceItem) => {
    setSelectedReferences(prev => {
      const newMap = new Map(prev);
      if (newMap.has(reference.id)) {
        newMap.delete(reference.id);
      } else {
        newMap.set(reference.id, reference);
      }
      return newMap;
    });
  }, []);
  
  /**
   * Check if reference is selected
   */
  const isSelected = useCallback((referenceId: string) => {
    return selectedReferences.has(referenceId);
  }, [selectedReferences]);
  
  // ============================================================================
  // Quick Borrow Actions
  // ============================================================================
  
  /**
   * Borrow from previous shot
   */
  const borrowFromPrevious = useCallback(async () => {
    const sortedShots = [...shots].sort((a, b) => a.orderIndex - b.orderIndex);
    const currentIndex = sortedShots.findIndex(s => s.id === currentShotId);
    
    if (currentIndex <= 0) {
      console.warn('[CrossShotReferencePicker] No previous shot available');
      return;
    }
    
    const previousShot = sortedShots[currentIndex - 1];
    const refs = await getShotReferences(previousShot.id);
    
    const newMap = new Map(selectedReferences);
    for (const ref of refs) {
      newMap.set(ref.id, ref);
    }
    setSelectedReferences(newMap);
  }, [shots, currentShotId, getShotReferences, selectedReferences]);
  
  /**
   * Borrow from next shot
   */
  const borrowFromNext = useCallback(async () => {
    const sortedShots = [...shots].sort((a, b) => a.orderIndex - b.orderIndex);
    const currentIndex = sortedShots.findIndex(s => s.id === currentShotId);
    
    if (currentIndex >= sortedShots.length - 1) {
      console.warn('[CrossShotReferencePicker] No next shot available');
      return;
    }
    
    const nextShot = sortedShots[currentIndex + 1];
    const refs = await getShotReferences(nextShot.id);
    
    const newMap = new Map(selectedReferences);
    for (const ref of refs) {
      newMap.set(ref.id, ref);
    }
    setSelectedReferences(newMap);
  }, [shots, currentShotId, getShotReferences, selectedReferences]);
  
  /**
   * Borrow all character references
   */
  const borrowAllCharacters = useCallback(async () => {
    const newMap = new Map(selectedReferences);
    
    for (const summary of shotSummaries) {
      const refs = await getShotReferences(summary.shotId);
      for (const ref of refs) {
        if (ref.type === 'character') {
          newMap.set(ref.id, ref);
        }
      }
    }
    
    setSelectedReferences(newMap);
  }, [shotSummaries, getShotReferences, selectedReferences]);
  
  // ============================================================================
  // Actions
  // ============================================================================
  
  /**
   * Handle confirm selection
   */
  const handleConfirm = () => {
    const references: ReferenceImage[] = Array.from(selectedReferences.values()).map(item => ({
      id: item.id,
      url: item.url,
      weight: 1.0,
      source: item.source,
    }));
    
    onSelect(references);
    onClose();
  };
  
  /**
   * Toggle shot expansion
   */
  const toggleShotExpansion = async (shotId: string) => {
    setExpandedShots(prev => {
      const newSet = new Set(prev);
      if (newSet.has(shotId)) {
        newSet.delete(shotId);
      } else {
        newSet.add(shotId);
        // Load references when expanding
        getShotReferences(shotId).then(refs => {
          // References are stored in component state via the expansion
          console.log(`[CrossShotReferencePicker] Loaded ${refs.length} references for shot ${shotId}`);
        });
      }
      return newSet;
    });
  };
  
  // ============================================================================
  // Render
  // ============================================================================
  
  const filteredShots = getFilteredShots();
  const selectedCount = selectedReferences.size;
  
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="cross-shot-picker">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5" />
            Cross-Shot Reference Picker
          </DialogTitle>
        </DialogHeader>
        
        {/* Search and Filter Bar */}
        <div className="picker-toolbar">
          <div className="search-container">
            <Search className="search-icon w-4 h-4" />
            <Input
              placeholder="Search shots or references..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          
          <Select value={filter} onValueChange={(v) => setFilter(v as ReferenceFilter)}>
            <SelectTrigger className="filter-select">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All References</SelectItem>
              <SelectItem value="character">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Characters
                </div>
              </SelectItem>
              <SelectItem value="location">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Locations
                </div>
              </SelectItem>
              <SelectItem value="style">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Styles
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Quick Borrow Actions */}
        <div className="quick-actions">
          <Button
            variant="outline"
            size="sm"
            onClick={borrowFromPrevious}
            className="quick-action-btn"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous Shot
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={borrowFromNext}
            className="quick-action-btn"
          >
            Next Shot
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={borrowAllCharacters}
            className="quick-action-btn"
          >
            <Users className="w-4 h-4 mr-1" />
            All Characters
          </Button>
        </div>
        
        {/* Shot List */}
        <ScrollArea className="shot-list-container">
          {isLoading ? (
            <div className="loading-state">
              <Layers className="w-8 h-8 animate-pulse" />
              <p>Loading shots...</p>
            </div>
          ) : filteredShots.length === 0 ? (
            <div className="empty-state">
              <Image className="w-8 h-8" />
              <p>No shots found matching your criteria</p>
            </div>
          ) : (
            <div className="shot-list">
              {filteredShots.map(summary => (
                <ShotCard
                  key={summary.shotId}
                  summary={summary}
                  isExpanded={expandedShots.has(summary.shotId)}
                  onToggle={() => toggleShotExpansion(summary.shotId)}
                  selectedReferences={selectedReferences}
                  onToggleReference={toggleReference}
                  isSelected={isSelected}
                  onPreview={setPreviewReference}
                  getShotReferences={getShotReferences}
                  filter={filter}
                />
              ))}
            </div>
          )}
        </ScrollArea>
        
        {/* Selected References Preview */}
        {selectedCount > 0 && (
          <div className="selection-preview">
            <div className="preview-header">
              <Label>Selected ({selectedCount})</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedReferences(new Map())}
              >
                Clear All
              </Button>
            </div>
            <ScrollArea className="preview-scroll">
              <div className="preview-grid">
                {Array.from(selectedReferences.values()).map(ref => (
                  <div
                    key={ref.id}
                    className="preview-item"
                    onClick={() => setPreviewReference(ref)}
                  >
                    <img src={ref.url} alt={ref.sourceName} />
                    <button
                      className="remove-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleReference(ref);
                      }}
                      aria-label={`Remove ${ref.sourceName} from selection`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
        
        {/* Preview Modal */}
        {previewReference && (
          <div className="preview-modal" onClick={() => setPreviewReference(null)}>
            <div className="preview-modal-content" onClick={(e) => e.stopPropagation()}>
              <img src={previewReference.url} alt={previewReference.sourceName} />
              <div className="preview-modal-info">
                <h4>{previewReference.sourceName}</h4>
                <p>From: {previewReference.shotName}</p>
                <Badge variant="secondary">
                  {previewReference.type === 'character' && <Users className="w-3 h-3 mr-1" />}
                  {previewReference.type === 'location' && <MapPin className="w-3 h-3 mr-1" />}
                  {previewReference.type === 'style' && <Palette className="w-3 h-3 mr-1" />}
                  {previewReference.type}
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleReference(previewReference)}
              >
                {isSelected(previewReference.id) ? 'Remove' : 'Add'} to Selection
              </Button>
              <button
                className="close-modal"
                onClick={() => setPreviewReference(null)}
                aria-label="Close preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
        
        <DialogFooter className="picker-footer">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedCount === 0}
            className="confirm-btn"
          >
            <Download className="w-4 h-4 mr-2" />
            Borrow {selectedCount} Reference{selectedCount !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Shot Card Subcomponent
// ============================================================================

interface ShotCardProps {
  summary: ShotReferenceSummary;
  isExpanded: boolean;
  onToggle: () => void;
  selectedReferences: Map<string, ReferenceItem>;
  onToggleReference: (ref: ReferenceItem) => void;
  isSelected: (id: string) => boolean;
  onPreview: (ref: ReferenceItem | null) => void;
  getShotReferences: (shotId: string) => Promise<ReferenceItem[]>;
  filter: ReferenceFilter;
}

function ShotCard({
  summary,
  isExpanded,
  onToggle,
  selectedReferences,
  onToggleReference,
  isSelected,
  onPreview,
  getShotReferences,
  filter,
}: ShotCardProps) {
  const [references, setReferences] = useState<ReferenceItem[]>([]);
  const [isLoadingRefs, setIsLoadingRefs] = useState(false);
  
  useEffect(() => {
    if (isExpanded && references.length === 0) {
      setIsLoadingRefs(true);
      getShotReferences(summary.shotId).then(refs => {
        setReferences(refs);
        setIsLoadingRefs(false);
      });
    }
  }, [isExpanded, summary.shotId, getShotReferences, references.length]);
  
  const filteredReferences = references.filter(ref => {
    if (filter === 'all') return true;
    return ref.type === filter;
  });
  
  const getFilteredBadgeCount = () => {
    if (filter === 'all') return summary.referenceCount;
    switch (filter) {
      case 'character':
        return summary.characterRefs.length;
      case 'location':
        return summary.locationRefs.length;
      case 'style':
        return summary.styleRefs.length;
      default:
        return summary.referenceCount;
    }
  };
  
  return (
    <div className={cn('shot-card', { expanded: isExpanded })}>
      <div className="shot-card-header" onClick={onToggle}>
        <div className="shot-info">
          {summary.thumbnailUrl ? (
            <img src={summary.thumbnailUrl} alt={summary.shotName} className="shot-thumbnail" />
          ) : (
            <div className="shot-thumbnail-placeholder">
              <Image className="w-4 h-4" />
            </div>
          )}
          <div className="shot-details">
            <span className="shot-name">{summary.shotName}</span>
            <div className="shot-badges">
              {summary.characterRefs.length > 0 && (
                <Badge variant="secondary" className="ref-badge">
                  <Users className="w-3 h-3 mr-1" />
                  {summary.characterRefs.length}
                </Badge>
              )}
              {summary.locationRefs.length > 0 && (
                <Badge variant="secondary" className="ref-badge">
                  <MapPin className="w-3 h-3 mr-1" />
                  {summary.locationRefs.length}
                </Badge>
              )}
              {summary.styleRefs.length > 0 && (
                <Badge variant="secondary" className="ref-badge">
                  <Palette className="w-3 h-3 mr-1" />
                  {summary.styleRefs.length}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="shot-card-actions">
          <span className="ref-count">{getFilteredBadgeCount()} refs</span>
          <ChevronRight className={cn('expand-icon', { rotated: isExpanded })} />
        </div>
      </div>
      
      {isExpanded && (
        <div className="shot-references">
          {isLoadingRefs ? (
            <div className="loading-refs">
              <Layers className="w-6 h-6 animate-pulse" />
            </div>
          ) : filteredReferences.length === 0 ? (
            <div className="no-refs">No references of this type</div>
          ) : (
            <div className="reference-grid">
              {filteredReferences.map(ref => (
                <div
                  key={ref.id}
                  className={cn('reference-item', { selected: isSelected(ref.id) })}
                  onClick={() => onToggleReference(ref)}
                >
                  <img src={ref.url} alt={ref.sourceName} />
                  {isSelected(ref.id) && (
                    <div className="selected-overlay">
                      <Check className="w-6 h-6" />
                    </div>
                  )}
                  <div className="reference-tooltip">
                    <span>{ref.sourceName}</span>
                    <Badge variant="outline" className="type-badge">
                      {ref.type}
                    </Badge>
                  </div>
                  <button
                    className="preview-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreview(ref);
                    }}
                    aria-label={`Preview ${ref.sourceName}`}
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CrossShotReferencePicker;
