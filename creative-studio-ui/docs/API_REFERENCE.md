# Creative Studio UI - API Reference

## Table of Contents

1. [Overview](#overview)
2. [State Management](#state-management)
3. [Core Types](#core-types)
4. [Components](#components)
5. [Hooks](#hooks)
6. [Utilities](#utilities)
7. [Backend Integration](#backend-integration)

---

## Overview

This document provides a comprehensive reference for the Creative Studio UI codebase. It covers the main APIs, components, hooks, and utilities available for developers.

### Architecture

```
creative-studio-ui/
├── src/
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   ├── stores/         # Zustand state stores
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   └── lib/            # Third-party integrations
```

---

## State Management

The application uses **Zustand** for state management with a single global store.

### Store Structure

```typescript
interface AppState {
  // Project data
  project: Project | null;
  shots: Shot[];
  assets: Asset[];
  
  // UI state
  selectedShotId: string | null;
  currentTime: number;
  showChat: boolean;
  showTaskQueue: boolean;
  panelSizes: PanelSizes;
  
  // Task queue
  taskQueue: GenerationTask[];
  
  // Backend communication
  generationStatus: GenerationStatus;
  
  // Playback state
  isPlaying: boolean;
  playbackSpeed: number;
  
  // Undo/Redo
  history: HistoryState[];
  historyIndex: number;
  
  // Selection state
  selectedEffectId: string | null;
  selectedTextLayerId: string | null;
  selectedKeyframeId: string | null;
}
```

### Store Actions

#### Project Actions

```typescript
// Create new project
createProject(name: string, settings: ProjectSettings): void

// Load existing project
loadProject(projectData: Project): void

// Save project
saveProject(): Promise<void>

// Export project
exportProject(format: 'json' | 'pdf' | 'video'): Promise<Blob>
```

#### Shot Actions

```typescript
// Add shot
addShot(shot: Partial<Shot>): string

// Update shot
updateShot(shotId: string, updates: Partial<Shot>): void

// Delete shot
deleteShot(shotId: string): void

// Reorder shots
reorderShots(shotIds: string[]): void

// Select shot
selectShot(shotId: string | null): void
```

#### Asset Actions

```typescript
// Add asset
addAsset(asset: Partial<Asset>): string

// Upload asset
uploadAsset(file: File): Promise<string>

// Delete asset
deleteAsset(assetId: string): void

// Search assets
searchAssets(query: string): Asset[]
```

#### Audio Actions

```typescript
// Add audio track
addAudioTrack(shotId: string, track: Partial<AudioTrack>): string

// Update audio track
updateAudioTrack(shotId: string, trackId: string, updates: Partial<AudioTrack>): void

// Delete audio track
deleteAudioTrack(shotId: string, trackId: string): void

// Add audio effect
addAudioEffect(shotId: string, trackId: string, effect: Partial<AudioEffect>): string

// Update audio effect
updateAudioEffect(shotId: string, trackId: string, effectId: string, updates: Partial<AudioEffect>): void
```

#### UI Actions

```typescript
// Toggle chat
toggleChat(): void

// Toggle task queue
toggleTaskQueue(): void

// Update panel sizes
updatePanelSizes(sizes: Partial<PanelSizes>): void

// Set playback state
setPlaying(isPlaying: boolean): void

// Set current time
setCurrentTime(time: number): void
```

#### Undo/Redo Actions

```typescript
// Undo last action
undo(): void

// Redo last undone action
redo(): void

// Check if can undo
canUndo(): boolean

// Check if can redo
canRedo(): boolean
```

### Using the Store

```typescript
import { useStore } from '@/stores/useStore';

function MyComponent() {
  // Select specific state
  const shots = useStore((state) => state.shots);
  const addShot = useStore((state) => state.addShot);
  
  // Use actions
  const handleAddShot = () => {
    addShot({
      title: 'New Shot',
      description: 'Description',
      duration: 5
    });
  };
  
  return <button onClick={handleAddShot}>Add Shot</button>;
}
```

---

## Core Types

### Shot

```typescript
interface Shot {
  id: string;
  title: string;
  description: string;
  duration: number; // seconds
  image?: string; // URL or base64
  audioTracks: AudioTrack[];
  effects: Effect[];
  textLayers: TextLayer[];
  animations: Animation[];
  transitionOut?: Transition;
  position: number;
  metadata?: Record<string, any>;
}
```

### AudioTrack

```typescript
interface AudioTrack {
  id: string;
  name: string;
  type: 'music' | 'sfx' | 'dialogue' | 'voiceover' | 'ambient';
  url: string;
  startTime: number;
  duration: number;
  offset: number;
  volume: number; // 0-100
  fadeIn: number;
  fadeOut: number;
  pan: number; // -100 to 100
  surroundConfig?: SurroundConfig;
  muted: boolean;
  solo: boolean;
  effects: AudioEffect[];
  waveformData?: number[];
}
```

### AudioEffect

```typescript
interface AudioEffect {
  id: string;
  type: 'limiter' | 'eq' | 'compressor' | 'voice-clarity' | 
        'noise-reduction' | 'reverb' | 'distortion' | 
        'bass-boost' | 'treble-boost' | 'gain';
  enabled: boolean;
  preset?: 'podcast' | 'music-video' | 'cinematic' | 'dialogue' | 'custom';
  parameters: AudioEffectParameters;
  automationCurve?: AutomationCurve;
}
```

### Effect

```typescript
interface Effect {
  id: string;
  type: 'filter' | 'adjustment' | 'overlay';
  name: string;
  enabled: boolean;
  intensity: number; // 0-100
  parameters: Record<string, number>;
}
```

### TextLayer

```typescript
interface TextLayer {
  id: string;
  content: string;
  font: string;
  fontSize: number;
  color: string;
  backgroundColor?: string;
  position: { x: number; y: number };
  alignment: 'left' | 'center' | 'right';
  startTime: number;
  duration: number;
  animation?: TextAnimation;
  style: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    stroke?: { color: string; width: number };
    shadow?: { x: number; y: number; blur: number; color: string };
  };
}
```

### Transition

```typescript
interface Transition {
  id: string;
  type: 'fade' | 'dissolve' | 'wipe' | 'slide' | 'zoom' | 'custom';
  duration: number;
  direction?: 'left' | 'right' | 'up' | 'down';
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  parameters?: Record<string, any>;
}
```

### Asset

```typescript
interface Asset {
  id: string;
  name: string;
  type: 'image' | 'audio' | 'template';
  url: string;
  thumbnail?: string;
  metadata?: Record<string, any>;
}
```

### Project

```typescript
interface Project {
  schema_version: string;
  project_name: string;
  shots: Shot[];
  assets: Asset[];
  capabilities: {
    grid_generation: boolean;
    promotion_engine: boolean;
    qa_engine: boolean;
    autofix_engine: boolean;
  };
  generation_status: {
    grid: 'pending' | 'done' | 'failed' | 'passed';
    promotion: 'pending' | 'done' | 'failed' | 'passed';
  };
  metadata?: Record<string, any>;
}
```

---

## Components

### StoryboardCanvas

Visual workspace for arranging shots.

```typescript
interface StoryboardCanvasProps {
  shots: Shot[];
  selectedShotId: string | null;
  onShotSelect: (id: string) => void;
  onShotsChange: (shots: Shot[]) => void;
}

function StoryboardCanvas(props: StoryboardCanvasProps): JSX.Element
```

**Usage**:
```typescript
<StoryboardCanvas
  shots={shots}
  selectedShotId={selectedShotId}
  onShotSelect={handleSelect}
  onShotsChange={handleReorder}
/>
```

### Timeline

Temporal representation of shots.

```typescript
interface TimelineProps {
  shots: Shot[];
  currentTime: number;
  onTimeChange: (time: number) => void;
  onShotSelect: (id: string) => void;
}

function Timeline(props: TimelineProps): JSX.Element
```

**Usage**:
```typescript
<Timeline
  shots={shots}
  currentTime={currentTime}
  onTimeChange={setCurrentTime}
  onShotSelect={selectShot}
/>
```

### AssetLibrary

Manages and displays assets.

```typescript
interface AssetLibraryProps {
  assets: Asset[];
  onAssetDrop: (asset: Asset, position: Position) => void;
  onAssetUpload: (file: File) => void;
}

function AssetLibrary(props: AssetLibraryProps): JSX.Element
```

**Usage**:
```typescript
<AssetLibrary
  assets={assets}
  onAssetDrop={handleAssetDrop}
  onAssetUpload={handleUpload}
/>
```

### PropertiesPanel

Displays and edits shot properties.

```typescript
interface PropertiesPanelProps {
  shot: Shot | null;
  onUpdate: (shot: Shot) => void;
}

function PropertiesPanel(props: PropertiesPanelProps): JSX.Element
```

**Usage**:
```typescript
<PropertiesPanel
  shot={selectedShot}
  onUpdate={updateShot}
/>
```

### ChatBox

AI-powered chat interface.

```typescript
interface ChatBoxProps {
  projectContext: Project;
  onClose: () => void;
  onShotsGenerated: (shots: Shot[]) => void;
}

function ChatBox(props: ChatBoxProps): JSX.Element
```

**Usage**:
```typescript
<ChatBox
  projectContext={project}
  onClose={toggleChat}
  onShotsGenerated={handleShotsGenerated}
/>
```

### AudioPanel

Manages audio tracks and effects.

```typescript
interface AudioPanelProps {
  shot: Shot;
  onAudioTrackAdd: (track: AudioTrack) => void;
  onAudioTrackUpdate: (trackId: string, updates: Partial<AudioTrack>) => void;
  onAudioTrackRemove: (trackId: string) => void;
  onVoiceOverGenerate: (voiceOver: VoiceOver) => void;
}

function AudioPanel(props: AudioPanelProps): JSX.Element
```

**Usage**:
```typescript
<AudioPanel
  shot={selectedShot}
  onAudioTrackAdd={addAudioTrack}
  onAudioTrackUpdate={updateAudioTrack}
  onAudioTrackRemove={removeAudioTrack}
  onVoiceOverGenerate={generateVoiceOver}
/>
```

---

## Hooks

### useStore

Access global state store.

```typescript
function useStore<T>(selector: (state: AppState) => T): T
```

**Example**:
```typescript
const shots = useStore((state) => state.shots);
const addShot = useStore((state) => state.addShot);
```

### useDragAndDrop

Handle drag-and-drop operations.

```typescript
interface UseDragAndDropOptions {
  type: string;
  onDrop: (item: any, position: Position) => void;
}

function useDragAndDrop(options: UseDragAndDropOptions): {
  dragRef: RefObject<HTMLElement>;
  dropRef: RefObject<HTMLElement>;
  isDragging: boolean;
  isOver: boolean;
}
```

**Example**:
```typescript
const { dragRef, dropRef, isDragging, isOver } = useDragAndDrop({
  type: 'shot',
  onDrop: handleDrop
});
```

### useAudioEngine

Manage audio playback and processing.

```typescript
function useAudioEngine(): {
  loadAudio: (url: string) => Promise<AudioBuffer>;
  playAudio: (buffer: AudioBuffer, options: PlayOptions) => void;
  stopAudio: () => void;
  applyEffect: (effect: AudioEffect) => void;
}
```

**Example**:
```typescript
const { loadAudio, playAudio, stopAudio } = useAudioEngine();

const handlePlay = async () => {
  const buffer = await loadAudio(audioUrl);
  playAudio(buffer, { volume: 0.8, pan: 0 });
};
```

### useKeyboardShortcuts

Register keyboard shortcuts.

```typescript
interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: () => void;
}

function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]): void
```

**Example**:
```typescript
useKeyboardShortcuts([
  { key: 's', ctrl: true, handler: saveProject },
  { key: 'z', ctrl: true, handler: undo },
  { key: 'y', ctrl: true, handler: redo }
]);
```

### useUndo

Manage undo/redo state.

```typescript
function useUndo<T>(initialState: T): {
  state: T;
  setState: (newState: T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}
```

**Example**:
```typescript
const { state, setState, undo, redo, canUndo, canRedo } = useUndo(initialShots);
```

---

## Utilities

### Project Utilities

```typescript
// Validate project against schema
function validateProject(project: Project): ValidationResult

// Calculate total duration
function calculateTotalDuration(shots: Shot[]): number

// Export project to JSON
function exportToJSON(project: Project): string

// Import project from JSON
function importFromJSON(json: string): Project
```

### Audio Utilities

```typescript
// Generate waveform data
function generateWaveform(audioBuffer: AudioBuffer): number[]

// Apply audio effect
function applyAudioEffect(buffer: AudioBuffer, effect: AudioEffect): AudioBuffer

// Calculate surround channel levels
function calculateSurroundLevels(position: SpatialPosition): ChannelLevels

// Mix audio tracks
function mixAudioTracks(tracks: AudioTrack[]): AudioBuffer
```

### Image Utilities

```typescript
// Generate thumbnail
function generateThumbnail(image: HTMLImageElement, size: number): string

// Apply visual effect
function applyVisualEffect(image: HTMLImageElement, effect: Effect): HTMLCanvasElement

// Resize image
function resizeImage(image: HTMLImageElement, width: number, height: number): HTMLCanvasElement
```

### Animation Utilities

```typescript
// Interpolate between keyframes
function interpolateKeyframes(keyframes: Keyframe[], time: number): number

// Apply easing function
function applyEasing(value: number, easing: EasingType): number

// Calculate bezier curve
function calculateBezier(t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point
```

---

## Backend Integration

### API Client

```typescript
class StoryCoreAPI {
  // Initialize project
  async initProject(name: string): Promise<Project>
  
  // Generate grid
  async generateGrid(projectId: string): Promise<GridResult>
  
  // Promote panels
  async promotePanels(projectId: string): Promise<PromotionResult>
  
  // Run QA
  async runQA(projectId: string): Promise<QAResult>
  
  // Export project
  async exportProject(projectId: string, format: string): Promise<Blob>
}
```

**Usage**:
```typescript
import { StoryCoreAPI } from '@/lib/api';

const api = new StoryCoreAPI();

async function processProject(projectId: string) {
  const gridResult = await api.generateGrid(projectId);
  const promotionResult = await api.promotePanels(projectId);
  const qaResult = await api.runQA(projectId);
  return qaResult;
}
```

### WebSocket Connection

```typescript
class StoryCoreWebSocket {
  // Connect to backend
  connect(url: string): void
  
  // Subscribe to events
  on(event: string, handler: (data: any) => void): void
  
  // Send message
  send(message: any): void
  
  // Disconnect
  disconnect(): void
}
```

**Usage**:
```typescript
import { StoryCoreWebSocket } from '@/lib/websocket';

const ws = new StoryCoreWebSocket();
ws.connect('ws://localhost:8080');

ws.on('generation:progress', (data) => {
  console.log('Progress:', data.progress);
});

ws.on('generation:complete', (data) => {
  console.log('Complete:', data.result);
});
```

---

## Testing

### Component Testing

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { ShotCard } from '@/components/ShotCard';

test('renders shot card with title', () => {
  const shot = {
    id: '1',
    title: 'Test Shot',
    description: 'Description',
    duration: 5
  };
  
  render(<ShotCard shot={shot} />);
  expect(screen.getByText('Test Shot')).toBeInTheDocument();
});
```

### Hook Testing

```typescript
import { renderHook, act } from '@testing-library/react';
import { useStore } from '@/stores/useStore';

test('adds shot to store', () => {
  const { result } = renderHook(() => useStore());
  
  act(() => {
    result.current.addShot({
      title: 'New Shot',
      description: 'Description',
      duration: 5
    });
  });
  
  expect(result.current.shots).toHaveLength(1);
});
```

---

## Contributing

### Code Style

- Use TypeScript for all new code
- Follow ESLint and Prettier configurations
- Write JSDoc comments for public APIs
- Include unit tests for new features

### Pull Request Process

1. Create feature branch from `main`
2. Implement changes with tests
3. Update documentation
4. Submit PR with description
5. Address review feedback

---

## License

MIT License - See LICENSE file for details

---

## Support

- **Documentation**: https://docs.storycore-engine.com
- **Issues**: https://github.com/storycore-engine/creative-studio-ui/issues
- **Email**: support@storycore-engine.com
