# Creative Studio UI - Code Examples

## Table of Contents

1. [Basic Project Setup](#basic-project-setup)
2. [Working with Shots](#working-with-shots)
3. [Audio Management](#audio-management)
4. [Visual Effects](#visual-effects)
5. [Custom Components](#custom-components)
6. [State Management](#state-management)
7. [Backend Integration](#backend-integration)

---

## Basic Project Setup

### Creating a New Project

```typescript
import { useStore } from '@/stores/useStore';

function CreateProjectButton() {
  const createProject = useStore((state) => state.createProject);
  
  const handleCreate = () => {
    createProject('My New Project', {
      resolution: '1920x1080',
      frameRate: 30,
      duration: 60
    });
  };
  
  return (
    <button onClick={handleCreate}>
      Create New Project
    </button>
  );
}
```

### Loading an Existing Project

```typescript
import { useStore } from '@/stores/useStore';

function OpenProjectButton() {
  const loadProject = useStore((state) => state.loadProject);
  
  const handleOpen = async () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    
    fileInput.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const text = await file.text();
      const projectData = JSON.parse(text);
      loadProject(projectData);
    };
    
    fileInput.click();
  };
  
  return (
    <button onClick={handleOpen}>
      Open Project
    </button>
  );
}
```

### Saving a Project

```typescript
import { useStore } from '@/stores/useStore';

function SaveProjectButton() {
  const saveProject = useStore((state) => state.saveProject);
  const project = useStore((state) => state.project);
  
  const handleSave = async () => {
    await saveProject();
    
    // Download as JSON file
    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.project_name}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  };
  
  return (
    <button onClick={handleSave}>
      Save Project
    </button>
  );
}
```

---

## Working with Shots

### Adding a Shot

```typescript
import { useStore } from '@/stores/useStore';

function AddShotButton() {
  const addShot = useStore((state) => state.addShot);
  
  const handleAdd = () => {
    const shotId = addShot({
      title: 'New Shot',
      description: 'Shot description',
      duration: 5,
      image: undefined,
      audioTracks: [],
      effects: [],
      textLayers: [],
      animations: [],
      position: 0
    });
    
    console.log('Created shot:', shotId);
  };
  
  return (
    <button onClick={handleAdd}>
      Add Shot
    </button>
  );
}
```

### Updating a Shot

```typescript
import { useStore } from '@/stores/useStore';

function ShotEditor({ shotId }: { shotId: string }) {
  const shot = useStore((state) => 
    state.shots.find(s => s.id === shotId)
  );
  const updateShot = useStore((state) => state.updateShot);
  
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateShot(shotId, { title: e.target.value });
  };
  
  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateShot(shotId, { duration: parseFloat(e.target.value) });
  };
  
  if (!shot) return null;
  
  return (
    <div>
      <input
        type="text"
        value={shot.title}
        onChange={handleTitleChange}
        placeholder="Shot title"
      />
      <input
        type="number"
        value={shot.duration}
        onChange={handleDurationChange}
        placeholder="Duration (seconds)"
      />
    </div>
  );
}
```

### Deleting a Shot

```typescript
import { useStore } from '@/stores/useStore';

function DeleteShotButton({ shotId }: { shotId: string }) {
  const deleteShot = useStore((state) => state.deleteShot);
  
  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this shot?')) {
      deleteShot(shotId);
    }
  };
  
  return (
    <button onClick={handleDelete}>
      Delete Shot
    </button>
  );
}
```

### Reordering Shots with Drag and Drop

```typescript
import { useDrag, useDrop } from 'react-dnd';
import { useStore } from '@/stores/useStore';

interface DraggableShotProps {
  shot: Shot;
  index: number;
}

function DraggableShot({ shot, index }: DraggableShotProps) {
  const reorderShots = useStore((state) => state.reorderShots);
  const shots = useStore((state) => state.shots);
  
  const [{ isDragging }, drag] = useDrag({
    type: 'shot',
    item: { id: shot.id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });
  
  const [{ isOver }, drop] = useDrop({
    accept: 'shot',
    hover: (item: { id: string; index: number }) => {
      if (item.index !== index) {
        const newShots = [...shots];
        const [removed] = newShots.splice(item.index, 1);
        newShots.splice(index, 0, removed);
        reorderShots(newShots.map(s => s.id));
        item.index = index;
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  });
  
  return (
    <div
      ref={(node) => drag(drop(node))}
      style={{
        opacity: isDragging ? 0.5 : 1,
        backgroundColor: isOver ? '#e0e0e0' : 'white'
      }}
    >
      <h3>{shot.title}</h3>
      <p>{shot.description}</p>
    </div>
  );
}
```

---

## Audio Management

### Adding an Audio Track

```typescript
import { useStore } from '@/stores/useStore';

function AddAudioTrackButton({ shotId }: { shotId: string }) {
  const addAudioTrack = useStore((state) => state.addAudioTrack);
  
  const handleAdd = async () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'audio/*';
    
    fileInput.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      // Upload file and get URL
      const url = await uploadAudioFile(file);
      
      addAudioTrack(shotId, {
        name: file.name,
        type: 'music',
        url,
        startTime: 0,
        duration: 10, // Will be updated after loading
        offset: 0,
        volume: 80,
        fadeIn: 0,
        fadeOut: 0,
        pan: 0,
        muted: false,
        solo: false,
        effects: []
      });
    };
    
    fileInput.click();
  };
  
  return (
    <button onClick={handleAdd}>
      Add Audio Track
    </button>
  );
}

async function uploadAudioFile(file: File): Promise<string> {
  // Implementation depends on your backend
  const formData = new FormData();
  formData.append('audio', file);
  
  const response = await fetch('/api/upload/audio', {
    method: 'POST',
    body: formData
  });
  
  const data = await response.json();
  return data.url;
}
```

### Applying Audio Effects

```typescript
import { useStore } from '@/stores/useStore';

function AudioEffectsPanel({ shotId, trackId }: { shotId: string; trackId: string }) {
  const addAudioEffect = useStore((state) => state.addAudioEffect);
  const updateAudioEffect = useStore((state) => state.updateAudioEffect);
  
  const handleAddLimiter = () => {
    addAudioEffect(shotId, trackId, {
      type: 'limiter',
      enabled: true,
      parameters: {
        threshold: -6,
        ceiling: -0.1,
        release: 50
      }
    });
  };
  
  const handleAddVoiceClarity = () => {
    addAudioEffect(shotId, trackId, {
      type: 'voice-clarity',
      enabled: true,
      preset: 'podcast',
      parameters: {
        intensity: 80
      }
    });
  };
  
  return (
    <div>
      <button onClick={handleAddLimiter}>Add Limiter</button>
      <button onClick={handleAddVoiceClarity}>Add Voice Clarity</button>
    </div>
  );
}
```

### Generating Waveform

```typescript
import { useEffect, useRef } from 'react';

function WaveformDisplay({ audioUrl }: { audioUrl: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    generateWaveform(audioUrl, canvasRef.current);
  }, [audioUrl]);
  
  return <canvas ref={canvasRef} width={800} height={100} />;
}

async function generateWaveform(url: string, canvas: HTMLCanvasElement | null) {
  if (!canvas) return;
  
  const audioContext = new AudioContext();
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  const data = audioBuffer.getChannelData(0);
  const step = Math.ceil(data.length / canvas.width);
  const amp = canvas.height / 2;
  
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  for (let i = 0; i < canvas.width; i++) {
    let min = 1.0;
    let max = -1.0;
    
    for (let j = 0; j < step; j++) {
      const datum = data[(i * step) + j];
      if (datum < min) min = datum;
      if (datum > max) max = datum;
    }
    
    ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
  }
}
```

### Surround Sound Configuration

```typescript
import { useStore } from '@/stores/useStore';

function SurroundSoundPanel({ shotId, trackId }: { shotId: string; trackId: string }) {
  const updateAudioTrack = useStore((state) => state.updateAudioTrack);
  
  const handleModeChange = (mode: '5.1' | '7.1') => {
    updateAudioTrack(shotId, trackId, {
      surroundConfig: {
        mode,
        channels: {
          frontLeft: 100,
          frontRight: 100,
          center: 100,
          lfe: 80,
          surroundLeft: 80,
          surroundRight: 80,
          ...(mode === '7.1' && {
            sideLeft: 80,
            sideRight: 80
          })
        }
      }
    });
  };
  
  return (
    <div>
      <button onClick={() => handleModeChange('5.1')}>5.1 Surround</button>
      <button onClick={() => handleModeChange('7.1')}>7.1 Surround</button>
    </div>
  );
}
```

---

## Visual Effects

### Applying an Effect

```typescript
import { useStore } from '@/stores/useStore';

function EffectsLibrary({ shotId }: { shotId: string }) {
  const shot = useStore((state) => state.shots.find(s => s.id === shotId));
  const updateShot = useStore((state) => state.updateShot);
  
  const applyEffect = (effectName: string) => {
    if (!shot) return;
    
    const newEffect: Effect = {
      id: crypto.randomUUID(),
      type: 'filter',
      name: effectName,
      enabled: true,
      intensity: 50,
      parameters: {}
    };
    
    updateShot(shotId, {
      effects: [...shot.effects, newEffect]
    });
  };
  
  return (
    <div>
      <button onClick={() => applyEffect('vintage')}>Vintage</button>
      <button onClick={() => applyEffect('blur')}>Blur</button>
      <button onClick={() => applyEffect('brightness')}>Brightness</button>
    </div>
  );
}
```

### Adjusting Effect Parameters

```typescript
import { useStore } from '@/stores/useStore';

function EffectControls({ shotId, effectId }: { shotId: string; effectId: string }) {
  const shot = useStore((state) => state.shots.find(s => s.id === shotId));
  const updateShot = useStore((state) => state.updateShot);
  
  const effect = shot?.effects.find(e => e.id === effectId);
  
  const handleIntensityChange = (intensity: number) => {
    if (!shot || !effect) return;
    
    const updatedEffects = shot.effects.map(e =>
      e.id === effectId ? { ...e, intensity } : e
    );
    
    updateShot(shotId, { effects: updatedEffects });
  };
  
  if (!effect) return null;
  
  return (
    <div>
      <label>Intensity: {effect.intensity}%</label>
      <input
        type="range"
        min="0"
        max="100"
        value={effect.intensity}
        onChange={(e) => handleIntensityChange(parseInt(e.target.value))}
      />
    </div>
  );
}
```

---

## Custom Components

### Creating a Custom Shot Card

```typescript
import { useDrag } from 'react-dnd';
import { useStore } from '@/stores/useStore';

interface CustomShotCardProps {
  shot: Shot;
  onSelect: (id: string) => void;
}

function CustomShotCard({ shot, onSelect }: CustomShotCardProps) {
  const selectedShotId = useStore((state) => state.selectedShotId);
  const isSelected = selectedShotId === shot.id;
  
  const [{ isDragging }, drag] = useDrag({
    type: 'shot',
    item: { id: shot.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });
  
  return (
    <div
      ref={drag}
      onClick={() => onSelect(shot.id)}
      style={{
        opacity: isDragging ? 0.5 : 1,
        border: isSelected ? '2px solid blue' : '1px solid gray',
        padding: '10px',
        margin: '5px',
        cursor: 'move'
      }}
    >
      {shot.image && (
        <img
          src={shot.image}
          alt={shot.title}
          style={{ width: '100%', height: 'auto' }}
        />
      )}
      <h3>{shot.title}</h3>
      <p>{shot.description}</p>
      <span>{shot.duration}s</span>
      {shot.audioTracks.length > 0 && (
        <span>🔊 {shot.audioTracks.length} tracks</span>
      )}
    </div>
  );
}
```

### Creating a Custom Timeline

```typescript
import { useRef, useEffect } from 'react';
import { useStore } from '@/stores/useStore';

function CustomTimeline() {
  const shots = useStore((state) => state.shots);
  const currentTime = useStore((state) => state.currentTime);
  const setCurrentTime = useStore((state) => state.setCurrentTime);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    drawTimeline();
  }, [shots, currentTime]);
  
  const drawTimeline = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    let x = 0;
    const totalDuration = shots.reduce((sum, shot) => sum + shot.duration, 0);
    const pixelsPerSecond = canvas.width / totalDuration;
    
    // Draw shots
    shots.forEach((shot) => {
      const width = shot.duration * pixelsPerSecond;
      
      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(x, 0, width, canvas.height);
      
      ctx.strokeStyle = '#000';
      ctx.strokeRect(x, 0, width, canvas.height);
      
      ctx.fillStyle = '#000';
      ctx.fillText(shot.title, x + 5, 20);
      
      x += width;
    });
    
    // Draw playhead
    const playheadX = currentTime * pixelsPerSecond;
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, canvas.height);
    ctx.stroke();
  };
  
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const totalDuration = shots.reduce((sum, shot) => sum + shot.duration, 0);
    const time = (x / canvas.width) * totalDuration;
    
    setCurrentTime(time);
  };
  
  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={100}
      onClick={handleClick}
      style={{ border: '1px solid black', cursor: 'pointer' }}
    />
  );
}
```

---

## State Management

### Creating a Custom Store Slice

```typescript
import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  zoom: number;
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setZoom: (zoom: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  theme: 'light',
  zoom: 100,
  
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setTheme: (theme) => set({ theme }),
  setZoom: (zoom) => set({ zoom })
}));
```

### Persisting State to LocalStorage

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  autoSave: boolean;
  autoSaveInterval: number;
  gridSize: number;
  setAutoSave: (enabled: boolean) => void;
  setAutoSaveInterval: (interval: number) => void;
  setGridSize: (size: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      autoSave: true,
      autoSaveInterval: 120, // seconds
      gridSize: 20,
      
      setAutoSave: (autoSave) => set({ autoSave }),
      setAutoSaveInterval: (autoSaveInterval) => set({ autoSaveInterval }),
      setGridSize: (gridSize) => set({ gridSize })
    }),
    {
      name: 'creative-studio-settings'
    }
  )
);
```

---

## Backend Integration

### Calling StoryCore-Engine API

```typescript
import { StoryCoreAPI } from '@/lib/api';

async function generateVideo(projectId: string) {
  const api = new StoryCoreAPI();
  
  try {
    // Step 1: Generate grid
    console.log('Generating grid...');
    const gridResult = await api.generateGrid(projectId);
    console.log('Grid generated:', gridResult);
    
    // Step 2: Promote panels
    console.log('Promoting panels...');
    const promotionResult = await api.promotePanels(projectId);
    console.log('Panels promoted:', promotionResult);
    
    // Step 3: Run QA
    console.log('Running QA...');
    const qaResult = await api.runQA(projectId);
    console.log('QA complete:', qaResult);
    
    // Step 4: Export
    console.log('Exporting...');
    const exportBlob = await api.exportProject(projectId, 'video');
    console.log('Export complete');
    
    return exportBlob;
  } catch (error) {
    console.error('Error generating video:', error);
    throw error;
  }
}
```

### WebSocket Real-time Updates

```typescript
import { useEffect } from 'react';
import { StoryCoreWebSocket } from '@/lib/websocket';
import { useStore } from '@/stores/useStore';

function GenerationProgress({ projectId }: { projectId: string }) {
  const setGenerationStatus = useStore((state) => state.setGenerationStatus);
  
  useEffect(() => {
    const ws = new StoryCoreWebSocket();
    ws.connect('ws://localhost:8080');
    
    ws.on('generation:progress', (data) => {
      setGenerationStatus({
        stage: data.stage,
        progress: data.progress,
        message: data.message
      });
    });
    
    ws.on('generation:complete', (data) => {
      setGenerationStatus({
        stage: 'complete',
        progress: 100,
        message: 'Generation complete!'
      });
    });
    
    ws.on('generation:error', (data) => {
      setGenerationStatus({
        stage: 'error',
        progress: 0,
        message: data.error
      });
    });
    
    return () => {
      ws.disconnect();
    };
  }, [projectId]);
  
  const status = useStore((state) => state.generationStatus);
  
  return (
    <div>
      <h3>Generation Progress</h3>
      <p>Stage: {status.stage}</p>
      <p>Progress: {status.progress}%</p>
      <p>Message: {status.message}</p>
      <progress value={status.progress} max={100} />
    </div>
  );
}
```

---

## Complete Example: Mini Storyboard Editor

```typescript
import { useState } from 'react';
import { useStore } from '@/stores/useStore';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

function MiniStoryboardEditor() {
  const shots = useStore((state) => state.shots);
  const selectedShotId = useStore((state) => state.selectedShotId);
  const addShot = useStore((state) => state.addShot);
  const updateShot = useStore((state) => state.updateShot);
  const deleteShot = useStore((state) => state.deleteShot);
  const selectShot = useStore((state) => state.selectShot);
  
  const selectedShot = shots.find(s => s.id === selectedShotId);
  
  const handleAddShot = () => {
    addShot({
      title: `Shot ${shots.length + 1}`,
      description: 'New shot description',
      duration: 5
    });
  };
  
  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{ display: 'flex', height: '100vh' }}>
        {/* Shot List */}
        <div style={{ width: '300px', borderRight: '1px solid #ccc', padding: '10px' }}>
          <button onClick={handleAddShot}>Add Shot</button>
          <div>
            {shots.map((shot) => (
              <div
                key={shot.id}
                onClick={() => selectShot(shot.id)}
                style={{
                  padding: '10px',
                  margin: '5px 0',
                  border: selectedShotId === shot.id ? '2px solid blue' : '1px solid gray',
                  cursor: 'pointer'
                }}
              >
                <h4>{shot.title}</h4>
                <p>{shot.duration}s</p>
              </div>
            ))}
          </div>
        </div>
        
        {/* Properties Panel */}
        <div style={{ flex: 1, padding: '20px' }}>
          {selectedShot ? (
            <div>
              <h2>Edit Shot</h2>
              <div>
                <label>Title:</label>
                <input
                  type="text"
                  value={selectedShot.title}
                  onChange={(e) => updateShot(selectedShot.id, { title: e.target.value })}
                />
              </div>
              <div>
                <label>Description:</label>
                <textarea
                  value={selectedShot.description}
                  onChange={(e) => updateShot(selectedShot.id, { description: e.target.value })}
                />
              </div>
              <div>
                <label>Duration (seconds):</label>
                <input
                  type="number"
                  value={selectedShot.duration}
                  onChange={(e) => updateShot(selectedShot.id, { duration: parseFloat(e.target.value) })}
                />
              </div>
              <button onClick={() => deleteShot(selectedShot.id)}>Delete Shot</button>
            </div>
          ) : (
            <p>Select a shot to edit</p>
          )}
        </div>
      </div>
    </DndProvider>
  );
}

export default MiniStoryboardEditor;
```

---

## Additional Resources

- **User Guide**: See USER_GUIDE.md for end-user documentation
- **API Reference**: See API_REFERENCE.md for complete API documentation
- **GitHub**: https://github.com/storycore-engine/creative-studio-ui
- **Support**: support@storycore-engine.com
