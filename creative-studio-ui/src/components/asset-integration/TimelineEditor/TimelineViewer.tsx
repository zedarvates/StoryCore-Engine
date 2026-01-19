import React from 'react';
import { VideoTimelineMetadata, Scene } from '../../../types/asset-integration';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Film, Clock, Users, Mic, Camera } from 'lucide-react';

interface TimelineViewerProps {
  timeline: VideoTimelineMetadata;
  currentTime?: number;
  onSceneClick?: (scene: Scene) => void;
}

export const TimelineViewer: React.FC<TimelineViewerProps> = ({
  timeline,
  currentTime = 0,
  onSceneClick,
}) => {
  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getSceneElementsCount = (scene: Scene): { audio: number; video: number; characters: number; dialogue: number } => {
    return {
      audio: scene.elements.audio.length,
      video: scene.elements.video.length,
      characters: scene.characters.length,
      dialogue: scene.dialogue.length,
    };
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Film className="h-5 w-5" />
          <span>{timeline.metadata.title}</span>
          <Badge variant="outline">{timeline.scenes.length} scenes</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Timeline Metadata */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Duration:</span> {timeline.metadata.total_duration}s
            </div>
            <div>
              <span className="font-medium">Frame Rate:</span> {timeline.metadata.frame_rate}fps
            </div>
            <div>
              <span className="font-medium">Resolution:</span> {timeline.metadata.resolution}
            </div>
            <div>
              <span className="font-medium">Codec:</span> {timeline.metadata.video_codec}
            </div>
          </div>

          {/* Scene Timeline */}
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {timeline.scenes.map((scene) => {
                const elements = getSceneElementsCount(scene);
                const isActive = currentTime >= scene.start_time && currentTime <= scene.end_time;

                return (
                  <div
                    key={scene.scene_number}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      isActive ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => onSceneClick?.(scene)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Scene {scene.scene_number}</h4>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span>{formatTime(scene.start_time)} - {formatTime(scene.end_time)}</span>
                        <Badge variant="secondary">{scene.duration}s</Badge>
                      </div>
                    </div>

                    <p className="text-sm text-gray-700 mb-3">{scene.description}</p>

                    <div className="flex items-center space-x-4 text-xs text-gray-600">
                      {elements.video > 0 && (
                        <div className="flex items-center space-x-1">
                          <Film className="h-3 w-3" />
                          <span>{elements.video} video</span>
                        </div>
                      )}
                      {elements.audio > 0 && (
                        <div className="flex items-center space-x-1">
                          <Mic className="h-3 w-3" />
                          <span>{elements.audio} audio</span>
                        </div>
                      )}
                      {elements.characters > 0 && (
                        <div className="flex items-center space-x-1">
                          <Users className="h-3 w-3" />
                          <span>{elements.characters} characters</span>
                        </div>
                      )}
                      {elements.dialogue > 0 && (
                        <div className="flex items-center space-x-1">
                          <Camera className="h-3 w-3" />
                          <span>{elements.dialogue} dialogue</span>
                        </div>
                      )}
                    </div>

                    {scene.transitions.length > 0 && (
                      <div className="mt-2">
                        <Badge variant="outline" className="text-xs">
                          {scene.transitions.length} transition{scene.transitions.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};