/**
 * AI Progress Indicator
 * 
 * Displays real-time progress for AI enhancement operations with detailed status information.
 * Provides ETA, current operation details, and visual feedback.
 * 
 * @module AIProgressIndicator
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  CircularProgress,
  Stack,
  Chip,
  Alert,
  Collapse,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Memory as GPUIcon,
  Speed as SpeedIcon,
  Timer as TimerIcon
} from '@mui/icons-material';

/**
 * Processing stage information
 */
interface ProcessingStage {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  progress: number;
  startTime?: number;
  endTime?: number;
  error?: string;
}

/**
 * Resource usage information
 */
interface ResourceUsage {
  gpuUtilization: number;
  gpuMemory: number;
  cpuUtilization: number;
  processingSpeed: number; // frames per second
}

/**
 * Props for AIProgressIndicator
 */
interface AIProgressIndicatorProps {
  isProcessing: boolean;
  overallProgress: number;
  currentStage?: string;
  eta?: number; // seconds
  stages?: ProcessingStage[];
  resourceUsage?: ResourceUsage;
  onCancel?: () => void;
  showDetails?: boolean;
}

/**
 * AI Progress Indicator Component
 */
export const AIProgressIndicator: React.FC<AIProgressIndicatorProps> = ({
  isProcessing,
  overallProgress,
  currentStage = 'Initializing...',
  eta = 0,
  stages = [],
  resourceUsage,
  onCancel,
  showDetails = false
}) => {
  const [expanded, setExpanded] = useState(showDetails);
  const [elapsedTime, setElapsedTime] = useState(0);

  /**
   * Track elapsed time
   */
  useEffect(() => {
    if (!isProcessing) {
      setElapsedTime(0);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isProcessing]);

  /**
   * Format time for display
   */
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  /**
   * Get status icon for stage
   */
  const getStageIcon = (status: ProcessingStage['status']) => {
    switch (status) {
      case 'complete':
        return <CheckIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'processing':
        return <CircularProgress size={20} />;
      default:
        return <CircularProgress size={20} sx={{ opacity: 0.3 }} />;
    }
  };

  /**
   * Calculate stage duration
   */
  const getStageDuration = (stage: ProcessingStage): string => {
    if (!stage.startTime) return '-';
    const endTime = stage.endTime || Date.now();
    const duration = Math.floor((endTime - stage.startTime) / 1000);
    return formatTime(duration);
  };

  if (!isProcessing && overallProgress === 0) {
    return null;
  }

  return (
    <Card elevation={3}>
      <CardContent>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            {isProcessing ? 'Processing...' : 'Complete'}
          </Typography>
          {stages.length > 0 && (
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <CollapseIcon /> : <ExpandIcon />}
            </IconButton>
          )}
        </Stack>

        {/* Overall Progress */}
        <Box mb={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2" color="text.secondary">
              {currentStage}
            </Typography>
            <Chip
              label={`${Math.round(overallProgress)}%`}
              size="small"
              color={overallProgress === 100 ? 'success' : 'primary'}
            />
          </Stack>
          <LinearProgress
            variant="determinate"
            value={overallProgress}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        {/* Time Information */}
        <Stack direction="row" spacing={2} mb={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <TimerIcon fontSize="small" color="action" />
            <Typography variant="caption" color="text.secondary">
              Elapsed: {formatTime(elapsedTime)}
            </Typography>
          </Stack>
          {eta > 0 && (
            <Stack direction="row" spacing={1} alignItems="center">
              <SpeedIcon fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                ETA: {formatTime(eta)}
              </Typography>
            </Stack>
          )}
        </Stack>

        {/* Resource Usage */}
        {resourceUsage && (
          <Box mb={2} p={1.5} bgcolor="action.hover" borderRadius={1}>
            <Typography variant="caption" fontWeight="bold" display="block" mb={1}>
              Resource Usage
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <GPUIcon fontSize="small" />
                  <Typography variant="caption">
                    GPU: {Math.round(resourceUsage.gpuUtilization)}%
                  </Typography>
                </Stack>
              </Box>
              <Box>
                <Typography variant="caption">
                  Memory: {Math.round(resourceUsage.gpuMemory)}MB
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption">
                  CPU: {Math.round(resourceUsage.cpuUtilization)}%
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption">
                  Speed: {resourceUsage.processingSpeed.toFixed(1)} fps
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        {/* Detailed Stages */}
        <Collapse in={expanded}>
          <Box mt={2}>
            <Typography variant="subtitle2" gutterBottom>
              Processing Stages
            </Typography>
            <List dense>
              {stages.map((stage) => (
                <ListItem key={stage.id}>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {getStageIcon(stage.status)}
                  </ListItemIcon>
                  <ListItemText
                    primary={stage.name}
                    secondary={
                      stage.status === 'error'
                        ? stage.error
                        : stage.status === 'complete'
                        ? `Completed in ${getStageDuration(stage)}`
                        : stage.status === 'processing'
                        ? `${Math.round(stage.progress)}%`
                        : 'Pending'
                    }
                    secondaryTypographyProps={{
                      color: stage.status === 'error' ? 'error' : 'text.secondary'
                    }}
                  />
                  {stage.status === 'processing' && (
                    <Box sx={{ width: 60 }}>
                      <LinearProgress
                        variant="determinate"
                        value={stage.progress}
                        sx={{ height: 4 }}
                      />
                    </Box>
                  )}
                </ListItem>
              ))}
            </List>
          </Box>
        </Collapse>

        {/* Error Alert */}
        {stages.some(s => s.status === 'error') && (
          <Alert severity="error" sx={{ mt: 2 }}>
            One or more stages failed. Check details above.
          </Alert>
        )}

        {/* Cancel Button */}
        {isProcessing && onCancel && (
          <Box mt={2}>
            <Button
              variant="outlined"
              color="error"
              fullWidth
              onClick={onCancel}
            >
              Cancel Processing
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default AIProgressIndicator;

