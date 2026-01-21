/**
 * AudioTrackManager - Container component for audio track management
 * 
 * Integrates AudioTimeline, DialoguePhraseEditor, and VoiceGenerationPanel
 * to provide a complete workflow for creating, editing, and generating
 * dialogue phrases synchronized with shot timing.
 * 
 * Requirements: 4.1, 4.2, 4.3, 5.1
 */

import React, { useState, useCallback, useMemo } from 'react';
import { AudioTimeline } from './AudioTimeline';
import { DialoguePhraseEditor } from './DialoguePhraseEditor';
import { VoiceGenerationPanel } from './VoiceGenerationPanel';
import { useProject } from '../contexts/ProjectContext';
import type { DialoguePhrase, VoiceParameters } from '../types/projectDashboard';
import { Button } from './ui/button';

// ============================================================================
// Component Props
// ============================================================================

export interface AudioTrackManagerProps {
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export const AudioTrackManager: React.FC<AudioTrackManagerProps> = ({
  className = '',
}) => {
  // ============================================================================
  // Context
  // ============================================================================

  const {
    project,
    addDialoguePhrase,
    updateDialoguePhrase,
    deleteDialoguePhrase,
  } = useProject();

  // ============================================================================
  // State
  // ============================================================================

  const [selectedPhraseId, setSelectedPhraseId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const shots = project?.shots || [];
  const phrases = project?.audioPhrases || [];
  
  // Calculate total duration from shots
  const totalDuration = useMemo(() => {
    if (shots.length === 0) return 60; // Default 60 seconds
    return Math.max(...shots.map(shot => shot.startTime + shot.duration), 60);
  }, [shots]);

  // Get selected phrase
  const selectedPhrase = useMemo(() => {
    if (!selectedPhraseId) return null;
    return phrases.find(p => p.id === selectedPhraseId) || null;
  }, [selectedPhraseId, phrases]);

  // ============================================================================
  // Event Handlers - Timeline
  // ============================================================================

  /**
   * Handle phrase move on timeline
   * Requirements: 4.1, 7.1
   */
  const handlePhraseMove = useCallback((phraseId: string, newStartTime: number) => {
    const phrase = phrases.find(p => p.id === phraseId);
    if (!phrase) return;

    const duration = phrase.endTime - phrase.startTime;
    const newEndTime = newStartTime + duration;

    updateDialoguePhrase(phraseId, {
      startTime: newStartTime,
      endTime: newEndTime,
    });
  }, [phrases, updateDialoguePhrase]);

  /**
   * Handle phrase resize on timeline
   * Requirements: 4.1, 7.2
   */
  const handlePhraseResize = useCallback((phraseId: string, newDuration: number) => {
    const phrase = phrases.find(p => p.id === phraseId);
    if (!phrase) return;

    const newEndTime = phrase.startTime + newDuration;

    updateDialoguePhrase(phraseId, {
      endTime: newEndTime,
    });
  }, [phrases, updateDialoguePhrase]);

  /**
   * Handle timeline click - update current time
   * Requirements: 4.1
   */
  const handleTimelineClick = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  // ============================================================================
  // Event Handlers - Phrase Editor
  // ============================================================================

  /**
   * Handle phrase update from editor
   * Requirements: 4.3
   */
  const handlePhraseUpdate = useCallback((updates: Partial<DialoguePhrase>) => {
    if (!selectedPhraseId) return;
    updateDialoguePhrase(selectedPhraseId, updates);
  }, [selectedPhraseId, updateDialoguePhrase]);

  /**
   * Handle phrase deletion
   * Requirements: 4.4
   */
  const handlePhraseDelete = useCallback(() => {
    if (!selectedPhraseId) return;
    deleteDialoguePhrase(selectedPhraseId);
    setSelectedPhraseId(null);
  }, [selectedPhraseId, deleteDialoguePhrase]);

  /**
   * Handle phrase selection from timeline or list
   * Requirements: 4.1
   */
  const handlePhraseSelect = useCallback((phraseId: string | null) => {
    setSelectedPhraseId(phraseId);
  }, []);

  // ============================================================================
  // Event Handlers - Voice Generation
  // ============================================================================

  /**
   * Handle voice generation for selected phrase
   * Requirements: 5.1, 5.2, 5.3
   */
  const handleVoiceGenerate = useCallback(async (voiceParams: VoiceParameters) => {
    if (!selectedPhraseId || !selectedPhrase) return;

    try {
      setIsGeneratingVoice(true);

      // TODO: Integrate with actual voice generation service
      // For now, simulate generation with a delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update phrase with voice parameters and mock audio URL
      updateDialoguePhrase(selectedPhraseId, {
        voiceParameters: voiceParams,
        generatedAudioUrl: `mock://audio/${selectedPhraseId}`,
      });

      ;
    } catch (error) {
      console.error('Voice generation failed:', error);
      throw error;
    } finally {
      setIsGeneratingVoice(false);
    }
  }, [selectedPhraseId, selectedPhrase, updateDialoguePhrase]);

  /**
   * Handle voice preview
   * Requirements: 5.4
   */
  const handleVoicePreview = useCallback((audioUrl: string) => {
    ;
    // Audio preview is handled internally by VoiceGenerationPanel
  }, []);

  // ============================================================================
  // Event Handlers - Phrase Creation
  // ============================================================================

  /**
   * Handle adding new phrase at current time
   * Requirements: 4.2
   */
  const handleAddPhrase = useCallback(() => {
    // Find shot at current time
    const shotAtTime = shots.find(
      shot => currentTime >= shot.startTime && currentTime < shot.startTime + shot.duration
    );

    if (!shotAtTime) {
      alert('Please select a time within a shot to add a phrase');
      return;
    }

    // Create new phrase with default duration of 3 seconds
    const newPhrase: Omit<DialoguePhrase, 'id'> = {
      shotId: shotAtTime.id,
      text: 'New dialogue phrase',
      startTime: currentTime,
      endTime: Math.min(currentTime + 3, shotAtTime.startTime + shotAtTime.duration),
      metadata: {},
    };

    addDialoguePhrase(newPhrase);
  }, [currentTime, shots, addDialoguePhrase]);

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderPhraseList = () => {
    if (phrases.length === 0) {
      return (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>No dialogue phrases yet</p>
          <p style={styles.emptyHint}>
            Click "Add Phrase" to create a new dialogue phrase at the current time
          </p>
        </div>
      );
    }

    return (
      <div style={styles.phraseList}>
        {phrases.map(phrase => {
          const isSelected = phrase.id === selectedPhraseId;
          const shot = shots.find(s => s.id === phrase.shotId);
          
          return (
            <div
              key={phrase.id}
              style={{
                ...styles.phraseItem,
                ...(isSelected ? styles.phraseItemSelected : {}),
              }}
              onClick={() => handlePhraseSelect(phrase.id)}
            >
              <div style={styles.phraseItemHeader}>
                <span style={styles.phraseItemText}>
                  {phrase.text.length > 40 ? phrase.text.slice(0, 40) + '...' : phrase.text}
                </span>
                {phrase.generatedAudioUrl && (
                  <span style={styles.audioIndicator}>🔊</span>
                )}
              </div>
              <div style={styles.phraseItemMeta}>
                <span style={styles.phraseItemTime}>
                  {phrase.startTime.toFixed(1)}s - {phrase.endTime.toFixed(1)}s
                </span>
                {shot && (
                  <span style={styles.phraseItemShot}>
                    Shot {shot.id.slice(-8)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (!project) {
    return (
      <div className={`audio-track-manager ${className}`} style={styles.container}>
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>No project loaded</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`audio-track-manager ${className}`} style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>Audio Track Manager</h2>
        <div style={styles.headerActions}>
          <span style={styles.timeDisplay}>
            Current Time: {currentTime.toFixed(1)}s
          </span>
          <Button
            onClick={handleAddPhrase}
            disabled={shots.length === 0}
            aria-label="Add new dialogue phrase at current time"
            aria-disabled={shots.length === 0}
          >
            Add Phrase
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.content}>
        {/* Left Panel - Timeline and Phrase List */}
        <div style={styles.leftPanel}>
          {/* Timeline */}
          <div style={styles.timelineSection}>
            <h3 style={styles.sectionTitle}>Timeline</h3>
            <AudioTimeline
              shots={shots}
              phrases={phrases}
              duration={totalDuration}
              currentTime={currentTime}
              onPhraseMove={handlePhraseMove}
              onPhraseResize={handlePhraseResize}
              onTimelineClick={handleTimelineClick}
            />
          </div>

          {/* Phrase List */}
          <div style={styles.phraseListSection}>
            <h3 style={styles.sectionTitle}>
              Dialogue Phrases ({phrases.length})
            </h3>
            {renderPhraseList()}
          </div>
        </div>

        {/* Right Panel - Editor and Voice Generation */}
        <div style={styles.rightPanel}>
          {selectedPhrase ? (
            <>
              {/* Phrase Editor */}
              <div style={styles.editorSection}>
                <DialoguePhraseEditor
                  phrase={selectedPhrase}
                  shots={shots}
                  onUpdate={handlePhraseUpdate}
                  onDelete={handlePhraseDelete}
                />
              </div>

              {/* Voice Generation Panel */}
              <div style={styles.voiceSection}>
                <VoiceGenerationPanel
                  phrase={selectedPhrase}
                  onGenerate={handleVoiceGenerate}
                  onPreview={handleVoicePreview}
                  isGenerating={isGeneratingVoice}
                />
              </div>
            </>
          ) : (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>No phrase selected</p>
              <p style={styles.emptyHint}>
                Select a phrase from the timeline or list to edit
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#0a0a0a',
    color: '#fff',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #333',
    backgroundColor: '#1a1a1a',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 600,
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  timeDisplay: {
    fontSize: '14px',
    color: '#999',
    fontWeight: 500,
    padding: '8px 12px',
    backgroundColor: '#2a2a2a',
    borderRadius: '4px',
  },
  content: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  leftPanel: {
    flex: '1 1 60%',
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid #333',
    overflow: 'hidden',
  },
  rightPanel: {
    flex: '1 1 40%',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    padding: '20px',
    overflow: 'auto',
  },
  timelineSection: {
    padding: '20px',
    borderBottom: '1px solid #333',
  },
  phraseListSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
    overflow: 'hidden',
  },
  sectionTitle: {
    margin: '0 0 16px 0',
    fontSize: '16px',
    fontWeight: 600,
    color: '#fff',
  },
  phraseList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    overflow: 'auto',
  },
  phraseItem: {
    padding: '12px',
    backgroundColor: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  phraseItemSelected: {
    backgroundColor: '#2a3a4a',
    borderColor: '#4a9eff',
  },
  phraseItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  phraseItemText: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#fff',
  },
  audioIndicator: {
    fontSize: '16px',
  },
  phraseItemMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  phraseItemTime: {
    fontSize: '12px',
    color: '#999',
  },
  phraseItemShot: {
    fontSize: '12px',
    color: '#4a9eff',
    padding: '2px 6px',
    backgroundColor: '#1a2a3a',
    borderRadius: '3px',
  },
  editorSection: {
    flex: '0 0 auto',
  },
  voiceSection: {
    flex: '0 0 auto',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    textAlign: 'center',
  },
  emptyText: {
    margin: '0 0 8px 0',
    fontSize: '16px',
    color: '#666',
    fontWeight: 500,
  },
  emptyHint: {
    margin: 0,
    fontSize: '14px',
    color: '#555',
  },
};

export default AudioTrackManager;
