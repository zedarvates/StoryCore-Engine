import React, { useState, useEffect, useCallback } from 'react';
import { 
  X,
  Activity,
  Zap,
  Target, 
  Layers, 
  Database,
  Layout, 
  Settings, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  FileSearch,
  Cpu
} from 'lucide-react';
import './GhostTrackerWizard.css';
import './WizardModal.css';

interface GhostTrackerWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

type TrackingMode = 'full' | 'incremental' | 'selective' | 'diagnostic';

export function GhostTrackerWizard({ isOpen, onClose }: GhostTrackerWizardProps) {
  const [currentStep, setCurrentStep] = useState<'mode' | 'analyzing' | 'results'>('mode');
  const [selectedMode, setSelectedMode] = useState<TrackingMode>('full');
  const [progress, setProgress] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState<string>('Initializing tracking engine...');

  const initializeWizard = useCallback(() => {
    setCurrentStep('mode');
    setProgress(0);
    setAnalysisStatus('Initializing tracking engine...');
    setSelectedMode('full');
  }, []);

  // Handle Escape key
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      // Reset state when opening (async to avoid render cascade)
      const timer = setTimeout(() => {
        initializeWizard();
      }, 0);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'unset';
      };
    } else {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown, initializeWizard]);

  const handleStartAnalysis = () => {
    setCurrentStep('analyzing');
    // Simulated progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setCurrentStep('results'), 500);
          return 100;
        }
        
        // Update status text based on progress
        if (prev < 20) setAnalysisStatus('Scanning project file signatures...');
        else if (prev < 40) setAnalysisStatus('Analyzing ghost assets and dependencies...');
        else if (prev < 60) setAnalysisStatus('Mapping data points to creative timeline...');
        else if (prev < 80) setAnalysisStatus('Validating integrity of extracted objects...');
        else setAnalysisStatus('Finalizing Ghost Tracking report...');
        
        return prev + Math.random() * 8;
      });
    }, 200);
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="wizard-modal-overlay" onClick={handleClose}>
      <div className="wizard-modal-container max-w-4xl" onClick={(e) => e.stopPropagation()}>
        <div className="wizard-modal-header">
           <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
              <Activity size={20} className="animate-pulse" />
            </div>
            <div className="flex flex-col">
              <h2 className="wizard-modal-title">Ghost Tracker</h2>
              <span className="text-[10px] text-purple-400/70 uppercase tracking-widest font-black">Project Integrity Engine</span>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={20} className="text-white/50" />
          </button>
        </div>

        <div className="wizard-modal-content p-6 min-h-[400px]">
          {currentStep === 'mode' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-8 text-center">
                <h3 className="text-2xl font-bold text-white mb-2">Select Analysis Mode</h3>
                <p className="text-white/60">Choose how deep the Ghost Tracker should scan your project.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div 
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedMode === 'full' ? 'bg-purple-500/20 border-purple-500' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                  onClick={() => setSelectedMode('full')}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Zap className={selectedMode === 'full' ? 'text-purple-400' : 'text-white/40'} size={24} />
                    <span className="font-bold">Full Scrutiny</span>
                  </div>
                  <p className="text-sm text-white/50">Comprehensive scan of all assets, references, and nested dependencies. (Recommended)</p>
                </div>

                <div 
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedMode === 'incremental' ? 'bg-indigo-500/20 border-indigo-500' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                  onClick={() => setSelectedMode('incremental')}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Target className={selectedMode === 'incremental' ? 'text-indigo-400' : 'text-white/40'} size={24} />
                    <span className="font-bold">Incremental Link</span>
                  </div>
                  <p className="text-sm text-white/50">Verify only recently added or modified objects and their immediate relations.</p>
                </div>

                <div 
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedMode === 'selective' ? 'bg-blue-500/20 border-blue-500' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                  onClick={() => setSelectedMode('selective')}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Layers className={selectedMode === 'selective' ? 'text-blue-400' : 'text-white/40'} size={24} />
                    <span className="font-bold">Selective Probe</span>
                  </div>
                  <p className="text-sm text-white/50">Target specific folders or asset categories for integrity validation.</p>
                </div>

                <div 
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedMode === 'diagnostic' ? 'bg-amber-500/20 border-amber-500' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                  onClick={() => setSelectedMode('diagnostic')}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <FileSearch className={selectedMode === 'diagnostic' ? 'text-amber-400' : 'text-white/40'} size={24} />
                    <span className="font-bold">Diagnostic Fix</span>
                  </div>
                  <p className="text-sm text-white/50">Identify and attempt to repair broken references or corrupted manifest files.</p>
                </div>
              </div>

              <div className="mt-8 flex justify-center">
                <button 
                  onClick={handleStartAnalysis}
                  className="px-10 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full font-bold hover:scale-105 transition-transform flex items-center gap-3 shadow-lg shadow-purple-500/20"
                >
                  <Activity size={20} />
                  Initiate Ghost Tracking
                </button>
              </div>
            </div>
          )}

          {currentStep === 'analyzing' && (
            <div className="flex flex-col items-center justify-center h-full animate-in fade-in duration-500">
              <div className="relative w-48 h-48 mb-8">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle 
                    cx="50" cy="50" r="45" 
                    fill="none" 
                    stroke="rgba(255,255,255,0.05)" 
                    strokeWidth="2" 
                  />
                  <circle 
                    cx="50" cy="50" r="45" 
                    fill="none" 
                    stroke="url(#gradient)" 
                    strokeWidth="4" 
                    strokeDasharray={`${progress * 2.82} 282`}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-white">{Math.floor(progress)}%</span>
                  <span className="text-[10px] text-white/40 uppercase tracking-widest">Analysis</span>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-lg text-white mb-2 font-medium">{analysisStatus}</p>
                <div className="flex gap-1 justify-center">
                  {[...Array(3)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" 
                      style={{ animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 'results' && (
            <div className="animate-in fade-in zoom-in-95 duration-500">
              <div className="flex items-center gap-4 mb-8 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                <div className="p-3 bg-emerald-500 rounded-full text-white">
                  <CheckCircle2 size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Integrity Verified</h3>
                  <p className="text-emerald-400/70 text-sm">All assets and references are correctly mapped and functional.</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 mb-2 text-white/60">
                    <Database size={16} />
                    <span className="text-xs uppercase font-bold tracking-wider">Objects</span>
                  </div>
                  <span className="text-2xl font-bold text-white">124</span>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 mb-2 text-white/60">
                    <Layout size={16} />
                    <span className="text-xs uppercase font-bold tracking-wider">Scenes</span>
                  </div>
                  <span className="text-2xl font-bold text-white">12</span>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 mb-2 text-white/60">
                    <Cpu size={16} />
                    <span className="text-xs uppercase font-bold tracking-wider">Signals</span>
                  </div>
                  <span className="text-2xl font-bold text-white">Clean</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle size={18} className="text-amber-400" />
                  <span className="font-bold">Minor Improvements Suggested</span>
                </div>
                <ul className="space-y-3 text-sm text-white/60">
                  <li className="flex gap-3">
                    <div className="flex-shrink-0 w-1.5 h-1.5 bg-amber-400 rounded-full mt-1.5" />
                    <span>3 assets in "characters/hero" are using unoptimized textures ({'>'} 4k).</span>
                  </li>
                  <li className="flex gap-3">
                    <div className="flex-shrink-0 w-1.5 h-1.5 bg-amber-400 rounded-full mt-1.5" />
                    <span>Orphaned metadata detected for "scene_04_v2". Safe to remove?</span>
                  </li>
                </ul>
              </div>

              <div className="flex justify-end gap-3">
                <button 
                  onClick={onClose}
                  className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors font-bold"
                >
                  Dismiss
                </button>
                <button 
                  className="px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors font-bold flex items-center gap-2"
                >
                  <Settings size={18} />
                  Optimize Project
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
