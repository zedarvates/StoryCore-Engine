/**
 * Effect Stack
 * 
 * Visualizes the stack of applied effects with preview and order information.
 * Shows the processing pipeline and allows quick navigation between layers.
 * 
 * Features:
 * - Visual representation of effect stack
 * - Preview of each layer's output
 * - Processing order visualization
 * - Quick layer selection
 * - Performance metrics per layer
 * 
 * @module EffectStack
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Collapse,
  LinearProgress,
  Divider
} from '@mui/material';
import {
  ArrowDownward as ArrowIcon,
  Image as ImageIcon,
  Timer as TimerIcon,
  Memory as MemoryIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Layers as LayersIcon
} from '@mui/icons-material';

/**
 * Effect layer with processing info
 */
interface EffectStackLayer {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  opacity: number;
  blendMode: string;
  processingTime?: number; // milliseconds
  memoryUsage?: number; // MB
  status: 'pending' | 'processing' | 'complete' | 'error';
  error?: string;
  thumbnail?: string;
}

/**
 * Props for EffectStack
 */
interface EffectStackProps {
  layers: EffectStackLayer[];
  selectedLayerId?: string;
  onLayerSelect?: (layerId: string) => void;
  showMetrics?: boolean;
  compact?: boolean;
}

/**
 * Effect Stack Component
 */
export const EffectStack: React.FC<EffectStackProps> = ({
  layers,
  selectedLayerId,
  onLayerSelect,
  showMetrics = true,
  compact = false
}) => {
  const [expanded, setExpanded] = useState(!compact);

  /**
   * Get status icon
   */
  const getStatusIcon = (status: EffectStackLayer['status']) => {
    switch (status) {
      case 'complete':
        return <CheckIcon color="success" fontSize="small" />;
      case 'error':
        return <ErrorIcon color="error" fontSize="small" />;
      case 'processing':
        return <LinearProgress sx={{ width: 20, height: 20 }} />;
      default:
        return null;
    }
  };

  /**
   * Get status color
   */
  const getStatusColor = (status: EffectStackLayer['status']) => {
    switch (status) {
      case 'complete':
        return 'success.light';
      case 'error':
        return 'error.light';
      case 'processing':
        return 'warning.light';
      default:
        return 'action.hover';
    }
  };

  /**
   * Format processing time
   */
  const formatTime = (ms?: number): string => {
    if (!ms) return '-';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  /**
   * Format memory usage
   */
  const formatMemory = (mb?: number): string => {
    if (!mb) return '-';
    if (mb < 1024) return `${Math.round(mb)}MB`;
    return `${(mb / 1024).toFixed(2)}GB`;
  };

  /**
   * Calculate total metrics
   */
  const totalProcessingTime = layers.reduce((sum, layer) => sum + (layer.processingTime || 0), 0);
  const totalMemoryUsage = layers.reduce((sum, layer) => sum + (layer.memoryUsage || 0), 0);
  const completedLayers = layers.filter(l => l.status === 'complete').length;

  return (
    <Card elevation={2}>
      <CardContent>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <LayersIcon color="primary" />
            <Typography variant="h6">
              Effect Stack
            </Typography>
            <Chip
              label={`${completedLayers}/${layers.length}`}
              size="small"
              color={completedLayers === layers.length ? 'success' : 'default'}
            />
          </Stack>
          <IconButton
            size="small"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <CollapseIcon /> : <ExpandIcon />}
          </IconButton>
        </Stack>

        {/* Summary Metrics */}
        {showMetrics && (
          <Box mb={2} p={1.5} bgcolor="action.hover" borderRadius={1}>
            <Stack direction="row" spacing={3} justifyContent="space-around">
              <Stack direction="row" spacing={1} alignItems="center">
                <TimerIcon fontSize="small" color="action" />
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Total Time
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {formatTime(totalProcessingTime)}
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <MemoryIcon fontSize="small" color="action" />
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Memory
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {formatMemory(totalMemoryUsage)}
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <LayersIcon fontSize="small" color="action" />
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Layers
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {layers.length}
                  </Typography>
                </Box>
              </Stack>
            </Stack>
          </Box>
        )}

        {/* Layer Stack Visualization */}
        <Collapse in={expanded}>
          {layers.length === 0 ? (
            <Box p={3} textAlign="center" bgcolor="action.hover" borderRadius={1}>
              <LayersIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No layers in stack
              </Typography>
            </Box>
          ) : (
            <List sx={{ bgcolor: 'background.paper' }}>
              {/* Original Image */}
              <ListItem
                sx={{
                  bgcolor: 'primary.lighter',
                  borderRadius: 1,
                  mb: 1
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <ImageIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary="Original Image"
                  secondary="Starting point"
                />
              </ListItem>

              {/* Processing Arrow */}
              <Box textAlign="center" my={1}>
                <ArrowIcon color="action" />
              </Box>

              {/* Effect Layers */}
              {layers.map((layer, index) => (
                <React.Fragment key={layer.id}>
                  <ListItemButton
                    selected={selectedLayerId === layer.id}
                    onClick={() => onLayerSelect?.(layer.id)}
                    sx={{
                      bgcolor: getStatusColor(layer.status),
                      borderRadius: 1,
                      mb: 1,
                      border: 2,
                      borderColor: selectedLayerId === layer.id ? 'primary.main' : 'transparent'
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        sx={{
                          bgcolor: layer.enabled ? 'primary.main' : 'action.disabled'
                        }}
                      >
                        {index + 1}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2" fontWeight="medium">
                            {layer.name}
                          </Typography>
                          {!layer.enabled && (
                            <Chip label="Disabled" size="small" variant="outlined" />
                          )}
                          {getStatusIcon(layer.status)}
                        </Stack>
                      }
                      secondary={
                        <Box mt={0.5}>
                          <Stack direction="row" spacing={2}>
                            <Typography variant="caption" color="text.secondary">
                              {layer.type}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Opacity: {Math.round(layer.opacity * 100)}%
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {layer.blendMode}
                            </Typography>
                          </Stack>
                          {showMetrics && layer.status === 'complete' && (
                            <Stack direction="row" spacing={2} mt={0.5}>
                              <Typography variant="caption" color="text.secondary">
                                ⏱️ {formatTime(layer.processingTime)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                💾 {formatMemory(layer.memoryUsage)}
                              </Typography>
                            </Stack>
                          )}
                          {layer.status === 'error' && layer.error && (
                            <Typography variant="caption" color="error" display="block" mt={0.5}>
                              Error: {layer.error}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItemButton>

                  {/* Processing Arrow */}
                  {index < layers.length - 1 && (
                    <Box textAlign="center" my={1}>
                      <ArrowIcon color="action" />
                    </Box>
                  )}
                </React.Fragment>
              ))}

              {/* Final Result */}
              {layers.length > 0 && (
                <>
                  <Box textAlign="center" my={1}>
                    <ArrowIcon color="action" />
                  </Box>
                  <ListItem
                    sx={{
                      bgcolor: 'success.lighter',
                      borderRadius: 1
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'success.main' }}>
                        <CheckIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary="Final Result"
                      secondary={`${completedLayers}/${layers.length} layers applied`}
                    />
                  </ListItem>
                </>
              )}
            </List>
          )}
        </Collapse>

        {/* Info Footer */}
        <Box mt={2} p={1} bgcolor="action.hover" borderRadius={1}>
          <Typography variant="caption" color="text.secondary">
            💡 Effects are applied from top to bottom. Click a layer to view details.
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default EffectStack;
