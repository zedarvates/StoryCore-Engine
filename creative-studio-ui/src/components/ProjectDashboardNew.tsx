/**
 * ProjectDashboardNew Component
 * 
 * Enhanced project dashboard that integrates shot-level prompt management
 * with automated sequence generation and advanced audio track synchronization.
 * 
 * Features:
 * - Shot-level prompt management with real-time validation
 * - Automated sequence generation through StoryCore pipeline
 * - Audio track management with phrase-level dialogue synchronization
 * - Voice generation integration
 * - Progress tracking and error handling
 * 
 * Requirements: 1.1, 1.2, 1.4, 1.5, 2.3, 2.4, 3.1, 4.1, 6.1, 6.2
 */

import React, { useState } from 'react';
import { ProjectProvider, useProject } from '../contexts/ProjectContext';
import { PromptManagementPanel } from './PromptManagementPanel';
import { SequenceGenerationControl } from './SequenceGenerationControl';
import { AudioTrackManager } from './AudioTrackManager';
import { PromptAnalysisPanel } from './PromptAnalysisPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, AlertCircle, CheckCircle, Save, FileText, Music, Sparkles, TrendingUp } from 'lucide-react';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import type { Project, GenerationResults } from '../types/projectDashboard';

// ============================================================================
// Component Props
// ============================================================================

export interface ProjectDashboardNewProps {
  projectId: string;
  onProjectUpdate?: (project: Project) => void;
  onGenerationComplete?: (results: GenerationResults) => void;
}

// ============================================================================
// Inner Component (uses ProjectContext)
// ============================================================================

/**
 * ProjectDashboardContent - Main dashboard content with all integrated panels
 * Requirements: 1.1, 1.2, 1.4, 1.5, 2.3, 2.4, 3.1, 4.1, 6.1, 6.2
 */
