# Shot Frame Viewer Components

Advanced shot editing and frame viewing components for the StoryCore-Engine creative studio.

## Components

### ShotFrameViewer

A comprehensive frame-by-frame viewer and metadata editor for video shots.

**Features:**
- ✅ Editable metadata with real-time validation
- ✅ Frame-by-frame navigation with arrow keys
- ✅ In/Out point markers with I/O keyboard shortcuts
- ✅ Zoom up to 400% for high-quality preview
- ✅ Timeline with visual markers
- ✅ Multiple timecode formats (SMPTE, seconds, frames)
- ✅ Auto-calculation of duration from in/out points
- ✅ Validation feedback with error messages
- ✅ Dirty state tracking

**Usage:**
```tsx
import { ShotFrameViewer, ShotMetadata } from '@/components/shot';

const shot: ShotMetadata = {
  id: 'shot-001',
  name: 'Opening Scene',
  duration: 5.0,
  frameRate: 30,
  inPoint: 0,
  outPoint: 150,
  // ... other metadata
};

<ShotFrameViewer
  shot={shot}
  onUpdate={(updatedShot) => console.log('Updated:', updatedShot)}
  onClose={() => console.log('Closed')}
/>
```

**Keyboard Shortcuts:**
- `←/→` - Navigate frame by frame
- `Home` - Jump to in point
- `End` - Jump to out point
- `I` - Set in point at current frame
- `O` - Set out point at current frame
- `Ctrl + Wheel` - Zoom in/out

**Props:**
```typescript
interface ShotFrameViewerProps {
  shot: ShotMetadata;
  onUpdate?: (shot: ShotMetadata) => void;
  onClose?: () => void;
}
```

### FrameComparisonView

Side-by-side or slider-based frame comparison tool.

**Features:**
- ✅ Side-by-side comparison mode
- ✅ Slider comparison mode with draggable handle
- ✅ Independent frame navigation for each frame
- ✅ Timecode display for both frames
- ✅ Difference calculation
- ✅ Smooth transitions between modes

**Usage:**
```tsx
import { FrameComparisonView } from '@/components/shot';

<FrameComparisonView
  videoUrl="/path/to/video.mp4"
  frameRate={30}
  frame1={45}
  frame2={90}
  onClose={() => console.log('Closed')}
/>
```

**Props:**
```typescript
interface FrameComparisonViewProps {
  videoUrl: string;
  frameRate: number;
  frame1: number;
  frame2: number;
  onClose?: () => void;
}
```

## Data Types

### ShotMetadata

```typescript
interface ShotMetadata {
  id: string;
  name: string;
  description?: string;
  duration: number;
  startTime: number;
  endTime: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  frameRate: number;
  resolution: { width: number; height: number };
  position: number;
  track: number;
  inPoint: number; // Point d'entrée en frames
  outPoint: number; // Point de sortie en frames
  tags: string[];
  category?: string;
  status: 'draft' | 'ready' | 'processing' | 'error';
  locked: boolean;
  createdAt: number;
  updatedAt: number;
  version: number;
}
```

### TimecodeFormat

```typescript
type TimecodeFormat = 'frames' | 'seconds' | 'smpte';
```

## Validation Rules

The ShotFrameViewer includes real-time validation for:

- **Name**: Required, max 100 characters
- **Duration**: Must be positive, max 1 hour
- **Frame Rate**: Between 1 and 120 fps
- **In Point**: Cannot be negative, must be before out point
- **Out Point**: Must be after in point, cannot exceed video duration
- **Resolution**: Between 1 and 7680 pixels for width/height

## Examples

See `src/examples/ShotFrameViewerExample.tsx` for a complete working example.

## Requirements Validation

This implementation satisfies the following requirements from the spec:

**Exigence 9.1**: ✅ Displays all editable metadata  
**Exigence 9.2**: ✅ Frame-by-frame navigation with arrow keys  
**Exigence 9.3**: ✅ Real-time validation with visual feedback  
**Exigence 9.4**: ✅ In/Out points with automatic duration calculation  
**Exigence 9.5**: ✅ High-quality preview with zoom up to 400%  
**Exigence 9.6**: ✅ I/O keyboard shortcuts for in/out points  
**Exigence 9.7**: ✅ Configurable timecode formats (frames, seconds, SMPTE)  
**Exigence 9.8**: ✅ Side-by-side frame comparison with slider  

## Accessibility

- Keyboard navigation support
- ARIA labels for screen readers
- Respects `prefers-reduced-motion` for animations
- High contrast colors for visibility
- Focus indicators for interactive elements

## Performance

- Optimized React rendering with memo/useMemo/useCallback
- Efficient video seeking with frame-accurate positioning
- Lazy loading of comparison view
- Minimal re-renders on metadata updates

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires support for:
- HTML5 video
- CSS Grid
- CSS clip-path (for slider comparison)
- Framer Motion animations
