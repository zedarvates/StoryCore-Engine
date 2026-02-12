import React, { useState } from 'react';
import styles from './RegenerateVideoDialog.module.css';

interface RegenerateVideoDialogProps {
  assetId: string;
  assetType: 'video' | 'audio';
  onClose: () => void;
  onRegenerate: (config: unknown) => Promise<void>;
}

export const RegenerateVideoDialog: React.FC<RegenerateVideoDialogProps> = ({
  assetId,
  assetType,
  onClose,
  onRegenerate
}) => {
  const [methodology, setMethodology] = useState('ai-enhanced');
  const [workflow, setWorkflow] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const methodologies = [
    { 
      id: 'ai-enhanced', 
      name: 'IA Amelioree', 
      description: 'Modeles IA avances',
      workflows: [
        { id: 'wan22', name: 'Wan 2.2' },
        { id: 'stable-video', name: 'Stable Video' }
      ]
    },
    { 
      id: 'interpolation', 
      name: 'Interpolation', 
      description: 'Interpolation de frames',
      workflows: [
        { id: 'optical-flow', name: 'Optical Flow' }
      ]
    },
    { 
      id: 'upscaling', 
      name: 'Upscaling', 
      description: 'Amelioration resolution',
      workflows: [
        { id: 'real-esrgan', name: 'Real-ESRGAN' }
      ]
    }
  ];

  const selectedMethodology = methodologies.find(m => m.id === methodology);

  return (
    <div className={styles.dialogBackdrop} onClick={onClose}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <h2>Regenerer {assetType === 'video' ? 'Video' : 'Audio'}</h2>

        <div className={styles.preview}>
          {assetType === 'video' ? (
            <video src={`/api/videos/${assetId}/preview`} controls />
          ) : (
            <audio src={`/api/audio/${assetId}/preview`} controls />
          )}
        </div>

        <div className={styles.section}>
          <h3>Methodologie</h3>
          <div className={styles.methodologyGrid}>
            {methodologies.map(m => (
              <button
                key={m.id}
                className={`${styles.methodologyBtn} ${methodology === m.id ? styles.active : ''}`}
                onClick={() => setMethodology(m.id)}
              >
                <span>{m.name}</span>
                <small>{m.description}</small>
              </button>
            ))}
          </div>
        </div>

        {selectedMethodology && (
          <div className={styles.section}>
            <h3>Workflow</h3>
            <div className={styles.workflowList}>
              {selectedMethodology.workflows.map(w => (
                <button
                  key={w.id}
                  className={`${styles.workflowBtn} ${workflow === w.id ? styles.active : ''}`}
                  onClick={() => setWorkflow(w.id)}
                >
                  {w.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={styles.dialogActions}>
          <button className={styles.cancelBtn} onClick={onClose}>Annuler</button>
          <button
            className={styles.confirmBtn}
            onClick={() => onRegenerate({ methodology, workflow })}
            disabled={!workflow || isLoading}
          >
            {isLoading ? 'Generation...' : 'Regenerer'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegenerateVideoDialog;


