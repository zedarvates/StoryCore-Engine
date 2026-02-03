/**
 * Generation Button Toolbar Examples
 * 
 * Demonstrates how to integrate the GenerationButtonToolbar in different contexts.
 */

import React, { useState } from 'react';
import { GenerationButtonToolbar } from './GenerationButtonToolbar';
import type { Shot, Sequence, GeneratedAsset } from '../../types';

/**
 * Example 1: Editor Context Integration
 * 
 * Shows how to integrate the toolbar in the editor layout.
 * The toolbar is positioned at the top of the editor with sticky positioning.
 */
export function EditorContextExample() {
  const [currentShot, setCurrentShot] = useState<Shot>({
    id: 'shot-1',
    title: 'Opening Scene',
    description: 'A wide shot of the city skyline at dawn',
    duration: 5,
    position: 1,
    audioTracks: [],
    effects: [],
    textLayers: [],
    animations: [],
    metadata: {},
  });

  const [currentSequence, setCurrentSequence] = useState<Sequence>({
    id: 'seq-1',
    name: 'Act 1 - Introduction',
    shots: [currentShot],
    duration: 5,
  });

  const handleGenerationComplete = (asset: GeneratedAsset) => {
    console.log('Generation complete:', asset);
    // Update shot or sequence with generated asset
  };

  return (
    <div className="editor-layout">
      {/* Generation Toolbar at top of editor */}
      <GenerationButtonToolbar
        context="editor"
        currentShot={currentShot}
        currentSequence={currentSequence}
        onGenerationComplete={handleGenerationComplete}
      />
      
      {/* Editor content below */}
      <div className="editor-content">
        <div className="editor-canvas">
          <h2>Editor Canvas</h2>
          <p>Current Shot: {currentShot.title}</p>
          <p>Sequence: {currentSequence.name}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Example 2: Dashboard Context Integration
 * 
 * Shows how to integrate the toolbar in the project dashboard.
 * The toolbar is displayed as a panel in the dashboard overview.
 */
export function DashboardContextExample() {
  const handleGenerationComplete = (asset: GeneratedAsset) => {
    console.log('Generation complete:', asset);
    // Add asset to project
  };

  return (
    <div className="dashboard-layout">
      <div className="dashboard-header">
        <h1>Project Dashboard</h1>
      </div>
      
      <div className="dashboard-content">
        {/* Project Overview */}
        <div className="dashboard-section">
          <h2>Project Overview</h2>
          <div className="project-stats">
            <div className="stat">
              <span className="stat-label">Sequences</span>
              <span className="stat-value">3</span>
            </div>
            <div className="stat">
              <span className="stat-label">Shots</span>
              <span className="stat-value">12</span>
            </div>
            <div className="stat">
              <span className="stat-label">Duration</span>
              <span className="stat-value">2:30</span>
            </div>
          </div>
        </div>
        
        {/* Generation Toolbar Panel */}
        <div className="dashboard-section">
          <h2>Quick Generation</h2>
          <GenerationButtonToolbar
            context="dashboard"
            onGenerationComplete={handleGenerationComplete}
          />
        </div>
        
        {/* Recent Activity */}
        <div className="dashboard-section">
          <h2>Recent Activity</h2>
          <ul className="activity-list">
            <li>Created sequence "Act 1"</li>
            <li>Generated image for shot 1</li>
            <li>Added audio to shot 3</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * Example 3: Responsive Layout
 * 
 * Shows how the toolbar adapts to different screen sizes.
 */
export function ResponsiveExample() {
  const [context, setContext] = useState<'editor' | 'dashboard'>('editor');

  return (
    <div className="responsive-example">
      <div className="controls">
        <button onClick={() => setContext('editor')}>
          Editor Context
        </button>
        <button onClick={() => setContext('dashboard')}>
          Dashboard Context
        </button>
      </div>
      
      <div className="preview">
        <GenerationButtonToolbar
          context={context}
          onGenerationComplete={(asset) => {
            console.log('Generated:', asset);
          }}
        />
      </div>
      
      <div className="info">
        <p>Current context: <strong>{context}</strong></p>
        <p>Resize the window to see responsive behavior</p>
      </div>
    </div>
  );
}

/**
 * Example 4: Custom Styling
 * 
 * Shows how to apply custom styles to the toolbar.
 */
export function CustomStylingExample() {
  return (
    <div className="custom-styling-example">
      <h2>Default Styling</h2>
      <GenerationButtonToolbar
        context="dashboard"
      />
      
      <h2>Custom Styling</h2>
      <GenerationButtonToolbar
        context="dashboard"
        className="custom-toolbar"
      />
      
      <style>{`
        .custom-toolbar {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          padding: 1rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .custom-toolbar .toolbar-buttons {
          gap: 1rem;
        }
      `}</style>
    </div>
  );
}

/**
 * Example 5: Integration with EditorLayout
 * 
 * Complete example showing integration with the actual EditorLayout component.
 */
export function EditorLayoutIntegrationExample() {
  return (
    <div className="editor-layout-integration">
      <div className="flex h-screen bg-background text-foreground">
        {/* Left Sidebar - Asset Panel */}
        <div className="w-64 border-r border-border">
          <div className="p-4">
            <h3 className="font-semibold mb-4">Assets</h3>
            <div className="space-y-2">
              <div className="p-2 bg-muted rounded">Image 1</div>
              <div className="p-2 bg-muted rounded">Video 1</div>
              <div className="p-2 bg-muted rounded">Audio 1</div>
            </div>
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Generation Toolbar */}
          <GenerationButtonToolbar
            context="editor"
            onGenerationComplete={(asset) => {
              console.log('Asset generated:', asset);
            }}
          />
          
          {/* Canvas Area */}
          <div className="flex-1 p-4">
            <div className="h-full border-2 border-dashed border-border rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground">Canvas Area</p>
            </div>
          </div>
        </div>
        
        {/* Right Sidebar - Properties Panel */}
        <div className="w-64 border-l border-border">
          <div className="p-4">
            <h3 className="font-semibold mb-4">Properties</h3>
            <div className="space-y-2">
              <div className="p-2 bg-muted rounded">Duration: 5s</div>
              <div className="p-2 bg-muted rounded">Position: 1</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Example 6: Integration with ProjectDashboard
 * 
 * Complete example showing integration with the actual ProjectDashboard component.
 */
export function ProjectDashboardIntegrationExample() {
  return (
    <div className="project-dashboard-integration">
      <div className="min-h-screen bg-background">
        {/* Dashboard Header */}
        <div className="border-b border-border p-4">
          <h1 className="text-2xl font-bold">My Project</h1>
          <p className="text-muted-foreground">Created 2 days ago</p>
        </div>
        
        {/* Dashboard Content */}
        <div className="p-6 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">3</div>
              <div className="text-sm text-muted-foreground">Sequences</div>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">12</div>
              <div className="text-sm text-muted-foreground">Shots</div>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">2:30</div>
              <div className="text-sm text-muted-foreground">Duration</div>
            </div>
          </div>
          
          {/* Generation Panel */}
          <div className="bg-card rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Generation</h2>
            <GenerationButtonToolbar
              context="dashboard"
              onGenerationComplete={(asset) => {
                console.log('Asset generated:', asset);
              }}
            />
          </div>
          
          {/* Sequences List */}
          <div className="bg-card rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Sequences</h2>
            <div className="space-y-2">
              <div className="p-3 bg-muted rounded">Act 1 - Introduction</div>
              <div className="p-3 bg-muted rounded">Act 2 - Conflict</div>
              <div className="p-3 bg-muted rounded">Act 3 - Resolution</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Main Example Component
 * 
 * Renders all examples with tabs for easy navigation.
 */
export function GenerationButtonToolbarExamples() {
  const [activeExample, setActiveExample] = useState<string>('editor');

  const examples = {
    editor: {
      title: 'Editor Context',
      component: <EditorContextExample />,
    },
    dashboard: {
      title: 'Dashboard Context',
      component: <DashboardContextExample />,
    },
    responsive: {
      title: 'Responsive Layout',
      component: <ResponsiveExample />,
    },
    styling: {
      title: 'Custom Styling',
      component: <CustomStylingExample />,
    },
    editorIntegration: {
      title: 'Editor Integration',
      component: <EditorLayoutIntegrationExample />,
    },
    dashboardIntegration: {
      title: 'Dashboard Integration',
      component: <ProjectDashboardIntegrationExample />,
    },
  };

  return (
    <div className="examples-container">
      <div className="examples-header">
        <h1>Generation Button Toolbar Examples</h1>
        <p>Explore different ways to integrate the generation toolbar</p>
      </div>
      
      <div className="examples-tabs">
        {Object.entries(examples).map(([key, example]) => (
          <button
            key={key}
            className={`tab ${activeExample === key ? 'active' : ''}`}
            onClick={() => setActiveExample(key)}
          >
            {example.title}
          </button>
        ))}
      </div>
      
      <div className="examples-content">
        {examples[activeExample as keyof typeof examples].component}
      </div>
      
      <style>{`
        .examples-container {
          padding: 2rem;
        }
        
        .examples-header {
          margin-bottom: 2rem;
        }
        
        .examples-header h1 {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
        }
        
        .examples-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
          border-bottom: 1px solid hsl(var(--border));
        }
        
        .tab {
          padding: 0.75rem 1.5rem;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .tab:hover {
          background: hsl(var(--muted));
        }
        
        .tab.active {
          border-bottom-color: hsl(var(--primary));
          font-weight: 600;
        }
        
        .examples-content {
          padding: 2rem;
          border: 1px solid hsl(var(--border));
          border-radius: 0.5rem;
        }
        
        .editor-layout,
        .dashboard-layout {
          min-height: 400px;
        }
        
        .responsive-example .controls {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
        }
        
        .responsive-example .controls button {
          padding: 0.5rem 1rem;
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
          border: none;
          border-radius: 0.25rem;
          cursor: pointer;
        }
        
        .custom-styling-example h2 {
          margin: 2rem 0 1rem;
          font-size: 1.5rem;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
