/**
 * StyleTransferPanel Storybook Stories
 * 
 * Stories for the StyleTransferPanel component which handles
 * extracting and applying visual styles between shots.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { StyleTransferPanel } from './StyleTransferPanel';
import type { StyleFeatures, StylePreset, StyleTransferOptions } from '../../services/styleTransferService';

// ============================================================================
// Mock Data
// ============================================================================

const mockStyleFeatures: StyleFeatures = {
  colorPalette: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'],
  lightingStyle: 'soft_natural',
  compositionStyle: 'rule_of_thirds',
  artStyle: 'impressionist',
  mood: 'cheerful',
  textureStyle: 'smooth_detailed',
  contrast: 'medium',
  saturation: 'high',
  temperature: 'neutral',
  dominantColors: [
    { color: '#FF6B6B', percentage: 0.35 },
    { color: '#4ECDC4', percentage: 0.25 },
    { color: '#45B7D1', percentage: 0.20 },
  ],
};

const mockPreset: StylePreset = {
  id: 'preset_1',
  name: 'Sunset Vibes',
  thumbnail: 'https://picsum.photos/seed/preset1/200/150',
  style: {
    ...mockStyleFeatures,
    colorPalette: ['#FF6B6B', '#FFEAA7', '#FD79A8', '#E17055', '#FDCB6E'],
    lightingStyle: 'golden_hour',
    mood: 'romantic',
  },
  createdAt: new Date('2024-02-10'),
};

const mockPreset2: StylePreset = {
  id: 'preset_2',
  name: 'Cyberpunk Night',
  thumbnail: 'https://picsum.photos/seed/preset2/200/150',
  style: {
    ...mockStyleFeatures,
    colorPalette: ['#00D4FF', '#FF00E5', '#1A1A2E', '#00FF87', '#FF006E'],
    lightingStyle: 'neon_lit',
    mood: 'mysterious',
    artStyle: 'digital_art',
  },
  createdAt: new Date('2024-03-05'),
};

const mockPreset3: StylePreset = {
  id: 'preset_3',
  name: 'Vintage Film',
  thumbnail: 'https://picsum.photos/seed/preset3/200/150',
  style: {
    ...mockStyleFeatures,
    colorPalette: ['#D4A574', '#8B7355', '#CD853F', '#DEB887', '#F5DEB3'],
    lightingStyle: 'soft_diffused',
    mood: 'nostalgic',
    artStyle: 'realistic',
    textureStyle: 'film_grain',
  },
  createdAt: new Date('2024-01-20'),
};

const mockPresets: StylePreset[] = [mockPreset, mockPreset2, mockPreset3];

const defaultTransferOptions: StyleTransferOptions = {
  preserveContent: true,
  intensity: 0.8,
  blendWithOriginal: false,
};

// ============================================================================
// Storybook Configuration
// ============================================================================

const meta = {
  title: 'Reference/StyleTransferPanel',
  component: StyleTransferPanel,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'UI component for extracting and applying visual styles between shots.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    currentSequenceId: {
      control: 'text',
      description: 'The ID of the current sequence',
    },
    selectedShotId: {
      control: 'text',
      description: 'The ID of the selected shot',
    },
    onStyleApplied: {
      action: 'style-applied',
      description: 'Callback when style is applied',
    },
    onClose: {
      action: 'closed',
      description: 'Callback when panel is closed',
    },
  },
  args: {
    currentSequenceId: 'sequence_1',
    selectedShotId: 'shot_1',
    onStyleApplied: () => console.log('Style applied'),
    onClose: () => console.log('Panel closed'),
  },
} satisfies Meta<typeof StyleTransferPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// Stories
// ============================================================================

/**
 * Default story showing the transfer tab
 */
export const Default: Story = {
  name: 'Transfer Tab',
  args: {
    currentSequenceId: 'sequence_1',
    selectedShotId: 'shot_1',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '80vh', width: '100%' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Story showing the presets tab
 */
export const PresetsTab: Story = {
  name: 'Presets Tab',
  args: {
    currentSequenceId: 'sequence_1',
    selectedShotId: 'shot_1',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '80vh', width: '100%' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Story showing the compare tab
 */
export const CompareTab: Story = {
  name: 'Compare Tab',
  args: {
    currentSequenceId: 'sequence_1',
    selectedShotId: 'shot_1',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '80vh', width: '100%' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Story with extracted style features
 */
export const ExtractedStyle: Story = {
  name: 'Extracted Style Features',
  args: {
    currentSequenceId: 'sequence_1',
    selectedShotId: 'shot_1',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '80vh', width: '100%' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Story showing style application in progress
 */
export const ApplyingStyle: Story = {
  name: 'Applying Style',
  args: {
    currentSequenceId: 'sequence_1',
    selectedShotId: 'shot_1',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '80vh', width: '100%' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Story with multiple presets
 */
export const MultiplePresets: Story = {
  name: 'Multiple Presets',
  args: {
    currentSequenceId: 'sequence_1',
    selectedShotId: 'shot_1',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '80vh', width: '100%' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Story with no presets available
 */
export const NoPresets: Story = {
  name: 'No Presets Available',
  args: {
    currentSequenceId: 'sequence_1',
    selectedShotId: 'shot_1',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '80vh', width: '100%' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Story with style comparison view
 */
export const StyleComparison: Story = {
  name: 'Style Comparison',
  args: {
    currentSequenceId: 'sequence_1',
    selectedShotId: 'shot_1',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '80vh', width: '100%' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Story for sequence-level style transfer
 */
export const SequenceTransfer: Story = {
  name: 'Sequence-Level Transfer',
  args: {
    currentSequenceId: 'sequence_1',
    selectedShotId: undefined,
  },
  decorators: [
    (Story) => (
      <div style={{ height: '80vh', width: '100%' }}>
        <Story />
      </div>
    ),
  ],
};
