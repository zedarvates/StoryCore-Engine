/**
 * Simple Editor Page Wrapper
 * 
 * Wraps the VideoEditorPage component and loads sequence data
 */

import { useState, useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { useEditorStore } from '@/stores/editorStore';
import VideoEditorPage from '@/components/editor/VideoEditorPage';
import type { Shot } from '@/types';

interface EditorPageSimpleProps {
  sequenceId?: string;
  onBackToDashboard: () => void;
}

export function EditorPageSimple({ sequenceId, onBackToDashboard }: EditorPageSimpleProps) {
  const { project } = useAppStore();
  const { shots } = useEditorStore();
  
  const [sequenceShots, setSequenceShots] = useState<Shot[]>([]);
  const [sequenceName, setSequenceName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Load sequence data
  useEffect(() => {
    const loadSequenceData = async () => {
      setIsLoading(true);
      
      try {
        if (sequenceId && shots) {
          // Filter shots for this sequence
          const filtered = shots.filter((shot: any) => shot.sequence_id === sequenceId);
          setSequenceShots(filtered);
          
          // Get sequence name
          if (filtered.length > 0) {
            const firstShot = filtered[0] as any;
            setSequenceName(firstShot.sequence_name || `Sequence ${sequenceId}`);
          } else {
            setSequenceName(`Sequence ${sequenceId}`);
          }
          
          console.log(`Loaded ${filtered.length} shots for sequence ${sequenceId}`);
        } else {
          // No sequence selected, show all shots
          setSequenceShots(shots || []);
          setSequenceName('All Shots');
        }
      } catch (error) {
        console.error('Failed to load sequence data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSequenceData();
  }, [sequenceId, shots]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading sequence...</p>
        </div>
      </div>
    );
  }
  
  if (!project) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">No Project Loaded</h1>
          <p className="text-muted-foreground">Please create or open a project first.</p>
          <button
            onClick={onBackToDashboard}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <VideoEditorPage 
      sequenceId={sequenceId}
      sequenceName={sequenceName}
      initialShots={sequenceShots}
      projectName={project.project_name}
      onBackToDashboard={onBackToDashboard}
    />
  );
}
