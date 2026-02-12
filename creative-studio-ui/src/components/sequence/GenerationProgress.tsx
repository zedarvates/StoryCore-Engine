/**
 * Generation Progress Component - Shows sequence generation progress
 * Connected to sequenceService.ts for backend API communication
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  sequenceService, 
  GenerationJobResponse, 
  SequenceResult,
  GenerationStatus 
} from '../../services/sequenceService';

// Steps for generation pipeline
const GENERATION_STEPS = [
  { key: 'pending', label: 'En attente', icon: '⏳' },
  { key: 'initializing', label: 'Initialisation', icon: '⚙️' },
  { key: 'analyzing', label: 'Analyse du prompt', icon: '🔍' },
  { key: 'structure', label: 'Structure narrative', icon: '📋' },
  { key: 'shots', label: 'Création des plans', icon: '🎬' },
  { key: 'descriptions', label: 'Descriptions', icon: '📝' },
  { key: 'finalizing', label: 'Finalisation', icon: '✨' },
  { key: 'completed', label: 'Terminé', icon: '✅' },
];

interface GenerationProgressProps {
  jobId: string;
  onComplete?: (result: SequenceResult) => void;
  onCancel?: () => void;
  onError?: (error: string) => void;
  showDetails?: boolean;
}

export const GenerationProgress: React.FC<GenerationProgressProps> = ({
  jobId,
  onComplete,
  onCancel,
  onError,
  showDetails = true,
}) => {
  const [status, setStatus] = useState<GenerationJobResponse | null>(null);
  const [isStreaming, setIsStreaming] = useState(true);

  // Get step index from current_step string
  const getStepIndex = useCallback((stepName: string | undefined): number => {
    if (!stepName) return 0;
    const index = GENERATION_STEPS.findIndex(s => 
      stepName.toLowerCase().includes(s.key.toLowerCase())
    );
    return index >= 0 ? index : 1; // Default to initializing
  }, []);

  // Format time remaining
  const formatTime = (seconds: number | undefined): string => {
    if (!seconds || seconds <= 0) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get status color
  const getStatusColor = (statusValue: GenerationStatus | undefined): string => {
    switch (statusValue) {
      case 'completed': return '#4caf50'; // Green
      case 'failed': return '#f44336'; // Red
      case 'cancelled': return '#ff9800'; // Orange
      case 'processing': return '#2196f3'; // Blue
      default: return '#9e9e9e'; // Gray
    }
  };

  // Subscribe to SSE stream for real-time updates
  useEffect(() => {
    if (!jobId || !isStreaming) return;

    console.log('[GenerationProgress] Subscribing to stream for job:', jobId);

    const unsubscribe = sequenceService.streamProgress(
      jobId,
      // onProgress
      (data: GenerationJobResponse) => {
        console.log('[GenerationProgress] Progress:', data.progress, data.current_step);
        setStatus(data);
      },
      // onComplete
      (data: GenerationJobResponse) => {
        console.log('[GenerationProgress] Complete:', data.status);
        setStatus(data);
        setIsStreaming(false);
        if (data.status === 'completed' && data.result && onComplete) {
          onComplete(data.result);
        }
      },
      // onError
      (error: string) => {
        console.error('[GenerationProgress] Error:', error);
        setIsStreaming(false);
        if (onError) onError(error);
      }
    );

    return () => {
      console.log('[GenerationProgress] Unsubscribing from stream');
      unsubscribe();
    };
  }, [jobId, isStreaming, onComplete, onError]);

  // Handle cancel
  const handleCancel = async () => {
    try {
      console.log('[GenerationProgress] Cancelling job:', jobId);
      await sequenceService.cancelJob(jobId);
      setIsStreaming(false);
      if (onCancel) onCancel();
    } catch (error) {
      console.error('[GenerationProgress] Cancel failed:', error);
    }
  };

  // Retry
  const handleRetry = () => {
    setIsStreaming(true);
    setStatus(null);
  };

  // Current values
  const progress = status?.progress ?? 0;
  const currentStep = status?.current_step || 'initializing';
  const estimatedTime = status?.estimated_time_remaining ?? 0;
  const stepIndex = getStepIndex(currentStep);
  const step = GENERATION_STEPS[Math.min(stepIndex, GENERATION_STEPS.length - 1)];

  return (
    <div style={{
      padding: '24px',
      background: '#1e1e1e',
      borderRadius: '12px',
      color: '#fff',
      fontFamily: 'system-ui, sans-serif',
      maxWidth: '500px',
      margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
      }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
          Génération de Séquence
        </h3>
        <span style={{
          padding: '4px 12px',
          borderRadius: '20px',
          background: getStatusColor(status?.status),
          fontSize: '12px',
          fontWeight: 500,
          textTransform: 'uppercase',
        }}>
          {status?.status || 'Initialisation...'}
        </span>
      </div>

      {/* Progress Bar */}
      <div style={{
        height: '8px',
        background: '#333',
        borderRadius: '4px',
        overflow: 'hidden',
        marginBottom: '20px',
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          background: `linear-gradient(90deg, #2196f3, #03a9f4)`,
          transition: 'width 0.3s ease',
          borderRadius: '4px',
        }} />
      </div>

      {/* Stats Row */}
      <div style={{
        display: 'flex',
        gap: '24px',
        marginBottom: '20px',
      }}>
        <div>
          <span style={{ color: '#888', fontSize: '12px', display: 'block' }}>
            Progression
          </span>
          <span style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {progress}%
          </span>
        </div>
        <div>
          <span style={{ color: '#888', fontSize: '12px', display: 'block' }}>
            Temps estimé
          </span>
          <span style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {formatTime(estimatedTime)}
          </span>
        </div>
      </div>

      {/* Current Step */}
      <div style={{
        background: '#252525',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>{step.icon}</span>
          <div>
            <div style={{ color: '#888', fontSize: '11px', textTransform: 'uppercase' }}>
              Étape en cours
            </div>
            <div style={{ fontSize: '16px', fontWeight: 500 }}>
              {step.label}
            </div>
          </div>
        </div>
      </div>

      {/* Steps Timeline */}
      {showDetails && (
        <div style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '20px',
        }}>
          {GENERATION_STEPS.slice(0, -1).map((s, idx) => (
            <div
              key={s.key}
              style={{
                flex: 1,
                height: '4px',
                borderRadius: '2px',
                background: idx < stepIndex ? '#4caf50' : '#333',
                transition: 'background 0.3s ease',
              }}
              title={s.label}
            />
          ))}
        </div>
      )}

      {/* Actions */}
      {isStreaming && status?.status === 'processing' && (
        <button
          onClick={handleCancel}
          style={{
            width: '100%',
            padding: '12px',
            background: '#f44336',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            transition: 'background 0.2s',
          }}
          onMouseOver={(e) => e.currentTarget.style.background = '#d32f2f'}
          onMouseOut={(e) => e.currentTarget.style.background = '#f44336'}
        >
          Annuler la génération
        </button>
      )}

      {/* Failed State */}
      {status?.status === 'failed' && (
        <div>
          <div style={{
            padding: '16px',
            background: 'rgba(244, 67, 54, 0.1)',
            border: '1px solid #f44336',
            borderRadius: '8px',
            marginBottom: '16px',
          }}>
            <div style={{ color: '#f44336', fontWeight: 500, marginBottom: '8px' }}>
              ⚠️ Erreur de génération
            </div>
            <div style={{ color: '#ccc', fontSize: '14px' }}>
              {status.error || 'Une erreur inattendue est survenue'}
            </div>
          </div>
          <button
            onClick={handleRetry}
            style={{
              width: '100%',
              padding: '12px',
              background: '#2196f3',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Completed State */}
      {status?.status === 'completed' && status.result && (
        <div style={{
          padding: '16px',
          background: 'rgba(76, 175, 80, 0.1)',
          border: '1px solid #4caf50',
          borderRadius: '8px',
        }}>
          <div style={{ color: '#4caf50', fontWeight: 500, marginBottom: '8px' }}>
            ✅ Génération terminée !
          </div>
          <div style={{ color: '#ccc', fontSize: '14px' }}>
            {status.result.shots?.length || 0} plans générés • {' '}
            {status.result.total_duration?.toFixed(1) || 0}s de durée totale
          </div>
        </div>
      )}

      {/* Cancelled State */}
      {status?.status === 'cancelled' && (
        <div style={{
          padding: '16px',
          background: 'rgba(255, 152, 0, 0.1)',
          border: '1px solid #ff9800',
          borderRadius: '8px',
        }}>
          <div style={{ color: '#ff9800', fontWeight: 500 }}>
            Génération annulée
          </div>
        </div>
      )}
    </div>
  );
};

export default GenerationProgress;

