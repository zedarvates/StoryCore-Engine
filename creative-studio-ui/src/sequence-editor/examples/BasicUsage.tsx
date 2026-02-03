/**
 * Basic Usage Example for Sequence Editor
 * 
 * This file demonstrates how to integrate and use the Sequence Editor
 * in your application.
 */

import React from 'react';
import { SequenceEditor } from '../SequenceEditor';

/**
 * Example: Basic Integration
 * 
 * Simply import and render the SequenceEditor component.
 * The Redux store and drag-and-drop context are automatically configured.
 */
export const BasicUsageExample: React.FC = () => {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <SequenceEditor />
    </div>
  );
};

/**
 * Example: With Custom Wrapper
 * 
 * You can wrap the SequenceEditor with your own components
 * for additional functionality.
 */
export const CustomWrapperExample: React.FC = () => {
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    // Simulate loading project data
    setTimeout(() => setIsLoading(false), 1000);
  }, []);

  if (isLoading) {
    return (
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#1a1a1a',
        color: '#ffffff'
      }}>
        <p>Loading Sequence Editor...</p>
      </div>
    );
  }

  return <SequenceEditor />;
};

/**
 * Example: Accessing Redux State
 * 
 * Use the provided hooks to access and update Redux state
 * from within child components.
 */
import { useAppDispatch, useAppSelector } from '../store';
import { addShot } from '../store/slices/timelineSlice';
import { setActiveTool } from '../store/slices/toolsSlice';

export const StateAccessExample: React.FC = () => {
  const dispatch = useAppDispatch();
  const shots = useAppSelector((state) => state.timeline.shots);
  const activeTool = useAppSelector((state) => state.tools.activeTool);

  const handleAddShot = () => {
    dispatch(addShot({
      id: `shot-${Date.now()}`,
      name: `Shot ${shots.length + 1}`,
      startTime: shots.length > 0 
        ? Math.max(...shots.map(s => s.startTime + s.duration))
        : 0,
      duration: 150, // 5 seconds at 30 FPS
      layers: [],
      referenceImages: [],
      prompt: '',
      parameters: {
        seed: Math.floor(Math.random() * 1000000),
        denoising: 0.7,
        steps: 20,
        guidance: 7.5,
        sampler: 'euler',
        scheduler: 'normal',
      },
      generationStatus: 'pending',
    }));
  };

  const handleToolChange = (tool: 'select' | 'trim' | 'split') => {
    dispatch(setActiveTool(tool));
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Sequence Editor State</h2>
      <p>Total Shots: {shots.length}</p>
      <p>Active Tool: {activeTool}</p>
      
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <button onClick={handleAddShot}>Add Shot</button>
        <button onClick={() => handleToolChange('select')}>Select Tool</button>
        <button onClick={() => handleToolChange('trim')}>Trim Tool</button>
        <button onClick={() => handleToolChange('split')}>Split Tool</button>
      </div>
    </div>
  );
};

export default BasicUsageExample;
