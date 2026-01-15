/**
 * AI Enhancement Controls - Main Control Panel
 * 
 * Provides intuitive controls for AI enhancement operations with real-time feedback.
 * Integrates with AI Enhancement Engine for seamless enhancement application.
 * 
 * Features:
 * - Real-time parameter adjustment
 * - Progress indicators with ETA
 * - Undo/redo functionality
 * - Preview feedback
 * 
 * @module AIEnhancementControls
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Slider, 
  Button, 
  ButtonGroup,
  LinearProgress,
  Chip,
  Stack,
  Alert,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  AutoFixHigh as AutoFixIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Info as InfoIcon
} from '@mui/icons-material';

/**
 * Enhancement configuration interface
 */
interface EnhancementConfig {
  type: 'style_transfer' | 'super_resolution' | 'interpolation' | 'quality_optimizer';
  strength: number;
  quality: 'preview' | 'standard' | 'high' | 'maximum';
  enabled: boolean;
}

/**
 * Processing status interface
 */
interface ProcessingStatus {
  isProcessing: boolean;
  progress: number;
  eta: number; // seconds
  currentOperation: string;
}

/**
 * Props for AIEnhancementControls component
 */
interface AIEnhancementControlsProps {
  onEnhance: (config: EnhancementConfig) => Promise<void>;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  initialConfig?: Partial<EnhancementConfig>;
}

/**
 * Main AI Enhancement Controls Component
 */
