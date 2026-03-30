import React, { useState } from 'react';
import { 
  CheckCircle, 
  AlertCircle, 
  Sparkles, 
  ChevronRight, 
  Activity, 
  ShieldCheck, 
  Zap,
  BarChart3
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import './AlignmentDashboard.css';

export interface AlignmentCategory {
  score: number;
  issues: string[];
  recommendations?: string[];
}

export interface AlignmentReport {
  total_score: number;
  summary: string;
  categories: Record<string, AlignmentCategory>;
  recommendations: string[];
}

interface AlignmentDashboardProps {
  report: AlignmentReport;
  isRefining?: boolean;
  onFixAll?: (recommendations: string[]) => void;
  onFixSelected?: (selectedRecs: string[]) => void;
  onFixSingle?: (recommendation: string) => void;
  onChat?: (recommendation: string) => void;
}

export const AlignmentDashboard: React.FC<AlignmentDashboardProps> = ({
  report,
  isRefining = false,
  onFixAll,
  onFixSelected,
  onFixSingle,
  onChat
}) => {
  const [selectedRecs, setSelectedRecs] = useState<string[]>([]);

  const toggleRecommendation = (rec: string) => {
    setSelectedRecs(prev => 
      prev.includes(rec) ? prev.filter(r => r !== rec) : [...prev, rec]
    );
  };


  return (
    <div className="alignment-dashboard">
        <div className="alignment-header">
          <div className="score-container">
              <div 
                className="score-circle" 
                data-level={report.total_score >= 80 ? 'success' : report.total_score >= 50 ? 'warning' : 'error'}
                style={{ '--score-percent': report.total_score } as React.CSSProperties}
              >
              <div className="score-value">{report.total_score}</div>
              <div className="score-label">Global Health</div>
            </div>
            <div className="score-info">
              <h3>Story Alignment</h3>
              <p>Predictive analysis of narrative consistency</p>
            </div>
          </div>
        
        {report.total_score < 100 && onFixAll && (
          <Button 
            onClick={() => onFixAll(report.recommendations)}
            disabled={isRefining}
            className="fix-all-btn"
          >
            <Sparkles className="w-4 h-4" />
            Auto-Repair All
          </Button>
        )}
      </div>

      {/* Summary Bubble */}
      <div className="alignment-summary">
        <div className="summary-icon">
          <Activity className="w-4 h-4" />
        </div>
        <div className="summary-text italic">
          "{report.summary}"
        </div>
      </div>

      {/* Category Grid */}
      <div className="category-grid">
          {Object.entries(report.categories).map(([key, data]) => {
          const categoryName = key.replace(/_/g, ' ');
          return (
            <div key={key} className="category-card">
              <div className="category-info">
                <span className="category-name">{categoryName}</span>
                <span 
                  className="category-score" 
                  data-level={data.score >= 75 ? 'success' : data.score >= 50 ? 'warning' : 'error'}
                >
                  {Math.round(data.score)}%
                </span>
              </div>
              <Progress 
                value={data.score} 
                className="category-progress"
                // variant={data.score >= 75 ? 'success' : data.score >= 50 ? 'warning' : 'error'}
              />
              {data.issues.length > 0 && (
                <div className="category-issue-hint">
                  <AlertCircle className="w-3 h-3" />
                  {data.issues[0]}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Recommendations Section */}
      <div className="recommendations-section">
        <div className="section-header">
          <div className="section-title">
            <ShieldCheck className="w-4 h-4" />
            Priority Fixes
          </div>
          {selectedRecs.length > 0 && onFixSelected && (
            <Button 
              size="sm" 
              onClick={() => onFixSelected(selectedRecs)}
              disabled={isRefining}
              className="fix-selected-btn"
            >
              Fix Selected ({selectedRecs.length})
            </Button>
          )}
        </div>

        <div className="recommendations-list">
          {report.recommendations.map((rec, i) => (
            <div 
              key={i} 
              className={`recommendation-item ${selectedRecs.includes(rec) ? 'selected' : ''}`}
            >
              <div className="rec-checkbox-container">
                <Checkbox 
                  id={`rec-${i}`} 
                  checked={selectedRecs.includes(rec)}
                  onCheckedChange={() => toggleRecommendation(rec)}
                />
              </div>
              
              <label htmlFor={`rec-${i}`} className="rec-text">
                {rec}
              </label>

              <div className="rec-actions">
                {onChat && (
                  <button className="rec-action-btn chat" onClick={() => onChat(rec)} title="Discuss fix with AI">
                    💬
                  </button>
                )}
                {onFixSingle && (
                  <button 
                    className="rec-action-btn apply" 
                    onClick={() => onFixSingle(rec)}
                    disabled={isRefining}
                    title="Apply intelligent fix"
                  >
                    <Zap className="w-3 h-3" />
                  </button>
                )}
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          ))}
          
          {report.recommendations.length === 0 && (
            <div className="no-recommendations">
              <CheckCircle className="w-8 h-8 text-green-500/20" />
              <p>Everything looks perfectly aligned.</p>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Insights Footer */}
      <div className="dashboard-footer">
        <div className="insight-stat">
          <BarChart3 className="w-4 h-4" />
          <span>Real-time analysis active</span>
        </div>
        <div className="ai-assisted-badge">
          AI ASSISTED ORCHESTRATION
        </div>
      </div>
    </div>
  );
};
