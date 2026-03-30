import React, { useState, useRef, useEffect } from 'react';
import { Download, Film, FileJson, Package, CheckCircle2, Loader2, X } from 'lucide-react';
import './dialogs.css';

interface ExportDialogProps {
  onClose: () => void;
  onExport: (format: string) => void;
  projectName: string;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ onClose, onExport, projectName }) => {
  const [status, setStatus] = useState<'idle' | 'exporting' | 'complete'>('idle');
  const [progress, setProgress] = useState(0);
  const [selectedFormat, setSelectedFormat] = useState<'json' | 'video' | 'assets'>('json');
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (progressRef.current) {
      progressRef.current.style.setProperty('--progress', `${progress}%`);
    }
  }, [progress]);

  const handleExport = () => {
    setStatus('exporting');
    setProgress(0);
    
    // Simulate export progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setStatus('complete');
          onExport(selectedFormat);
          return 100;
        }
        return prev + 5;
      });
    }, 100);
  };

  return (
    <div className="sequence-dialog-overlay" onClick={onClose}>
      <div className="sequence-dialog-content export-dialog" onClick={e => e.stopPropagation()}>
        <header className="dialog-header">
          <div className="header-title">
            <Download className="w-5 h-5 text-primary mr-2" />
            <h3>Export Project: {projectName}</h3>
          </div>
          <button className="close-btn" onClick={onClose} title="Close dialog"><X className="w-4 h-4" /></button>
        </header>

        <div className="dialog-body">
          {status === 'idle' ? (
            <div className="export-options-grid">
              <button 
                className={`export-option ${selectedFormat === 'json' ? 'active' : ''}`}
                onClick={() => setSelectedFormat('json')}
              >
                <div className="option-icon"><FileJson className="w-8 h-8" /></div>
                <div className="option-info">
                  <span className="option-title">Project JSON</span>
                  <span className="option-desc">Export editable project file for backup or sharing.</span>
                </div>
              </button>

              <button 
                className={`export-option ${selectedFormat === 'video' ? 'active' : ''}`}
                onClick={() => setSelectedFormat('video')}
              >
                <div className="option-icon"><Film className="w-8 h-8" /></div>
                <div className="option-info">
                  <span className="option-title">Cinematic Video</span>
                  <span className="option-desc">Render full sequence to high-quality MP4/MOV.</span>
                </div>
              </button>

              <button 
                className={`export-option ${selectedFormat === 'assets' ? 'active' : ''}`}
                onClick={() => setSelectedFormat('assets')}
              >
                <div className="option-icon"><Package className="w-8 h-8" /></div>
                <div className="option-info">
                  <span className="option-title">Asset Bundle</span>
                  <span className="option-desc">Export all generated frames and reference images.</span>
                </div>
              </button>
            </div>
          ) : status === 'exporting' ? (
            <div className="export-progress-view">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <h4>Generating {selectedFormat.toUpperCase()} Bundle...</h4>
              <div className="progress-bar-container">
                <div ref={progressRef} className="progress-bar-fill" />
              </div>
              <span className="progress-text">{progress}% Complete</span>
              <p className="mt-4 opacity-60 text-xs">Orchestrating narrative layers and rendering cinematic components...</p>
            </div>
          ) : (
            <div className="export-complete-view">
              <CheckCircle2 className="w-16 h-16 text-green-500 mb-4 animate-bounce" />
              <h4>Export Successful!</h4>
              <p>Your {selectedFormat.toUpperCase()} bundle has been generated and saved.</p>
              <button className="btn-primary mt-6 px-8" onClick={onClose}>Done</button>
            </div>
          )}
        </div>

        {status === 'idle' && (
          <footer className="dialog-footer">
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn-primary px-10" onClick={handleExport}>Start Export</button>
          </footer>
        )}
      </div>
    </div>
  );
};
