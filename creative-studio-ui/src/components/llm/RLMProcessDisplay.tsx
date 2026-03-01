
import React, { useEffect, useRef } from 'react';
import { Cpu, CheckCircle2, AlertCircle, Terminal, Braces, Search, GitBranch, ShieldCheck } from 'lucide-react';
import './RLMProcessDisplay.css';

interface RLMProcessDisplayProps {
  steps: string[];
  isProcessing: boolean;
  error?: string;
  className?: string;
}

export const RLMProcessDisplay: React.FC<RLMProcessDisplayProps> = ({
  steps,
  isProcessing,
  error,
  className = ''
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [steps]);

  const getStepIcon = (msg: string) => {
    const m = msg.toLowerCase();
    if (m.includes('critique') || m.includes('reflection')) return <ShieldCheck className="step-icon text-purple-400" />;
    if (m.includes('graphrag') || m.includes('lore')) return <Search className="step-icon text-blue-400" />;
    if (m.includes('code') || m.includes('snippets')) return <Braces className="step-icon text-yellow-400" />;
    if (m.includes('subtask') || m.includes('parallel')) return <GitBranch className="step-icon text-green-400" />;
    if (m.includes('setting up')) return <Terminal className="step-icon text-gray-400" />;
    return <Cpu className="step-icon text-cyan-400" />;
  };

  return (
    <div className={`rlm-process-display ${className}`}>
      <div className="process-header">
        <div className="header-title">
          <Cpu className="w-4 h-4 animate-pulse text-cyan-500" />
          <span>RLM Engine: Recursive Reasoning</span>
        </div>
        <div className="status-badge">
          {isProcessing ? (
            <span className="status-active">
              <span className="dot animate-ping" />
              Processing
            </span>
          ) : error ? (
            <span className="status-error">Failed</span>
          ) : (
            <span className="status-done">Complete</span>
          )}
        </div>
      </div>

      <div className="process-steps" ref={scrollRef}>
        {steps.map((step, index) => (
          <div key={index} className="process-step">
            <div className="step-visual">
              <div className="step-line" />
              {getStepIcon(step)}
            </div>
            <div className="step-content">
              <div className="step-message">{step}</div>
              <div className="step-time">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="process-step pending">
            <div className="step-visual">
              <div className="step-line" />
              <div className="step-icon-pending">
                <div className="spinner-mini" />
              </div>
            </div>
            <div className="step-content">
              <div className="step-message">Analyzing trajectory...</div>
            </div>
          </div>
        )}

        {error && (
          <div className="process-error">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {steps.length > 0 && !isProcessing && !error && (
          <div className="process-success">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Logic synchronized. Final synthesized result below.</span>
          </div>
        )}
      </div>
    </div>
  );
};
