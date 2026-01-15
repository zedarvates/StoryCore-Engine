/**
 * Style Transfer Controls
 * 
 * Specialized controls for artistic style transfer operations.
 * Provides style selection, intensity adjustment, and temporal consistency options.
 * 
 * @module StyleTransferControls
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Slider,
  FormControlLabel,
  Switch,
  Grid,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  IconButton,
  Chip,
  Stack
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Palette as PaletteIcon
} from '@mui/icons-material';

/**
 * Available artistic styles
 */
interface ArtisticStyle {
  id: string;
  name: string;
  thumbnail: string;
  description: string;
  artist?: string;
}

/**
 * Style transfer configuration
 */
interface StyleTransferConfig {
  styleId: string;
  intensity: number;
  preserveColor: boolean;
  temporalConsistency: boolean;
  contentWeight: number;
}

/**
 * Props for StyleTransferControls
 */
interface StyleTransferControlsProps {
  onConfigChange: (config: StyleTransferConfig) => void;
  initialConfig?: Partial<StyleTransferConfig>;
}

/**
 * Predefined artistic styles
 */
const ARTISTIC_STYLES: ArtisticStyle[] = [
  {
    id: 'monet',
    name: 'Impressionist',
    thumbnail: '/styles/monet.jpg',
    description: 'Soft brushstrokes and light effects',
    artist: 'Claude Monet'
  },
  {
    id: 'vangogh',
    name: 'Post-Impressionist',
    thumbnail: '/styles/vangogh.jpg',
    description: 'Bold colors and expressive brushwork',
    artist: 'Vincent van Gogh'
  },
  {
    id: 'picasso',
    name: 'Cubist',
    thumbnail: '/styles/picasso.jpg',
    description: 'Geometric shapes and abstract forms',
    artist: 'Pablo Picasso'
  },
  {
    id: 'kandinsky',
    name: 'Abstract',
    thumbnail: '/styles/kandinsky.jpg',
    description: 'Non-representational forms and colors',
    artist: 'Wassily Kandinsky'
  },
  {
    id: 'hokusai',
    name: 'Japanese Woodblock',
    thumbnail: '/styles/hokusai.jpg',
    description: 'Traditional Japanese art style',
    artist: 'Katsushika Hokusai'
  },
  {
    id: 'munch',
    name: 'Expressionist',
    thumbnail: '/styles/munch.jpg',
    description: 'Emotional and psychological themes',
    artist: 'Edvard Munch'
  }
];

/**
 * Style Transfer Controls Component
 */