export const AIEnhancementControls: React.FC<AIEnhancementControlsProps> = ({
  onEnhance,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  initialConfig = {}
}) => {
  // State management
  const [config, setConfig] = useState<EnhancementConfig>({
    type: 'style_transfer',
    strength: 0.7,
    quality: 'standard',
    enabled: true,
    ...initialConfig
  });

  const [status, setStatus] = useState<ProcessingStatus>({
    isProcessing: false,
    progress: 0,
    eta: 0,
    currentOperation: ''
  });

  const [error, setError] = useState<string | null>(null);

  /**
   * Handle enhancement application
   */
  const handleApply = useCallback(async () => {
    try {
      setError(null);
      setStatus({
        isProcessing: true,
        progress: 0,
        eta: 5,
        currentOperation: 'Initializing AI models...'
      });

      // Simulate progress updates (in real implementation, this would come from the backend)
      const progressInterval = setInterval(() => {
        setStatus(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90),
          eta: Math.max(prev.eta - 0.5, 0),
          currentOperation: prev.progress < 30 ? 'Loading models...' :
                          prev.progress < 60 ? 'Processing frames...' :
                          'Finalizing...'
        }));
      }, 500);

      await onEnhance(config);

      clearInterval(progressInterval);
      setStatus({
        isProcessing: false,
        progress: 100,
        eta: 0,
        currentOperation: 'Complete'
      });

      // Reset progress after 2 seconds
      setTimeout(() => {
        setStatus(prev => ({ ...prev, progress: 0, currentOperation: '' }));
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enhancement failed');
      setStatus({
        isProcessing: false,
        progress: 0,
        eta: 0,
        currentOperation: ''
      });
    }
  }, [config, onEnhance]);

  /**
   * Handle parameter changes
   */
  const handleStrengthChange = useCallback((event: Event, value: number | number[]) => {
    setConfig(prev => ({ ...prev, strength: value as number }));
  }, []);

  const handleQualityChange = useCallback((quality: EnhancementConfig['quality']) => {
    setConfig(prev => ({ ...prev, quality }));
  }, []);

  const handleTypeChange = useCallback((type: EnhancementConfig['type']) => {
    setConfig(prev => ({ ...prev, type }));
  }, []);

  /**
   * Handle reset to defaults
   */
  const handleReset = useCallback(() => {
    setConfig({
      type: 'style_transfer',
      strength: 0.7,
      quality: 'standard',
      enabled: true
    });
    setError(null);
  }, []);

  /**
   * Format ETA for display
   */
  const formatETA = (seconds: number): string => {
    if (seconds < 1) return 'Less than 1 second';
    if (seconds < 60) return `${Math.round(seconds)} seconds`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  return (
    <Card elevation={3} sx={{ maxWidth: 600, margin: 'auto' }}>
      <CardContent>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5" component="h2">
            AI Enhancement Controls
          </Typography>
          <Tooltip title="Reset to defaults">
            <IconButton onClick={handleReset} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Enhancement Type Selection */}
        <Box mb={3}>
          <Typography variant="subtitle2" gutterBottom>
            Enhancement Type
          </Typography>
          <ButtonGroup fullWidth variant="outlined" size="small">
            <Button
              variant={config.type === 'style_transfer' ? 'contained' : 'outlined'}
              onClick={() => handleTypeChange('style_transfer')}
            >
              Style Transfer
            </Button>
            <Button
              variant={config.type === 'super_resolution' ? 'contained' : 'outlined'}
              onClick={() => handleTypeChange('super_resolution')}
            >
              Super Resolution
            </Button>
            <Button
              variant={config.type === 'interpolation' ? 'contained' : 'outlined'}
              onClick={() => handleTypeChange('interpolation')}
            >
              Interpolation
            </Button>
            <Button
              variant={config.type === 'quality_optimizer' ? 'contained' : 'outlined'}
              onClick={() => handleTypeChange('quality_optimizer')}
            >
              Auto Optimize
            </Button>
          </ButtonGroup>
        </Box>

        {/* Strength Slider */}
        <Box mb={3}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="subtitle2">
              Strength
            </Typography>
            <Chip label={`${Math.round(config.strength * 100)}%`} size="small" />
          </Stack>
          <Slider
            value={config.strength}
            onChange={handleStrengthChange}
            min={0}
            max={1}
            step={0.05}
            marks={[
              { value: 0, label: 'Subtle' },
              { value: 0.5, label: 'Balanced' },
              { value: 1, label: 'Strong' }
            ]}
            disabled={status.isProcessing}
          />
        </Box>

        {/* Quality Level Selection */}
        <Box mb={3}>
          <Typography variant="subtitle2" gutterBottom>
            Quality Level
          </Typography>
          <ButtonGroup fullWidth variant="outlined" size="small">
            <Button
              variant={config.quality === 'preview' ? 'contained' : 'outlined'}
              onClick={() => handleQualityChange('preview')}
            >
              Preview
            </Button>
            <Button
              variant={config.quality === 'standard' ? 'contained' : 'outlined'}
              onClick={() => handleQualityChange('standard')}
            >
              Standard
            </Button>
            <Button
              variant={config.quality === 'high' ? 'contained' : 'outlined'}
              onClick={() => handleQualityChange('high')}
            >
              High
            </Button>
            <Button
              variant={config.quality === 'maximum' ? 'contained' : 'outlined'}
              onClick={() => handleQualityChange('maximum')}
            >
              Maximum
            </Button>
          </ButtonGroup>
        </Box>

        {/* Progress Indicator */}
        {status.isProcessing && (
          <Box mb={3}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="body2" color="text.secondary">
                {status.currentOperation}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ETA: {formatETA(status.eta)}
              </Typography>
            </Stack>
            <LinearProgress variant="determinate" value={status.progress} />
          </Box>
        )}

        {/* Action Buttons */}
        <Stack direction="row" spacing={2} justifyContent="space-between">
          <Stack direction="row" spacing={1}>
            <Tooltip title="Undo last change">
              <span>
                <IconButton
                  onClick={onUndo}
                  disabled={!canUndo || status.isProcessing}
                  size="small"
                >
                  <UndoIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Redo last change">
              <span>
                <IconButton
                  onClick={onRedo}
                  disabled={!canRedo || status.isProcessing}
                  size="small"
                >
                  <RedoIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>

          <Button
            variant="contained"
            startIcon={<AutoFixIcon />}
            onClick={handleApply}
            disabled={status.isProcessing}
            size="large"
          >
            {status.isProcessing ? 'Processing...' : 'Apply Enhancement'}
          </Button>
        </Stack>

        {/* Info Footer */}
        <Box mt={2} p={1} bgcolor="action.hover" borderRadius={1}>
          <Stack direction="row" spacing={1} alignItems="center">
            <InfoIcon fontSize="small" color="action" />
            <Typography variant="caption" color="text.secondary">
              Changes are applied in real-time. Use undo/redo to navigate through your edits.
            </Typography>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
};

export default AIEnhancementControls;
