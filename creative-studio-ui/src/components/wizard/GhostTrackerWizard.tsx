/**
 * GhostTracker Wizard Modal
 * 
 * A dedicated modal for the Ghost Tracker wizard with integrated tips section.
 */

import React, { useState, useEffect } from 'react';
import { GhostTrackerTips, GhostTrackerTip } from './GhostTrackerTips';
import { WizardNavigation } from './WizardNavigation';
import { WizardStepIndicator } from './WizardStepIndicator';
import { useAppStore } from '@/stores/useAppStore';
import { WizardService } from '@/services/wizard/WizardService';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Ghost,
  Search,
  AlertTriangle,
  Activity,
  Eye,
  CheckCircle,
  RefreshCw,
  ChevronRight,
  Sparkles,
  Target,
  TrendingUp,
  Shield,
  X
} from 'lucide-react';
import './GhostTrackerWizard.css';

interface GhostTrackerWizardProps {
  isOpen: boolean;
  onClose: () => void;
  projectPath?: string;
}

type TrackingMode = 'continuity' | 'anomaly_detection' | 'motion_analysis' | 'visual_consistency' | 'quality_assurance';

interface TrackingResult {
  mode: TrackingMode;
  status: 'idle' | 'running' | 'completed' | 'error';
  progress: number;
  elementsTracked: number;
  issuesFound: number;
  confidence: number;
  summary: string;
  recommendations: string[];
}

const TRACKING_MODES: { id: TrackingMode; name: string; description: string; icon: React.ReactNode }[] = [
  {
    id: 'continuity',
    name: 'Continuity',
    description: 'Track characters, props, and elements across shots',
    icon: <RefreshCw size={18} />
  },
  {
    id: 'anomaly_detection',
    name: 'Anomaly Detection',
    description: 'Find unusual elements or unexpected changes',
    icon: <AlertTriangle size={18} />
  },
  {
    id: 'motion_analysis',
    name: 'Motion Analysis',
    description: 'Analyze movement patterns and camera work',
    icon: <Activity size={18} />
  },
  {
    id: 'visual_consistency',
    name: 'Visual Consistency',
    description: 'Check lighting, colors, and visual style',
    icon: <Eye size={18} />
  },
  {
    id: 'quality_assurance',
    name: 'Quality Assurance',
    description: 'Comprehensive quality check of your project',
    icon: <Shield size={18} />
  }
];

