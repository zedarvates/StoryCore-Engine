/**
 * Recovery Dialog Component
 * 
 * Displays crash recovery options and available recovery snapshots.
 * Allows users to recover from a crashed session or dismiss the recovery.
 * 
 * Requirements: 19.2, 19.5
 */

import React from 'react';
import { type RecoverySnapshot } from '../../services/projectRecovery';
import './recoveryDialog.css';

export interface RecoveryDialogProps {
  onClose: () => void;
  hasCrashedSession: boolean;
  recoverySnapshots: RecoverySnapshot[];
  recoverFromSnapshot: (snapshotId: string) => Promise<void>;
  dismissCrashRecovery: () => void;
  deleteSnapshot: (snapshotId: string) => void;
  formatTimestamp: (timestamp: string) => string;
  isRecovering: boolean;
  error: string | null;
}

/**
 * Recovery Dialog Component
 */
export const RecoveryDialog: React.FC<RecoveryDialogProps> = ({
  onClose,
  hasCrashedSession,
  recoverySnapshots,
  recoverFromSnapshot,
  dismissCrashRecovery,
  deleteSnapshot,
  formatTimestamp,
  isRecovering,
  error
}) => {
  const [selectedSnapshotId, setSelectedSnapshotId] = React.useState<string | null>(null);

  const handleRecover = React.useCallback(async () => {
    if (!selectedSnapshotId) {
      return;
    }

    try {
      await recoverFromSnapshot(selectedSnapshotId);
      onClose();
    } catch (err) {
      // Error is handled by the hook
      console.error('Recovery failed:', err);
    }
  }, [selectedSnapshotId, recoverFromSnapshot, onClose]);

  const handleDismiss = React.useCallback(() => {
    dismissCrashRecovery();
    onClose();
  }, [dismissCrashRecovery, onClose]);

  // Handle escape key to close dialog
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleDismiss();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [handleDismiss]);

  const handleDelete = React.useCallback((snapshotId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this recovery snapshot?')) {
      deleteSnapshot(snapshotId);
      if (selectedSnapshotId === snapshotId) {
        setSelectedSnapshotId(null);
      }
    }
  }, [deleteSnapshot, selectedSnapshotId]);

  return (
    <div className="recovery-dialog-overlay" onClick={handleDismiss}>
      <div className="recovery-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="recovery-dialog-header">
          <h2>
            {hasCrashedSession ? (
              <>
                <span className="recovery-icon">⚠️</span>
                Session Recovery
              </>
            ) : (
              'Recovery Snapshots'
            )}
          </h2>
          <button
            className="recovery-dialog-close"
            onClick={handleDismiss}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="recovery-dialog-content">
          {hasCrashedSession && (
            <div className="recovery-warning">
              <p>
                It looks like the application didn't close properly last time.
                You can recover your work from an automatic snapshot.
              </p>
            </div>
          )}

          {error && (
            <div className="recovery-error">
              <strong>Error:</strong> {error}
            </div>
          )}

          {recoverySnapshots.length === 0 ? (
            <div className="recovery-empty">
              <p>No recovery snapshots available.</p>
            </div>
          ) : (
            <div className="recovery-snapshots">
              <h3>Available Snapshots</h3>
              <div className="recovery-snapshots-list">
                {recoverySnapshots.map((snapshot) => (
                  <div
                    key={snapshot.id}
                    className={`recovery-snapshot ${selectedSnapshotId === snapshot.id ? 'selected' : ''
                      }`}
                    onClick={() => setSelectedSnapshotId(snapshot.id)}
                  >
                    <div className="recovery-snapshot-info">
                      <div className="recovery-snapshot-name">
                        {snapshot.projectName || 'Untitled Project'}
                      </div>
                      <div className="recovery-snapshot-meta">
                        <span className="recovery-snapshot-time">
                          {formatTimestamp(snapshot.timestamp)}
                        </span>
                        <span className="recovery-snapshot-details">
                          {snapshot.shotCount} shot{snapshot.shotCount !== 1 ? 's' : ''}
                          {' • '}
                          {Math.floor(snapshot.duration / 60)}:{String(snapshot.duration % 60).padStart(2, '0')}
                        </span>
                      </div>
                    </div>
                    <button
                      className="recovery-snapshot-delete"
                      onClick={(e) => handleDelete(snapshot.id, e)}
                      aria-label="Delete snapshot"
                      title="Delete snapshot"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="recovery-dialog-footer">
          <button
            className="recovery-button recovery-button-secondary"
            onClick={handleDismiss}
            disabled={isRecovering}
          >
            {hasCrashedSession ? 'Start Fresh' : 'Close'}
          </button>
          <button
            className="recovery-button recovery-button-primary"
            onClick={handleRecover}
            disabled={!selectedSnapshotId || isRecovering}
          >
            {isRecovering ? 'Recovering...' : 'Recover Project'}
          </button>
        </div>
      </div>
    </div>
  );
};