export const StyleTransferControls: React.FC<StyleTransferControlsProps> = ({
  onConfigChange,
  initialConfig = {}
}) => {
  const [config, setConfig] = useState<StyleTransferConfig>({
    styleId: 'monet',
    intensity: 0.7,
    preserveColor: false,
    temporalConsistency: true,
    contentWeight: 0.5,
    ...initialConfig
  });

  /**
   * Update configuration and notify parent
   */
  const updateConfig = useCallback((updates: Partial<StyleTransferConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onConfigChange(newConfig);
  }, [config, onConfigChange]);

  /**
   * Handle style selection
   */
  const handleStyleSelect = useCallback((styleId: string) => {
    updateConfig({ styleId });
  }, [updateConfig]);

  /**
   * Handle intensity change
   */
  const handleIntensityChange = useCallback((event: Event, value: number | number[]) => {
    updateConfig({ intensity: value as number });
  }, [updateConfig]);

  /**
   * Handle content weight change
   */
  const handleContentWeightChange = useCallback((event: Event, value: number | number[]) => {
    updateConfig({ contentWeight: value as number });
  }, [updateConfig]);

  /**
   * Handle toggle switches
   */
  const handleToggle = useCallback((field: 'preserveColor' | 'temporalConsistency') => {
    updateConfig({ [field]: !config[field] });
  }, [config, updateConfig]);

  return (
    <Card elevation={2}>
      <CardContent>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={1} mb={3}>
          <PaletteIcon color="primary" />
          <Typography variant="h6">
            Style Transfer Settings
          </Typography>
        </Stack>

        {/* Style Selection Grid */}
        <Box mb={3}>
          <Typography variant="subtitle2" gutterBottom>
            Select Artistic Style
          </Typography>
          <ImageList cols={3} gap={8} sx={{ maxHeight: 300 }}>
            {ARTISTIC_STYLES.map((style) => (
              <ImageListItem
                key={style.id}
                sx={{
                  cursor: 'pointer',
                  border: config.styleId === style.id ? 3 : 1,
                  borderColor: config.styleId === style.id ? 'primary.main' : 'divider',
                  borderRadius: 1,
                  overflow: 'hidden',
                  position: 'relative',
                  '&:hover': {
                    borderColor: 'primary.light',
                    transform: 'scale(1.05)',
                    transition: 'all 0.2s'
                  }
                }}
                onClick={() => handleStyleSelect(style.id)}
              >
                {/* Placeholder for style thumbnail */}
                <Box
                  sx={{
                    width: '100%',
                    height: 120,
                    bgcolor: 'grey.300',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <PaletteIcon sx={{ fontSize: 40, color: 'grey.500' }} />
                </Box>
                <ImageListItemBar
                  title={style.name}
                  subtitle={style.artist}
                  actionIcon={
                    config.styleId === style.id ? (
                      <IconButton sx={{ color: 'primary.main' }}>
                        <CheckIcon />
                      </IconButton>
                    ) : null
                  }
                />
              </ImageListItem>
            ))}
          </ImageList>
        </Box>

        {/* Selected Style Info */}
        {config.styleId && (
          <Box mb={3} p={2} bgcolor="action.hover" borderRadius={1}>
            <Typography variant="body2" color="text.secondary">
              {ARTISTIC_STYLES.find(s => s.id === config.styleId)?.description}
            </Typography>
          </Box>
        )}

        {/* Intensity Slider */}
        <Box mb={3}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="subtitle2">
              Style Intensity
            </Typography>
            <Chip label={`${Math.round(config.intensity * 100)}%`} size="small" />
          </Stack>
          <Slider
            value={config.intensity}
            onChange={handleIntensityChange}
            min={0}
            max={1}
            step={0.05}
            marks={[
              { value: 0, label: 'Subtle' },
              { value: 0.5, label: 'Balanced' },
              { value: 1, label: 'Strong' }
            ]}
          />
          <Typography variant="caption" color="text.secondary">
            Controls how strongly the artistic style is applied
          </Typography>
        </Box>

        {/* Content Weight Slider */}
        <Box mb={3}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="subtitle2">
              Content Preservation
            </Typography>
            <Chip label={`${Math.round(config.contentWeight * 100)}%`} size="small" />
          </Stack>
          <Slider
            value={config.contentWeight}
            onChange={handleContentWeightChange}
            min={0}
            max={1}
            step={0.05}
            marks={[
              { value: 0, label: 'Style' },
              { value: 0.5, label: 'Balanced' },
              { value: 1, label: 'Content' }
            ]}
          />
          <Typography variant="caption" color="text.secondary">
            Balance between preserving original content and applying style
          </Typography>
        </Box>

        {/* Advanced Options */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Advanced Options
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.preserveColor}
                    onChange={() => handleToggle('preserveColor')}
                  />
                }
                label="Preserve Original Colors"
              />
              <Typography variant="caption" display="block" color="text.secondary" ml={4}>
                Keep original colors while applying style patterns
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.temporalConsistency}
                    onChange={() => handleToggle('temporalConsistency')}
                  />
                }
                label="Temporal Consistency (Video)"
              />
              <Typography variant="caption" display="block" color="text.secondary" ml={4}>
                Maintain consistent style across video frames
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StyleTransferControls;
