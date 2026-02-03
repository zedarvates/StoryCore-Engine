/**
 * Video Preview Panel Component
 * 
 * Displays generated video with playback controls, metadata, and action buttons.
 * Provides save, regenerate, and export options.
 * Enables audio generation button on success.
 * 
 * Requirements: 3.3, 3.5
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
  Video as VideoIcon,
  Calendar,
  HardDrive,
  Maximize2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Mic,
  Clock,
} from 'lucide-react';
import type { GeneratedAsset } from '../../types/generation';
import { shouldStreamVideo, createStreamingVideoUrl, formatFileSize } from '../../utils/assetOptimization';

export interface VideoPreviewPanelProps {
  /**
   * Generated video asset
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
   * Callback when audio generation is triggered
   */
  onGenerateAudio?: (asset: GeneratedAsset) => void;
  
  /**
   * Whether audio generation is available
   */
  canGenerateAudio?: boolean;
  
  /**
   * Custom className for styling
   */
  className?: string;
}

/**
 * Format file size for display
 */
const formatFileSizeLocal = (bytes: number): string => {
  return formatFileSize(bytes);
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
 * Video Preview Panel
 * 
 * Displays generated video with playback controls, metadata, parameters, and action buttons.
 * Enables audio generation workflow on successful video generation.
 * Supports streaming for large video files.
 */
export const VideoPreviewPanel: React.FC<VideoPreviewPanelProps> = ({
  asset,
  onSave,
  onRegenerate,
  onGenerateAudio,
  canGenerateAudio = true,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isVideoExpanded, setIsVideoExpanded] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string>(asset.url);
  const [useStreaming, setUseStreaming] = useState(false);
  
  const { metadata } = asset;
  const { generationParams, fileSize, dimensions, format } = metadata;
  const videoDuration = metadata.duration || 0;
  
  // Determine if streaming should be used
  useEffect(() => {
    const shouldStream = shouldStreamVideo(fileSize);
    setUseStreaming(shouldStream);
    
    if (shouldStream) {
      const streamingUrl = createStreamingVideoUrl(asset.url);
      setVideoUrl(streamingUrl);
    } else {
      setVideoUrl(asset.url);
    }
  }, [asset.url, fileSize]);
  
  /**
   * Handle play/pause toggle
   */
  const togglePlayPause = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };
  
  /**
   * Handle mute toggle
   */
  const toggleMute = () => {
    if (!videoRef.current) return;
    
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };
  
  /**
   * Handle volume change
   */
  const handleVolumeChange = (value: number[]) => {
    if (!videoRef.current) return;
    
    const newVolume = value[0];
    videoRef.current.volume = newVolume;
    setVolume(newVolume);
    
    // Unmute if volume is increased from 0
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
      videoRef.current.muted = false;
    }
  };
  
  /**
   * Handle time update
   */
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };
  
  /**
   * Handle loaded metadata
   */
  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };
  
  /**
   * Handle seek
   */
  const handleSeek = (value: number[]) => {
    if (!videoRef.current) return;
    
    const newTime = value[0];
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };
  
  /**
   * Handle video ended
   */
  const handleVideoEnded = () => {
    setIsPlaying(false);
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
   * Handle audio generation
   */
  const handleGenerateAudio = () => {
    if (onGenerateAudio && canGenerateAudio) {
      onGenerateAudio(asset);
    }
  };
  
  /**
   * Toggle video expansion
   */
  const toggleVideoExpansion = () => {
    setIsVideoExpanded(!isVideoExpanded);
  };
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <VideoIcon className="h-5 w-5" />
          Generated Video
        </CardTitle>
        <CardDescription>
          Video generated successfully. You can save, regenerate, or proceed to audio generation.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Video Player */}
        <div className="relative group">
          {useStreaming && (
            <Badge variant="secondary" className="absolute top-2 left-2 z-10">
              Streaming
            </Badge>
          )}
          <video
            ref={videoRef}
            src={videoUrl}
            className={`w-full rounded-lg border bg-black ${
              isVideoExpanded ? 'max-h-none' : 'max-h-96'
            }`}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleVideoEnded}
            onClick={togglePlayPause}
            preload={useStreaming ? 'metadata' : 'auto'}
          />
          
          {/* Expand Button */}
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={toggleVideoExpansion}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          
          {/* Play/Pause Overlay */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Button
                variant="secondary"
                size="icon"
                className="h-16 w-16 rounded-full opacity-80 hover:opacity-100"
                onClick={togglePlayPause}
              >
                <Play className="h-8 w-8" />
              </Button>
            </div>
          )}
        </div>
        
        {/* Video Controls */}
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
            {/* Dimensions */}
            {dimensions && (
              <div className="flex items-center gap-2">
                <VideoIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Dimensions:</span>
                <Badge variant="secondary">
                  {dimensions.width} × {dimensions.height}
                </Badge>
              </div>
            )}
            
            {/* Duration */}
            {videoDuration > 0 && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Duration:</span>
                <Badge variant="secondary">{formatDuration(videoDuration)}</Badge>
              </div>
            )}
            
            {/* File Size */}
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Size:</span>
              <Badge variant="secondary">{formatFileSizeLocal(fileSize)}</Badge>
            </div>
            
            {/* Format */}
            <div className="flex items-center gap-2">
              <VideoIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Format:</span>
              <Badge variant="secondary">{format.toUpperCase()}</Badge>
            </div>
            
            {/* Timestamp */}
            <div className="flex items-center gap-2 col-span-2">
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
            {generationParams.frameCount && (
              <div>
                <span className="text-muted-foreground">Frame Count:</span>{' '}
                <span className="font-medium">{generationParams.frameCount}</span>
              </div>
            )}
            {generationParams.frameRate && (
              <div>
                <span className="text-muted-foreground">Frame Rate:</span>{' '}
                <span className="font-medium">{generationParams.frameRate} fps</span>
              </div>
            )}
            {generationParams.motionStrength !== undefined && (
              <div>
                <span className="text-muted-foreground">Motion Strength:</span>{' '}
                <span className="font-medium">{generationParams.motionStrength}</span>
              </div>
            )}
            {generationParams.seed !== undefined && (
              <div>
                <span className="text-muted-foreground">Seed:</span>{' '}
                <span className="font-medium">{generationParams.seed}</span>
              </div>
            )}
          </div>
          
          {/* Motion Prompt */}
          {generationParams.prompt && (
            <div className="mt-2">
              <span className="text-muted-foreground text-sm">Motion Description:</span>
              <p className="text-sm mt-1 p-2 bg-muted rounded-md">
                {generationParams.prompt}
              </p>
            </div>
          )}
          
          {/* Source Image Path */}
          {generationParams.inputImagePath && (
            <div className="mt-2">
              <span className="text-muted-foreground text-sm">Source Image:</span>
              <p className="text-sm mt-1 p-2 bg-muted rounded-md font-mono">
                {generationParams.inputImagePath}
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
        
        {/* Generate Audio Button */}
        {onGenerateAudio && (
          <Button
            onClick={handleGenerateAudio}
            disabled={!canGenerateAudio}
            className="ml-auto"
          >
            <Mic className="mr-2 h-4 w-4" />
            Generate Audio
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
