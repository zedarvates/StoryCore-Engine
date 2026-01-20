/**
 * LLM Diagnostic Panel Component
 * 
 * Visual diagnostic tool for troubleshooting LLM configuration and connectivity issues.
 * Displays comprehensive diagnostic information and provides quick actions.
 */

import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  Settings,
  Download,
  Copy,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  runLLMDiagnostic, 
  printDiagnostic, 
  type DiagnosticResult,
  type DiagnosticCheck 
} from '@/utils/llmDiagnostic';

// ============================================================================
// Types
// ============================================================================

interface LLMDiagnosticPanelProps {
  onClose?: () => void;
  onOpenSettings?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function LLMDiagnosticPanel({ onClose, onOpenSettings }: LLMDiagnosticPanelProps) {
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  // Run diagnostic on mount
  useEffect(() => {
    runDiagnostic();
  }, []);

  const runDiagnostic = async () => {
    setIsRunning(true);
    try {
      const result = await runLLMDiagnostic();
      setDiagnostic(result);
      printDiagnostic(result);
    } catch (error) {
      console.error('Diagnostic failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const copyToClipboard = () => {
    if (!diagnostic) return;

    const text = JSON.stringify(diagnostic, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const downloadReport = () => {
    if (!diagnostic) return;

    const text = JSON.stringify(diagnostic, null, 2);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `llm-diagnostic-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!diagnostic) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2 text-foreground">Running diagnostic...</span>
      </div>
    );
  }

  return (
    <div className="bg-background border border-border rounded-lg shadow-lg max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          {diagnostic.overall === 'healthy' && (
            <CheckCircle className="w-5 h-5 text-green-500" />
          )}
          {diagnostic.overall === 'warning' && (
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
          )}
          {diagnostic.overall === 'error' && (
            <AlertCircle className="w-5 h-5 text-red-500" />
          )}
          <h2 className="text-lg font-semibold text-foreground">
            LLM Diagnostic Report
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={runDiagnostic}
            disabled={isRunning}
          >
            <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
          >
            <Copy className="w-4 h-4" />
            {copied && <span className="ml-1 text-xs">Copied!</span>}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={downloadReport}
          >
            <Download className="w-4 h-4" />
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Overall Status */}
      <div className={`p-4 ${
        diagnostic.overall === 'healthy' ? 'bg-green-50 dark:bg-green-900/20' :
        diagnostic.overall === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20' :
        'bg-red-50 dark:bg-red-900/20'
      }`}>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">Status:</span>
          <span className={`font-bold ${
            diagnostic.overall === 'healthy' ? 'text-green-600 dark:text-green-400' :
            diagnostic.overall === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
            'text-red-600 dark:text-red-400'
          }`}>
            {diagnostic.overall.toUpperCase()}
          </span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {new Date(diagnostic.timestamp).toLocaleString()}
        </div>
      </div>

      {/* Configuration Summary */}
      {diagnostic.config && (
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground mb-2">Configuration</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Provider:</span>
              <span className="ml-2 font-medium text-foreground">{diagnostic.config.provider}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Model:</span>
              <span className="ml-2 font-medium text-foreground">{diagnostic.config.model}</span>
            </div>
            <div>
              <span className="text-muted-foreground">API Key:</span>
              <span className="ml-2 font-medium text-foreground">
                {diagnostic.config.hasApiKey ? '✓ Configured' : '✗ Missing'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Streaming:</span>
              <span className="ml-2 font-medium text-foreground">
                {diagnostic.config.streamingEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Diagnostic Checks */}
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-foreground mb-3">Diagnostic Checks</h3>
        <div className="space-y-2">
          {Object.entries(diagnostic.checks).map(([name, check]) => (
            <DiagnosticCheckItem key={name} name={name} check={check} />
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-foreground mb-3">Recommendations</h3>
        <ul className="space-y-2">
          {diagnostic.recommendations.map((rec, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="text-blue-500 font-bold">{i + 1}.</span>
              <span className="text-foreground">{rec}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="p-4 flex gap-2">
        {onOpenSettings && (
          <Button onClick={onOpenSettings} className="flex-1">
            <Settings className="w-4 h-4 mr-2" />
            Open Settings
          </Button>
        )}
        <Button onClick={runDiagnostic} variant="outline" disabled={isRunning}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
          Run Again
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Diagnostic Check Item Component
// ============================================================================

interface DiagnosticCheckItemProps {
  name: string;
  check: DiagnosticCheck;
}

function DiagnosticCheckItem({ name, check }: DiagnosticCheckItemProps) {
  const [expanded, setExpanded] = useState(false);

  const getIcon = () => {
    switch (check.status) {
      case 'pass':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'fail':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    switch (check.status) {
      case 'pass':
        return 'text-green-600 dark:text-green-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'fail':
        return 'text-red-600 dark:text-red-400';
    }
  };

  return (
    <div className="border border-border rounded p-3">
      <div 
        className="flex items-start gap-2 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {getIcon()}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground capitalize">
              {name.replace(/([A-Z])/g, ' $1').trim()}
            </span>
            <span className={`text-xs font-semibold ${getStatusColor()}`}>
              {check.status.toUpperCase()}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{check.message}</p>
        </div>
      </div>

      {expanded && check.details && (
        <div className="mt-2 pl-6 border-l-2 border-border">
          <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
            {JSON.stringify(check.details, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Compact Diagnostic Badge Component
// ============================================================================

interface LLMDiagnosticBadgeProps {
  onClick?: () => void;
}

export function LLMDiagnosticBadge({ onClick }: LLMDiagnosticBadgeProps) {
  const [status, setStatus] = useState<'healthy' | 'warning' | 'error' | 'loading'>('loading');

  useEffect(() => {
    async function checkStatus() {
      const result = await runLLMDiagnostic();
      setStatus(result.overall);
    }
    checkStatus();
  }, []);

  const getIcon = () => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'loading':
        return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
    }
  };

  const getLabel = () => {
    switch (status) {
      case 'healthy':
        return 'LLM Healthy';
      case 'warning':
        return 'LLM Warning';
      case 'error':
        return 'LLM Error';
      case 'loading':
        return 'Checking...';
    }
  };

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background border border-border hover:bg-muted transition-colors"
    >
      {getIcon()}
      <span className="text-xs font-medium text-foreground">{getLabel()}</span>
    </button>
  );
}
