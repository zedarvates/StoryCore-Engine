# 🎨 Plan d'Améliorations UI - Réduction des Frictions

## 📋 Vue d'Ensemble

Améliorations UI pour réduire les frictions d'utilisation:
1. **Images**: Hover avec boutons Regenerer + Quick Edit
2. **Vidéos/Sons**: Bouton Regenerer avec sélection workflow
3. **Audio Timeline**: Spectre + Courbe modifiable (style Houdini)
4. **Presets**: Fenêtre prête à l'emploi avec Apply

---

## 1. Images - Hover Overlay avec Actions

### 1.1 Composant ImageHoverActions

**Fichier:** `creative-studio-ui/src/components/image/ImageHoverOverlay.tsx`

```typescript
import React, { useState } from 'react';
import styles from './ImageHoverOverlay.module.css';

interface ImageHoverOverlayProps {
  imageUrl: string;
  imageId: string;
  onRegenerate: (imageId: string, options: RegenerateOptions) => Promise<void>;
  onQuickEdit: (imageId: string) => void;
  isGenerating?: boolean;
}

interface RegenerateOptions {
  prompt?: string;
  strength?: number;
  seed?: number;
  steps?: number;
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
            <span className={styles.icon}>🔄</span>
            Regenerer
          </button>
          
          <button
            className={styles.actionBtn}
            onClick={() => setShowQuickEdit(true)}
            disabled={isGenerating}
          >
            <span className={styles.icon}>✏️</span>
            Edit Rapide
          </button>
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
  const [seed, setSeed] = useState<number | undefined>();
  const [workflow, setWorkflow] = useState('flux');
  const [isLoading, setIsLoading] = useState(false);
  
  const workflows = [
    { id: 'flux', name: 'Flux.1 Dev' },
    { id: 'sdxl', name: 'SDXL' },
    { id: 'qwen', name: 'Qwen 2.5' }
  ];
  
  return (
    <div className={styles.dialogBackdrop} onClick={onClose}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <h3>🔄 Regenerer l'Image</h3>
        
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
            onClick={() => onConfirm({ prompt, strength, seed })}
            disabled={isLoading}
          >
            {isLoading ? 'Generation...' : '🚀 Generer'}
          </button>
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
  
  const presets = [
    { name: 'clair', params: { brightness: 110, contrast: 105 } },
    { name: 'sombre', params: { brightness: 90, contrast: 110 } },
    { name: 'vibrant', params: { brightness: 100, contrast: 115, saturation: 130 } },
    { name: 'BW', params: { saturation: 0 } },
  ];
  
  return (
    <div className={styles.dialogBackdrop} onClick={onClose}>
      <div className={styles.quickEditDialog} onClick={e => e.stopPropagation()}>
        <h3>✏️ Edition Rapide</h3>
        
        <div className={styles.previewGrid}>
          <div className={styles.previewBox}><span>Original</span></div>
          <div className={styles.previewBox}><span>Resultat</span></div>
        
        <div className={styles.presetsRow}>
          {presets.map(preset => (
            <button key={preset.name} className={styles.presetBtn}>{preset.name}</button>
          ))}
        </div>
        
        <div className={styles.sliderGroup}>
          <label>Lumi: {brightness}%</label>
          <input type="range" min="0" max="200" value={brightness} onChange={e => setBrightness(parseInt(e.target.value))} />
        </div>
        
        <div className={styles.sliderGroup}>
          <label>Contrast: {contrast}%</label>
          <input type="range" min="0" max="200" value={contrast} onChange={e => setContrast(parseInt(e.target.value))} />
        </div>
        
        <div className={styles.sliderGroup}>
          <label>Sat: {saturation}%</label>
          <input type="range" min="0" max="200" value={saturation} onChange={e => setSaturation(parseInt(e.target.value))} />
        </div>
        
        <div className={styles.dialogActions}>
          <button className={styles.cancelBtn} onClick={onClose}>Annuler</button>
          <button className={styles.resetBtn} onClick={() => { setBrightness(100); setContrast(100); setSaturation(100); }}>Reset</button>
          <button className={styles.confirmBtn} onClick={() => onSave(imageId)}>✅ Appliquer</button>
        </div>
    </div>
  );
};

export default ImageHoverOverlay;
```

---

## 2. Audio Timeline - Visualisation Houdini Style

**Fichier:** `creative-studio-ui/src/components/audio/AudioWaveformEditor.tsx`

