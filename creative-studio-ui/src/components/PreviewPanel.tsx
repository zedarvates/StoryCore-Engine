import React, { useRef, useEffect, useState } from 'react';
import { useStore } from '../store';
import { usePlaybackEngine } from '../hooks/usePlaybackEngine';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Maximize2,
  Volume2,
  VolumeX,
  Repeat,
} from 'lucide-react';

interface PreviewPanelProps {
  className?: string;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ className }) => {
  const { canvasRef } = usePlaybackEngine();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [loopMode, setLoopMode] = useState(false);

  const shots = useStore((state) => state.shots);
  const isPlaying = useStore((state) => state.isPlaying);
  const currentTime = useStore((state) => state.currentTime);
  const playbackSpeed = useStore((state) => state.playbackSpeed);
  const play = useStore((state) => state.play);
  const pause = useStore((state) => state.pause);
  const stop = useStore((state) => state.stop);
  const setCurrentTime = useStore((state) => state.setCurrentTime);
  const setPlaybackSpeed = useStore((state) => state.setPlaybackSpeed);

  // Calculate total duration
  const totalDuration = shots.reduce((acc, shot) => {
    let duration = acc + shot.duration;
    if (shot.transitionOut) {
      duration += shot.transitionOut.duration;
    }
    return duration;
  }, 0);

  // Format time as MM:SS:FF (minutes:seconds:frames)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30); // Assuming 30 FPS
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  // Handle play/pause toggle
  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  // Handle stop
  const handleStop = () => {
    stop();
  };

  // Handle frame-by-frame navigation
  const handlePreviousFrame = () => {
    const frameTime = 1 / 30; // 30 FPS
    setCurrentTime(Math.max(0, currentTime - frameTime));
  };

  const handleNextFrame = () => {
    const frameTime = 1 / 30; // 30 FPS
    setCurrentTime(Math.min(totalDuration, currentTime + frameTime));
  };

  // Handle fullscreen toggle
  const handleFullscreen = () => {
    if (!canvasRef.current) return;

    if (!isFullscreen) {
      if (canvasRef.current.requestFullscreen) {
        canvasRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  // Handle volume change
  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
    if (value[0] > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  // Handle mute toggle
  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  // Handle timeline scrubbing
  const handleTimelineChange = (value: number[]) => {
    setCurrentTime(value[0]);
  };

  // Handle timeline scrubbing with audio sync
  const handleTimelineScrub = (value: number[]) => {
    const newTime = value[0];
    setCurrentTime(newTime);
    
    // This would involve updating audio tracks to play from the new time
  };

  // Handle playback speed change
  const handlePlaybackSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
  };

  // Handle loop mode toggle
  const handleLoopToggle = () => {
    setLoopMode(!loopMode);
  };

  // Handle end of playback for loop mode
  useEffect(() => {
    if (loopMode && !isPlaying && currentTime >= totalDuration && totalDuration > 0) {
      setCurrentTime(0);
      play();
    }
  }, [currentTime, isPlaying, loopMode, totalDuration, play, setCurrentTime]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Video Canvas */}
        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain"
            style={{ imageRendering: 'crisp-edges' }}
          />

          {/* Fullscreen Button Overlay */}
          <Button
            size="sm"
            variant="ghost"
            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70"
            onClick={handleFullscreen}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Timeline Scrubber */}
        <div className="space-y-2">
          <Slider
            value={[currentTime]}
            min={0}
            max={totalDuration || 1}
            step={1 / 30} // 30 FPS
            onValueChange={handleTimelineScrub}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(totalDuration)}</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-2">
          {/* Frame Back */}
          <Button
            size="sm"
            variant="outline"
            onClick={handlePreviousFrame}
            disabled={currentTime <= 0}
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          {/* Play/Pause */}
          <Button
            size="lg"
            onClick={handlePlayPause}
            disabled={shots.length === 0}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </Button>

          {/* Stop */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleStop}
            disabled={!isPlaying && currentTime === 0}
          >
            <Square className="h-4 w-4" />
          </Button>

          {/* Frame Forward */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleNextFrame}
            disabled={currentTime >= totalDuration}
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleMuteToggle}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume]}
            min={0}
            max={100}
            step={1}
            onValueChange={handleVolumeChange}
            className="flex-1"
          />
          <span className="text-sm text-muted-foreground w-12 text-right">
            {isMuted ? 0 : volume}%
          </span>
        </div>

        {/* Playback Speed Control */}
        <div className="flex items-center gap-3">
          <Label htmlFor="playback-speed" className="text-sm whitespace-nowrap">
            Speed:
          </Label>
          <Select
            value={playbackSpeed.toString()}
            onValueChange={(value) => handlePlaybackSpeedChange(parseFloat(value))}
          >
            <SelectTrigger id="playback-speed" className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0.25">0.25x</SelectItem>
              <SelectItem value="0.5">0.5x</SelectItem>
              <SelectItem value="0.75">0.75x</SelectItem>
              <SelectItem value="1">1x</SelectItem>
              <SelectItem value="1.25">1.25x</SelectItem>
              <SelectItem value="1.5">1.5x</SelectItem>
              <SelectItem value="2">2x</SelectItem>
            </SelectContent>
          </Select>

          {/* Loop Mode Toggle */}
          <div className="flex items-center gap-2 ml-auto">
            <Switch
              id="loop-mode"
              checked={loopMode}
              onCheckedChange={handleLoopToggle}
            />
            <Label htmlFor="loop-mode" className="text-sm flex items-center gap-1 cursor-pointer">
              <Repeat className="h-4 w-4" />
              Loop
            </Label>
          </div>
        </div>

        {/* Timecode Display */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Timecode:</span>
            <span className="font-mono font-medium">{formatTime(currentTime)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Duration:</span>
            <span className="font-mono font-medium">{formatTime(totalDuration)}</span>
          </div>
        </div>

        {/* Shot Info */}
        {shots.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {shots.length} shot{shots.length !== 1 ? 's' : ''} in timeline
          </div>
        )}

        {shots.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No shots in timeline. Add shots to preview your video.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
