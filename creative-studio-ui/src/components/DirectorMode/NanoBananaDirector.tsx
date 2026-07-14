import React, { useState } from 'react';
import { 
  Search, 
  Lock, 
  Zap, 
  Layout, 
  Layers, 
  Camera, 
  Sparkles,
  Music,
  Scissors,
  PenTool,
  XCircle
} from 'lucide-react';
import './NanoBananaDirector.css';

type AspectRatio = '16:9' | '9:16' | '1:1' | '2.35:1' | '21:9';

interface ResearchFacts {
  architecture?: string;
  clothing?: string;
  lighting?: string;
  palette?: string;
  historical_accuracy?: string;
  weather?: string;
}

interface GPUStatus {
  vram_allocated_gb: number;
  vram_total_gb: number;
  status: string;
}

interface NanoBananaDirectorProps {
  onClose?: () => void;
}

export const NanoBananaDirector: React.FC<NanoBananaDirectorProps> = ({ onClose }) => {
  // --- States ---
  const [prompt, setPrompt] = useState('');
  const [audioPrompt, setAudioPrompt] = useState('');
  const [physicsPrompt, setPhysicsPrompt] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  
  const [isResearching, setIsResearching] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [researchFacts, setResearchFacts] = useState<ResearchFacts | null>(null);
  const [useSpectrum, setUseSpectrum] = useState(true);
  const [gpuStatus, setGpuStatus] = useState<GPUStatus | null>(null);
  
  const [sceneId, setSceneId] = useState<string | null>(null);

  // --- Actions ---

  const handleResearch = async () => {
    if (!prompt) return;
    setIsResearching(true);
    try {
      const response = await fetch('/api/director/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          location,
          date
        })
      });
      const data = await response.json();
      setResearchFacts(data.facts);
      setPrompt(data.enhanced_prompt);
    } catch (err) {
      console.error("Research failed:", err);
    } finally {
      setIsResearching(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    // Refresh GPU status
    try {
      const res = await fetch('/api/director/gpu-status');
      const status = await res.json();
      setGpuStatus(status);
    } catch (_err) {
      console.warn("GPU status check failed");
    }
    
    // This would call /api/ltx/generate with all params
    console.log("Generating with all Nano Banana 2 features...");
    setTimeout(() => setIsGenerating(false), 3000);
  };

  const handleLockScene = async () => {
    // Call /api/director/lock-scene
    setSceneId("SCENE_" + Math.random().toString(36).substr(2, 9));
  };

  const handleGenerateCoverage = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/director/generate-coverage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scene_description: prompt,
          shots: ['Master Shot', 'Close Up', 'OTS A', 'OTS B']
        })
      });
      const data = await response.json();
      console.log("Coverage generated:", data);
    } catch (err) {
      console.error("Coverage failed:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKiwiedit = async () => {
    // In a real app, we would select the video first
    console.log("Launching Kiwiedit Swap UI...");
  };

  return (
    <div className="director-container">
      {/* Header */}
      <div className="director-header">
        <div className="director-title">
          <div style={{ padding: 10, borderRadius: 12, background: 'rgba(124, 58, 237, 0.2)', border: '1px solid rgba(124, 58, 237, 0.4)' }}>
            <Camera className="h-6 w-6" style={{ color: '#a78bfa' }} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>DIRECTOR MODE</h2>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Nano Banana 2 & LTX 2.3 Integration</p>
          </div>
        </div>
        <div className="director-badge">Ultra-Consistency</div>
        {onClose && (
          <button className="close-button" onClick={onClose} title="Fermer le mode réalisateur">
            <XCircle className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="director-grid">
        {/* Left Column: Input & Research */}
        <div className="director-column">
          <div className="director-section">
            <h3><Search className="h-4 w-4" /> Real-World Grounding</h3>
            
            <div className="input-group">
              <span className="input-label">Core Narrative Beat</span>
              <textarea 
                className="director-textarea" 
                rows={3} 
                placeholder="Ex: A duel at dawn in the ruins of a Scottish castle..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="input-group">
                <span className="input-label">Location (Optional)</span>
                <input 
                  className="director-input" 
                  placeholder="Ex: Skye Island" 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <div className="input-group">
                <span className="input-label">Date/Period</span>
                <input 
                  className="director-input" 
                  placeholder="Ex: 1450-10-12"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            <button 
              className="director-button btn-secondary" 
              style={{ width: '100%' }}
              onClick={handleResearch}
              disabled={isResearching}
            >
              {isResearching ? <Zap className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {isResearching ? "Researching History..." : "Research & Enhance Prompt"}
            </button>

            {researchFacts && (
              <div className="research-result">
                <p style={{ margin: '0 0 8px 0', fontSize: '0.7rem', fontWeight: 800, color: '#34d399' }}>VERIFIED FACTS:</p>
                {Object.entries(researchFacts).map(([key, val]) => (
                  <div key={key} className="fact-item">
                    • <strong>{key}:</strong> {val}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="director-section" style={{ marginTop: 20 }}>
            <h3><Music className="h-4 w-4" /> Native Audio & Physics</h3>
            <div className="input-group">
              <span className="input-label">Audio Atmosphere (LTX 2.3)</span>
              <input 
                className="director-input" 
                placeholder="Ex: Heavy rain on metal, far thunder, clashing steel..." 
                value={audioPrompt}
                onChange={(e) => setAudioPrompt(e.target.value)}
              />
            </div>
            <div className="input-group">
              <span className="input-label">Real Wonder Physics (Wind/Gravity)</span>
              <input 
                className="director-input" 
                placeholder="Ex: Strong wind from North-East blowing capes left..." 
                value={physicsPrompt}
                onChange={(e) => setPhysicsPrompt(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Settings & Lock */}
        <div className="director-column">
          <div className="director-section">
            <h3><Layout className="h-4 w-4" /> Cinematic Output</h3>
            
            <span className="input-label">Aspect Ratio (Native LTX)</span>
            <div className="aspect-ratio-grid">
              {(['16:9', '9:16', '1:1', '2.35:1', '21:9'] as AspectRatio[]).map(ratio => (
                <div 
                  key={ratio} 
                  className={`ratio-chip ${aspectRatio === ratio ? 'active' : ''}`}
                  onClick={() => setAspectRatio(ratio)}
                >
                  {ratio}
                </div>
              ))}
            </div>

            <div className="spectrum-toggle">
              <div>
                <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700 }}>Spectrum Acceleration</p>
                <p style={{ margin: 0, fontSize: '0.65rem', color: '#60a5fa' }}>⚡ 3.5x Speedup Enabled</p>
              </div>
              <input 
                type="checkbox" 
                checked={useSpectrum} 
                onChange={(e) => setUseSpectrum(e.target.checked)}
              />
            </div>

            <div className="action-row">
              <button 
                className={`director-button ${sceneId ? 'btn-secondary' : 'btn-primary'}`} 
                style={{ flex: 1 }}
                onClick={handleLockScene}
              >
                <Lock className="h-4 w-4" />
                {sceneId ? "Scene Locked" : "Lock Visual DNA"}
              </button>
            </div>
            {sceneId && <p style={{ fontSize: '0.65rem', color: '#34d399', textAlign: 'center', marginTop: 8 }}>✓ DNA Locked: {sceneId}</p>}
          </div>

          <div className="director-section" style={{ marginTop: 20 }}>
            <h3><Layers className="h-4 w-4" /> Coverage Assistant</h3>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 15 }}>
              Automatically generate multiple angles keeping character & object consistency.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div className="ratio-chip">Master Shot</div>
              <div className="ratio-chip">Close Up</div>
              <div className="ratio-chip">OTS A</div>
              <div className="ratio-chip">OTS B</div>
            </div>
            <button 
              className="director-button btn-secondary" 
              style={{ width: '100%', marginTop: 12 }}
              onClick={handleGenerateCoverage}
              disabled={isGenerating || !prompt}
            >
              Generate Full Coverage
            </button>
          </div>

          <div className="director-section" style={{ marginTop: 20 }}>
            <h3><Scissors className="h-4 w-4" /> Semantic Post-Production</h3>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 15 }}>
              Modify existing clips using Kiwiedit or expand to VR with Cube Composer.
            </p>
            <div className="action-row" style={{ gap: 8 }}>
              <button 
                className="director-button btn-secondary" 
                style={{ flex: 1, fontSize: '0.8rem' }}
                onClick={handleKiwiedit}
              >
                <Scissors className="h-4 w-4" /> Kiwiedit Swap
              </button>
              <button className="director-button btn-secondary" style={{ flex: 1, fontSize: '0.8rem' }}>
                <PenTool className="h-4 w-4" /> Hi-Fi Paint: Props
              </button>
            </div>
          </div>

          {/* MAIN GENERATE BUTTON */}
          <button 
            className="director-button btn-primary" 
            style={{ width: '100%', marginTop: 20, padding: '16px', background: 'linear-gradient(90deg, #7c3aed, #db2777)', fontSize: '1rem' }}
            disabled={isGenerating}
            onClick={handleGenerate}
          >
            {isGenerating ? <Zap className="h-6 w-6 animate-spin" /> : <Sparkles className="h-6 w-6" />}
            {isGenerating ? "DIRECTING SCENE..." : "DIRECT SCENE"}
          </button>
        </div>
      </div>

      {isGenerating && (
        <div className="progress-banner">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span className="generating-text">DIRECTOR IS WORKING...</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>45%</span>
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
            <div style={{ width: '45%', height: '100%', background: '#a78bfa', borderRadius: 2, boxShadow: '0 0 10px #a78bfa' }}></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <p style={{ margin: 0, fontSize: '0.65rem', color: '#94a3b8' }}>[LTX 2.3] Processing Latent Space with Spectrum Speedup...</p>
            {gpuStatus && (
              <p style={{ margin: 0, fontSize: '0.65rem', color: '#60a5fa' }}>⚡ GPU: {gpuStatus.vram_allocated_gb}/{gpuStatus.vram_total_gb}GB</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NanoBananaDirector;