```typescript
import React, { useRef, useEffect, useState } from 'react';
import styles from './AudioWaveformEditor.module.css';

interface AudioWaveformEditorProps {
  audioUrl: string;
  audioId: string;
  duration: number;
  onCurveChange: (curvePoints: CurvePoint[]) => void;
}

interface CurvePoint {
  time: number;
  value: number;
}

export const AudioWaveformEditor: React.FC<AudioWaveformEditorProps> = ({
  audioUrl,
  duration,
  onCurveChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [curvePoints, setCurvePoints] = useState<CurvePoint[]>([]);
  const [viewMode, setViewMode] = useState<'waveform' | 'spectrum' | 'combined'>('combined');
  
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    
    ctx.clearRect(0, 0, width, height);
    
    // Draw waveform (mock data)
    ctx.fillStyle = 'rgba(0, 150, 255, 0.3)';
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    for (let i = 0; i < width; i++) {
      const y = height / 2 + Math.sin(i * 0.02) * (height / 3) * Math.random();
      ctx.lineTo(i, y);
    }
    ctx.lineTo(width, height / 2);
    ctx.fill();
    
    // Draw curve
    if (curvePoints.length >= 2) {
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 3;
      ctx.beginPath();
      curvePoints.forEach((point, i) => {
        const x = point.time * width;
        const y = (1 - point.value) * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
  }, [audioUrl, curvePoints, viewMode]);
  
  const curvePresets = [
    { name: 'Fade In', points: [{ time: 0, value: 0 }, { time: 1, value: 1 }] },
    { name: 'Fade Out', points: [{ time: 0, value: 1 }, { time: 1, value: 0 }] },
    { name: 'Duck', points: [{ time: 0, value: 1 }, { time: 0.5, value: 0.3 }, { time: 1, value: 1 }] },
  ];
  
  return (
    <div className={styles.editorContainer}>
      <div className={styles.header}>
        <h4>🎵 Editeur Audio</h4>
        <div className={styles.viewToggle}>
          {['waveform', 'spectrum', 'combined'].map(mode => (
            <button key={mode} className={`${styles.viewBtn} ${viewMode === mode ? styles.active : ''}`} onClick={() => setViewMode(mode as any)}>{mode}</button>
          ))}
        </div>
      
      <canvas ref={canvasRef} width={800} height={150} className={styles.waveformCanvas} />
      
      <div className={styles.curveEditor}>
        <h5>📈 Courbe de Volume</h5>
        <div className={styles.curvePresets}>
          {curvePresets.map(preset => (
            <button key={preset.name} className={styles.presetBtn} onClick={() => { setCurvePoints(preset.points); onCurveChange(preset.points); }}>{preset.name}</button>
          ))}
        </div>
      
      <div className={styles.actions}>
        <button className={styles.actionBtn} onClick={() => { setCurvePoints([]); onCurveChange([]); }}>🗑️ Effacer</button>
        <button className={styles.actionBtn}>▶️ Appliquer</button>
      </div>
  );
};

export default AudioWaveformEditor;
```

---

## 3. Video/Audio Regenerate Dialog

**Fichier:** `creative-studio-ui/src/components/video/RegenerateVideoDialog.tsx`

```typescript
import React, { useState } from 'react';
import styles from './RegenerateVideoDialog.module.css';

interface RegenerateVideoDialogProps {
  assetId: string;
  assetType: 'video' | 'audio';
  onClose: () => void;
  onRegenerate: (config: any) => Promise<void>;
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
    { id: 'ai-enhanced', name: '🤖 IA Amelioree', description: 'Modeles IA avances', workflows: [
      { id: 'wan22', name: 'Wan 2.2' },
      { id: 'stable-video', name: 'Stable Video' }
    ]},
    { id: 'interpolation', name: '🎬 Interpolation', description: 'Interpolation de frames', workflows: [
      { id: 'optical-flow', name: 'Optical Flow' }
    ]},
    { id: 'upscaling', name: '🔍 Upscaling', description: 'Amelioration resolution', workflows: [
      { id: 'real-esrgan', name: 'Real-ESRGAN' }
    ]}
  ];
  
  const selectedMethodology = methodologies.find(m => m.id === methodology);
  
  return (
    <div className={styles.dialogBackdrop} onClick={onClose}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <h2>🔄 Regenerer {assetType === 'video' ? 'Video' : 'Audio'}</h2>
        
        <div className={styles.preview}>
          {assetType === 'video' ? <video src={`/api/videos/${assetId}/preview`} controls /> : <audio src={`/api/audio/${assetId}/preview`} controls />}
        </div>
        
        <div className={styles.section}>
          <h3>Methodologie</h3>
          <div className={styles.methodologyGrid}>
            {methodologies.map(m => (
              <button key={m.id} className={`${styles.methodologyBtn} ${methodology === m.id ? styles.active : ''}`} onClick={() => setMethodology(m.id)}>
                <span>{m.name}</span>
                <small>{m.description}</small>
              </button>
            ))}
          </div>
        
        {selectedMethodology && (
          <div className={styles.section}>
            <h3>Workflow</h3>
            <div className={styles.workflowList}>
              {selectedMethodology.workflows.map(w => (
                <button key={w.id} className={`${styles.workflowBtn} ${workflow === w.id ? styles.active : ''}`} onClick={() => setWorkflow(w.id)}>{w.name}</button>
              ))}
            </div>
        )}
        
        <div className={styles.dialogActions}>
          <button className={styles.cancelBtn} onClick={onClose}>Annuler</button>
          <button className={styles.confirmBtn} onClick={() => onRegenerate({ methodology, workflow })} disabled={!workflow || isLoading}>
            {isLoading ? 'Generation...' : '🚀 Regenerer'}
          </button>
        </div>
    </div>
  );
};

export default RegenerateVideoDialog;
```

---

## 📁 Fichiers a Creer

```
creative-studio-ui/src/
├── components/
│   ├── image/
│   │   ├── ImageHoverOverlay.tsx
│   │   └── ImageHoverOverlay.module.css
│   ├── audio/
│   │   ├── AudioWaveformEditor.tsx
│   │   └── AudioWaveformEditor.module.css
│   └── video/
│       ├── RegenerateVideoDialog.tsx
│       └── RegenerateVideoDialog.module.css
```

---

*Document genere automatiquement*
