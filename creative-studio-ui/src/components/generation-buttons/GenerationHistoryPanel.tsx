/**
 * Generation History Panel Component
 * 
 * Displays all previous generations with thumbnails, metadata, and version comparison.
 * Allows users to view history, select entries, display parameters, and regenerate.
 * 
 * Requirements: 14.2, 14.5
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ScrollArea } from '../ui/scroll-area';
import {
  History,
  Image as ImageIcon,
  Video as VideoIcon,
  Volume2 as AudioIcon,
  FileText,
  Calendar,
  RefreshCw,
  Search,
  Filter,
  ArrowUpDown,
  GitCompare,
  X,
} from 'lucide-react';
import type { HistoryEntry, GeneratedAsset } from '../../types/generation';
import { generationHistoryService } from '../../services/GenerationHistoryService';

export interface GenerationHistoryPanelProps {
  /**
   * Callback when a history entry is selected
   */
  onEntrySelect?: (entry: HistoryEntry) => void;
  
  /**
   * Callback when regenerate is clicked
   */
  onRegenerate?: (entry: HistoryEntry) => void;
  
  /**
   * Custom className for styling
   */
  className?: string;
}

/**
 * Filter options for history
 */
interface HistoryFilters {
  type: 'all' | 'prompt' | 'image' | 'video' | 'audio';
  searchQuery: string;
  sortBy: 'timestamp' | 'version';
  sortOrder: 'asc' | 'desc';
}

/**
 * Format timestamp for display
 */
const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
};

/**
 * Get asset type icon
 */
const getAssetIcon = (type: HistoryEntry['type']) => {
  switch (type) {
    case 'image':
      return ImageIcon;
    case 'video':
      return VideoIcon;
    case 'audio':
      return AudioIcon;
    case 'prompt':
      return FileText;
    default:
      return FileText;
  }
};

/**
 * Get asset type label
 */
const getAssetTypeLabel = (type: HistoryEntry['type']): string => {
  switch (type) {
    case 'image':
      return 'Image';
    case 'video':
      return 'Video';
    case 'audio':
      return 'Audio';
    case 'prompt':
      return 'Prompt';
    default:
      return 'Asset';
  }
};

/**
 * Generation History Panel
 * 
 * Displays all previous generations with filtering, sorting, and version comparison.
 */
