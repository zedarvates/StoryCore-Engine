/**
 * EpisodeReferenceDialog Storybook Stories
 * 
 * Stories for the EpisodeReferenceDialog component which handles
 * episode references and continuity management.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { EpisodeReferenceDialog } from './EpisodeReferenceDialog';
import type { PreviousEpisodeReference } from '../../types/reference';

// ============================================================================
// Mock Data
// ============================================================================

const mockReferences: PreviousEpisodeReference[] = [
  {
    episodeId: 'ep_1',
    episodeName: 'Episode 1: The Beginning',
    referenceShotIds: ['shot_10'],
    continuityNotes: ['Character appearance consistent', 'Location matches previous episode'],
  },
  {
    episodeId: 'ep_2',
    episodeName: 'Episode 2: The Journey',
    referenceShotIds: ['shot_3', 'shot_15'],
    continuityNotes: ['Visual style matches', 'Character outfit change explained'],
  },
  {
    episodeId: 'ep_3',
    episodeName: 'Episode 3: The Confrontation',
    referenceShotIds: ['shot_1', 'shot_2', 'shot_8'],
    continuityNotes: ['Battle damage accumulates', 'Weather conditions match'],
  },
];

// ============================================================================
// Storybook Configuration
// ============================================================================

const meta = {
  title: 'Reference/EpisodeReferenceDialog',
  component: EpisodeReferenceDialog,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'UI component for managing episode references and continuity.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    open: {
      control: 'boolean',
      description: 'Controls whether the dialog is open',
    },
    currentProjectId: {
      control: 'text',
      description: 'The ID of the current project',
    },
    currentEpisodeId: {
      control: 'text',
      description: 'The ID of the current episode',
    },
    currentSequenceId: {
      control: 'text',
      description: 'The ID of the current sequence',
    },
    onClose: {
      action: 'closed',
      description: 'Callback when dialog is closed',
    },
    onReferenceAdded: {
      action: 'reference-added',
      description: 'Callback when a reference is added',
    },
    onReferenceRemoved: {
      action: 'reference-removed',
      description: 'Callback when a reference is removed',
    },
  },
  args: {
    open: true,
    currentProjectId: 'project_1',
    currentEpisodeId: 'ep_4',
    currentSequenceId: 'seq_1',
    onClose: () => console.log('Dialog closed'),
    onReferenceAdded: (reference) => console.log('Reference added:', reference),
    onReferenceRemoved: (episodeId) => console.log('Reference removed:', episodeId),
  },
} satisfies Meta<typeof EpisodeReferenceDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// Stories
// ============================================================================

/**
 * Default story showing the Add Reference tab
 */
export const Default: Story = {
  name: 'Add Reference Tab',
  args: {
    open: true,
    currentProjectId: 'project_1',
    currentEpisodeId: 'ep_4',
    currentSequenceId: 'seq_1',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '80vh' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Story showing the Existing References tab
 */
export const ExistingReferencesTab: Story = {
  name: 'Existing References Tab',
  args: {
    open: true,
    currentProjectId: 'project_1',
    currentEpisodeId: 'ep_4',
    currentSequenceId: 'seq_1',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '80vh' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Story showing the Continuity Check tab
 */
export const ContinuityCheckTab: Story = {
  name: 'Continuity Check Tab',
  args: {
    open: true,
    currentProjectId: 'project_1',
    currentEpisodeId: 'ep_4',
    currentSequenceId: 'seq_1',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '80vh' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Story with episode selected
 */
export const WithEpisodeSelected: Story = {
  name: 'With Episode Selected',
  args: {
    open: true,
    currentProjectId: 'project_1',
    currentEpisodeId: 'ep_4',
    currentSequenceId: 'seq_1',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '80vh' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Story with shots selected
 */
export const WithShotsSelected: Story = {
  name: 'With Shots Selected',
  args: {
    open: true,
    currentProjectId: 'project_1',
    currentEpisodeId: 'ep_4',
    currentSequenceId: 'seq_1',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '80vh' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Story with continuity notes added
 */
export const WithContinuityNotes: Story = {
  name: 'With Continuity Notes',
  args: {
    open: true,
    currentProjectId: 'project_1',
    currentEpisodeId: 'ep_4',
    currentSequenceId: 'seq_1',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '80vh' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Story with all auto-link options enabled
 */
export const AllAutoLinkOptions: Story = {
  name: 'All Auto-Link Options',
  args: {
    open: true,
    currentProjectId: 'project_1',
    currentEpisodeId: 'ep_4',
    currentSequenceId: 'seq_1',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '80vh' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Story with multiple existing references
 */
export const MultipleReferences: Story = {
  name: 'Multiple Existing References',
  args: {
    open: true,
    currentProjectId: 'project_1',
    currentEpisodeId: 'ep_5',
    currentSequenceId: 'seq_1',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '80vh' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Story with no references
 */
export const NoReferences: Story = {
  name: 'No Existing References',
  args: {
    open: true,
    currentProjectId: 'project_1',
    currentEpisodeId: 'ep_new',
    currentSequenceId: 'seq_1',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '80vh' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Story with search query
 */
export const WithSearchQuery: Story = {
  name: 'With Search Query',
  args: {
    open: true,
    currentProjectId: 'project_1',
    currentEpisodeId: 'ep_4',
    currentSequenceId: 'seq_1',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '80vh' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Story with many shots to reference
 */
export const ManyShots: Story = {
  name: 'Many Shots Available',
  args: {
    open: true,
    currentProjectId: 'project_1',
    currentEpisodeId: 'ep_4',
    currentSequenceId: 'seq_1',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '80vh' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Story showing ready to add state
 */
export const ReadyToAdd: Story = {
  name: 'Ready to Add Reference',
  args: {
    open: true,
    currentProjectId: 'project_1',
    currentEpisodeId: 'ep_4',
    currentSequenceId: 'seq_1',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '80vh' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Story with all continuity checks passing
 */
export const AllChecksPassing: Story = {
  name: 'All Continuity Checks Passing',
  args: {
    open: true,
    currentProjectId: 'project_1',
    currentEpisodeId: 'ep_4',
    currentSequenceId: 'seq_1',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '80vh' }}>
        <Story />
      </div>
    ),
  ],
};
