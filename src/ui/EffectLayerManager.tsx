/**
 * Effect Layer Manager
 * 
 * Manages multiple AI enhancement layers with individual controls.
 * Supports drag & drop reordering, opacity control, and blend modes.
 * 
 * Features:
 * - Layer reordering via drag & drop
 * - Individual layer enable/disable
 * - Opacity control per layer
 * - Blend mode selection
 * - Layer preview
 * 
 * @module EffectLayerManager
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Chip,
  Tooltip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  DragIndicator as DragIcon,
  Visibility as VisibleIcon,
  VisibilityOff as HiddenIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  ContentCopy as DuplicateIcon,
  Layers as LayersIcon,
  Opacity as OpacityIcon
} from '@mui/icons-material';

/**
 * Blend modes for layer composition
 */
type BlendMode = 
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion';

/**
 * Effect layer definition
 */
interface EffectLayer {
  id: string;
  name: string;
  type: 'style_transfer' | 'super_resolution' | 'interpolation' | 'quality_optimizer';
  enabled: boolean;
  opacity: number; // 0-1
  blendMode: BlendMode;
  config: Record<string, any>;
  thumbnail?: string;
  createdAt: number;
}

/**
 * Props for EffectLayerManager
 */
interface EffectLayerManagerProps {
  layers: EffectLayer[];
  onLayersChange: (layers: EffectLayer[]) => void;
  onAddLayer: () => void;
  maxLayers?: number;
}

/**
 * Effect Layer Manager Component
 */