export const GenerationHistoryPanel: React.FC<GenerationHistoryPanelProps> = ({
  onEntrySelect,
  onRegenerate,
  className = '',
}) => {
  // State
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [comparisonEntry, setComparisonEntry] = useState<HistoryEntry | null>(null);
  const [filters, setFilters] = useState<HistoryFilters>({
    type: 'all',
    searchQuery: '',
    sortBy: 'timestamp',
    sortOrder: 'desc',
  });
  
  // Get all history entries
  const allEntries = useMemo(() => {
    return generationHistoryService.getAllEntries();
  }, []);
  
  // Filter and sort entries
  const filteredEntries = useMemo(() => {
    let entries = [...allEntries];
    
    // Filter by type
    if (filters.type !== 'all') {
      entries = entries.filter(entry => entry.type === filters.type);
    }
    
    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      entries = entries.filter(entry => {
        // Search in parameters
        const paramsStr = JSON.stringify(entry.params).toLowerCase();
        return paramsStr.includes(query);
      });
    }
    
    // Sort entries
    entries.sort((a, b) => {
      let comparison = 0;
      
      if (filters.sortBy === 'timestamp') {
        comparison = a.timestamp - b.timestamp;
      } else if (filters.sortBy === 'version') {
        comparison = a.version - b.version;
      }
      
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return entries;
  }, [allEntries, filters]);
  
  // Get statistics
  const statistics = useMemo(() => {
    return generationHistoryService.getStatistics();
  }, [allEntries]);
  
  /**
   * Handle entry selection
   */
  const handleEntryClick = (entry: HistoryEntry) => {
    setSelectedEntry(entry);
    if (onEntrySelect) {
      onEntrySelect(entry);
    }
  };
  
  /**
   * Handle regenerate
   */
  const handleRegenerate = (entry: HistoryEntry) => {
    if (onRegenerate) {
      onRegenerate(entry);
    }
  };
  
  /**
   * Handle comparison mode
   */
  const handleCompare = (entry: HistoryEntry) => {
    if (!comparisonEntry) {
      setComparisonEntry(entry);
    } else {
      // Already in comparison mode, clear it
      setComparisonEntry(null);
    }
  };
  
  /**
   * Clear comparison
   */
  const clearComparison = () => {
    setComparisonEntry(null);
  };
  
  /**
   * Update filter
   */
  const updateFilter = <K extends keyof HistoryFilters>(
    key: K,
    value: HistoryFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Generation History
          </CardTitle>
          <CardDescription>
            View all previous generations with parameters and versions
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Entries</p>
              <p className="text-2xl font-bold">{statistics.totalEntries}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Images</p>
              <p className="text-2xl font-bold">{statistics.entriesByType.image || 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Videos</p>
              <p className="text-2xl font-bold">{statistics.entriesByType.video || 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Audio</p>
              <p className="text-2xl font-bold">{statistics.entriesByType.audio || 0}</p>
            </div>
          </div>
          
          <Separator />
          
          {/* Filters */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Type Filter */}
              <Select
                value={filters.type}
                onValueChange={(value) => updateFilter('type', value as HistoryFilters['type'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="prompt">Prompts</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Sort By */}
              <Select
                value={filters.sortBy}
                onValueChange={(value) => updateFilter('sortBy', value as HistoryFilters['sortBy'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="timestamp">Date</SelectItem>
                  <SelectItem value="version">Version</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Sort Order */}
              <Button
                variant="outline"
                onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                <ArrowUpDown className="mr-2 h-4 w-4" />
                {filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              </Button>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search parameters..."
                value={filters.searchQuery}
                onChange={(e) => updateFilter('searchQuery', e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Comparison Mode Banner */}
      {comparisonEntry && (
        <Card className="border-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitCompare className="h-5 w-5 text-primary" />
                <span className="font-medium">Comparison Mode Active</span>
                <Badge variant="secondary">
                  Comparing v{comparisonEntry.version}
                </Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={clearComparison}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Select another entry to compare parameters
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* History List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            History Entries ({filteredEntries.length})
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            {filteredEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <History className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No history entries found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Generate some content to see it here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEntries.map((entry) => (
                  <HistoryEntryCard
                    key={entry.id}
                    entry={entry}
                    isSelected={selectedEntry?.id === entry.id}
                    isComparing={comparisonEntry?.id === entry.id}
                    onClick={() => handleEntryClick(entry)}
                    onRegenerate={() => handleRegenerate(entry)}
                    onCompare={() => handleCompare(entry)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
      
      {/* Selected Entry Details */}
      {selectedEntry && (
        <HistoryEntryDetails
          entry={selectedEntry}
          comparisonEntry={comparisonEntry}
          onRegenerate={() => handleRegenerate(selectedEntry)}
        />
      )}
    </div>
  );
};

/**
 * History Entry Card Component
 */
interface HistoryEntryCardProps {
  entry: HistoryEntry;
  isSelected: boolean;
  isComparing: boolean;
  onClick: () => void;
  onRegenerate: () => void;
  onCompare: () => void;
}

const HistoryEntryCard: React.FC<HistoryEntryCardProps> = ({
  entry,
  isSelected,
  isComparing,
  onClick,
  onRegenerate,
  onCompare,
}) => {
  const AssetIcon = getAssetIcon(entry.type);
  const assetLabel = getAssetTypeLabel(entry.type);
  
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-lg border transition-colors ${
        isSelected
          ? 'border-primary bg-primary/5'
          : isComparing
          ? 'border-blue-500 bg-blue-500/5'
          : 'border-border hover:border-primary/50'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Thumbnail */}
        <div className="flex-shrink-0 w-16 h-16 rounded-md bg-muted flex items-center justify-center overflow-hidden">
          {(entry.type === 'image' || entry.type === 'video') && entry.result.url ? (
            entry.type === 'image' ? (
              <img
                src={entry.result.url}
                alt={assetLabel}
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                src={entry.result.url}
                className="w-full h-full object-cover"
                muted
              />
            )
          ) : (
            <AssetIcon className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="text-xs">
              {assetLabel}
            </Badge>
            <Badge variant="outline" className="text-xs">
              v{entry.version}
            </Badge>
            {isComparing && (
              <Badge variant="default" className="text-xs bg-blue-500">
                Comparing
              </Badge>
            )}
          </div>
          
          <p className="text-sm font-medium truncate">
            {entry.params.prompt || entry.params.text || `${assetLabel} Generation`}
          </p>
          
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{formatTimestamp(entry.timestamp)}</span>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex flex-col gap-1">
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onRegenerate();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                onRegenerate();
              }
            }}
            className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground rounded-md text-xs h-8 px-2 cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" />
          </div>
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onCompare();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                onCompare();
              }
            }}
            className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground rounded-md text-xs h-8 px-2 cursor-pointer"
          >
            <GitCompare className="h-3 w-3" />
          </div>
        </div>
      </div>
    </button>
  );
};

/**
 * History Entry Details Component
 */
interface HistoryEntryDetailsProps {
  entry: HistoryEntry;
  comparisonEntry: HistoryEntry | null;
  onRegenerate: () => void;
}

const HistoryEntryDetails: React.FC<HistoryEntryDetailsProps> = ({
  entry,
  comparisonEntry,
  onRegenerate,
}) => {
  const AssetIcon = getAssetIcon(entry.type);
  const assetLabel = getAssetTypeLabel(entry.type);
  
  // Get version comparison if comparing
  const comparison = useMemo(() => {
    if (!comparisonEntry) return null;
    
    return generationHistoryService.compareVersions(
      entry.result.id,
      comparisonEntry.version,
      entry.version
    );
  }, [entry, comparisonEntry]);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AssetIcon className="h-5 w-5" />
          {assetLabel} Details - Version {entry.version}
        </CardTitle>
        <CardDescription>
          Generated on {new Date(entry.timestamp).toLocaleString()}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Asset Preview */}
        {(entry.type === 'image' || entry.type === 'video') && entry.result.url && (
          <div className="rounded-lg overflow-hidden border">
            {entry.type === 'image' ? (
              <img
                src={entry.result.url}
                alt={assetLabel}
                className="w-full h-auto"
              />
            ) : (
              <video
                src={entry.result.url}
                controls
                className="w-full h-auto"
              />
            )}
          </div>
        )}
        
        <Separator />
        
        {/* Parameters */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Generation Parameters</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {Object.entries(entry.params).map(([key, value]) => {
              const isChanged = comparison?.paramDifferences[key];
              
              return (
                <div
                  key={key}
                  className={`p-2 rounded ${
                    isChanged ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-muted'
                  }`}
                >
                  <span className="text-muted-foreground capitalize block mb-1">
                    {key.replace(/([A-Z])/g, ' $1').trim()}:
                  </span>
                  <span className="font-medium block">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                  
                  {/* Show comparison value */}
                  {isChanged && comparisonEntry && (
                    <div className="mt-2 pt-2 border-t border-yellow-500/20">
                      <span className="text-xs text-muted-foreground">
                        v{comparisonEntry.version}:
                      </span>
                      <span className="text-xs font-medium ml-1">
                        {typeof isChanged.v1 === 'object'
                          ? JSON.stringify(isChanged.v1)
                          : String(isChanged.v1)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Comparison Summary */}
        {comparison && comparisonEntry && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <GitCompare className="h-4 w-4" />
                Version Comparison
              </h4>
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <p className="text-sm">
                  Comparing <Badge variant="secondary">v{comparisonEntry.version}</Badge> with{' '}
                  <Badge variant="secondary">v{entry.version}</Badge>
                </p>
                <p className="text-sm text-muted-foreground">
                  {Object.keys(comparison.paramDifferences).length} parameter(s) changed
                </p>
                {Object.keys(comparison.paramDifferences).length > 0 && (
                  <div className="text-xs space-y-1 mt-2">
                    {Object.keys(comparison.paramDifferences).map((key) => (
                      <Badge key={key} variant="outline" className="mr-1">
                        {key}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
      
      <CardFooter>
        <Button onClick={onRegenerate} className="w-full">
          <RefreshCw className="mr-2 h-4 w-4" />
          Regenerate with These Parameters
        </Button>
      </CardFooter>
    </Card>
  );
};