const ProjectDashboardContent: React.FC = () => {
  // ============================================================================
  // Context
  // ============================================================================

  const {
    project,
    isLoading,
    isSaving,
    saveStatus,
    error,
    getPromptCompletionStatus,
    isGenerating,
  } = useProject();

  // ============================================================================
  // Local State
  // ============================================================================

  const [activeTab, setActiveTab] = useState<string>('prompts');

  // ============================================================================
  // Keyboard Shortcuts
  // ============================================================================

  useKeyboardShortcuts({
    shortcuts: [
      {
        key: '1',
        ctrlKey: true,
        action: () => setActiveTab('prompts'),
        description: 'Switch to Prompts tab',
      },
      {
        key: '2',
        ctrlKey: true,
        action: () => setActiveTab('audio'),
        description: 'Switch to Audio tab',
      },
      {
        key: '3',
        ctrlKey: true,
        action: () => setActiveTab('generate'),
        description: 'Switch to Generate tab',
      },
      {
        key: '4',
        ctrlKey: true,
        action: () => setActiveTab('analysis'),
        description: 'Switch to Analysis tab',
      },
    ],
    enabled: !isLoading && !error && !!project,
  });

  // ============================================================================
  // Computed Values
  // ============================================================================

  const promptStatus = project ? getPromptCompletionStatus() : { complete: 0, incomplete: 0, total: 0 };
  const completionPercentage = promptStatus.total > 0
    ? Math.round((promptStatus.complete / promptStatus.total) * 100)
    : 0;

  // ============================================================================
  // Render Helpers
  // ============================================================================

  /**
   * Render save status indicator
   * Requirements: 9.1, 9.2
   */
  const renderSaveStatus = () => {
    if (isSaving || saveStatus === 'saving') {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Saving...
        </Badge>
      );
    }

    if (saveStatus === 'saved') {
      return (
        <Badge variant="outline" className="flex items-center gap-1 text-green-600 border-green-600">
          <CheckCircle className="h-3 w-3" />
          Saved
        </Badge>
      );
    }

    if (saveStatus === 'error') {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Save Failed
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Save className="h-3 w-3" />
        Auto-save enabled
      </Badge>
    );
  };

  /**
   * Render generation status indicator
   * Requirements: 3.6, 8.1
   */
  const renderGenerationStatus = () => {
    if (!isGenerating) return null;

    return (
      <Badge variant="default" className="flex items-center gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Generating...
      </Badge>
    );
  };

  // ============================================================================
  // Loading State
  // ============================================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center">
                <p className="text-lg font-medium">Loading project...</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Please wait while we load your project data
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================================
  // Error State
  // ============================================================================

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-6 w-6" />
              Error Loading Project
            </CardTitle>
            <CardDescription>
              An error occurred while loading the project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================================
  // No Project State
  // ============================================================================

  if (!project) {
    return (
      <div className="flex items-center justify-center h-screen bg-background p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-6 w-6" />
              Project Not Found
            </CardTitle>
            <CardDescription>
              Failed to load project data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              The requested project could not be loaded. Please check the project ID and try again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================================
  // Main Dashboard Render
  // ============================================================================

  return (
    <div className="project-dashboard-new h-screen flex flex-col bg-background" role="main" aria-label="Project Dashboard">
      {/* Header */}
      <header className="border-b bg-card" role="banner">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Project Info */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-sm text-muted-foreground">
                  Project ID: {project.id}
                </p>
                <span className="text-muted-foreground" aria-hidden="true">•</span>
                <p className="text-sm text-muted-foreground">
                  Schema v{project.schemaVersion}
                </p>
              </div>
            </div>

            {/* Status Indicators */}
            <div className="flex items-center gap-3" role="status" aria-label="Project status indicators">
              {/* Prompt Completion */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Prompts:</span>
                <Badge
                  variant={completionPercentage === 100 ? 'default' : 'secondary'}
                  className="flex items-center gap-1"
                  aria-label={`${promptStatus.complete} of ${promptStatus.total} prompts complete`}
                >
                  {completionPercentage === 100 ? (
                    <CheckCircle className="h-3 w-3" aria-hidden="true" />
                  ) : (
                    <FileText className="h-3 w-3" aria-hidden="true" />
                  )}
                  {promptStatus.complete}/{promptStatus.total}
                </Badge>
              </div>

              {/* Generation Status */}
              {renderGenerationStatus()}

              {/* Save Status */}
              {renderSaveStatus()}
            </div>
          </div>

          {/* Progress Bar */}
          {promptStatus.total > 0 && (
            <div className="mt-3" role="progressbar" aria-valuenow={completionPercentage.toString()} aria-valuemin="0" aria-valuemax="100" aria-label="Prompt completion progress">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">
                  Prompt Completion
                </span>
                <span className="text-xs font-medium">
                  {completionPercentage}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden" role="main">
        <div className="container mx-auto h-full">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="h-full flex flex-col"
          >
            {/* Tab Navigation */}
            <div className="border-b bg-card px-6 pt-4">
              <TabsList className="grid w-full max-w-2xl grid-cols-4" role="tablist" aria-label="Dashboard sections">
                <TabsTrigger value="prompts" className="flex items-center gap-2" role="tab" aria-label="Prompts section" aria-controls="prompts-panel">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Prompts</span>
                </TabsTrigger>
                <TabsTrigger value="audio" className="flex items-center gap-2" role="tab" aria-label="Audio section" aria-controls="audio-panel">
                  <Music className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Audio</span>
                </TabsTrigger>
                <TabsTrigger value="generate" className="flex items-center gap-2" role="tab" aria-label="Generate section" aria-controls="generate-panel">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Generate</span>
                </TabsTrigger>
                <TabsTrigger value="analysis" className="flex items-center gap-2" role="tab" aria-label="Analysis section" aria-controls="analysis-panel">
                  <TrendingUp className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Analysis</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto">
              {/* Prompts Tab */}
              {/* Requirements: 1.1, 1.4, 1.5, 2.4 */}
              <TabsContent value="prompts" className="h-full m-0 p-6" role="tabpanel" id="prompts-panel" aria-labelledby="prompts-tab">
                <PromptManagementPanel />
              </TabsContent>

              {/* Audio Tab */}
              {/* Requirements: 4.1, 4.2, 4.3, 5.1 */}
              <TabsContent value="audio" className="h-full m-0 p-0" role="tabpanel" id="audio-panel" aria-labelledby="audio-tab">
                <AudioTrackManager />
              </TabsContent>

              {/* Generate Tab */}
              {/* Requirements: 2.3, 2.4, 3.1 */}
              <TabsContent value="generate" className="h-full m-0 p-6" role="tabpanel" id="generate-panel" aria-labelledby="generate-tab">
                <div className="max-w-4xl mx-auto">
                  <SequenceGenerationControl />
                </div>
              </TabsContent>

              {/* Analysis Tab */}
              {/* Requirements: 6.1, 6.2 */}
              <TabsContent value="analysis" className="h-full m-0 p-6" role="tabpanel" id="analysis-panel" aria-labelledby="analysis-tab">
                <PromptAnalysisPanel />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card" role="contentinfo">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4" role="status" aria-label="Project statistics">
              <span>Shots: {project.shots.length}</span>
              <span aria-hidden="true">•</span>
              <span>Phrases: {project.audioPhrases.length}</span>
              <span aria-hidden="true">•</span>
              <span>Sequences: {project.sequences.length}</span>
            </div>
            <div className="flex items-center gap-2" role="status" aria-label="Project capabilities">
              {project.capabilities.gridGeneration && (
                <Badge variant="outline" className="text-xs" aria-label="Grid generation enabled">Grid Gen</Badge>
              )}
              {project.capabilities.promotionEngine && (
                <Badge variant="outline" className="text-xs" aria-label="Promotion engine enabled">Promotion</Badge>
              )}
              {project.capabilities.qaEngine && (
                <Badge variant="outline" className="text-xs" aria-label="QA engine enabled">QA</Badge>
              )}
              {project.capabilities.voiceGeneration && (
                <Badge variant="outline" className="text-xs" aria-label="Voice generation enabled">Voice</Badge>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// ============================================================================
// Main Component (wraps with ProjectProvider)
// ============================================================================

export const ProjectDashboardNew: React.FC<ProjectDashboardNewProps> = ({
  projectId,
  onProjectUpdate,
  onGenerationComplete,
}) => {
  return (
    <ProjectProvider
      projectId={projectId}
      onProjectUpdate={onProjectUpdate}
      onGenerationComplete={onGenerationComplete}
    >
      <ProjectDashboardContent />
    </ProjectProvider>
  );
};

export default ProjectDashboardNew;