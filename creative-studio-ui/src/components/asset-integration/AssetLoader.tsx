import React, { useState } from 'react';
import { ProjectTemplateService, TimelineService, NarrativeService } from '../../services/asset-integration';
import { ProjectTemplate, VideoTimelineMetadata, NarrativeText } from '../../types/asset-integration';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, FileText, Film, BookOpen } from 'lucide-react';

interface AssetLoaderProps {
  onProjectTemplateLoaded: (template: ProjectTemplate) => void;
  onTimelineLoaded: (timeline: VideoTimelineMetadata) => void;
  onNarrativeLoaded: (narrative: NarrativeText) => void;
}

export const AssetLoader: React.FC<AssetLoaderProps> = ({
  onProjectTemplateLoaded,
  onTimelineLoaded,
  onNarrativeLoaded,
}) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const projectService = ProjectTemplateService.getInstance();
  const timelineService = TimelineService.getInstance();
  const narrativeService = NarrativeService.getInstance();

  const handleLoadProjectTemplate = async () => {
    setLoading('project');
    setError(null);
    try {
      const templates = await projectService.listAvailableTemplates();
      if (templates.length > 0) {
        const template = await projectService.loadProjectTemplate(templates[0]);
        onProjectTemplateLoaded(template);
      }
    } catch (err) {
      setError(`Failed to load project template: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(null);
    }
  };

  const handleLoadTimeline = async () => {
    setLoading('timeline');
    setError(null);
    try {
      const timelines = await timelineService.listAvailableTimelines();
      if (timelines.length > 0) {
        const timeline = await timelineService.loadTimeline(timelines[0]);
        onTimelineLoaded(timeline);
      }
    } catch (err) {
      setError(`Failed to load timeline: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(null);
    }
  };

  const handleLoadNarrative = async () => {
    setLoading('narrative');
    setError(null);
    try {
      const narratives = await narrativeService.listAvailableNarratives();
      if (narratives.length > 0) {
        const narrative = await narrativeService.loadNarrativeText(narratives[0]);
        onNarrativeLoaded(narrative);
      } else {
        // Create a new narrative if none exist
        const newNarrative = narrativeService.createNewNarrative('New Narrative', 'notes');
        onNarrativeLoaded(newNarrative);
      }
    } catch (err) {
      setError(`Failed to load narrative: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Load Assets</CardTitle>
        <CardDescription>
          Load project templates, video timelines, and narrative texts into the editor.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            onClick={handleLoadProjectTemplate}
            disabled={loading !== null}
            className="flex flex-col items-center p-6 h-auto"
            variant="outline"
          >
            {loading === 'project' ? (
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
            ) : (
              <FileText className="h-8 w-8 mb-2" />
            )}
            <span className="text-sm">Load Project Template</span>
          </Button>

          <Button
            onClick={handleLoadTimeline}
            disabled={loading !== null}
            className="flex flex-col items-center p-6 h-auto"
            variant="outline"
          >
            {loading === 'timeline' ? (
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
            ) : (
              <Film className="h-8 w-8 mb-2" />
            )}
            <span className="text-sm">Load Timeline</span>
          </Button>

          <Button
            onClick={handleLoadNarrative}
            disabled={loading !== null}
            className="flex flex-col items-center p-6 h-auto"
            variant="outline"
          >
            {loading === 'narrative' ? (
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
            ) : (
              <BookOpen className="h-8 w-8 mb-2" />
            )}
            <span className="text-sm">Load Narrative</span>
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};