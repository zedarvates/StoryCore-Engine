# Video Player Components

This directory contains advanced video player components for the StoryCore Creative Studio UI, implementing the requirements from the Advanced Grid Editor Improvements specification.

## Components

### 1. VideoPlayer

A comprehensive video player component with frame-accurate controls and professional features.

**Features:**
- ✅ Play/Pause controls
- ✅ Frame-accurate seeking with framerate calculation
- ✅ Timecode display with millisecond precision (HH:MM:SS.mmm)
- ✅ Playback speed control (0.25x, 0.5x, 1x, 1.5x, 2x)
- ✅ Volume control and mute
- ✅ Fullscreen support
- ✅ Error handling with placeholder display
- ✅ Loading states
- ✅ Keyboard shortcuts
- ✅ Thumbnail generation capability

**Props:**
```typescript
interface VideoPlayerProps {
  shot: Shot;                              // Shot data with video URL
  autoPlay?: boolean;                      // Auto-play on mount
  controls?: boolean;                      // Show/hide controls
  onTimeUpdate?: (time: number) => void;   // Time update callback
  onEnded?: () => void;                    // Video ended callback
  playbackRate?: number;                   // Initial playback rate
  onPlaybackRateChange?: (rate: number) => void; // Playback rate change callback
  className?: string;                      // Additional CSS classes
}
```

**Usage:**
```tsx
import { VideoPlayer } from '@/components/video';

<VideoPlayer
  shot={currentShot}
  autoPlay={false}
  controls={true}
  playbackRate={1.0}
  onTimeUpdate={(time) => console.log('Current time:', time)}
  onEnded={() => console.log('Video ended')}
/>
```

**Keyboard Shortcuts:**
- `Space` - Play/Pause
- `←` - Seek backward 5 seconds
- `→` - Seek forward 5 seconds
- `M` - Toggle mute
- `F` - Toggle fullscreen

**Requirements Satisfied:**
- ✅ Requirement 1.1: Video player with playback controls
- ✅ Requirement 1.2: Video playback with audio synchronization
- ✅ Requirement 1.3: Frame-by-frame navigation
- ✅ Requirement 1.5: Position display with millisecond precision
- ✅ Requirement 1.7: Placeholder for unavailable videos
- ✅ Requirement 1.8: Playback speed control (0.25x - 2x)

---

### 2. VideoSequencePlayer

A sequence player for continuous playback across multiple shots with seamless transitions.

**Features:**
- ✅ Continuous playback across multiple shots
- ✅ Preloading of next shot for smooth transitions
- ✅ Audio synchronization between shots
- ✅ Shot navigation controls (Previous/Next)
- ✅ Thumbnail strip for quick navigation
- ✅ Shot counter display
- ✅ Preload status indicator
- ✅ Keyboard shortcuts for navigation

**Props:**
```typescript
interface VideoSequencePlayerProps {
  shots: Shot[];                           // Array of shots to play
  currentIndex: number;                    // Current shot index
  onShotChange?: (index: number) => void;  // Shot change callback
  seamlessTransition?: boolean;            // Enable seamless transitions
  autoPlay?: boolean;                      // Auto-play on mount
  className?: string;                      // Additional CSS classes
}
```

**Usage:**
```tsx
import { VideoSequencePlayer } from '@/components/video';

<VideoSequencePlayer
  shots={shots}
  currentIndex={currentShotIndex}
  onShotChange={(index) => setCurrentShotIndex(index)}
  seamlessTransition={true}
  autoPlay={false}
/>
```

**Keyboard Shortcuts:**
- `↑` / `Page Up` - Previous shot
- `↓` / `Page Down` - Next shot

**Requirements Satisfied:**
- ✅ Requirement 1.4: Sequence preview with multiple shots

---

### 3. VideoThumbnailPreview

A thumbnail preview component that displays video frames on hover with timecode.

**Features:**
- ✅ Real-time thumbnail generation from video
- ✅ LRU cache for performance optimization
- ✅ Timecode display
- ✅ Smooth animations (Framer Motion)
- ✅ Automatic positioning near cursor
- ✅ Error handling
- ✅ Loading states

**Props:**
```typescript
interface VideoThumbnailPreviewProps {
  videoUrl: string;                        // Video URL
  time: number;                            // Time position in seconds
  width?: number;                          // Thumbnail width (default: 160)
  height?: number;                         // Thumbnail height (default: 90)
  mouseX?: number;                         // Mouse X position
  mouseY?: number;                         // Mouse Y position
  visible?: boolean;                       // Show/hide preview
  onThumbnailGenerated?: (blob: Blob) => void; // Thumbnail generated callback
}
```

**Usage with Hook:**
```tsx
import { VideoThumbnailPreview, useVideoThumbnailPreview } from '@/components/video';

const { previewState, showPreview, hidePreview, updatePosition } = useVideoThumbnailPreview();

<div
  onMouseMove={(e) => {
    const time = calculateTimeFromPosition(e);
    showPreview(videoUrl, time, e.clientX, e.clientY);
  }}
  onMouseLeave={hidePreview}
>
  {/* Your timeline */}
</div>

{previewState.visible && <VideoThumbnailPreview {...previewState} />}
```

**Requirements Satisfied:**
- ✅ Requirement 1.6: Thumbnail preview on timeline hover

---

### 4. PlaybackSpeedControl

A dropdown control for selecting playback speed.

