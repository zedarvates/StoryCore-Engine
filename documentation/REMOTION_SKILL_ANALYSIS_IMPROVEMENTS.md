# StoryCore Improvement Plan: Remiton Claude Code Skill Analysis

**Document Version:** 1.0  
**Created:** February 2026  
**Based On:** Remiton Claude Code Skill Analysis  
**Project:** StoryCore Creative Studio Video Application

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Remiton Skill Overview](#2-remiton-skill-overview)
3. [StoryCore Current State Analysis](#3-storycore-current-state-analysis)
4. [Prioritized Improvements](#4-prioritized-improvements)
5. [Implementation Roadmap](#5-implementation-roadmap)
6. [Architecture Recommendations](#6-architecture-recommendations)
7. [Code Examples](#7-code-examples)
8. [Expected Outcomes](#8-expected-outcomes)

---

## 1. Executive Summary

### Key Insights from Remiton Skill Analysis

Remiton represents a paradigm shift in video programming, treating video as code through React-based compositing. For StoryCore, this analysis reveals significant opportunities to enhance our creative studio capabilities while leveraging existing strengths in audio processing, AI sequence generation, and WebGL puppet animation.

| Dimension | StoryCore Current State | Remiton Benchmark | Gap Analysis |
|-----------|------------------------|-------------------|--------------|
| **Composition Model** | Linear timeline with AI sequences | Nested compositions with React components | Medium Gap |
| **Rendering Pipeline** | Server-side with ComfyUI integration | Browser-native with FFmpeg fallback | Major Gap |
| **Animation System** | WebGL puppet + CSS transitions | React Spring + GSAP + keyframe animations | Small Gap |
| **Audio Visualization** | Waveform editor only | Audio visualizations + spectrum analysis | Medium Gap |
| **CLI Tools** | Basic API commands | Full CLI with hot reload | Major Gap |
| **FFmpeg Integration** | Via backend services | Native + programmable | Major Gap |

### Strategic Recommendations

The analysis suggests a three-phase approach:

1. **Phase 1 (Critical):** Implement React-based animation system and composition nesting
2. **Phase 2 (Major):** Add FFmpeg integration and CLI tools
3. **Phase 3 (Medium):** Develop audio visualization and advanced transitions

This approach allows StoryCore to maintain its AI-first philosophy while adopting proven patterns from the Remiton ecosystem.

---

## 2. Remiton Skill Overview

### 2.1 Core Capabilities

Remiton's strength lies in treating video as a programmable medium. Here's how each capability maps to potential StoryCore enhancements:

#### Media Assets Management

```typescript
// Remiton-style media asset composition
interface MediaAsset {
  src: string;
  startTime?: number;
  endTime?: number;
  volume?: number;
  playbackRate?: number;
  filters?: VideoFilter[];
}

const StoryScene: React.FC<SceneProps> = ({ assets }) => {
  return (
    <Sequence>
      <Video src={assets.background} startFrom={0} />
      <Audio src={assets.narration} volume={0.8} />
      <Image src={assets.character} style={{ bottom: 0 }} />
    </Sequence>
  );
};
```

#### Animations & Transitions

| Feature | Description | StoryCore Integration |
|---------|-------------|----------------------|
| **Spring Physics** | Natural motion with configurable mass, stiffness, damping | Enhance puppet animations |
| **Keyframes** | CSS-style keyframe animations | Timeline action sequences |
| **Easing Functions** | Custom bezier curves | Smooth transitions between AI sequences |
| **Layout Transitions** | Automatic layout animation | Scene transitions |

#### Composition Nesting

Remiton's composition system allows unlimited nesting:

```
Project
├── Main Timeline
│   ├── Sequence A (0-30s)
│   │   ├── Sub-sequence A1
│   │   │   ├── Video Layer
│   │   │   └── Audio Layer
│   │   └── Sub-sequence A2
│   └── Sequence B (30-60s)
│       ├── Parallel Track 1
│       └── Parallel Track 2
```

### 2.2 Advanced Features

#### FFmpeg Integration

```typescript
// Programmable FFmpeg within React components
const VideoExport = ({ composition, settings }) => {
  return (
    <Render>
      <FFmpeg
        input={composition}
        codec="h264"
        bitrate={settings.quality === 'high' ? '50M' : '25M'}
        fps={60}
        onProgress={(progress) => updateProgress(progress)}
      />
    </Render>
  );
};
```

#### Audio Visualization

| Visualization Type | Use Case | Implementation |
|-------------------|----------|----------------|
| **Waveform** | Audio editing | Canvas-based rendering |
| **Spectrum Analyzer** | Beat detection | Web Audio API + FFT |
| **Circular Visualizer** | Artistic effects | WebGL shader-based |
| **Frequency Bars** | Analysis view | React components |

#### 3D & Text Rendering

```typescript
// 3D Text with depth effects
const Title3D = ({ text, depth = 20 }) => {
  return (
    <ThreeDimensional>
      <Text3D
        text={text}
        font={customFont}
        extrudeSettings={{ depth }}
        material={metallicMaterial}
        castShadow
      />
      <Lighting ambient={0.5} directional />
    </ThreeDimensional>
  );
};
```

---

## 3. StoryCore Current State Analysis

### 3.1 Strengths

#### Audio Processing (Strong)

| Component | Capability | Technology |
|-----------|------------|------------|
| **AudioWaveformEditor** | Waveform visualization and editing | Canvas + Web Audio API |
| **AudioRemixStore** | Remix generation and storage | State management |
| **Backend Processing** | Format conversion, analysis | Python FastAPI |

#### AI Sequence Generation (Strong)

```typescript
// Existing AI sequence generation
interface AISequenceConfig {
  prompt: string;
  style?: string;
  duration: number;
  characters?: Character[];
  narrativeArc?: NarrativeArc;
}

async function generateSequence(config: AISequenceConfig): Promise<Sequence> {
  const response = await api.post('/api/sequence/generate', config);
  return response.data;
}
```

#### Timeline Editing (Moderate-Strong)

| Feature | Status | Notes |
|---------|--------|-------|
| **Multi-track Timeline** | ✅ Implemented | 4-track system |
| **Clip Trimming** | ✅ Implemented | Basic operations |
| **Drag & Drop** | ✅ Implemented | Via dnd-kit |
| **Nested Sequences** | ❌ Missing | Major gap |
| **Composition Previews** | 🔄 Partial | Server-rendered |

#### WebGL Puppet Animation (Strong)

| Component | Capability | Implementation |
|-----------|------------|----------------|
| **PuppetRenderer** | WebGL-based character rendering | Custom shaders |
| **Bone System** | Inverse kinematics | React Three Fiber |
| **Expression Control** | Facial expressions | Blend shapes |

### 3.2 Identified Gaps

#### Critical Gaps

| Gap | Impact | Complexity |
|-----|--------|------------|
| **React-based Animation System** | High | Medium |
| **Composition Nesting** | High | High |
| **FFmpeg Integration** | High | Medium |

#### Major Gaps

| Gap | Impact | Complexity |
|-----|--------|------------|
| **CLI Tools** | Medium | Low |
| **Audio Visualization** | Medium | Medium |
| **Hot Reload** | Medium | Low |

#### Medium Gaps

| Gap | Impact | Complexity |
|-----|--------|------------|
| **Advanced Transitions** | Medium | Medium |
| **Lottie Integration** | Low | Low |
| **Parameter Tunnels** | Low | Medium |

---

## 4. Prioritized Improvements

### 4.1 Critical Priority

#### C1: React-based Animation System

**Objective:** Implement a declarative animation system similar to Remiton's approach.

**Components to Create:**

| Component | Purpose | Dependencies |
|-----------|---------|--------------|
| `AnimationProvider` | Global animation state | React Context |
| `useSpring` | Spring physics hook | react-spring |
| `useKeyframes` | Keyframe animations | custom hooks |
| `TransitionGroup` | Enter/exit animations | react-transition-group |

**Implementation Timeline:** 2-3 weeks

**Success Metrics:**
- 50% reduction in animation code
- Consistent 60fps animation performance
- Storybook documentation coverage > 80%

#### C2: Composition Nesting System

**Objective:** Enable unlimited composition nesting with proper timeline management.

**Architecture:**

```
TimelineStore
├── ActiveComposition
│   ├── NestedCompositions[]
│   │   └── Each has own tracks
│   └── RootTracks[]
└── RenderQueue
```

**Implementation Timeline:** 3-4 weeks

**Success Metrics:**
- Support for 10+ levels of nesting
- Zero performance degradation > 3 levels
- Full undo/redo support

#### C3: FFmpeg Integration Layer

**Objective:** Provide programmatic FFmpeg access for video processing.

**Integration Points:**

| Feature | Backend | Frontend |
|---------|---------|----------|
| **Video Transcoding** | Python FFmpeg | Progress callbacks |
| **Format Conversion** | Auto-detection | Format selector |
| **Thumbnail Generation** | Scene detection | Preview grid |
| **Audio Extraction** | Stream selection | Track selector |

**Implementation Timeline:** 2-3 weeks

**Success Metrics:**
- Support for all major formats
- Progress reporting accuracy > 95%
- Conversion speed within 2x of native

### 4.2 Major Priority

#### M1: CLI Tools

**Objective:** Enable command-line control of StoryCore operations.

**Proposed Commands:**

```bash
# StoryCore CLI
storycore init <project-name>        # Initialize new project
storycore import <path>              # Import media assets
storycore render [composition]       # Render composition
storycore preview [composition]      # Live preview
storycore export --format=mp4        # Export video
storycore analyze <media>            # Analyze media metadata
```

**Implementation Timeline:** 1-2 weeks

#### M2: Audio Visualization Suite

**Objective:** Extend beyond waveforms to comprehensive audio visualization.

**Visualization Types:**

| Type | Description | Use Case |
|------|-------------|----------|
| **Waveform** | Time-domain display | Editing |
| **Spectrum** | Frequency analysis | Beat detection |
| **Circular** | Radial visualization | Creative effects |
| **3D Terrain** | 3D frequency terrain | Immersive audio |

**Implementation Timeline:** 2-3 weeks

#### M3: Hot Reload Development

**Objective:** Enable instant preview during development.

**Features:**

```typescript
// Hot reload configuration
const hotReloadConfig = {
  watchPaths: ['./src', './assets'],
  debounceMs: 100,
  autoPreview: true,
  errorOverlay: true,
};
```

**Implementation Timeline:** 1 week

### 4.3 Medium Priority

#### ME1: Advanced Transitions Library

**Objective:** Provide production-ready transitions between scenes/clips.

**Available Transitions:**

| Category | Transitions | Performance |
|----------|-------------|-------------|
| **Fade** | Black, White, Cross | GPU-accelerated |
| **Slide** | Left, Right, Up, Down | GPU-accelerated |
| **Zoom** | In, Out, Pulsar | GPU-accelerated |
| **Wipe** | Linear, Radial, Gradient | GPU-accelerated |
| **Glitch** | RGB split, Noise | WebGL |

#### ME2: Lottie Integration

**Objective:** Support Lottie animations for vector graphics.

**Implementation:**

```typescript
interface LottieConfig {
  url: string | object;
  loop: boolean;
  autoplay: boolean;
  speed: number;
  direction: 'forward' | 'backward';
}

const AnimatedLogo = ({ config }: { config: LottieConfig }) => {
  return <Lottie animationData={config.url} />;
};
```

#### ME3: Parameter Tunneling

**Objective:** Enable runtime parameter adjustment during playback.

**Use Cases:**
- Interactive storytelling with viewer choices
- A/B testing of video elements
- Real-time style adjustments

### 4.4 Minor Priority

#### MI1: Color Correction Presets

| Preset Name | Effect |
|-------------|--------|
| **Vintage** | Sepia tone + vignette |
| **Noir** | High contrast B&W |
| **Vibrant** | Saturation boost |
| **Cinematic** | Teal/orange skew |

#### MI2: Caption Styles

| Style | Characteristics |
|-------|-----------------|
| **Modern** | Sans-serif, rounded, shadow |
| **Classic** | Serif, bottom-centered |
| **Dynamic** | Animated entry/exit |

#### MI3: Template Marketplace

- User-created template sharing
- Version control for templates
- Rating and review system

---

## 5. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)

#### Week 1-2: Animation System

```
Day 1-3:   Setup animation architecture
Day 4-6:   Implement useSpring hook
Day 7-10:  Implement useKeyframes hook
Day 11-14: Testing and documentation
```

#### Week 3-4: Composition System

```
Day 1-2:   Design composition data structure
Day 3-5:   Implement nested sequence store
Day 6-8:   Build timeline UI for nesting
Day 9-14:  Testing and iteration
```

### Phase 2: Integration (Weeks 5-8)

#### Week 5-6: FFmpeg Integration

```
Day 1-2:   Backend FFmpeg wrapper
Day 3-4:   Frontend progress callbacks
Day 5-7:   Format conversion pipeline
Day 8-14:  Testing all formats
```

#### Week 7-8: CLI Tools

```
Day 1-3:   CLI architecture design
Day 4-6:   Core commands implementation
Day 7-10:  Hot reload integration
Day 11-14: Documentation and examples
```

### Phase 3: Enhancement (Weeks 9-12)

#### Week 9-10: Audio Visualization

```
Day 1-3:   Spectrum analyzer component
Day 4-6:   Circular visualizer
Day 7-10:  Integration with timeline
Day 11-14: Performance optimization
```

#### Week 11-12: Advanced Features

```
Day 1-3:   Transition library completion
Day 4-6:   Lottie integration
Day 7-10:  Parameter tunneling
Day 11-14: Final testing and polish
```

### Milestone Timeline

| Phase | Milestone | Target Date | Key Deliverables |
|-------|-----------|-------------|------------------|
| **Phase 1** | Animation Foundation | Week 4 | React animation system |
| **Phase 2** | Production Tools | Week 8 | CLI + FFmpeg integration |
| **Phase 3** | Feature Complete | Week 12 | Full feature set |
| **Beta** | Public Beta | Week 16 | User testing + polish |

---

## 6. Architecture Recommendations

### 6.1 Component Architecture

#### Animation System Architecture

```
┌─────────────────────────────────────┐
│         AnimationContext            │
│  ┌───────────────────────────────┐   │
│  │    AnimationEngine            │   │
│  │  ┌─────────────────────────┐  │   │
│  │  │   Spring Physics       │  │   │
│  │  │   - Mass                │  │   │
│  │  │   - Stiffness           │  │   │
│  │  │   - Damping             │  │   │
│  │  └─────────────────────────┘  │   │
│  │  ┌─────────────────────────┐  │   │
│  │  │   Keyframe Engine       │  │   │
│  │  │   - Interpolation       │  │   │
│  │  │   - Easing Functions    │  │   │
│  │  └─────────────────────────┘  │   │
│  └───────────────────────────────┘   │
│  ┌───────────────────────────────┐   │
│  │    Performance Monitor        │   │
│  │  - FPS tracking               │   │
│  │  - Frame skipping detection  │   │
│  └───────────────────────────────┘   │
└─────────────────────────────────────┘
```

#### Composition System Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Composition Root                   │
│  ┌─────────────────────────────────────────────┐    │
│  │  TimelineStore                              │    │
│  │  ┌─────────────────────────────────────┐     │    │
│  │  │  ActiveComposition                  │     │    │
│  │  │  - id: string                       │     │    │
│  │  │  - tracks: Track[]                  │     │    │
│  │  │  - nested: Composition[]            │     │    │
│  │  │  - duration: number                 │     │    │
│  │  └─────────────────────────────────────┘     │    │
│  │  ┌─────────────────────────────────────┐     │    │
│  │  │  RenderQueue                        │     │    │
│  │  │  - priority: number                │     │    │
│  │  │  - status: pending|processing|done │     │    │
│  │  └─────────────────────────────────────┘     │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

### 6.2 State Management

#### Proposed Store Structure

```typescript
// stores/animationStore.ts
interface AnimationState {
  // Animation instances
  animations: Map<string, AnimationInstance>;
  
  // Global settings
  globalSpeed: number;
  isPlaying: boolean;
  
  // Performance metrics
  fps: number;
  droppedFrames: number;
  
  // Actions
  play(): void;
  pause(): void;
  stop(): void;
  setSpeed(speed: number): void;
  registerAnimation(id: string, config: AnimationConfig): void;
  unregisterAnimation(id: string): void;
}

// stores/compositionStore.ts
interface CompositionState {
  // Current composition
  activeComposition: Composition | null;
  
  // Composition hierarchy
  compositionStack: Composition[];
  
  // Editing state
  selectedElement: string | null;
  clipboard: ClipboardData | null;
  
  // History
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
}
```

### 6.3 Performance Optimization Strategy

#### Animation Performance

| Optimization | Technique | Expected Benefit |
|--------------|-----------|------------------|
| **GPU Acceleration** | CSS transforms, WebGL | 60fps maintained |
| **Frame Skipping** | Catch-up animation | Smooth playback |
| **Batching** | RequestAnimationFrame grouping | Reduced overhead |
| **Memoization** | React.memo, useMemo | Fewer re-renders |

#### Memory Management

```typescript
// Automatic cleanup for animations
const useAnimation = (config: AnimationConfig) => {
  const animationRef = useRef<AnimationInstance>(null);
  
  useEffect(() => {
    animationRef.current = createAnimation(config);
    
    return () => {
      animationRef.current?.dispose();
    };
  }, []);
  
  return animationRef.current;
};
```

---

## 7. Code Examples

### 7.1 Animation System Examples

#### Spring Animation Hook

```typescript
// hooks/useSpring.ts
import { useState, useRef, useEffect } from 'react';

interface SpringConfig {
  mass?: number;
  stiffness?: number;
  damping?: number;
  velocity?: number;
}

interface SpringState<T> {
  value: T;
  velocity: number;
  done: boolean;
}

export function useSpring<T extends number | string | object>(
  targetValue: T,
  config: SpringConfig = {}
): SpringState<T> {
  const { mass = 1, stiffness = 100, damping = 20 } = config;
  
  const [state, setState] = useState<SpringState<T>>({
    value: targetValue,
    velocity: 0,
    done: false,
  });
  
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const startValueRef = useRef<T>(state.value);
  
  useEffect(() => {
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
        startValueRef.current = state.value;
      }
      
      const elapsed = timestamp - startTimeRef.current;
      
      // Spring physics calculation
      const displacement = Number(targetValue) - Number(startValueRef.current);
      const springForce = -stiffness * displacement;
      const dampingForce = -damping * state.velocity;
      const acceleration = (springForce + dampingForce) / mass;
      
      const newVelocity = state.velocity + acceleration;
      const newValue = startValueRef.current + (newVelocity * elapsed / 1000);
      
      const isDone = Math.abs(newVelocity) < 0.01 && 
                     Math.abs(displacement) < 0.01;
      
      setState({
        value: newValue as T,
        velocity: newVelocity,
        done: isDone,
      });
      
      if (!isDone) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetValue, mass, stiffness, damping]);
  
  return state;
}
```

#### Keyframe Animation Hook

```typescript
// hooks/useKeyframes.ts
interface Keyframe<T> {
  time: number; // Percentage (0-100)
  value: T;
  easing?: string; // CSS easing function
}

interface KeyframeConfig<T> {
  keyframes: Keyframe<T>[];
  duration: number;
  loop?: boolean;
  direction?: 'normal' | 'reverse' | 'alternate';
}

export function useKeyframes<T>(
  config: KeyframeConfig<T>
): [T, (action: 'play' | 'pause' | 'reset') => void] {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const startTimeRef = useRef<number>();
  
  const { keyframes, duration, loop = false, direction = 'normal' } = config;
  
  const currentValue = useMemo(() => {
    const time = (currentTime / duration) * 100;
    
    // Find surrounding keyframes
    const prevKeyframe = [...keyframes]
      .reverse()
      .find(k => k.time <= time);
    const nextKeyframe = keyframes.find(k => k.time >= time);
    
    if (!prevKeyframe || !nextKeyframe) {
      return keyframes[0].value;
    }
    
    // Interpolate between keyframes
    const range = nextKeyframe.time - prevKeyframe.time;
    const progress = (time - prevKeyframe.time) / range;
    const easedProgress = applyEasing(progress, prevKeyframe.easing);
    
    return interpolate(prevKeyframe.value, nextKeyframe.value, easedProgress);
  }, [currentTime, keyframes, duration]);
  
  const control = useCallback((action: 'play' | 'pause' | 'reset') => {
    switch (action) {
      case 'play':
        setIsPlaying(true);
        break;
      case 'pause':
        setIsPlaying(false);
        break;
      case 'reset':
        setCurrentTime(0);
        setIsPlaying(false);
        break;
    }
  }, []);
  
  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;
    
    let lastTimestamp: number;
    
    const animate = (timestamp: number) => {
      if (!lastTimestamp) lastTimestamp = timestamp;
      const delta = timestamp - lastTimestamp;
      
      setCurrentTime(prev => {
        let next = prev + delta;
        if (next >= duration) {
          if (loop) {
            return direction === 'reverse' ? duration : 0;
          }
          setIsPlaying(false);
          return duration;
        }
        return next;
      });
      
      lastTimestamp = timestamp;
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, duration, loop, direction]);
  
  return [currentValue, control];
}
```

### 7.2 Composition System Examples

#### Nested Composition Component

```typescript
// components/Composition/NestedComposition.tsx
interface NestedCompositionProps {
  compositionId: string;
  startTime?: number;
  duration?: number;
  volume?: number;
  playbackRate?: number;
  style?: React.CSSProperties;
}

export const NestedComposition: React.FC<NestedCompositionProps> = ({
  compositionId,
  startTime = 0,
  duration,
  volume = 1,
  playbackRate = 1,
  style,
}) => {
  const composition = useComposition(compositionId);
  const { currentTime } = useTimeline();
  
  if (!composition) {
    return <CompositionPlaceholder id={compositionId} />;
  }
  
  // Calculate local time based on parent timeline
  const localTime = currentTime - startTime;
  
  // Check if composition should be visible
  const isVisible = localTime >= 0 && 
                    (!duration || localTime < duration);
  
  if (!isVisible) {
    return null;
  }
  
  return (
    <div
      className="nested-composition"
      style={{
        ...style,
        position: 'absolute',
        width: '100%',
        height: '100%',
      }}
    >
      <MediaProvider volume={volume} playbackRate={playbackRate}>
        {composition.tracks.map(track => (
          <Track
            key={track.id}
            track={track}
            trackIndex={composition.tracks.indexOf(track)}
          />
        ))}
      </MediaProvider>
    </div>
  );
};
```

#### Composition Store

```typescript
// stores/compositionStore.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface Track {
  id: string;
  type: 'video' | 'audio' | 'text' | 'image' | 'composition';
  clips: Clip[];
  muted?: boolean;
  locked?: boolean;
  visible?: boolean;
}

interface Clip {
  id: string;
  startTime: number;
  endTime: number;
  assetId: string;
  trackId: string;
  keyframes?: Keyframe[];
  effects?: Effect[];
}

interface Composition {
  id: string;
  name: string;
  tracks: Track[];
  duration: number;
  nestedCompositions: string[];
  frameRate: number;
  resolution: { width: number; height: number };
}

interface CompositionState {
  // Active composition
  activeComposition: Composition | null;
  
  // Composition registry
  compositions: Map<string, Composition>;
  
  // Selection
  selectedClipIds: string[];
  selectedTrackIds: string[];
  
  // Clipboard
  clipboard: {
    clips: Clip[];
    sourceCompositionId: string;
  } | null;
  
  // Actions
  createComposition(name: string): string;
  deleteComposition(id: string): void;
  addTrack(compositionId: string, type: Track['type']): string;
  addClip(compositionId: string, clip: Omit<Clip, 'id'>): string;
  moveClip(clipId: string, newStartTime: number, newTrackId?: string): void;
  resizeClip(clipId: string, newStartTime: number, newEndTime: number): void;
  selectClips(clipIds: string[], additive?: boolean): void;
  copyClips(clipIds: string[]): void;
  pasteClips(targetCompositionId: string, targetTime: number): void;
  nestComposition(
    parentId: string,
    childId: string,
    startTime: number,
    duration: number
  ): void;
}

export const useCompositionStore = create<CompositionState>()(
  immer((set, get) => ({
    activeComposition: null,
    compositions: new Map(),
    selectedClipIds: [],
    selectedTrackIds: [],
    clipboard: null,
    
    createComposition: (name) => {
      const id = generateId();
      const composition: Composition = {
        id,
        name,
        tracks: [],
        duration: 0,
        nestedCompositions: [],
        frameRate: 30,
        resolution: { width: 1920, height: 1080 },
      };
      
      set((state) => {
        state.compositions.set(id, composition);
      });
      
      return id;
    },
    
    addTrack: (compositionId, type) => {
      const composition = get().compositions.get(compositionId);
      if (!composition) throw new Error('Composition not found');
      
      const trackId = generateId();
      const track: Track = {
        id: trackId,
        type,
        clips: [],
        muted: false,
        locked: false,
        visible: true,
      };
      
      set((state) => {
        const comp = state.compositions.get(compositionId);
        if (comp) {
          comp.tracks.push(track);
        }
      });
      
      return trackId;
    },
    
    addClip: (compositionId, clipData) => {
      const composition = get().compositions.get(compositionId);
      if (!composition) throw new Error('Composition not found');
      
      const clipId = generateId();
      const clip: Clip = {
        id: clipId,
        ...clipData,
      };
      
      set((state) => {
        const comp = state.compositions.get(compositionId);
        if (comp) {
          const track = comp.tracks.find(t => t.id === clipData.trackId);
          if (track) {
            track.clips.push(clip);
            // Update duration if needed
            comp.duration = Math.max(comp.duration, clip.endTime);
          }
        }
      });
      
      return clipId;
    },
    
    moveClip: (clipId, newStartTime, newTrackId) => {
      set((state) => {
        // Find and move the clip
        for (const composition of state.compositions.values()) {
          const track = composition.tracks.find(t => 
            t.clips.some(c => c.id === clipId)
          );
          
          if (track) {
            const clipIndex = track.clips.findIndex(c => c.id === clipId);
            if (clipIndex !== -1) {
              const [clip] = track.clips.splice(clipIndex, 1);
              clip.startTime = newStartTime;
              
              if (newTrackId) {
                const newTrack = composition.tracks.find(t => t.id === newTrackId);
                if (newTrack) {
                  newTrack.clips.push(clip);
                }
              } else {
                track.clips.push(clip);
              }
            }
          }
        }
      });
    },
    
    nestComposition: (parentId, childId, startTime, duration) => {
      set((state) => {
        const parent = state.compositions.get(parentId);
        const child = state.compositions.get(childId);
        
        if (parent && child) {
          // Add child to parent's nested compositions
          parent.nestedCompositions.push(childId);
          
          // Create a reference clip for the nested composition
          const trackId = generateId();
          parent.tracks.push({
            id: trackId,
            type: 'composition',
            clips: [{
              id: generateId(),
              startTime,
              endTime: startTime + duration,
              assetId: childId,
              trackId,
            }],
          });
        }
      });
    },
    
    selectClips: (clipIds, additive = false) => {
      set((state) => {
        if (!additive) {
          state.selectedClipIds = [];
        }
        state.selectedClipIds.push(...clipIds);
      });
    },
    
    copyClips: (clipIds) => {
      const activeComposition = get().activeComposition;
      if (!activeComposition) return;
      
      const clips: Clip[] = [];
      
      for (const track of activeComposition.tracks) {
        for (const clip of track.clips) {
          if (clipIds.includes(clip.id)) {
            clips.push({ ...clip });
          }
        }
      }
      
      set((state) => {
        state.clipboard = {
          clips,
          sourceCompositionId: activeComposition.id,
        };
      });
    },
    
    pasteClips: (targetCompositionId, targetTime) => {
      const { clipboard } = get();
      if (!clipboard) return;
      
      const targetComposition = get().compositions.get(targetCompositionId);
      if (!targetComposition) return;
      
      const offset = targetTime - Math.min(...clipboard.clips.map(c => c.startTime));
      
      set((state) => {
        for (const clip of clipboard.clips) {
          const newClip = {
            ...clip,
            id: generateId(),
            startTime: clip.startTime + offset,
            endTime: clip.endTime + offset,
            trackId: clip.trackId, // May need remapping
          };
          
          const track = targetComposition.tracks.find(
            t => t.id === newClip.trackId
          );
          if (track) {
            track.clips.push(newClip);
          }
        }
      });
    },
  }))
);
```

### 7.3 FFmpeg Integration Examples

#### FFmpeg Service

```typescript
// services/ffmpegService.ts
import { spawn, ChildProcess } from 'child_process';

interface FFmpegProgress {
  frame: number;
  fps: number;
  quality: number;
  size: number;
  time: number;
  bitrate: number;
  progress: number; // 0-1
}

interface RenderOptions {
  input: string;
  output: string;
  codec?: string;
  bitrate?: string;
  fps?: number;
  resolution?: { width: number; height: number };
  audioCodec?: string;
  audioBitrate?: string;
  format?: string;
  onProgress?: (progress: FFmpegProgress) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export class FFmpegService {
  private ffmpegPath: string;
  
  constructor(ffmpegPath = 'ffmpeg') {
    this.ffmpegPath = ffmpegPath;
  }
  
  async render(options: RenderOptions): Promise<void> {
    const {
      input,
      output,
      codec = 'libx264',
      bitrate = '25M',
      fps = 30,
      resolution = { width: 1920, height: 1080 },
      audioCodec = 'aac',
      audioBitrate = '192k',
      format,
      onProgress,
      onComplete,
      onError,
    } = options;
    
    return new Promise((resolve, reject) => {
      const args = [
        '-i', input,
        '-c:v', codec,
        '-b:v', bitrate,
        '-r', fps.toString(),
        '-vf', `scale=${resolution.width}:${resolution.height}`,
        '-c:a', audioCodec,
        '-b:a', audioBitrate,
      ];
      
      if (format) {
        args.push('-f', format);
      }
      
      args.push(output);
      
      const process = spawn(this.ffmpegPath, args);
      let duration = 0;
      
      // Parse progress from stderr
      process.stderr?.on('data', (data) => {
        const output = data.toString();
        
        // Parse duration
        const durationMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2})/);
        if (durationMatch && duration === 0) {
          const [, hours, minutes, seconds] = durationMatch;
          duration = parseInt(hours) * 3600 + 
                    parseInt(minutes) * 60 + 
                    parseInt(seconds);
        }
        
        // Parse current time
        const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2})/);
        if (timeMatch && duration > 0) {
          const [, hours, minutes, seconds] = timeMatch;
          const currentTime = parseInt(hours) * 3600 + 
                             parseInt(minutes) * 60 + 
                             parseInt(seconds);
          
          const progress: FFmpegProgress = {
            frame: parseInt(output.match(/frame=\s*(\d+)/)?.[1] || '0'),
            fps: parseFloat(output.match(/fps=\s*(\d+\.?\d*)/)?.[1] || '0'),
            quality: parseFloat(output.match(/quality=\s*(\d+\.?\d*)/)?.[1] || '0'),
            size: parseInt(output.match(/size=\s*(\d+)/)?.[1] || '0'),
            time: currentTime,
            bitrate: parseFloat(output.match(/bitrate=\s*(\d+\.?\d*)/)?.[1] || '0'),
            progress: currentTime / duration,
          };
          
          onProgress?.(progress);
        }
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          onComplete?.();
          resolve();
        } else {
          const error = new Error(`FFmpeg exited with code ${code}`);
          onError?.(error);
          reject(error);
        }
      });
      
      process.on('error', (error) => {
        onError?.(error);
        reject(error);
      });
    });
  }
  
  async getMediaInfo(filePath: string): Promise<MediaInfo> {
    return new Promise((resolve, reject) => {
      const process = spawn(this.ffmpegPath, [
        '-i', filePath,
        '-f', 'null',
        '-'
      ]);
      
      let output = '';
      process.stderr?.on('data', (data) => {
        output += data.toString();
      });
      
      process.on('close', () => {
        const info = this.parseMediaInfo(output);
        resolve(info);
      });
      
      process.on('error', reject);
    });
  }
  
  private parseMediaInfo(output: string): MediaInfo {
    const durationMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2})/);
    const resolutionMatch = output.match(/(\d{3,4})x(\d{3,4})/);
    const fpsMatch = output.match(/(\d+(?:\.\d+)?)\s*fps/);
    
    return {
      duration: durationMatch ? 
        parseInt(durationMatch[1]) * 3600 + 
        parseInt(durationMatch[2]) * 60 + 
        parseInt(durationMatch[3]) : 0,
      width: parseInt(resolutionMatch?.[1] || '0'),
      height: parseInt(resolutionMatch?.[2] || '0'),
      fps: parseFloat(fpsMatch?.[1] || '0'),
    };
  }
}
```

### 7.4 CLI Tool Examples

#### CLI Commander Setup

```typescript
// cli/index.ts
#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init';
import { importCommand } from './commands/import';
import { renderCommand } from './commands/render';
import { previewCommand } from './commands/preview';
import { exportCommand } from './commands/export';
import { analyzeCommand } from './commands/analyze';

const program = new Command();

program
  .name('storycore')
  .description('StoryCore Creative Studio CLI')
  .version('1.0.0');

program
  .command('init <project-name>')
  .description('Initialize a new StoryCore project')
  .option('--template <template>', 'Project template', 'blank')
  .option('--output <path>', 'Output directory', './')
  .action(initCommand);

program
  .command('import <path>')
  .description('Import media assets into the project')
  .option('--recursive', 'Import recursively', false)
  .option('--type <type>', 'Media type filter', 'all')
  .action(importCommand);

program
  .command('render [composition]')
  .description('Render a composition to video')
  .option('--output <path>', 'Output file path')
  .option('--quality <quality>', 'Render quality', 'high')
  .option('--fps <fps>', 'Frame rate', '30')
  .option('--watch', 'Watch for changes', false)
  .action(renderCommand);

program
  .command('preview [composition]')
  .description('Start a live preview server')
  .option('--port <port>', 'Server port', '3000')
  .option('--open', 'Open browser automatically', true)
  .action(previewCommand);

program
  .command('export')
  .description('Export project to various formats')
  .option('--format <format>', 'Export format', 'mp4')
  .option('--quality <quality>', 'Export quality', 'high')
  .option('--destination <path>', 'Export destination')
  .action(exportCommand);

program
  .command('analyze <media>')
  .description('Analyze media file metadata')
  .option('--json', 'Output as JSON', false)
  .action(analyzeCommand);

program.parse();
```

#### Render Command Implementation

```typescript
// cli/commands/render.ts
import { Command } from 'commander';
import * as path from 'path';
import { FFmpegService } from '../../services/ffmpegService';
import { ProjectManager } from '../../services/projectManager';

interface RenderOptions {
  output?: string;
  quality: string;
  fps: string;
  watch: boolean;
}

export async function renderCommand(
  composition: string | undefined,
  options: RenderOptions
) {
  console.log('🎬 Starting StoryCore render...');
  
  const projectManager = new ProjectManager();
  const project = projectManager.loadCurrentProject();
  
  const targetComposition = composition || 
    project.compositions.find(c => c.isMain)?.id ||
    project.compositions[0]?.id;
  
  if (!targetComposition) {
    throw new Error('No composition found to render');
  }
  
  const outputPath = options.output || 
    path.join(project.path, 'output', `${targetComposition}.mp4`);
  
  const qualitySettings = {
    high: { bitrate: '50M', fps: 60 },
    medium: { bitrate: '25M', fps: 30 },
    low: { bitrate: '10M', fps: 24 },
  };
  
  const settings = qualitySettings[options.quality as keyof typeof qualitySettings] 
    || qualitySettings.medium;
  
  const ffmpeg = new FFmpegService();
  
  const inputPath = await projectManager.generateCompositionRender(targetComposition);
  
  console.log(`📝 Rendering composition: ${targetComposition}`);
  console.log(`📁 Output: ${outputPath}`);
  
  try {
    await ffmpeg.render({
      input: inputPath,
      output: outputPath,
      bitrate: settings.bitrate,
      fps: parseInt(options.fps) || settings.fps,
      onProgress: (progress) => {
        const percent = Math.round(progress.progress * 100);
        console.log(`\r🔄 Rendering: ${percent}% (${progress.fps} fps)`);
      },
    });
    
    console.log('\n✅ Render complete!');
    console.log(`📁 File saved to: ${outputPath}`);
  } catch (error) {
    console.error('\n❌ Render failed:', error);
    process.exit(1);
  }
}
```

---

## 8. Expected Outcomes

### 8.1 Technical Outcomes

| Outcome | Current State | Target State | Improvement |
|---------|---------------|--------------|-------------|
| **Animation Development Speed** | Manual tweening | Declarative hooks | 50% faster |
| **Composition Complexity** | 2 levels | Unlimited nesting | 10x+ capability |
| **Export Formats** | Server-limited | Full format support | 5x more formats |
| **Preview Latency** | 5-10 seconds | Instant (hot reload) | 100x faster |
| **CLI Automation** | None | Full suite | Complete coverage |

### 8.2 User Experience Improvements

#### For Content Creators

| Feature | Before | After |
|---------|--------|-------|
| **Animation Creation** | Manual CSS + JavaScript | Declarative React components |
| **Complex Projects** | Flat timeline | Nested compositions |
| **Asset Import** | Manual upload | CLI automation |
| **Preview Updates** | Full re-render | Hot reload |

#### For Developers

| Tool | Before | After |
|------|--------|-------|
| **Project Setup** | Manual scaffolding | CLI templates |
| **Testing Animations** | Reload page | Instant preview |
| **Video Export** | API calls only | CLI + API |
| **Debugging** | Console logs | Visual timeline |

### 8.3 Business Value

#### Revenue Opportunities

1. **Professional Tier:** Advanced CLI tools and batch processing
2. **Enterprise:** Custom FFmpeg configurations and integrations
3. **Template Marketplace:** User-generated content revenue

#### Competitive Advantages

| Advantage | Description |
|-----------|-------------|
| **AI + Code Fusion** | Unique combination of AI generation with programmable video |
| **Developer-First** | CLI tools and code-based workflows attract technical users |
| **Performance** | Hot reload and real-time preview differentiate from competitors |

### 8.4 Success Metrics

#### Quantitative Metrics

| Metric | Baseline | 6-Month Target |
|--------|----------|----------------|
| **Animation Code Lines** | 5000+ | 2000+ |
| **Project Creation Time** | 30 min | 2 min |
| **Export Time (5 min video)** | 15 min | 5 min |
| **CLI Commands Available** | 0 | 15+ |
| **Documentation Pages** | 50 | 200+ |

#### Qualitative Metrics

- User satisfaction surveys
- Community feedback on GitHub
- Developer adoption rates
- Template marketplace activity

---

## Appendix A: Resources

### Related Documentation

- [Remiton Official Documentation](https://remotion.dev)
- [React Spring Documentation](https://www.react-spring.io)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [StoryCore Architecture Overview](docs/ARCHITECTURE.md)

### External Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react-spring | ^9.7 | Animation physics |
| commander | ^11 | CLI framework |
| fluent-ffmpeg | ^2.1 | FFmpeg bindings |
| lottie-react | ^6 | Lottie animations |

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **Composition** | A collection of tracks and clips forming a video sequence |
| **Nested Composition** | A composition embedded within another composition |
| **Spring Physics** | Animation technique simulating real-world spring motion |
| **Keyframe Animation** | Animation defined by key positions at specific times |
| **FFmpeg** | Cross-platform multimedia framework |
| **Hot Reload** | Real-time preview updates during development |
| **Parameter Tunneling** | Runtime adjustment of animation parameters |

---

**Document Status:** Ready for Implementation  
**Next Review:** After Phase 1 Completion  
**Owner:** StoryCore Engineering Team