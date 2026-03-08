import React, { useState, useEffect } from 'react';
import { useWizard } from '@/contexts/WizardContext';
import { WizardFormLayout, FormField } from '../WizardFormLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Download, CheckCircle, AlertCircle, History, RotateCcw, RefreshCw, ChevronLeft, Send, Bot, Sparkles } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import type { ExportOptions, Story, StoryPart, CharacterReference, LocationReference } from '@/types/story';
import { exportStory } from '@/services/storyExportService';
import { saveStoryToDisk } from '@/utils/storyFileIO';
import { useStore } from '@/store';
import { refineStory, generateStoryboard } from '@/services/storyGenerationService';
import { Image as ImageIcon, Layout, Maximize2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/SkeletonLoader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ============================================================================
// Wizard Form Data Interface
// ============================================================================

interface StoryWizardFormData {
  title?: string;
  genre?: string[];
  tone?: string[];
  length?: 'short' | 'medium' | 'long' | 'scene' | 'short_story' | 'novella' | 'novel' | 'epic_novel';
  selectedCharacters?: CharacterReference[];
  selectedLocations?: LocationReference[];
  generatedContent?: string;
  generatedSummary?: string;
  parts?: StoryPart[];
  assetPrompts?: Record<string, string>;
  critique?: string;
}

// ============================================================================
// Step 5: Review and Export
// ============================================================================

interface Step5ReviewExportProps {
  onBack?: () => void;
  onRegenerateAll?: () => void;
}

export function Step5ReviewExport({ onBack, onRegenerateAll }: Step5ReviewExportProps) {
  const { formData, updateFormData } = useWizard<StoryWizardFormData>();
  const { getVersionsByStoryId, loadVersion } = useStore();

  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportedFilePath, setExportedFilePath] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [storyId] = useState(() => crypto.randomUUID()); // Generate stable ID for this story
  const [versions, setVersions] = useState<Array<{ id: string; versionNumber: number; createdAt: number; changes: string }>>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  
  // Interactive Script Doctoring
  const [refineFeedback, setRefineFeedback] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  
  // Storyboard Generation
  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false);
  const [storyboard, setStoryboard] = useState<Array<{ scene_index: number; scene_title: string; image_url: string }>>([]);
  const [storyboardError, setStoryboardError] = useState<string | null>(null);

  // Load versions when component mounts or storyId changes
  useEffect(() => {
    const loadedVersions = getVersionsByStoryId(storyId);
    setVersions(loadedVersions);
  }, [storyId, getVersionsByStoryId]);

  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'md',
    includeMetadata: true,
    includeSummary: true,
    filename: formData.title || 'story',
  });

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateFormData({ generatedContent: e.target.value });
    setHasUnsavedChanges(true);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormData({ title: e.target.value });
    setExportOptions({ ...exportOptions, filename: e.target.value || 'story' });
  };

  const handleLoadVersion = (versionId: string) => {
    if (versionId === 'current') {
      setSelectedVersionId(null);
      return;
    }

    loadVersion(versionId);
    setSelectedVersionId(versionId);

    // Reload versions to get updated data
    const loadedVersions = getVersionsByStoryId(storyId);
    setVersions(loadedVersions);
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportSuccess(false);
    setExportError(null);

    try {
      const now = Date.now();
      // Build story object for export with correct types
      const story: Story = {
        id: crypto.randomUUID(),
        title: formData.title || 'Untitled Story',
        content: formData.generatedContent || '',
        summary: formData.generatedSummary || '',
        genre: formData.genre || [],
        tone: formData.tone || [],
        length: formData.length || 'medium',
        charactersUsed: formData.selectedCharacters || [],
        locationsUsed: formData.selectedLocations || [],
        autoGeneratedElements: [],
        parts: formData.parts,
        createdAt: now,
        updatedAt: now,
        version: 1,
        fileFormat: 'md',
      };

      // Get current project path from store
      const currentProject = useStore.getState().project;
      const projectPath = (currentProject?.metadata?.path || currentProject?.project_name) as string | undefined;

      // If Electron API available and we have a project path, save full project structure
      if (window.electronAPI?.fs && projectPath) {
        try {
          // Save complete story with all parts using saveStoryToDisk
          await saveStoryToDisk(projectPath, story);

          setExportSuccess(true);
          setExportedFilePath(`${projectPath}/story/`);
          setHasUnsavedChanges(false);
          console.log('[Step5ReviewExport] Story saved to project:', projectPath);
        } catch (diskError) {
          console.warn('[Step5ReviewExport] Failed to save to disk, falling back to export:', diskError);
          // Fallback to simple export
          const filePath = await exportStory(story, exportOptions);
          setExportSuccess(true);
          setExportedFilePath(filePath);
        }
      } else {
        // Browser environment or no project - use simple export
        const filePath = await exportStory(story, exportOptions);
        setExportSuccess(true);
        setExportedFilePath(filePath);
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Export failed:', error);
      setExportError(error instanceof Error ? error.message : 'Failed to export story');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRefine = async () => {
    if (!refineFeedback.trim() || !storyId) return;
    
    setIsRefining(true);
    setRefineError(null);
    
    try {
      const updatedStory = await refineStory(storyId, refineFeedback);
      updateFormData({
        generatedContent: updatedStory.content,
        generatedSummary: updatedStory.summary,
        parts: updatedStory.parts,
        critique: updatedStory.critique,
        title: updatedStory.title
      });
      setRefineFeedback('');
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error('Refinement failed:', error);
      setRefineError(error instanceof Error ? error.message : 'Failed to refine story');
    } finally {
      setIsRefining(false);
    }
  };

  const handleGenerateStoryboard = async () => {
    if (!storyId) return;
    
    setIsGeneratingStoryboard(true);
    setStoryboardError(null);
    
    try {
      const results = await generateStoryboard(storyId);
      setStoryboard(results);
    } catch (error) {
      console.error('Storyboard generation failed:', error);
      setStoryboardError(error instanceof Error ? error.message : 'Failed to generate storyboard');
    } finally {
      setIsGeneratingStoryboard(false);
    }
  };

  const wordCount = formData.generatedContent?.split(' ').length || 0;
  const characterCount = formData.generatedContent?.length || 0;

  return (
    <WizardFormLayout
      title="Review and Export"
      description="Review your story and export it to a file"
    >
      {/* Story Title */}
      <FormField
        label="Story Title"
        name="title"
        helpText="Edit the title if needed"
      >
        <Input
          id="title"
          value={formData.title || ''}
          onChange={handleTitleChange}
          placeholder="Enter story title"
        />
      </FormField>

      {/* Version History */}
      {versions.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="version-selector" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Version History
          </Label>
          <div className="flex gap-2">
            <Select
              value={selectedVersionId || 'current'}
              onValueChange={handleLoadVersion}
            >
              <SelectTrigger id="version-selector" className="flex-1">
                <SelectValue placeholder="Select a version" />
              </SelectTrigger>
              <SelectContent className="z-[9999]">
                <SelectItem value="current">
                  Current Version (Latest)
                </SelectItem>
                {versions.map((version) => (
                  <SelectItem key={version.id} value={version.id}>
                    Version {version.versionNumber} - {new Date(version.createdAt).toLocaleString()}
                    {version.changes && ` - ${version.changes}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedVersionId && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleLoadVersion('current')}
                title="Return to current version"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
          </div>
          {selectedVersionId && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Viewing historical version. Click the reset button to return to current.
            </p>
          )}
        </div>
      )}

      {/* Summary Display */}
      <div className="space-y-2">
        <Label>Summary</Label>
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-muted-foreground">
            {formData.generatedSummary || 'No summary available'}
          </p>
        </div>
      </div>

      {/* Multi-Agent Critique Section */}
      {formData.critique && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-indigo-600">
            <Bot className="w-4 h-4" />
            Analyse de Cohérence Multi-Agent
          </Label>
          <div className="p-4 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800">
            <div className="text-sm text-indigo-900 dark:text-indigo-100 whitespace-pre-wrap">
              {formData.critique}
            </div>
          </div>
        </div>
      )}

      {/* Interactive Script Doctoring Chat */}
      <div className="space-y-3 p-4 rounded-lg bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 border border-indigo-100 dark:border-indigo-900">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            Chat with Script Doctor
          </Label>
          <span className="text-[10px] uppercase tracking-wider text-indigo-500 font-bold">Interactive Refinement</span>
        </div>
        
        <div className="flex gap-2">
          <Input 
            value={refineFeedback}
            onChange={(e) => setRefineFeedback(e.target.value)}
            placeholder="Ex: 'Applique la suggestion n°3' ou 'Rends le protagoniste plus mystérieux'..."
            className="flex-1 bg-white dark:bg-gray-950"
            disabled={isRefining}
            onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
          />
          <Button 
            onClick={handleRefine} 
            disabled={isRefining || !refineFeedback.trim()}
            size="icon"
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isRefining ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      
      {/* Visual Storyboard Section */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-primary text-blue-600">
            <Layout className="w-4 h-4" />
            Visual Storyboard (ComfyUI)
          </Label>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleGenerateStoryboard}
            disabled={isGeneratingStoryboard}
            className="h-8 gap-2 border-primary/20 hover:bg-primary/5 text-blue-600"
          >
            {isGeneratingStoryboard ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <ImageIcon className="w-3 h-3" />
            )}
            Generate Visuals
          </Button>
        </div>

        {storyboardError && (
          <div className="p-3 rounded bg-red-50 text-red-600 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {storyboardError}
          </div>
        )}

        {isGeneratingStoryboard && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-video w-full rounded-lg" variant="rectangular" />
                <Skeleton className="h-4 w-3/4" variant="text" />
              </div>
            ))}
          </div>
        )}

        {!isGeneratingStoryboard && storyboard.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {storyboard.map((frame) => (
              <div key={frame.scene_index} className="group relative rounded-lg overflow-hidden border border-border bg-card shadow-sm hover:shadow-md transition-all">
                <div className="aspect-video w-full relative overflow-hidden bg-muted">
                  <img 
                    src={frame.image_url} 
                    alt={frame.scene_title}
                    className="object-cover w-full h-full transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                      <Maximize2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
                <div className="p-3">
                  <h4 className="text-xs font-semibold truncate">{frame.scene_title}</h4>
                  <p className="text-[10px] text-muted-foreground">Scene {frame.scene_index + 1}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isGeneratingStoryboard && storyboard.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 px-4 rounded-lg bg-muted/30 border border-dashed border-muted">
            <ImageIcon className="w-8 h-8 text-muted-foreground mb-2 opacity-20" />
            <p className="text-sm text-muted-foreground text-center max-w-[200px]">
              Visualize your story with AI-generated concept art.
            </p>
          </div>
        )}
      </div>
        
        {refineError && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {refineError}
          </p>
        )}
        
        <p className="text-[11px] text-muted-foreground italic">
          Cette IA analyse votre feedback et réécrit intelligemment les parties concernées pour maintenir la cohérence globale.
        </p>
      </div>

      {/* Story Content (Editable) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="story-content">Story Content</Label>
          <div className="flex items-center gap-2">
            {onRegenerateAll && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRegenerateAll}
                className="h-7 gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <RefreshCw className="w-3 h-3" />
                Tout Régénérer
              </Button>
            )}
            {hasUnsavedChanges && (
              <span className="text-xs text-amber-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Unsaved changes
              </span>
            )}
          </div>
        </div>
        <Textarea
          id="story-content"
          value={formData.generatedContent || ''}
          onChange={handleContentChange}
          rows={15}
          className="font-mono text-sm"
          placeholder="Story content will appear here..."
        />
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>📖 {wordCount} words</span>
          <span>🔤 {characterCount} characters</span>
        </div>
      </div>

      {/* Metadata Display */}
      <div className="space-y-2">
        <Label>Story Metadata</Label>
        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-2 text-sm">
          <div className="flex gap-2">
            <span className="font-medium">Genre:</span>
            <span className="text-muted-foreground">{formData.genre?.join(', ') || 'None'}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-medium">Tone:</span>
            <span className="text-muted-foreground">{formData.tone?.join(', ') || 'None'}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-medium">Length:</span>
            <span className="text-muted-foreground">{formData.length || 'medium'}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-medium">Characters:</span>
            <span className="text-muted-foreground">
              {formData.selectedCharacters?.length || 0} selected
            </span>
          </div>
          <div className="flex gap-2">
            <span className="font-medium">Locations:</span>
            <span className="text-muted-foreground">
              {formData.selectedLocations?.length || 0} selected
            </span>
          </div>
        </div>
      </div>

      {/* Story Structure Info */}
      {formData.parts && formData.parts.length > 0 && (
        <div className="space-y-2">
          <Label>LLM-Optimized File Structure</Label>
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-900 dark:text-green-100 mb-2">
              Story will be saved as separate .md files for optimal LLM processing:
            </p>
            <div className="font-mono text-xs space-y-1 text-green-800 dark:text-green-200">
              <div>story/</div>
              <div className="pl-4">├── story-index.md <span className="text-muted-foreground"># Index & metadata</span></div>
              <div className="pl-4">├── story-intro.md <span className="text-muted-foreground"># Introduction</span></div>
              {formData.parts.filter((p: StoryPart) => p.type === 'chapter').map((part: StoryPart, i: number) => (
                <div key={part.id} className="pl-4">├── story-chapter-{String(i + 1).padStart(2, '0')}.md <span className="text-muted-foreground"># {part.title}</span></div>
              ))}
              <div className="pl-4">├── story-ending.md <span className="text-muted-foreground"># Conclusion</span></div>
              <div className="pl-4">└── story-summary.md <span className="text-muted-foreground"># Rolling summary</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Export Options */}
      <div className="space-y-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <h3 className="font-semibold text-sm">Export Options</h3>

        {/* Format Selection */}
        <div className="space-y-2">
          <Label>File Format</Label>
          <div className="p-3 rounded bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2">
              <span className="font-medium text-blue-900 dark:text-blue-100">Markdown (.md)</span>
              <span className="text-xs text-blue-700 dark:text-blue-300">- LLM-optimized with YAML frontmatter</span>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Each part includes metadata for better LLM context understanding
            </p>
          </div>
        </div>

        {/* Filename */}
        <div className="space-y-2">
          <Label htmlFor="export-filename">Filename</Label>
          <Input
            id="export-filename"
            value={exportOptions.filename}
            onChange={(e) => setExportOptions({ ...exportOptions, filename: e.target.value })}
            placeholder="story"
          />
          <p className="text-xs text-muted-foreground">
            Extension will be added automatically
          </p>
        </div>

        {/* Include Options */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-metadata"
              checked={exportOptions.includeMetadata}
              onCheckedChange={(checked) =>
                setExportOptions({ ...exportOptions, includeMetadata: checked as boolean })
              }
            />
            <Label htmlFor="include-metadata" className="text-sm font-normal cursor-pointer">
              Include metadata (genre, tone, characters, locations)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-summary"
              checked={exportOptions.includeSummary}
              onCheckedChange={(checked) =>
                setExportOptions({ ...exportOptions, includeSummary: checked as boolean })
              }
            />
            <Label htmlFor="include-summary" className="text-sm font-normal cursor-pointer">
              Include story summary
            </Label>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        {onBack && (
          <Button
            variant="outline"
            onClick={onBack}
            className="flex-1 gap-2"
            size="lg"
          >
            <ChevronLeft className="w-4 h-4" />
            Retour
          </Button>
        )}
        <Button
          onClick={handleExport}
          disabled={isExporting || !formData.generatedContent}
          className="flex-[2] gap-2"
          size="lg"
        >
          <Download className="w-4 h-4" />
          {isExporting ? 'Exporting...' : 'Export Story'}
        </Button>
      </div>

      {/* Export Success Message */}
      {exportSuccess && (
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 text-green-900 dark:text-green-100">
            <CheckCircle className="w-5 h-5" />
            <div>
              <p className="font-semibold">Export Successful!</p>
              {exportedFilePath && (
                <p className="text-sm mt-1">File saved: {exportedFilePath}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Export Error Message */}
      {exportError && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 text-red-900 dark:text-red-100">
            <AlertCircle className="w-5 h-5" />
            <div>
              <p className="font-semibold">Export Failed</p>
              <p className="text-sm mt-1">{exportError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-md">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          💡 <strong>Tip:</strong> You can edit the story content before exporting.
          Changes will be saved when you complete the wizard.
        </p>
      </div>
    </WizardFormLayout>
  );
}

