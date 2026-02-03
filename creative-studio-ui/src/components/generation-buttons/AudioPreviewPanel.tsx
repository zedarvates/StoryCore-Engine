/**
 * Audio Preview Panel Component
 * 
 * Displays generated audio with waveform visualization, playback controls, metadata, and action buttons.
 * Provides save, regenerate, and export options.
 * Associates audio with current shot or sequence.
 * 
 * Requirements: 4.5
 */

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Slider } from '../ui/slider';
import {
  Download,
  RefreshCw,
  Volume2 as AudioIcon,
  Calendar,
  HardDrive,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Clock,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import type { GeneratedAsset } from '../../types/generation';

export interface AudioPreviewPanelProps {
  /**
   * Generated audio asset
   */
  asset: GeneratedAsset;
  
  /**
   * Callback when save is clicked
   */
  onSave?: (asset: GeneratedAsset) => void;
  
  /**
   * Callback when regenerate is clicked
   */
  onRegenerate?: () => void;
  
  /**
   * Callback when audio is associated with shot/sequence
   */
  onAssociate?: (asset: GeneratedAsset) => void;
  
  /**
   * Custom className for styling
   */
  className?: string;
}

/**
 * Format file size for display
 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Format timestamp for display
 */
const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

/**
 * Format duration for display (seconds to MM:SS)
 */
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Audio Preview Panel
 * 
 * Displays generated audio with waveform visualization, playback controls, metadata, parameters, and action buttons.
 * Allows association with current shot or sequence.
 */
export const AudioPreviewPanel: React.FC<AudioPreviewPanelProps> = ({
  asset,
  onSave,
  onRegenerate,
  onAssociate,
  className = '',
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  
  const { metadata } = asset;
  const { generationParams, fileSize, format } = metadata;
  const audioDuration = metadata.duration || 0;
  
  /**
   * Generate simple waveform visualization
   */
  useEffect(() => {
    // Generate mock waveform data (in production, this would analyze the audio)
    const mockWaveform = Array.from({ length: 100 }, () => Math.random());
    setWaveformData(mockWaveform);
  }, [asset.url]);
  
  /**
   * Draw waveform on canvas
   */
  useEffect(() => {
    if (!canvasRef.current || waveformData.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw waveform
    const barWidth = width / waveformData.length;
    const centerY = height / 2;
    
    ctx.fillStyle = 'hsl(var(--primary))';
    
    waveformData.forEach((value, index) => {
      const barHeight = value * centerY;
      const x = index * barWidth;
      
      // Draw bar (mirrored top and bottom)
      ctx.fillRect(x, centerY - barHeight, barWidth - 1, barHeight);
      ctx.fillRect(x, centerY, barWidth - 1, barHeight);
    });
    
    // Draw progress indicator
    if (duration > 0) {
      const progress = currentTime / duration;
      const progressX = progress * width;
      
      ctx.fillStyle = 'hsl(var(--primary) / 0.3)';
      ctx.fillRect(0, 0, progressX, height);
    }
  }, [waveformData, currentTime, duration]);
  
  /**
   * Handle play/pause toggle
   */
  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };
  
  /**
   * Handle mute toggle
   */
  const toggleMute = () => {
    if (!audioRef.current) return;
    
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };
  
  /**
   * Handle volume change
   */
  const handleVolumeChange = (value: number[]) => {
    if (!audioRef.current) return;
    
    const newVolume = value[0];
    audioRef.current.volume = newVolume;
    setVolume(newVolume);
    
    // Unmute if volume is increased from 0
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
      audioRef.current.muted = false;
    }
  };
  
  /**
   * Handle time update
   */
  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  };
  
  /**
   * Handle loaded metadata
   */
  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  };
  
  /**
   * Handle seek
   */
  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    
    const newTime = value[0];
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };
  
  /**
   * Handle audio ended
   */
  const handleAudioEnded = () => {
    setIsPlaying(false);
  };
  
  /**
   * Skip backward 10 seconds
   */
  const skipBackward = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
  };
  
  /**
   * Skip forward 10 seconds
   */
  const skipForward = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 10);
  };
  
  /**
   * Handle save action
   */
  const handleSave = () => {
    if (onSave) {
      onSave(asset);
    }
  };
  
  /**
   * Handle regenerate action
   */
  const handleRegenerate = () => {
    if (onRegenerate) {
      onRegenerate();
    }
  };
  
  /**
   * Handle associate action
   */
  const handleAssociate = () => {
    if (onAssociate) {
      onAssociate(asset);
    }
  };
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AudioIcon className="h-5 w-5" />
          Generated Audio
        </CardTitle>
        <CardDescription>
          Audio generated successfully. You can save, regenerate, or associate with your project.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Hidden Audio Element */}
        <audio
          ref={audioRef}
          src={asset.url}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleAudioEnded}
        />
        
        {/* Waveform Visualization */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={800}
            height={120}
            className="w-full h-[120px] rounded-lg border bg-muted/30"
          />
        </div>
        
        {/* Audio Controls */}
        <div className="space-y-2">
          {/* Progress Bar */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground min-w-[40px]">
              {formatDuration(currentTime)}
            </span>
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground min-w-[40px]">
              {formatDuration(duration)}
            </span>
          </div>
          
          {/* Control Buttons */}
          <div className="flex items-center gap-2">
            {/* Skip Backward */}
            <Button
              variant="outline"
              size="icon"
              onClick={skipBackward}
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            
            {/* Play/Pause */}
            <Button
              variant="outline"
              size="icon"
              onClick={togglePlayPause}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            
            {/* Skip Forward */}
            <Button
              variant="outline"
              size="icon"
              onClick={skipForward}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
            
            {/* Mute/Unmute */}
            <Button
              variant="outline"
              size="icon"
              onClick={toggleMute}
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            
            {/* Volume Slider */}
            <div className="flex items-center gap-2 flex-1 max-w-[200px]">
              <Slider
                value={[volume]}
                max={1}
                step={0.01}
                onValueChange={handleVolumeChange}
              />
            </div>
          </div>
        </div>
        
        {/* Metadata */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Metadata</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {/* Duration */}
            {audioDuration > 0 && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Duration:</span>
                <Badge variant="secondary">{formatDuration(audioDuration)}</Badge>
              </div>
            )}
            
            {/* File Size */}
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Size:</span>
              <Badge variant="secondary">{formatFileSize(fileSize)}</Badge>
            </div>
            
            {/* Format */}
            <div className="flex items-center gap-2">
              <AudioIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Format:</span>
              <Badge variant="secondary">{format.toUpperCase()}</Badge>
            </div>
            
            {/* Timestamp */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Created:</span>
              <Badge variant="secondary">{formatTimestamp(asset.timestamp)}</Badge>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Generation Parameters */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Generation Parameters</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {generationParams.voiceType && (
              <div>
                <span className="text-muted-foreground">Voice Type:</span>{' '}
                <span className="font-medium capitalize">{generationParams.voiceType}</span>
              </div>
            )}
            {generationParams.language && (
              <div>
                <span className="text-muted-foreground">Language:</span>{' '}
                <span className="font-medium">{generationParams.language}</span>
              </div>
            )}
            {generationParams.speed !== undefined && (
              <div>
                <span className="text-muted-foreground">Speed:</span>{' '}
                <span className="font-medium">{generationParams.speed}x</span>
              </div>
            )}
            {generationParams.pitch !== undefined && (
              <div>
                <span className="text-muted-foreground">Pitch:</span>{' '}
                <span className="font-medium">
                  {generationParams.pitch > 0 ? '+' : ''}{generationParams.pitch}
                </span>
              </div>
            )}
            {generationParams.emotion && (
              <div>
                <span className="text-muted-foreground">Emotion:</span>{' '}
                <span className="font-medium capitalize">{generationParams.emotion}</span>
              </div>
            )}
          </div>
          
          {/* Narration Text */}
          {generationParams.text && (
            <div className="mt-2">
              <span className="text-muted-foreground text-sm">Narration Text:</span>
              <p className="text-sm mt-1 p-2 bg-muted rounded-md">
                {generationParams.text}
              </p>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex flex-wrap gap-2">
        {/* Save Button */}
        {onSave && (
          <Button variant="outline" onClick={handleSave}>
            <Download className="mr-2 h-4 w-4" />
            Save
          </Button>
        )}
        
        {/* Regenerate Button */}
        {onRegenerate && (
          <Button variant="outline" onClick={handleRegenerate}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Regenerate
          </Button>
        )}
        
        {/* Associate Button */}
        {onAssociate && (
          <Button onClick={handleAssociate} className="ml-auto">
            <AudioIcon className="mr-2 h-4 w-4" />
            Associate with Shot
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
