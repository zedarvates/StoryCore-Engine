import React, { useState } from 'react';
import styles from './ImageHoverOverlay.module.css';

interface RegenerateOptions {
  prompt?: string;
  strength?: number;
  seed?: number;
}

interface ImageHoverOverlayProps {
  imageUrl: string;
  imageId: string;
  onRegenerate: (imageId: string, options: RegenerateOptions) => Promise<void>;
  onQuickEdit: (imageId: string) => void;
  isGenerating?: boolean;
}

export const ImageHoverOverlay: React.FC<ImageHoverOverlayProps> = ({
  imageUrl,
  imageId,
  onRegenerate,
  onQuickEdit,
  isGenerating = false
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showQuickEdit, setShowQuickEdit] = useState(false);

  return (
    <div className={styles.overlayContainer}>
      <img src={imageUrl} alt={imageId} className={styles.image} />

      <div className={styles.hoverOverlay}>
        <div className={styles.actionButtons}>
          <button
            className={styles.actionBtn}
            onClick={() => setShowMenu(true)}
            disabled={isGenerating}
          >
            <span className={styles.icon}>O</span>
            Regenerer
          </button>

          <button
            className={styles.actionBtn}
            onClick={() => setShowQuickEdit(true)}
            disabled={isGenerating}
          >
            <span className={styles.icon}>E</span>
            Edit Rapide
          </button>
        </div>
      </div>

      {showMenu && (
        <RegenerateDialog
          imageId={imageId}
          onClose={() => setShowMenu(false)}
          onConfirm={async (options) => {
            await onRegenerate(imageId, options);
            setShowMenu(false);
          }}
        />
      )}

      {showQuickEdit && (
        <QuickEditDialog
          imageId={imageId}
          onClose={() => setShowQuickEdit(false)}
          onSave={onQuickEdit}
        />
      )}
    </div>
  );
};

interface RegenerateDialogProps {
  imageId: string;
  onClose: () => void;
  onConfirm: (options: RegenerateOptions) => Promise<void>;
}

const RegenerateDialog: React.FC<RegenerateDialogProps> = ({
  imageId,
  onClose,
  onConfirm
}) => {
  const [prompt, setPrompt] = useState('');
  const [strength, setStrength] = useState(0.7);
  const [workflow, setWorkflow] = useState('flux');

  const workflows = [
    { id: 'flux', name: 'Flux.1 Dev' },
    { id: 'sdxl', name: 'SDXL' },
    { id: 'qwen', name: 'Qwen 2.5' }
  ];

  return (
    <div className={styles.dialogBackdrop} onClick={onClose}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <h3>Regenerer l'Image</h3>

        <div className={styles.formGroup}>
          <label>Workflow</label>
          <div className={styles.workflowGrid}>
            {workflows.map(w => (
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

        <div className={styles.formGroup}>
          <label>Prompt</label>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Decrivez ce que vous voulez..."
            rows={3}
          />
        </div>

        <div className={styles.formGroup}>
          <label>Force: {strength.toFixed(2)}</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={strength}
            onChange={e => setStrength(parseFloat(e.target.value))}
          />
        </div>

        <div className={styles.dialogActions}>
          <button className={styles.cancelBtn} onClick={onClose}>Annuler</button>
          <button
            className={styles.confirmBtn}
            onClick={() => onConfirm({ prompt, strength })}
          >
            Generer
          </button>
        </div>
      </div>
    </div>
  );
};

interface QuickEditDialogProps {
  imageId: string;
  onClose: () => void;
  onSave: (imageId: string) => void;
}

const QuickEditDialog: React.FC<QuickEditDialogProps> = ({
  imageId,
  onClose,
  onSave
}) => {
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);

  return (
    <div className={styles.dialogBackdrop} onClick={onClose}>
      <div className={styles.quickEditDialog} onClick={e => e.stopPropagation()}>
        <h3>Edition Rapide</h3>

        <div className={styles.presetsRow}>
          <button className={styles.presetBtn} onClick={() => { setBrightness(110); setContrast(105); }}>Clair</button>
          <button className={styles.presetBtn} onClick={() => { setBrightness(90); setContrast(110); }}>Sombre</button>
          <button className={styles.presetBtn} onClick={() => { setBrightness(100); setContrast(115); setSaturation(130); }}>Vibrant</button>
          <button className={styles.presetBtn} onClick={() => { setSaturation(0); }}>NB</button>
        </div>

        <div className={styles.sliderGroup}>
          <label>Lumi: {brightness}%</label>
          <input
            type="range"
            min="0"
            max="200"
            value={brightness}
            onChange={e => setBrightness(parseInt(e.target.value))}
          />
        </div>

        <div className={styles.sliderGroup}>
          <label>Contrast: {contrast}%</label>
          <input
            type="range"
            min="0"
            max="200"
            value={contrast}
            onChange={e => setContrast(parseInt(e.target.value))}
          />
        </div>

        <div className={styles.dialogActions}>
          <button className={styles.cancelBtn} onClick={onClose}>Annuler</button>
          <button className={styles.resetBtn} onClick={() => { setBrightness(100); setContrast(100); setSaturation(100); }}>Reset</button>
          <button className={styles.confirmBtn} onClick={() => onSave(imageId)}>Appliquer</button>
        </div>
      </div>
    </div>
  );
};

export default ImageHoverOverlay;

