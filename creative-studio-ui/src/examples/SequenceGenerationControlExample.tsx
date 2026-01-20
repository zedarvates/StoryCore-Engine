/**
 * SequenceGenerationControl Example
 * 
 * Demonstrates usage of the SequenceGenerationControl component
 * with various scenarios and configurations.
 */

import React, { useState } from 'react';
import { SequenceGenerationControl } from '../components/SequenceGenerationControl';
import { ProjectProvider } from '../contexts/ProjectContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import type { GenerationResults, Project } from '../types/projectDashboard';

// ============================================================================
// Mock Data
// ============================================================================

/**
 * Create a mock project with valid prompts
 */
const createValidProject = (): Project => ({
  id: 'valid-project',
  name: 'Valid Project',
  schemaVersion: '1.0',
  sequences: [
    {
      id: 'seq-1',
      name: 'Main Sequence',
      description: 'Main sequence with valid prompts',
      shotIds: ['shot-1', 'shot-2', 'shot-3'],
      duration: 30,
    },
  ],
  shots: [
    {
      id: 'shot-1',
      sequenceId: 'seq-1',
      startTime: 0,
      duration: 10,
      prompt: 'A beautiful sunset over the ocean with warm orange and pink colors',
      metadata: {
        cameraAngle: 'wide',
        lighting: 'natural',
        mood: 'peaceful',
      },
    },
    {
      id: 'shot-2',
      sequenceId: 'seq-1',
      startTime: 10,
      duration: 10,
      prompt: 'Close-up of a person looking at the sunset with a contemplative expression',
      metadata: {
        cameraAngle: 'close-up',
        lighting: 'natural',
        mood: 'contemplative',
      },
    },
    {
      id: 'shot-3',
      sequenceId: 'seq-1',
      startTime: 20,
      duration: 10,
      prompt: 'Wide shot of the beach with waves gently rolling onto the shore',
      metadata: {
        cameraAngle: 'wide',
        lighting: 'natural',
        mood: 'serene',
      },
    },
  ],
  audioPhrases: [],
  generationHistory: [],
  capabilities: {
    gridGeneration: true,
    promotionEngine: true,
    qaEngine: true,
    autofixEngine: true,
    voiceGeneration: true,
  },
});

/**
 * Create a mock project with invalid prompts
 */
const createInvalidProject = (): Project => ({
  id: 'invalid-project',
  name: 'Invalid Project',
  schemaVersion: '1.0',
  sequences: [
    {
      id: 'seq-1',
      name: 'Main Sequence',
      description: 'Sequence with invalid prompts',
      shotIds: ['shot-1', 'shot-2', 'shot-3'],
      duration: 30,
    },
  ],
  shots: [
    {
      id: 'shot-1',
      sequenceId: 'seq-1',
      startTime: 0,
      duration: 10,
      prompt: 'Short', // Too short (< 10 characters)
      metadata: {},
    },
    {
      id: 'shot-2',
      sequenceId: 'seq-1',
      startTime: 10,
      duration: 10,
      prompt: '', // Empty
      metadata: {},
    },
    {
      id: 'shot-3',
      sequenceId: 'seq-1',
      startTime: 20,
      duration: 10,
      prompt: 'A valid prompt that meets the minimum character requirement',
      metadata: {},
    },
  ],
  audioPhrases: [],
  generationHistory: [],
  capabilities: {
    gridGeneration: true,
    promotionEngine: true,
    qaEngine: true,
    autofixEngine: true,
    voiceGeneration: true,
  },
});

/**
 * Create an empty project
 */
const createEmptyProject = (): Project => ({
  id: 'empty-project',
  name: 'Empty Project',
  schemaVersion: '1.0',
  sequences: [],
  shots: [],
  audioPhrases: [],
  generationHistory: [],
  capabilities: {
    gridGeneration: true,
    promotionEngine: true,
    qaEngine: true,
    autofixEngine: true,
    voiceGeneration: true,
  },
});

// ============================================================================
// Example Components
// ============================================================================

/**
 * Example 1: Basic Usage with Valid Prompts
 */
