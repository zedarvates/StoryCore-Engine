import React, { useState } from 'react';
import { VideoPlayer, VideoSequencePlayer, VideoThumbnailPreview, useVideoThumbnailPreview } from '@/components/video';
import type { Shot } from '@/types';

/**
 * Example demonstrating the Video Player components
 * 
 * This example shows:
 * 1. Basic VideoPlayer with controls
 * 2. VideoSequencePlayer for continuous playback
 * 3. VideoThumbnailPreview on hover
 */

// Example shots data
const exampleShots: Shot[] = [
  {
    id: 'shot-1',
    title: 'Opening Scene',
    description: 'Wide establishing shot',
    duration: 5.0,
    position: 0,
    audioTracks: [],
    effects: [],
    textLayers: [],
    animations: [],
    metadata: {
      videoUrl: '/path/to/video1.mp4',
    },
  },
  {
    id: 'shot-2',
    title: 'Character Introduction',
    description: 'Medium shot of protagonist',
    duration: 8.0,
    position: 1,
    audioTracks: [],
    effects: [],
    textLayers: [],
    animations: [],
    metadata: {
      videoUrl: '/path/to/video2.mp4',
    },
  },
  {
    id: 'shot-3',
    title: 'Action Sequence',
    description: 'Dynamic camera movement',
    duration: 12.0,
    position: 2,
    audioTracks: [],
    effects: [],
    textLayers: [],
    animations: [],
    metadata: {
      videoUrl: '/path/to/video3.mp4',
    },
  },
];

export const VideoPlayerExample: React.FC = () => {
  const [selectedShotIndex, setSelectedShotIndex] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const { previewState, showPreview, hidePreview, updatePosition } = useVideoThumbnailPreview();

  const selectedShot = exampleShots[selectedShotIndex];

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">
            Video Player Components Demo
          </h1>
          <p className="text-gray-400">
            Demonstration of VideoPlayer, VideoSequencePlayer, and VideoThumbnailPreview
          </p>
        </div>

        {/* Single Video Player Example */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            1. Basic Video Player
          </h2>
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            <VideoPlayer
              shot={selectedShot}
              autoPlay={false}
              controls={true}
              playbackRate={playbackRate}
              onPlaybackRateChange={setPlaybackRate}
              onTimeUpdate={(time) => }
              onEnded={() => }
            />
          </div>
          <div className="mt-4 text-sm text-gray-400">
            <p>Features:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Play/Pause controls</li>
              <li>Frame-accurate seeking</li>
              <li>Timecode display with millisecond precision</li>
              <li>Playback speed control (0.25x - 2x)</li>
              <li>Volume control and mute</li>
              <li>Fullscreen support</li>
              <li>Keyboard shortcuts (Space, Arrow keys, M, F)</li>
            </ul>
          </div>
        </div>

        {/* Sequence Player Example */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            2. Video Sequence Player
          </h2>
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            <VideoSequencePlayer
              shots={exampleShots}
              currentIndex={selectedShotIndex}
              onShotChange={setSelectedShotIndex}
              seamlessTransition={true}
              autoPlay={false}
            />
          </div>
          <div className="mt-4 text-sm text-gray-400">
            <p>Features:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Continuous playback across multiple shots</li>
              <li>Preloading of next shot for smooth transitions</li>
              <li>Audio synchronization between shots</li>
              <li>Shot navigation controls</li>
              <li>Thumbnail strip for quick navigation</li>
              <li>Keyboard shortcuts (Arrow Up/Down, Page Up/Down)</li>
            </ul>
          </div>
        </div>

        {/* Thumbnail Preview Example */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            3. Video Thumbnail Preview
          </h2>
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">
              Hover over the timeline below to see thumbnail previews:
            </p>
            
            {/* Mock Timeline */}
            <div
              className="relative h-20 bg-gray-700 rounded-lg overflow-hidden"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const time = (x / rect.width) * selectedShot.duration;
                
                showPreview(
                  selectedShot.metadata?.videoUrl || '',
                  time,
                  e.clientX,
                  e.clientY
                );
                updatePosition(e.clientX, e.clientY);
              }}
              onMouseLeave={hidePreview}
            >
              <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                Hover to preview (Mock Timeline)
              </div>
              
              {/* Progress indicator */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600" />
            </div>

            <div className="text-sm text-gray-400">
              <p>Features:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Real-time thumbnail generation from video</li>
                <li>LRU cache for performance</li>
                <li>Timecode display</li>
                <li>Smooth animations</li>
                <li>Automatic positioning near cursor</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Shot Selection */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Shot Selection
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {exampleShots.map((shot, index) => (
              <button
                key={shot.id}
                onClick={() => setSelectedShotIndex(index)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  index === selectedShotIndex
                    ? 'border-blue-500 bg-blue-900 bg-opacity-20'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
              >
                <div className="text-left">
                  <h3 className="text-white font-semibold">{shot.title}</h3>
                  <p className="text-gray-400 text-sm mt-1">{shot.description}</p>
                  <p className="text-gray-500 text-xs mt-2">{shot.duration}s</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Usage Instructions
          </h2>
          <div className="space-y-4 text-sm text-gray-400">
            <div>
              <h3 className="text-white font-semibold mb-2">Import Components:</h3>
              <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
                <code>{`import { VideoPlayer, VideoSequencePlayer, VideoThumbnailPreview } from '@/components/video';`}</code>
              </pre>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-2">Basic VideoPlayer:</h3>
              <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
                <code>{`<VideoPlayer
  shot={shot}
  autoPlay={false}
  controls={true}
  playbackRate={1.0}
  onTimeUpdate={(time) => }
  onEnded={() => }
/>`}</code>
              </pre>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-2">VideoSequencePlayer:</h3>
              <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
                <code>{`<VideoSequencePlayer
  shots={shots}
  currentIndex={0}
  onShotChange={(index) => setIndex(index)}
  seamlessTransition={true}
  autoPlay={false}
/>`}</code>
              </pre>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-2">VideoThumbnailPreview:</h3>
              <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
                <code>{`const { previewState, showPreview, hidePreview } = useVideoThumbnailPreview();

<div onMouseMove={(e) => showPreview(videoUrl, time, e.clientX, e.clientY)}>
  {/* Your timeline */}
</div>

<VideoThumbnailPreview {...previewState} />`}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Render Thumbnail Preview */}
      {previewState.visible && <VideoThumbnailPreview {...previewState} />}
    </div>
  );
};

export default VideoPlayerExample;