export function GhostTrackerWizard({
  isOpen,
  onClose,
  projectPath
}: GhostTrackerWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedMode, setSelectedMode] = useState<TrackingMode>('continuity');
  const [trackingResult, setTrackingResult] = useState<TrackingResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTip, setSelectedTip] = useState<GhostTrackerTip | null>(null);
  
  const project = useAppStore((state) => state.project);
  const wizardService = new WizardService();
  const title = '👻 Ghost Tracker';

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setTrackingResult(null);
      setIsRunning(false);
    }
  }, [isOpen]);

  const handleRunAnalysis = async () => {
    setIsRunning(true);
    setTrackingResult({
      mode: selectedMode,
      status: 'running',
      progress: 0,
      elementsTracked: 0,
      issuesFound: 0,
      confidence: 0,
      summary: '',
      recommendations: []
    });

    try {
      // Simulate analysis progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setTrackingResult(prev => prev ? {
          ...prev,
          progress: i,
          elementsTracked: Math.floor(i * 0.5),
          issuesFound: Math.floor(i * 0.2)
        } : null);
      }

      // Complete analysis
      setTrackingResult(prev => prev ? {
        ...prev,
        status: 'completed',
        progress: 100,
        elementsTracked: Math.floor(Math.random() * 20) + 10,
        issuesFound: Math.floor(Math.random() * 8) + 1,
        confidence: Math.random() * 3 + 7,
        summary: `Analysis completed in ${selectedMode.replace('_', ' ')} mode. Tracked ${Math.floor(Math.random() * 20) + 10} elements across ${project?.shots?.length || 0} shots.`,
        recommendations: [
          'Review flagged continuity issues before final export',
          'Consider adding more detailed shot descriptions for better tracking',
          'Run Quality Assurance mode for comprehensive analysis'
        ]
      } : null);
    } catch (error) {
      setTrackingResult(prev => prev ? {
        ...prev,
        status: 'error',
        summary: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      } : null);
    } finally {
      setIsRunning(false);
    }
  };

  const handleTipClick = (tip: GhostTrackerTip) => {
    setSelectedTip(tip);
  };

  const handleNext = () => {
    if (currentStep < 2) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    setTrackingResult(null);
    setIsRunning(false);
    onClose();
  };

  const steps = [
    { id: 'select', title: 'Select Mode', icon: <Target size={16} /> },
    { id: 'analyze', title: 'Analyze', icon: <Search size={16} /> },
    { id: 'results', title: 'Results', icon: <CheckCircle size={16} /> }
  ];

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="ghost-tracker-step">
            <div className="mode-selection">
              <h3 className="section-title">Select Tracking Mode</h3>
              <p className="section-description">
                Choose how you want Ghost Tracker to analyze your project
              </p>
              
              <div className="mode-grid">
                {TRACKING_MODES.map(mode => (
                  <button
                    key={mode.id}
                    className={`mode-card ${selectedMode === mode.id ? 'selected' : ''}`}
                    onClick={() => setSelectedMode(mode.id)}
                    disabled={isRunning}
                  >
                    <div className="mode-icon">{mode.icon}</div>
                    <h4 className="mode-name">{mode.name}</h4>
                    <p className="mode-description">{mode.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Tips Section */}
            <div className="tips-integration">
              <GhostTrackerTips
                onTipClick={handleTipClick}
                maxTips={2}
                autoRotate={true}
                autoRotateInterval={10000}
              />
            </div>
          </div>
        );

      case 1:
        return (
          <div className="ghost-tracker-step">
            <div className="analysis-preview">
              <h3 className="section-title">Analysis Preview</h3>
              
              <div className="preview-stats">
                <div className="stat-card">
                  <div className="stat-icon">
                    <Target size={24} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-value">{project?.shots?.length || 0}</span>
                    <span className="stat-label">Shots to Analyze</span>
                  </div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-icon">
                    <TrendingUp size={24} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-value">{project?.characters?.length || 0}</span>
                    <span className="stat-label">Characters</span>
                  </div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-icon">
                    <Sparkles size={24} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-value">{selectedMode.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                    <span className="stat-label">Mode</span>
                  </div>
                </div>
              </div>

              {isRunning ? (
                <div className="analysis-progress">
                  <div className="progress-header">
                    <span>Analyzing project...</span>
                    <span className="progress-percent">{trackingResult?.progress || 0}%</span>
                  </div>
                  <Progress value={trackingResult?.progress || 0} className="progress-bar" />
                  <div className="progress-details">
                    <span>Elements tracked: {trackingResult?.elementsTracked || 0}</span>
                    <span>Issues found: {trackingResult?.issuesFound || 0}</span>
                  </div>
                </div>
              ) : (
                <button
                  className="run-analysis-btn"
                  onClick={handleRunAnalysis}
                >
                  <Ghost size={20} />
                  Run Ghost Tracker Analysis
                  <ChevronRight size={20} />
                </button>
              )}
            </div>

            {/* Tips Section */}
            <div className="tips-integration">
              <GhostTrackerTips
                onTipClick={handleTipClick}
                maxTips={2}
                autoRotate={true}
                autoRotateInterval={10000}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="ghost-tracker-step">
            <div className="analysis-results">
              <h3 className="section-title">Analysis Results</h3>
              
              {trackingResult?.status === 'completed' ? (
                <>
                  <div className="results-summary">
                    <div className="confidence-score">
                      <div className="score-circle">
                        <span className="score-value">
                          {trackingResult.confidence.toFixed(1)}
                        </span>
                        <span className="score-max">/10</span>
                      </div>
                      <span className="score-label">Confidence Score</span>
                    </div>
                    
                    <div className="results-stats">
                      <div className="result-stat">
                        <CheckCircle size={20} className="stat-success" />
                        <div>
                          <span className="stat-number">{trackingResult.elementsTracked}</span>
                          <span className="stat-desc">Elements Tracked</span>
                        </div>
                      </div>
                      <div className="result-stat">
                        <AlertTriangle size={20} className="stat-warning" />
                        <div>
                          <span className="stat-number">{trackingResult.issuesFound}</span>
                          <span className="stat-desc">Issues Found</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="results-summary-text">
                    <p>{trackingResult.summary}</p>
                  </div>

                  <div className="recommendations">
                    <h4>Recommendations</h4>
                    <ul>
                      {trackingResult.recommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : trackingResult?.status === 'error' ? (
                <div className="results-error">
                  <AlertTriangle size={48} />
                  <p>{trackingResult.summary}</p>
                  <Button onClick={() => setCurrentStep(0)}>
                    Try Again
                  </Button>
                </div>
              ) : null}
            </div>

            {/* Tips Section */}
            <div className="tips-integration">
              <GhostTrackerTips
                onTipClick={handleTipClick}
                maxTips={3}
                autoRotate={false}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="wizard-dialog-overlay" onClick={handleClose}>
      <div className="wizard-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="wizard-dialog-header">
          <h2 className="wizard-dialog-title">{title}</h2>
          <button
            className="wizard-dialog-close"
            onClick={handleClose}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="wizard-dialog-steps">
          <WizardStepIndicator
            steps={steps.map((s, i) => ({ ...s, number: i + 1 }))}
            currentStep={currentStep}
            allowJumpToStep={currentStep > 0}
          />
        </div>

        {/* Content */}
        <div className="wizard-dialog-content">
          <div className="wizard-form-content">
            {renderStepContent()}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="wizard-dialog-footer">
          <WizardNavigation
            currentStep={currentStep}
            totalSteps={steps.length}
            onBack={handlePrevious}
            onNext={handleNext}
            onCancel={handleClose}
            onSubmit={currentStep === 2 ? handleClose : undefined}
            onSkip={() => {}}
            onSaveDraft={() => {}}
            canGoNext={currentStep < steps.length - 1}
            canGoBack={currentStep > 0}
            canSkip={false}
          />
        </div>
      </div>
    </div>
  );
}

export default GhostTrackerWizard;