const BasicExample: React.FC = () => {
  const [results, setResults] = useState<GenerationResults | null>(null);

  const handleComplete = (generationResults: GenerationResults) => {
    console.log('Generation completed:', generationResults);
    setResults(generationResults);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Example 1: Valid Prompts</CardTitle>
          <CardDescription>
            All shots have valid prompts. Button should be enabled.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SequenceGenerationControl
            onGenerationComplete={handleComplete}
          />
          
          {results && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-800">
                Generation completed successfully!
              </p>
              <p className="text-xs text-green-700 mt-1">
                Generated {results.generatedShots.length} shots
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Example 2: Invalid Prompts
 */
const InvalidPromptsExample: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Example 2: Invalid Prompts</CardTitle>
        <CardDescription>
          Some shots have invalid prompts. Button should be disabled with error display.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SequenceGenerationControl />
      </CardContent>
    </Card>
  );
};

/**
 * Example 3: Empty Project
 */
const EmptyProjectExample: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Example 3: Empty Project</CardTitle>
        <CardDescription>
          Project has no shots. Button should be disabled with guidance message.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SequenceGenerationControl />
      </CardContent>
    </Card>
  );
};

/**
 * Example 4: With Callbacks
 */
const CallbacksExample: React.FC = () => {
  const [log, setLog] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const handleComplete = (results: GenerationResults) => {
    addLog(`Generation completed: ${results.generatedShots.length} shots generated`);
  };

  const handleCancel = () => {
    addLog('Generation cancelled by user');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Example 4: With Callbacks</CardTitle>
          <CardDescription>
            Demonstrates callback usage for generation events.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SequenceGenerationControl
            onGenerationComplete={handleComplete}
            onGenerationCancel={handleCancel}
          />

          {/* Event Log */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Event Log</p>
            <div className="p-3 bg-muted rounded-lg max-h-40 overflow-y-auto">
              {log.length === 0 ? (
                <p className="text-xs text-muted-foreground">No events yet</p>
              ) : (
                <div className="space-y-1">
                  {log.map((entry, index) => (
                    <p key={index} className="text-xs font-mono">
                      {entry}
                    </p>
                  ))}
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLog([])}
              disabled={log.length === 0}
            >
              Clear Log
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Example 5: Custom Styling
 */
const CustomStylingExample: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Example 5: Custom Styling</CardTitle>
        <CardDescription>
          Component with custom CSS classes applied.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SequenceGenerationControl
          className="max-w-xl mx-auto shadow-lg"
        />
      </CardContent>
    </Card>
  );
};

// ============================================================================
// Main Example Component
// ============================================================================

/**
 * Main example component with tabs for different scenarios
 */
export const SequenceGenerationControlExample: React.FC = () => {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">SequenceGenerationControl Examples</h1>
        <p className="text-muted-foreground">
          Interactive examples demonstrating the SequenceGenerationControl component
          in various scenarios and configurations.
        </p>
      </div>

      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="invalid">Invalid</TabsTrigger>
          <TabsTrigger value="empty">Empty</TabsTrigger>
          <TabsTrigger value="callbacks">Callbacks</TabsTrigger>
          <TabsTrigger value="styling">Styling</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <ProjectProvider projectId="valid-project">
            <BasicExample />
          </ProjectProvider>
        </TabsContent>

        <TabsContent value="invalid">
          <ProjectProvider projectId="invalid-project">
            <InvalidPromptsExample />
          </ProjectProvider>
        </TabsContent>

        <TabsContent value="empty">
          <ProjectProvider projectId="empty-project">
            <EmptyProjectExample />
          </ProjectProvider>
        </TabsContent>

        <TabsContent value="callbacks">
          <ProjectProvider projectId="valid-project">
            <CallbacksExample />
          </ProjectProvider>
        </TabsContent>

        <TabsContent value="styling">
          <ProjectProvider projectId="valid-project">
            <CustomStylingExample />
          </ProjectProvider>
        </TabsContent>
      </Tabs>

      {/* Code Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Code Examples</CardTitle>
          <CardDescription>
            Copy-paste ready code snippets for common use cases
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Basic Usage</p>
            <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs">
{`import { SequenceGenerationControl } from './components/SequenceGenerationControl';
import { ProjectProvider } from './contexts/ProjectContext';

function App() {
  return (
    <ProjectProvider projectId="my-project">
      <SequenceGenerationControl />
    </ProjectProvider>
  );
}`}
            </pre>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">With Callbacks</p>
            <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs">
{`import { SequenceGenerationControl } from './components/SequenceGenerationControl';
import type { GenerationResults } from './types/projectDashboard';

function App() {
  const handleComplete = (results: GenerationResults) => {
    console.log('Generated:', results.generatedShots.length, 'shots');
  };

  const handleCancel = () => {
    console.log('Generation cancelled');
  };

  return (
    <SequenceGenerationControl
      onGenerationComplete={handleComplete}
      onGenerationCancel={handleCancel}
    />
  );
}`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SequenceGenerationControlExample;
