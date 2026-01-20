# ProjectDashboardNew Component - Usage Examples

This document provides comprehensive usage examples for the ProjectDashboardNew component and its related components.

## Table of Contents

1. [Basic Usage](#basic-usage)
2. [With Custom Callbacks](#with-custom-callbacks)
3. [Accessing Project Context](#accessing-project-context)
4. [Shot Management](#shot-management)
5. [Dialogue Phrase Management](#dialogue-phrase-management)
6. [Sequence Generation](#sequence-generation)
7. [Error Handling](#error-handling)
8. [Performance Optimization](#performance-optimization)

---

## Basic Usage

The simplest way to use ProjectDashboardNew is to provide just a project ID:

```tsx
import { ProjectDashboardNew } from './components/ProjectDashboardNew';

function App() {
  return (
    <ProjectDashboardNew projectId="my-project-123" />
  );
}
```

This will:
- Load the project from storage (or create a new one if it doesn't exist)
- Display the dashboard with all panels
- Enable auto-save functionality
- Handle all state management internally

---

## With Custom Callbacks

You can provide callbacks to respond to project updates and generation completion:

```tsx
import { ProjectDashboardNew } from './components/ProjectDashboardNew';
import type { Project, GenerationResults } from './types/projectDashboard';

function App() {
  const handleProjectUpdate = (project: Project) => {
    console.log('Project updated:', project.name);
    // Sync with backend, update analytics, etc.
  };

  const handleGenerationComplete = (results: GenerationResults) => {
    console.log('Generation complete!');
    console.log('Master Coherence Sheet:', results.masterCoherenceSheetUrl);
    console.log('Generated shots:', results.generatedShots.length);
    console.log('QA Score:', results.qaReport.overallScore);
    
    // Show success notification
    showNotification({
      title: 'Sequence Generated',
      message: `Successfully generated ${results.generatedShots.length} shots`,
      type: 'success',
    });
  };

  return (
    <ProjectDashboardNew
      projectId="my-project-123"
      onProjectUpdate={handleProjectUpdate}
      onGenerationComplete={handleGenerationComplete}
    />
  );
}
```

---

## Accessing Project Context

Use the `useProject` hook to access project state and functions from child components:

```tsx
import { useProject } from './contexts/ProjectContext';

function CustomComponent() {
  const {
    project,
    selectedShot,
    isGenerating,
    updateShot,
    selectShot,
    generateSequence,
  } = useProject();

  if (!project) {
    return <div>No project loaded</div>;
  }

  return (
    <div>
      <h2>{project.name}</h2>
      <p>Shots: {project.shots.length}</p>
      <p>Phrases: {project.audioPhrases.length}</p>
      
      {isGenerating && <p>Generating sequence...</p>}
      
      <button onClick={() => generateSequence()}>
        Generate Sequence
      </button>
    </div>
  );
}

// Use within ProjectProvider
function App() {
  return (
    <ProjectDashboardNew projectId="my-project-123">
      <CustomComponent />
    </ProjectDashboardNew>
  );
}
```

---

## Shot Management

### Updating Shot Prompts

```tsx
import { useProject } from './contexts/ProjectContext';

function ShotEditor({ shotId }: { shotId: string }) {
  const { project, updateShot } = useProject();
  const shot = project?.shots.find(s => s.id === shotId);

  if (!shot) return null;

  const handlePromptChange = (newPrompt: string) => {
    updateShot(shotId, { prompt: newPrompt });
  };

  return (
    <div>
      <h3>Shot {shot.id}</h3>
      <textarea
        value={shot.prompt}
        onChange={(e) => handlePromptChange(e.target.value)}
        placeholder="Enter shot prompt..."
      />
      
      {shot.promptValidation && !shot.promptValidation.isValid && (
        <div className="error">
          {shot.promptValidation.errors.map(err => (
            <p key={err.type}>{err.message}</p>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Deleting Shots

```tsx
import { useProject } from './contexts/ProjectContext';

function ShotList() {
  const { project, deleteShot } = useProject();

  const handleDelete = (shotId: string) => {
    const confirmed = window.confirm(
      'Delete this shot? Choose how to handle associated dialogue phrases.'
    );
    
    if (confirmed) {
      const deletePhrases = window.confirm(
        'Delete associated dialogue phrases? (Cancel to unlink them instead)'
      );
      
      deleteShot(shotId, deletePhrases);
    }
  };

  return (
    <div>
      {project?.shots.map(shot => (
        <div key={shot.id}>
          <h4>{shot.id}</h4>
          <p>{shot.prompt}</p>
          <button onClick={() => handleDelete(shot.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
```

### Validating All Shots

```tsx
import { useProject } from './contexts/ProjectContext';

function ValidationPanel() {
  const { validateAllShots } = useProject();

  const handleValidate = () => {
    const result = validateAllShots();
    
    if (result.valid) {
      alert('All shots have valid prompts!');
    } else {
      alert(`${result.invalidShots.length} shots have invalid prompts`);
      console.log('Invalid shots:', result.invalidShots);
    }
  };

  return (
    <button onClick={handleValidate}>
      Validate All Shots
    </button>
  );
}
```

---

## Dialogue Phrase Management

### Adding Dialogue Phrases

```tsx
import { useProject } from './contexts/ProjectContext';
import type { DialoguePhrase } from './types/projectDashboard';

function AddPhraseForm({ shotId }: { shotId: string }) {
  const { addDialoguePhrase } = useProject();
  const [text, setText] = useState('');
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(5);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    addDialoguePhrase({
      shotId,
      text,
      startTime,
      endTime,
      metadata: {
        character: 'Narrator',
        emotion: 'neutral',
      },
    });
    
    // Reset form
    setText('');
    setStartTime(0);
    setEndTime(5);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Dialogue text..."
        required
      />
      
      <input
        type="number"
        value={startTime}
        onChange={(e) => setStartTime(Number(e.target.value))}
        placeholder="Start time (seconds)"
        min={0}
        required
      />
      
      <input
        type="number"
        value={endTime}
        onChange={(e) => setEndTime(Number(e.target.value))}
        placeholder="End time (seconds)"
        min={startTime + 0.1}
        required
      />
      
      <button type="submit">Add Phrase</button>
    </form>
  );
}
```

### Updating Dialogue Phrases

```tsx
import { useProject } from './contexts/ProjectContext';

function PhraseEditor({ phraseId }: { phraseId: string }) {
  const { project, updateDialoguePhrase } = useProject();
  const phrase = project?.audioPhrases.find(p => p.id === phraseId);

  if (!phrase) return null;

  const handleTextChange = (newText: string) => {
    updateDialoguePhrase(phraseId, { text: newText });
  };

  const handleTimeChange = (startTime: number, endTime: number) => {
    updateDialoguePhrase(phraseId, { startTime, endTime });
  };

  return (
    <div>
      <input
        type="text"
        value={phrase.text}
        onChange={(e) => handleTextChange(e.target.value)}
      />
      
      <input
        type="number"
        value={phrase.startTime}
        onChange={(e) => handleTimeChange(Number(e.target.value), phrase.endTime)}
      />
      
      <input
        type="number"
        value={phrase.endTime}
        onChange={(e) => handleTimeChange(phrase.startTime, Number(e.target.value))}
      />
    </div>
  );
}
```

### Linking Phrases to Shots

```tsx
import { useProject } from './contexts/ProjectContext';

function PhraseShotLinker({ phraseId }: { phraseId: string }) {
  const { project, linkPhraseToShot } = useProject();
  const phrase = project?.audioPhrases.find(p => p.id === phraseId);

  if (!phrase) return null;

  return (
    <select
      value={phrase.shotId}
      onChange={(e) => linkPhraseToShot(phraseId, e.target.value)}
    >
      <option value="">No shot</option>
      {project?.shots.map(shot => (
        <option key={shot.id} value={shot.id}>
          {shot.id}
        </option>
      ))}
    </select>
  );
}
```

---

## Sequence Generation

### Basic Generation

```tsx
import { useProject } from './contexts/ProjectContext';

function GenerateButton() {
  const { generateSequence, isGenerating, validateAllShots } = useProject();

  const handleGenerate = async () => {
    // Validate first
    const validation = validateAllShots();
    if (!validation.valid) {
      alert('Please fix invalid prompts before generating');
      return;
    }

    // Generate
    const results = await generateSequence();
    
    if (results) {
      console.log('Generation successful!', results);
    } else {
      console.log('Generation cancelled or failed');
    }
  };

  return (
    <button
      onClick={handleGenerate}
      disabled={isGenerating}
    >
      {isGenerating ? 'Generating...' : 'Generate Sequence'}
    </button>
  );
}
```

### With Progress Tracking

```tsx
import { useProject } from './contexts/ProjectContext';

function GenerationProgress() {
  const { generationStatus, isGenerating } = useProject();

  if (!isGenerating) return null;

  const stageNames = {
    grid: 'Generating Master Coherence Sheet',
    comfyui: 'Generating Images with ComfyUI',
    promotion: 'Promoting Shots',
    qa: 'Running Quality Analysis',
    export: 'Exporting Results',
  };

  return (
    <div>
      <h3>{stageNames[generationStatus.stage] || 'Processing...'}</h3>
      
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${generationStatus.progress}%` }}
        />
      </div>
      
      <p>{generationStatus.progress}% complete</p>
      
      {generationStatus.currentShot && generationStatus.totalShots && (
        <p>
          Shot {generationStatus.currentShot} of {generationStatus.totalShots}
        </p>
      )}
      
      {generationStatus.estimatedCompletion && (
        <p>
          Estimated completion: {new Date(generationStatus.estimatedCompletion).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
```

### Cancelling Generation

```tsx
import { useProject } from './contexts/ProjectContext';

function CancelButton() {
  const { cancelGeneration, isGenerating } = useProject();

  if (!isGenerating) return null;

  const handleCancel = () => {
    const confirmed = window.confirm('Cancel generation?');
    if (confirmed) {
      cancelGeneration();
    }
  };

  return (
    <button onClick={handleCancel}>
      Cancel Generation
    </button>
  );
}
```

---

## Error Handling

### Displaying Errors

```tsx
import { useProject } from './contexts/ProjectContext';

function ErrorDisplay() {
  const { error } = useProject();

  if (!error) return null;

  return (
    <div className="error-banner">
      <h4>Error</h4>
      <p>{error}</p>
    </div>
  );
}
```

### Handling Save Errors

```tsx
import { useProject } from './contexts/ProjectContext';

function SaveStatusIndicator() {
  const { saveStatus, isSaving, saveProject } = useProject();

  const handleRetry = () => {
    saveProject();
  };

  return (
    <div>
      {isSaving && <span>Saving...</span>}
      {saveStatus === 'saved' && <span>✓ Saved</span>}
      {saveStatus === 'error' && (
        <div>
          <span>✗ Save failed</span>
          <button onClick={handleRetry}>Retry</button>
        </div>
      )}
    </div>
  );
}
```

---

## Performance Optimization

### Using Memoized Validation

```tsx
import { memoizedValidatePrompt } from './utils/performanceOptimizations';

function OptimizedPromptEditor({ prompt }: { prompt: string }) {
  // Use memoized validation for better performance
  const validation = memoizedValidatePrompt(prompt);

  return (
    <div>
      <textarea value={prompt} />
      {!validation.isValid && (
        <div className="errors">
          {validation.errors.map(err => (
            <p key={err.type}>{err.message}</p>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Using Debounced Updates

```tsx
import { useDebounce } from './utils/performanceOptimizations';
import { useProject } from './contexts/ProjectContext';

function DebouncedPromptEditor({ shotId }: { shotId: string }) {
  const { project, updateShot } = useProject();
  const shot = project?.shots.find(s => s.id === shotId);
  const [localPrompt, setLocalPrompt] = useState(shot?.prompt || '');

  // Debounce updates to reduce validation calls
  const debouncedUpdate = useDebounce((prompt: string) => {
    updateShot(shotId, { prompt });
  }, 300);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newPrompt = e.target.value;
    setLocalPrompt(newPrompt);
    debouncedUpdate(newPrompt);
  };

  return (
    <textarea
      value={localPrompt}
      onChange={handleChange}
      placeholder="Enter shot prompt..."
    />
  );
}
```

### Virtual Scrolling for Large Lists

```tsx
import { useVirtualScroll } from './utils/performanceOptimizations';
import { useProject } from './contexts/ProjectContext';

function VirtualizedShotList() {
  const { project } = useProject();
  const shots = project?.shots || [];

  const {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
  } = useVirtualScroll(shots, 100, 600); // 100px per item, 600px container

  return (
    <div
      style={{ height: 600, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map(shot => (
            <div key={shot.id} style={{ height: 100 }}>
              <h4>{shot.id}</h4>
              <p>{shot.prompt}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## Complete Example

Here's a complete example that combines multiple features:

```tsx
import React, { useState } from 'react';
import { ProjectDashboardNew } from './components/ProjectDashboardNew';
import { useProject } from './contexts/ProjectContext';
import type { Project, GenerationResults } from './types/projectDashboard';

// Custom component using project context
function ProjectStats() {
  const { project, getPromptCompletionStatus } = useProject();
  
  if (!project) return null;
  
  const status = getPromptCompletionStatus();
  
  return (
    <div className="stats">
      <h3>Project Statistics</h3>
      <p>Total Shots: {project.shots.length}</p>
      <p>Complete Prompts: {status.complete}</p>
      <p>Incomplete Prompts: {status.incomplete}</p>
      <p>Dialogue Phrases: {project.audioPhrases.length}</p>
    </div>
  );
}

// Main app component
function App() {
  const [projectId] = useState('demo-project-123');

  const handleProjectUpdate = (project: Project) => {
    console.log('Project updated:', project.name);
    // Sync with backend, analytics, etc.
  };

  const handleGenerationComplete = (results: GenerationResults) => {
    console.log('Generation complete!');
    console.log('QA Score:', results.qaReport.overallScore);
    
    // Show notification
    alert(`Successfully generated ${results.generatedShots.length} shots!`);
  };

  return (
    <div className="app">
      <header>
        <h1>StoryCore Project Dashboard</h1>
      </header>
      
      <main>
        <ProjectDashboardNew
          projectId={projectId}
          onProjectUpdate={handleProjectUpdate}
          onGenerationComplete={handleGenerationComplete}
        />
        
        {/* Custom components can access project context */}
        <aside>
          <ProjectStats />
        </aside>
      </main>
    </div>
  );
}

export default App;
```

---

## Best Practices

1. **Always validate before generation**: Use `validateAllShots()` before calling `generateSequence()`

2. **Handle errors gracefully**: Display error messages to users and provide retry options

3. **Use memoized functions**: For expensive operations like validation and analysis

4. **Debounce user input**: Reduce validation calls while typing

5. **Monitor save status**: Display save indicators and handle failures

6. **Provide feedback**: Show progress during generation and loading states

7. **Clean up resources**: Cancel generation when navigating away

8. **Use TypeScript**: Leverage type safety for better development experience

---

## Additional Resources

- [Type Definitions](./types/projectDashboard.ts)
- [Project Context API](./contexts/ProjectContext.tsx)
- [Performance Utilities](./utils/performanceOptimizations.ts)
- [Validation Utilities](./utils/promptValidation.ts)
