/**
 * Plan Sequences Section Component
 * 
 * Displays and manages sequence plans
 * Extracted from ProjectDashboardNew.tsx for better modularity
 */

import React, { memo, useMemo } from 'react';
import { Plus, FileText, RefreshCw, Edit3, Trash2, Sparkles } from 'lucide-react';
import { InlineLoading } from '@/components/ui/LoadingFeedback';

interface SequenceData {
  id: string;
  name: string;
  duration: number;
  shots: number;
  resume: string;
  order: number;
}

interface PlanSequencesSectionProps {
  sequences: SequenceData[];
  isLoadingSequences: boolean;
  isAddingSequence: boolean;
  isSyncing: boolean;
  onRefresh: () => void;
  onNewPlan: () => void;
  onAddSequence: () => void;
  onEditSequence: (sequence: SequenceData, e: React.MouseEvent) => void;
  onDeleteSequence: (sequenceId: string, e: React.MouseEvent) => void;
  onSequenceClick: (sequenceId: string) => void;
  onSync: () => void;
  className?: string;
}

/**
 * PlanSequencesSection - Memoized for performance optimization
 */
export const PlanSequencesSection = memo(function PlanSequencesSection({
  sequences,
  isLoadingSequences,
  isAddingSequence,
  isSyncing,
  onRefresh,
  onNewPlan,
  onAddSequence,
  onEditSequence,
  onDeleteSequence,
  onSequenceClick,
  onSync,
  className,
}: PlanSequencesSectionProps) {
  // Memoized empty state check
  const isEmpty = useMemo(() => sequences.length === 0, [sequences.length]);

  return (
    <div className={`plan-sequences-section ${className || ''}`}>
      <div className="section-header">
        <h3>Plan Sequences</h3>
        <div className="sequence-controls">
          <button
            className="btn-sequence-control sync"
            onClick={onSync}
            disabled={isSyncing || isEmpty}
            title="Synchroniser les plans séquences avec l'histoire et les dialogues"
            aria-label="Synchroniser"
          >
            {isSyncing ? (
              <InlineLoading message="Sync..." />
            ) : (
              <>
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                <span>Sync</span>
              </>
            )}
          </button>
          <button
            className="btn-sequence-control refresh"
            onClick={onRefresh}
            disabled={isLoadingSequences}
            title="Refresh sequences from JSON files"
            aria-label="Refresh sequences"
          >
            {isLoadingSequences ? (
              <InlineLoading message="Loading..." />
            ) : (
              <>
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                <span>Refresh</span>
              </>
            )}
          </button>
          <button
            className="btn-sequence-control new-plan"
            onClick={onNewPlan}
            title="Create a new sequence plan"
            aria-label="Create new plan"
          >
            <FileText className="w-4 h-4" aria-hidden="true" />
            <span>New Plan</span>
          </button>
          <button
            className="btn-sequence-control add"
            onClick={onAddSequence}
            disabled={isAddingSequence}
            title="Add a new sequence"
            aria-label="Add sequence"
          >
            {isAddingSequence ? (
              <InlineLoading message="Adding..." />
            ) : (
              <Plus className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <div className="sequences-grid" role="list" aria-label="Sequence list">
        {isEmpty ? (
          <div className="no-sequences-message" role="listitem">
            <p>No sequences yet. Click + to add your first sequence.</p>
          </div>
        ) : (
          sequences.map((seq) => (
            <div
              key={seq.id}
              className="sequence-card"
              onClick={() => onSequenceClick(seq.id)}
              role="listitem"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSequenceClick(seq.id);
                }
              }}
            >
              <div className="sequence-header">
                <h4>{seq.name}</h4>
                <div className="sequence-actions">
                  <button
                    className="btn-sequence-action edit"
                    onClick={(e) => onEditSequence(seq, e)}
                    title="Edit sequence"
                    aria-label={`Edit ${seq.name}`}
                  >
                    <Edit3 className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    className="btn-sequence-action delete"
                    onClick={(e) => onDeleteSequence(seq.id, e)}
                    title="Delete sequence"
                    aria-label={`Delete ${seq.name}`}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div className="sequence-info">
                <span>Order: #{seq.order}</span>
                <span>Duration: {seq.duration}s</span>
                <span>Shots: {seq.shots}</span>
              </div>
              <div className="sequence-resume">
                <strong>Resume:</strong> {seq.resume}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

