/**
 * PromptAnalysisPanel Component
 * 
 * Displays analysis of project prompts, identifies missing/incomplete prompts,
 * and provides suggestions with accept/modify/reject actions.
 * 
 * Requirements: 6.1, 6.2, 6.5
 */

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  Check,
  X,
  Edit,
} from 'lucide-react';
import { useProject } from '../contexts/ProjectContext';
import {
  generatePromptSuggestions,
  type ShotAnalysis,
} from '../utils/promptAnalysis';
import { memoizedAnalyzeProjectPrompts } from '../utils/performanceOptimizations';
import type { Shot } from '../types/projectDashboard';

// ============================================================================
// Component Props
// ============================================================================

export interface PromptAnalysisPanelProps {
  className?: string;
}

// ============================================================================
// PromptAnalysisPanel Component
// ============================================================================

export const PromptAnalysisPanel: React.FC<PromptAnalysisPanelProps> = ({
  className = '',
}) => {
  // ============================================================================
  // Context
  // ============================================================================

  const { project, updateShot, selectShot } = useProject();

  // ============================================================================
  // State
  // ============================================================================

  const [editingSuggestion, setEditingSuggestion] = useState<{
    shotId: string;
    suggestion: string;
  } | null>(null);

  // ============================================================================
  // Computed Values (Memoized for performance - Requirements: 10.1)
  // ============================================================================

  const analysis = useMemo(() => {
    if (!project) {
      return {
        totalShots: 0,
        completePrompts: 0,
        incompletePrompts: 0,
        invalidPrompts: 0,
        shotAnalyses: [],
        overallSuggestions: [],
      };
    }
    // Use memoized analysis for better performance with large projects
    return memoizedAnalyzeProjectPrompts(project);
  }, [project]);

  // Get shots with issues (missing or invalid prompts)
  const shotsWithIssues = useMemo(() => {
    return analysis.shotAnalyses.filter(sa => !sa.isValid);
  }, [analysis]);

  // ============================================================================
  // Handlers
  // ============================================================================

  /**
   * Accept a suggestion and apply it to the shot
   */
  const handleAcceptSuggestion = (shot: Shot, suggestion: string) => {
    updateShot(shot.id, { prompt: suggestion });
    setEditingSuggestion(null);
  };

  /**
   * Start editing a suggestion
   */
  const handleModifySuggestion = (shot: Shot, suggestion: string) => {
    setEditingSuggestion({
      shotId: shot.id,
      suggestion,
    });
  };

  /**
   * Apply the modified suggestion
   */
  const handleApplyModifiedSuggestion = () => {
    if (editingSuggestion) {
      const shot = project?.shots.find(s => s.id === editingSuggestion.shotId);
      if (shot) {
        updateShot(shot.id, { prompt: editingSuggestion.suggestion });
      }
      setEditingSuggestion(null);
    }
  };

  /**
   * Cancel editing a suggestion
   */
  const handleCancelEdit = () => {
    setEditingSuggestion(null);
  };

  /**
   * Reject a suggestion (no action needed, just dismiss)
   */
  const handleRejectSuggestion = () => {
    // No action needed - user simply doesn't apply the suggestion
  };

  /**
   * Navigate to a shot for editing
   */
  const handleGoToShot = (shot: Shot) => {
    selectShot(shot);
  };

  /**
   * Generate contextual suggestions for a shot
   */
  const getShotSuggestions = (shotAnalysis: ShotAnalysis): string[] => {
    if (!project) return shotAnalysis.suggestions;

    // Find surrounding shots for context
    const shotIndex = project.shots.findIndex(s => s.id === shotAnalysis.shot.id);
    const previousShot = shotIndex > 0 ? project.shots[shotIndex - 1] : undefined;
    const nextShot = shotIndex < project.shots.length - 1 ? project.shots[shotIndex + 1] : undefined;

    // Generate contextual suggestions
    const contextualSuggestions = generatePromptSuggestions(shotAnalysis.shot, {
      previousShot,
      nextShot,
    });

    // Combine with analysis suggestions, removing duplicates
    const allSuggestions = [...new Set([...shotAnalysis.suggestions, ...contextualSuggestions])];
    
    return allSuggestions;
  };

  // ============================================================================
  // Render Helpers
  // ============================================================================

  /**
   * Render the analysis summary section
   */
  const renderSummary = () => {
    const completionPercentage = analysis.totalShots > 0
      ? Math.round((analysis.completePrompts / analysis.totalShots) * 100)
      : 100;

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Total Shots */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Shots</p>
                <p className="text-3xl font-bold">{analysis.totalShots}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        {/* Complete Prompts */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Complete</p>
                <p className="text-3xl font-bold text-green-600">
                  {analysis.completePrompts}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {completionPercentage}% complete
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        {/* Incomplete Prompts */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Incomplete</p>
                <p className="text-3xl font-bold text-red-600">
                  {analysis.incompletePrompts}
                </p>
                {analysis.invalidPrompts > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {analysis.invalidPrompts} invalid
                  </p>
                )}
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  /**
   * Render overall suggestions
   */
  const renderOverallSuggestions = () => {
    if (analysis.overallSuggestions.length === 0) return null;

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-600" />
            Overall Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {analysis.overallSuggestions.map((suggestion, index) => (
              <li key={`overall-${index}`} className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{suggestion}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  };

  /**
   * Render a single shot analysis with suggestions
   */
  const renderShotAnalysis = (shotAnalysis: ShotAnalysis) => {
    const suggestions = getShotSuggestions(shotAnalysis);
    const isEditing = editingSuggestion?.shotId === shotAnalysis.shot.id;

    return (
      <Card key={shotAnalysis.shot.id} className="mb-4">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                Shot {shotAnalysis.shot.id.slice(0, 8)}
              </CardTitle>
              <CardDescription className="mt-1">
                Time: {shotAnalysis.shot.startTime}s - {shotAnalysis.shot.startTime + shotAnalysis.shot.duration}s
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleGoToShot(shotAnalysis.shot)}
            >
              Edit Shot
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Issues */}
          {shotAnalysis.issues.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-800 mb-2">Issues:</p>
              <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                {shotAnalysis.issues.map((issue, index) => (
                  <li key={`issue-${index}`}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Current Prompt */}
          {shotAnalysis.hasPrompt && (
            <div>
              <p className="text-sm font-medium mb-2">Current Prompt:</p>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {shotAnalysis.shot.prompt}
                </p>
              </div>
            </div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-600" />
                Suggestions:
              </p>
              <div className="space-y-3">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={`suggestion-${index}`}
                    className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                  >
                    {isEditing && editingSuggestion.suggestion === suggestion ? (
                      // Edit mode
                      <div className="space-y-3">
                        <Textarea
                          value={editingSuggestion.suggestion}
                          onChange={(e) =>
                            setEditingSuggestion({
                              ...editingSuggestion,
                              suggestion: e.target.value,
                            })
                          }
                          className="min-h-[100px]"
                          placeholder="Modify the suggestion..."
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={handleApplyModifiedSuggestion}
                            className="flex items-center gap-1"
                          >
                            <Check className="h-3 w-3" />
                            Apply
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                            className="flex items-center gap-1"
                          >
                            <X className="h-3 w-3" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // View mode
                      <>
                        <p className="text-sm text-yellow-900 mb-3">{suggestion}</p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleAcceptSuggestion(shotAnalysis.shot, suggestion)}
                            className="flex items-center gap-1"
                          >
                            <Check className="h-3 w-3" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleModifySuggestion(shotAnalysis.shot, suggestion)}
                            className="flex items-center gap-1"
                          >
                            <Edit className="h-3 w-3" />
                            Modify
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleRejectSuggestion}
                            className="flex items-center gap-1"
                          >
                            <X className="h-3 w-3" />
                            Reject
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // ============================================================================
  // Main Render
  // ============================================================================

  if (!project) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No project loaded</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Summary Cards */}
      {renderSummary()}

      {/* Overall Suggestions */}
      {renderOverallSuggestions()}

      {/* Shots with Issues */}
      {shotsWithIssues.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Shots Needing Attention</CardTitle>
            <CardDescription>
              {shotsWithIssues.length} shot{shotsWithIssues.length !== 1 ? 's' : ''} with missing or incomplete prompts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              {shotsWithIssues.map(renderShotAnalysis)}
            </ScrollArea>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
              <p className="text-sm font-medium text-green-800">All prompts are complete!</p>
              <p className="text-xs text-muted-foreground mt-2">
                Your project is ready for sequence generation
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PromptAnalysisPanel;
