import React, { useState } from 'react';
import { ServiceAsset } from '../../types';
import './assetLibrary.css';

interface MarketplacePublishDialogProps {
  asset: ServiceAsset;
  onClose: () => void;
}

export const MarketplacePublishDialog: React.FC<MarketplacePublishDialogProps> = ({ asset, onClose }) => {
  const [step, setStep] = useState<'details' | 'evaluating' | 'result'>('details');
  const [evaluation, setEvaluation] = useState<{ score: number; grade: string; reward: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startEvaluation = () => {
    setStep('evaluating');
    
    // Simulate complex AI evaluation of the asset
    setTimeout(() => {
      const score = Math.floor(Math.random() * 40) + 60; // 60-100
      let grade = 'B';
      let reward = 100;

      if (score >= 95) { grade = 'S+'; reward = 1000; }
      else if (score >= 90) { grade = 'S'; reward = 500; }
      else if (score >= 80) { grade = 'A'; reward = 250; }
      
      setEvaluation({ score, grade, reward });
      setStep('result');
    }, 3000);
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      // In a real app, this would send the asset + evaluation to the WordPress API
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('Success! Your asset is now live in the NexRealm Marketplace.');
      onClose();
    } catch (_e) {
      alert('Error submitting to marketplace');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="marketplace-publish-overlay">
      <div className="marketplace-publish-card">
        <div className="publish-header">
          <h3>💎 NexRealm Marketplace Submission</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="publish-body">
          {step === 'details' && (
            <div className="step-details">
              <div className="asset-preview-mini">
                <img src={asset.thumbnailUrl || asset.thumbnail} alt={asset.name} />
                <div className="mini-info">
                  <strong>{asset.name}</strong>
                  <span>{asset.type.toUpperCase()}</span>
                </div>
              </div>
              
              <div className="discovery-fields">
                <div className="field-group">
                  <label>Marketplace Category</label>
                  <select className="market-select">
                    <option value="3d-asset">3D Asset</option>
                    <option value="character">Character</option>
                    <option value="environment">Environment</option>
                    <option value="audio">Audio / SFX</option>
                    <option value="script">Script Template</option>
                  </select>
                </div>
                <div className="field-group">
                  <label>Discovery Tags (Comma separated)</label>
                  <input type="text" placeholder="e.g. hero, urban, lowpoly" className="market-input" />
                </div>
              </div>

              <div className="info-alert">
                <p>StoryCore Engine will now evaluate your asset based on quality, resolution, and consistency.</p>
                <p><strong>High-grade assets (S, A) earn more GEMmes!</strong></p>
              </div>

              <button className="start-eval-btn" onClick={startEvaluation}>Run AI Quality Scan</button>
            </div>
          )}

          {step === 'evaluating' && (
            <div className="step-evaluating">
              <div className="scanning-animation">
                <div className="scan-line"></div>
                <img src={asset.thumbnailUrl || asset.thumbnail} alt="scanning" />
              </div>
              <p>Analyzing geometry & texture resolution...</p>
              <div className="loader-dots"><span>.</span><span>.</span><span>.</span></div>
            </div>
          )}

          {step === 'result' && evaluation && (
            <div className="step-result">
              <div className="result-stats">
                <div className="stat-circle">
                  <span className="stat-label">SCORE</span>
                  <span className="stat-value">{evaluation.score}</span>
                </div>
                <div className="stat-grade">
                  <span className="stat-label">GRADE</span>
                  <span className="grade-value">{evaluation.grade}</span>
                </div>
              </div>

              <div className="reward-banner">
                <span className="reward-icon">💎</span>
                <span className="reward-text">REWARD: +{evaluation.reward} GEMmes</span>
              </div>

              <div className="submission-actions">
                <button className="cancel-btn" onClick={onClose}>Discard</button>
                <button 
                  className="confirm-btn" 
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Posting...' : 'Post to Marketplace'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .marketplace-publish-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          font-family: 'Outfit', sans-serif;
        }
        .marketplace-publish-card {
          background: #1e293b;
          width: 450px;
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.1);
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
        }
        .publish-header {
          padding: 20px 25px;
          background: rgba(255,255,255,0.03);
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .publish-header h3 { margin: 0; font-size: 18px; color: #fff; }
        .publish-body { padding: 30px; color: #cbd5e1; }
        .asset-preview-mini { display: flex; gap: 15px; align-items: center; margin-bottom: 25px; }
        .asset-preview-mini img { width: 60px; height: 60px; border-radius: 12px; object-fit: cover; }
        .mini-info strong { display: block; color: #fff; }
        .mini-info span { font-size: 11px; opacity: 0.6; }
        .info-alert { background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); padding: 15px; border-radius: 12px; margin-bottom: 25px; font-size: 13px; }
        .discovery-fields { display: flex; flex-direction: column; gap: 15px; margin-bottom: 25px; }
        .field-group { display: flex; flex-direction: column; gap: 5px; }
        .field-group label { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
        .market-select, .market-input { 
          background: rgba(255,255,255,0.05); 
          border: 1px solid rgba(255,255,255,0.1); 
          padding: 10px 12px; 
          border-radius: 8px; 
          color: #fff; 
          font-size: 13px;
          outline: none;
          transition: border-color 0.2s;
        }
        .market-select:focus, .market-input:focus { border-color: #6366f1; }
        .start-eval-btn { width: 100%; padding: 14px; background: #6366f1; color: #fff; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; transition: 0.3s; }
        .start-eval-btn:hover { background: #4f46e5; transform: translateY(-2px); }
        
        /* Evaluating Step */
        .step-evaluating { text-align: center; }
        .scanning-animation { position: relative; display: inline-block; margin-bottom: 20px; border-radius: 12px; overflow: hidden; }
        .scanning-animation img { width: 200px; height: 120px; object-fit: cover; opacity: 0.5; }
        .scan-line { position: absolute; top: 0; left: 0; width: 100%; height: 2px; background: #6366f1; box-shadow: 0 0 15px #6366f1; animation: scan 2s infinite ease-in-out; z-index: 10; }
        @keyframes scan { 0% { top: 0; } 50% { top: 100%; } 100% { top: 0; } }

        /* Result Step */
        .result-stats { display: flex; justify-content: center; gap: 40px; margin-bottom: 30px; }
        .stat-circle, .stat-grade { display: flex; flex-direction: column; align-items: center; }
        .stat-label { font-size: 11px; font-weight: 800; color: #64748b; margin-bottom: 5px; }
        .stat-value, .grade-value { font-size: 42px; font-weight: 900; color: #fff; }
        .grade-value { color: #22c55e; text-shadow: 0 0 10px rgba(34, 197, 94, 0.3); }
        .reward-banner { background: #0f172a; padding: 15px; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 30px; border: 1px solid #1e293b; }
        .reward-icon { font-size: 20px; }
        .reward-text { font-weight: 800; color: #fff; }
        .submission-actions { display: flex; gap: 15px; }
        .cancel-btn { flex: 1; padding: 12px; background: rgba(255,255,255,0.05); color: #fff; border: none; border-radius: 10px; cursor: pointer; }
        .confirm-btn { flex: 2; padding: 12px; background: #22c55e; color: #fff; border: none; border-radius: 10px; font-weight: 800; cursor: pointer; }
      `}</style>
    </div>
  );
};