export const EffectLayerManager: React.FC<EffectLayerManagerProps> = ({
  layers,
  onLayersChange,
  onAddLayer,
  maxLayers = 10
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [layerToDelete, setLayerToDelete] = useState<string | null>(null);

  /**
   * Handle layer reordering
   */
  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newLayers = [...layers];
    const draggedLayer = newLayers[draggedIndex];
    newLayers.splice(draggedIndex, 1);
    newLayers.splice(index, 0, draggedLayer);

    onLayersChange(newLayers);
    setDraggedIndex(index);
  }, [draggedIndex, layers, onLayersChange]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  /**
   * Handle layer visibility toggle
   */
  const handleToggleVisibility = useCallback((layerId: string) => {
    const newLayers = layers.map(layer =>
      layer.id === layerId ? { ...layer, enabled: !layer.enabled } : layer
    );
    onLayersChange(newLayers);
  }, [layers, onLayersChange]);

  /**
   * Handle opacity change
   */
  const handleOpacityChange = useCallback((layerId: string, opacity: number) => {
    const newLayers = layers.map(layer =>
      layer.id === layerId ? { ...layer, opacity } : layer
    );
    onLayersChange(newLayers);
  }, [layers, onLayersChange]);

  /**
   * Handle blend mode change
   */
  const handleBlendModeChange = useCallback((layerId: string, blendMode: BlendMode) => {
    const newLayers = layers.map(layer =>
      layer.id === layerId ? { ...layer, blendMode } : layer
    );
    onLayersChange(newLayers);
  }, [layers, onLayersChange]);

  /**
   * Handle layer deletion
   */
  const handleDeleteLayer = useCallback((layerId: string) => {
    setLayerToDelete(layerId);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (layerToDelete) {
      const newLayers = layers.filter(layer => layer.id !== layerToDelete);
      onLayersChange(newLayers);
    }
    setDeleteDialogOpen(false);
    setLayerToDelete(null);
  }, [layerToDelete, layers, onLayersChange]);

  /**
   * Handle layer duplication
   */
  const handleDuplicateLayer = useCallback((layerId: string) => {
    const layerToDuplicate = layers.find(l => l.id === layerId);
    if (!layerToDuplicate) return;

    const newLayer: EffectLayer = {
      ...layerToDuplicate,
      id: `layer-${Date.now()}`,
      name: `${layerToDuplicate.name} (Copy)`,
      createdAt: Date.now()
    };

    const layerIndex = layers.findIndex(l => l.id === layerId);
    const newLayers = [...layers];
    newLayers.splice(layerIndex + 1, 0, newLayer);
    onLayersChange(newLayers);
  }, [layers, onLayersChange]);

  /**
   * Get layer type icon
   */
  const getLayerTypeLabel = (type: EffectLayer['type']): string => {
    switch (type) {
      case 'style_transfer': return 'Style';
      case 'super_resolution': return 'Upscale';
      case 'interpolation': return 'Interpolate';
      case 'quality_optimizer': return 'Optimize';
    }
  };

  return (
    <Card elevation={2}>
      <CardContent>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <LayersIcon color="primary" />
            <Typography variant="h6">
              Effect Layers
            </Typography>
            <Chip
              label={`${layers.length}/${maxLayers}`}
              size="small"
              color={layers.length >= maxLayers ? 'warning' : 'default'}
            />
          </Stack>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={onAddLayer}
            disabled={layers.length >= maxLayers}
          >
            Add Layer
          </Button>
        </Stack>

        {/* Empty State */}
        {layers.length === 0 && (
          <Box
            p={4}
            textAlign="center"
            bgcolor="action.hover"
            borderRadius={1}
          >
            <LayersIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body1" color="text.secondary" gutterBottom>
              No layers yet
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Add your first enhancement layer to get started
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={onAddLayer}
            >
              Add First Layer
            </Button>
          </Box>
        )}

        {/* Layer List */}
        {layers.length > 0 && (
          <List sx={{ bgcolor: 'background.paper' }}>
            {layers.map((layer, index) => (
              <React.Fragment key={layer.id}>
                <ListItem
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  sx={{
                    cursor: 'grab',
                    bgcolor: draggedIndex === index ? 'action.hover' : 'transparent',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                    '&:active': {
                      cursor: 'grabbing'
                    }
                  }}
                >
                  {/* Drag Handle */}
                  <ListItemIcon>
                    <DragIcon color="action" />
                  </ListItemIcon>

                  {/* Layer Info */}
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body1">
                          {layer.name}
                        </Typography>
                        <Chip
                          label={getLayerTypeLabel(layer.type)}
                          size="small"
                          variant="outlined"
                        />
                      </Stack>
                    }
                    secondary={
                      <Box mt={1}>
                        {/* Opacity Slider */}
                        <Stack direction="row" spacing={2} alignItems="center" mb={1}>
                          <OpacityIcon fontSize="small" color="action" />
                          <Slider
                            value={layer.opacity}
                            onChange={(_, value) => handleOpacityChange(layer.id, value as number)}
                            min={0}
                            max={1}
                            step={0.05}
                            size="small"
                            sx={{ flexGrow: 1 }}
                            disabled={!layer.enabled}
                          />
                          <Typography variant="caption" sx={{ minWidth: 40 }}>
                            {Math.round(layer.opacity * 100)}%
                          </Typography>
                        </Stack>

                        {/* Blend Mode */}
                        <FormControl size="small" fullWidth>
                          <InputLabel>Blend Mode</InputLabel>
                          <Select
                            value={layer.blendMode}
                            label="Blend Mode"
                            onChange={(e) => handleBlendModeChange(layer.id, e.target.value as BlendMode)}
                            disabled={!layer.enabled}
                          >
                            <MenuItem value="normal">Normal</MenuItem>
                            <MenuItem value="multiply">Multiply</MenuItem>
                            <MenuItem value="screen">Screen</MenuItem>
                            <MenuItem value="overlay">Overlay</MenuItem>
                            <MenuItem value="darken">Darken</MenuItem>
                            <MenuItem value="lighten">Lighten</MenuItem>
                            <MenuItem value="color-dodge">Color Dodge</MenuItem>
                            <MenuItem value="color-burn">Color Burn</MenuItem>
                            <MenuItem value="hard-light">Hard Light</MenuItem>
                            <MenuItem value="soft-light">Soft Light</MenuItem>
                            <MenuItem value="difference">Difference</MenuItem>
                            <MenuItem value="exclusion">Exclusion</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                    }
                  />

                  {/* Layer Actions */}
                  <ListItemSecondaryAction>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title={layer.enabled ? 'Hide layer' : 'Show layer'}>
                        <IconButton
                          size="small"
                          onClick={() => handleToggleVisibility(layer.id)}
                        >
                          {layer.enabled ? <VisibleIcon /> : <HiddenIcon />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Duplicate layer">
                        <IconButton
                          size="small"
                          onClick={() => handleDuplicateLayer(layer.id)}
                          disabled={layers.length >= maxLayers}
                        >
                          <DuplicateIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete layer">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteLayer(layer.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < layers.length - 1 && <Divider sx={{ my: 1 }} />}
              </React.Fragment>
            ))}
          </List>
        )}

        {/* Info Footer */}
        <Box mt={2} p={1.5} bgcolor="info.lighter" borderRadius={1}>
          <Typography variant="caption" color="text.secondary">
            💡 Drag layers to reorder. Top layers are applied first. Use blend modes to combine effects creatively.
          </Typography>
        </Box>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Layer?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this layer? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default EffectLayerManager;