**Features:**
- ✅ Predefined speeds: 0.25x, 0.5x, 1x, 1.5x, 2x
- ✅ Visual indication of current speed
- ✅ Smooth animations
- ✅ Click-outside to close

**Props:**
```typescript
interface PlaybackSpeedControlProps {
  currentSpeed: number;                    // Current playback speed
  onSpeedChange: (speed: number) => void;  // Speed change callback
  className?: string;                      // Additional CSS classes
}
```

**Usage:**
```tsx
import { PlaybackSpeedControl } from '@/components/video';

<PlaybackSpeedControl
  currentSpeed={playbackRate}
  onSpeedChange={(rate) => setPlaybackRate(rate)}
/>
```

---

## Architecture

### Thumbnail Cache

The `VideoThumbnailPreview` component includes a built-in LRU (Least Recently Used) cache:

```typescript
class ThumbnailCache {
  private cache: Map<string, string>;
  private maxSize: number = 50;
  
  generateKey(videoUrl: string, time: number): string;
  get(videoUrl: string, time: number): string | null;
  set(videoUrl: string, time: number, thumbnailUrl: string): void;
  clear(): void;
}
```

**Cache Features:**
- Maximum 50 thumbnails in memory
- LRU eviction policy
- Automatic cleanup of object URLs
- Time precision: 0.1 seconds

### Frame-Accurate Seeking

The `VideoPlayer` component provides frame-accurate seeking:

```typescript
// Calculate frame number from time
const getFrameNumber = (time: number, framerate: number = 30): number => {
  return Math.floor(time * framerate);
};

// Seek to specific frame
const seekToFrame = (frameNumber: number, framerate: number = 30) => {
  const time = frameNumber / framerate;
  videoRef.current.currentTime = time;
};
```

### Thumbnail Generation

Thumbnails are generated using HTML5 Canvas:

```typescript
const generateThumbnail = async (time: number): Promise<Blob | null> => {
  // 1. Seek video to time
  video.currentTime = time;
  
  // 2. Wait for seeked event
  await new Promise((resolve) => {
    video.addEventListener('seeked', resolve);
  });
  
  // 3. Draw video frame to canvas
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  // 4. Convert canvas to blob
  return canvas.toBlob((blob) => blob, 'image/jpeg', 0.8);
};
```

---

## Integration with Timeline

To integrate the video player components with the Timeline component:

```tsx
import { Timeline } from '@/components/Timeline';
import { VideoPlayer, useVideoThumbnailPreview } from '@/components/video';

const EditorPage = () => {
  const [selectedShot, setSelectedShot] = useState<Shot | null>(null);
  const { previewState, showPreview, hidePreview } = useVideoThumbnailPreview();

  return (
    <div>
      {/* Video Player */}
      {selectedShot && (
        <VideoPlayer
          shot={selectedShot}
          controls={true}
        />
      )}

      {/* Timeline with Thumbnail Preview */}
      <Timeline
        selectedShotId={selectedShot?.id}
        onShotSelect={(shotId) => {
          const shot = shots.find(s => s.id === shotId);
          setSelectedShot(shot);
        }}
        onTimelineHover={(videoUrl, time, x, y) => {
          showPreview(videoUrl, time, x, y);
        }}
        onTimelineLeave={hidePreview}
      />

      {/* Thumbnail Preview */}
      {previewState.visible && <VideoThumbnailPreview {...previewState} />}
    </div>
  );
};
```

---

## Performance Considerations

### Optimization Strategies

1. **Thumbnail Caching**: LRU cache prevents redundant thumbnail generation
2. **Preloading**: Next shot is preloaded for seamless transitions
3. **Lazy Loading**: Thumbnails are generated on-demand
4. **Object URL Cleanup**: Automatic cleanup prevents memory leaks
5. **Debouncing**: Mouse move events can be debounced for better performance

### Memory Management

```typescript
// Cleanup on unmount
useEffect(() => {
  return () => {
    // Revoke object URLs
    if (thumbnailUrl) {
      URL.revokeObjectURL(thumbnailUrl);
    }
    
    // Clear cache
    thumbnailCache.clear();
  };
}, []);
```

---

## Testing

### Unit Tests

Test files should be created for each component:

- `VideoPlayer.test.tsx` - Test playback controls, seeking, error handling
- `VideoSequencePlayer.test.tsx` - Test sequence navigation, preloading
- `VideoThumbnailPreview.test.tsx` - Test thumbnail generation, caching
- `PlaybackSpeedControl.test.tsx` - Test speed selection

### Property-Based Tests

Property-based tests should verify:

1. **Lecture Vidéo avec Synchronisation Temporelle** (Requirement 1.2, 1.5)
2. **Navigation Frame-Accurate** (Requirement 1.3, 9.2)

See `tasks.md` for detailed property specifications.

---

## Dependencies

- **React 18+**: Core framework
- **Framer Motion**: Animations
- **Lucide React**: Icons
- **TypeScript**: Type safety

---

## Future Enhancements

Potential improvements for future iterations:

1. **WebGL Rendering**: Hardware-accelerated video rendering
2. **Advanced Caching**: IndexedDB persistence for thumbnails
3. **Multi-track Audio**: Support for multiple audio tracks
4. **Subtitle Support**: Display and edit subtitles
5. **Color Grading**: Real-time color correction
6. **Waveform Display**: Audio waveform visualization
7. **Markers**: Add markers and annotations to timeline
8. **Export**: Export video sequences

---

## License

Part of StoryCore Creative Studio UI - See project LICENSE for details.
