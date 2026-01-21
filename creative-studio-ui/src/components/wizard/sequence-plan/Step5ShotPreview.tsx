import { useState, useEffect, useMemo, useRef } from 'react';
import { Play, Pause, ZoomIn, ZoomOut, Camera, Clock, AlertTriangle, Download, Eye, SkipBack, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { SequencePlan, Scene } from '@/types/sequencePlan';
import { ProductionShot, ShotType } from '@/types/shot';

interface Step5ShotPreviewProps {
  sequencePlan: Partial<SequencePlan>;
  onShotsChange: (shots: ProductionShot[]) => void;
}

// Extended shot interface for preview
interface PreviewShot extends Omit<ProductionShot, 'id' | 'sequencePlanId'> {
  id: string;
  sequencePlanId: string;
  description: string;
  estimatedDuration: number; // in frames
  videoUrl?: string; // URL to the generated video preview
}

// Camera angle presets for shot generation
const CAMERA_ANGLES: { type: ShotType; framing: string; angle: string; description: string }[] = [
  { type: 'wide', framing: 'wide', angle: 'eye-level', description: 'Establishing wide shot' },
  { type: 'medium', framing: 'medium', angle: 'eye-level', description: 'Medium conversation shot' },
  { type: 'close-up', framing: 'close-up', angle: 'eye-level', description: 'Close-up on character' },
  { type: 'over-the-shoulder', framing: 'medium', angle: 'eye-level', description: 'Over-the-shoulder POV' },
  { type: 'pov', framing: 'medium', angle: 'eye-level', description: 'First-person POV' },
];

// Shot generation logic
function generateShotsFromScenes(scenes: Scene[], sequencePlanId: string): PreviewShot[] {
  const shots: PreviewShot[] = [];
  let shotCounter = 1;

  scenes.forEach(scene => {
    const shotCount = Math.max(1, scene.estimatedShotCount);
    const defaultDuration = 120; // 5 seconds at 24fps

    // Generate shots based on beats + base shots
    const totalShots = Math.max(shotCount, scene.beats.length + 1);

    for (let i = 0; i < totalShots; i++) {
      const cameraAngle = CAMERA_ANGLES[i % CAMERA_ANGLES.length];

      const shot: PreviewShot = {
        id: `shot-${scene.id}-${i + 1}`,
        sequencePlanId,
        sceneId: scene.id,
        number: shotCounter++,
        type: cameraAngle.type,
        category: i === 0 ? 'establishing' : i === totalShots - 1 ? 'reaction' : 'action',
        description: scene.beats[i] || `Shot ${i + 1} of scene ${scene.number}`,
        estimatedDuration: defaultDuration,
        videoUrl: `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4`, // Mock video URL for demo
        composition: {
          characterIds: scene.characterIds,
          characterPositions: [], // Will be populated based on shot type
          environmentId: scene.locationId,
          props: [],
          lightingMood: 'natural',
          timeOfDay: 'day',
        },
        camera: {
          framing: cameraAngle.framing as any,
          angle: cameraAngle.angle as any,
          movement: { type: 'static' },
        },
        timing: {
          duration: defaultDuration,
          inPoint: 0,
          outPoint: defaultDuration,
          transition: 'cut',
          transitionDuration: 0,
        },
        generation: {
          aiProvider: 'default',
          model: 'default',
          prompt: `Generate a ${cameraAngle.description.toLowerCase()} for scene: ${scene.title}`,
          negativePrompt: '',
          comfyuiPreset: 'default',
          parameters: {
            width: 1920,
            height: 1080,
            steps: 20,
            cfgScale: 7,
            sampler: 'euler',
            scheduler: 'normal',
          },
          styleReferences: [],
        },
        status: 'planned',
        notes: cameraAngle.description,
        tags: [`scene-${scene.number}`, cameraAngle.type],
        templates: [],
      };

      shots.push(shot);
    }
  });

  return shots;
}

export function Step5ShotPreview({
  sequencePlan,
  onShotsChange,
}: Step5ShotPreviewProps) {
  const [generatedShots, setGeneratedShots] = useState<PreviewShot[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [selectedShot, setSelectedShot] = useState<PreviewShot | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [viewerZoom, setViewerZoom] = useState(1);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Generate shots when scenes change
  useEffect(() => {
    if (sequencePlan.scenes && sequencePlan.scenes.length > 0 && sequencePlan.id) {
      const shots = generateShotsFromScenes(sequencePlan.scenes, sequencePlan.id);
      setGeneratedShots(shots);
      onShotsChange(shots);
    }
  }, [sequencePlan.scenes, sequencePlan.id, onShotsChange]);

  // Calculate total duration
  const totalDuration = useMemo(() => {
    return generatedShots.reduce((total, shot) => total + shot.estimatedDuration, 0);
  }, [generatedShots]);

  // Calculate duration per act/scene
  const durationByAct = useMemo(() => {
    const durations: Record<string, number> = {};
    if (!sequencePlan.acts || !sequencePlan.scenes) return durations;

    sequencePlan.acts.forEach(act => {
      const actScenes = sequencePlan.scenes!.filter(scene => scene.actId === act.id);
      const actShots = generatedShots.filter(shot =>
        actScenes.some(scene => scene.id === shot.sceneId)
      );
      durations[act.id] = actShots.reduce((total, shot) => total + shot.estimatedDuration, 0);
    });
    return durations;
  }, [sequencePlan.acts, sequencePlan.scenes, generatedShots]);

  const formatDuration = (frames: number): string => {
    const fps = sequencePlan.frameRate || 24;
    const seconds = frames / fps;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleScrub = (time: number[]) => {
    setCurrentTime(time[0]);
  };

  const handleZoom = (direction: 'in' | 'out') => {
    setZoom(prev => Math.max(0.1, Math.min(5, prev + (direction === 'in' ? 0.1 : -0.1))));
  };

  const stepForward = () => {
    setCurrentTime(prev => Math.min(totalDuration, prev + 1));
  };

  const stepBackward = () => {
    setCurrentTime(prev => Math.max(0, prev - 1));
  };

  // Timeline simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          const next = prev + 1;
          if (next >= totalDuration) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }, 1000 / ((sequencePlan.frameRate || 24) * playbackSpeed));
    }
    return () => clearInterval(interval);
  }, [isPlaying, totalDuration, sequencePlan.frameRate, playbackSpeed]);

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (generatedShots.length === 0) {
      errors.push("No shots generated. Please ensure scenes have been created in the previous step.");
    }
    return errors;
  }, [generatedShots]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Shot Preview</h2>
        <p className="text-gray-600">
          Preview your sequence timeline and visualize the shot breakdown.
        </p>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {validationErrors.map((error, index) => (
              <div key={index}>{error}</div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{generatedShots.length}</div>
          <div className="text-sm text-blue-600">Total Shots</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{formatDuration(totalDuration)}</div>
          <div className="text-sm text-green-600">Total Duration</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">{sequencePlan.acts?.length || 0}</div>
          <div className="text-sm text-purple-600">Acts</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">{sequencePlan.scenes?.length || 0}</div>
          <div className="text-sm text-orange-600">Scenes</div>
        </div>
      </div>

      {/* Timeline Controls */}
      <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={stepBackward}
            disabled={generatedShots.length === 0}
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePlayPause}
            disabled={generatedShots.length === 0}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={stepForward}
            disabled={generatedShots.length === 0}
          >
            <SkipForward className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => handleZoom('out')}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600 min-w-[3rem]">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="sm" onClick={() => handleZoom('in')}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          <Select value={playbackSpeed.toString()} onValueChange={(value) => setPlaybackSpeed(parseFloat(value))}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0.25">0.25x</SelectItem>
              <SelectItem value="0.5">0.5x</SelectItem>
              <SelectItem value="1">1x</SelectItem>
              <SelectItem value="1.5">1.5x</SelectItem>
              <SelectItem value="2">2x</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
        </div>
      </div>

      {/* Timeline Scrubber */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Timeline</span>
          <span>{formatDuration(currentTime)} / {formatDuration(totalDuration)}</span>
        </div>
        <Slider
          value={[currentTime]}
          onValueChange={handleScrub}
          max={totalDuration}
          step={1}
          className="w-full"
        />
      </div>

      {/* Timeline Visualization */}
      <div
        ref={timelineRef}
        className="border rounded-lg bg-white overflow-x-auto"
        style={{ maxHeight: '600px' }}
      >
        <div className="p-4" style={{ width: `${Math.max(100, totalDuration * zoom)}px` }}>
          {/* Act/Scene/Shots Hierarchy */}
          {sequencePlan.acts?.map(act => (
            <div key={act.id} className="mb-8">
              {/* Act Header */}
              <div className="flex items-center gap-2 mb-4 p-2 bg-blue-50 rounded">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {act.number}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Act {act.number}: {act.title}</h3>
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(durationByAct[act.id] || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Scenes in this Act */}
              {sequencePlan.scenes?.filter(scene => scene.actId === act.id).map(scene => (
                <div key={scene.id} className="ml-4 mb-4">
                  {/* Scene Header */}
                  <div className="flex items-center gap-2 mb-2 p-2 bg-gray-50 rounded">
                    <div className="w-6 h-6 bg-gray-600 text-white rounded-full flex items-center justify-center text-xs">
                      {scene.number}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">{scene.title}</h4>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{scene.estimatedShotCount} shots</span>
                      </div>
                    </div>
                  </div>

                  {/* Shots in this Scene */}
                  <div className="ml-6 flex gap-1">
                    {generatedShots.filter(shot => shot.sceneId === scene.id).map(shot => (
                      <div
                        key={shot.id}
                        className={cn(
                          'h-20 rounded cursor-pointer transition-all border-2 flex flex-col items-center justify-center text-xs font-medium min-w-[80px] overflow-hidden',
                          selectedShot?.id === shot.id
                            ? 'border-blue-500 bg-blue-100'
                            : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                        )}
                        style={{ width: `${Math.max(80, shot.estimatedDuration * zoom)}px` }}
                        onClick={() => setSelectedShot(shot)}
                        title={`${shot.type} - ${shot.description}`}
                      >
                        {shot.videoUrl ? (
                          <video
                            src={shot.videoUrl}
                            className="w-full h-12 object-cover rounded-t"
                            preload="metadata"
                            muted
                            loop
                          />
                        ) : (
                          <div className="w-full h-12 bg-gray-200 flex items-center justify-center rounded-t">
                            <Camera className="h-4 w-4 text-gray-500" />
                          </div>
                        )}
                        <div className="flex items-center gap-1 mt-1">
                          <span>{shot.number}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Selected Shot Details */}
      {selectedShot && (
        <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
          <h3 className="font-semibold text-gray-900">Shot {selectedShot.number} Details</h3>

          {/* Video Viewer */}
          <div className="flex flex-col items-center space-y-2">
            <div className="relative overflow-hidden rounded-lg bg-black" style={{ width: '400px', height: '225px' }}>
              {selectedShot.videoUrl ? (
                <video
                  src={selectedShot.videoUrl}
                  className="w-full h-full object-contain"
                  controls
                  style={{ transform: `scale(${viewerZoom})`, transformOrigin: 'center' }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                  <Camera className="h-8 w-8" />
                  <span>No video available</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setViewerZoom(prev => Math.max(1, prev - 0.25))}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-600 min-w-[3rem]">{Math.round(viewerZoom * 100)}%</span>
              <Button variant="ghost" size="sm" onClick={() => setViewerZoom(prev => Math.min(4, prev + 0.25))}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Type</label>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{selectedShot.type}</Badge>
                <span className="text-sm text-gray-600">{selectedShot.category}</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Duration</label>
              <div className="text-sm">{formatDuration(selectedShot.estimatedDuration)}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Camera</label>
              <div className="text-sm">{selectedShot.camera.framing} • {selectedShot.camera.angle}</div>
            </div>
          </div>
          <div className="mt-2">
            <label className="text-sm font-medium text-gray-600">Description</label>
            <div className="text-sm text-gray-700">{selectedShot.description}</div>
          </div>
        </div>
      )}
    </div>
  );
}
