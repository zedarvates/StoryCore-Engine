/**
 * CrossShotReferencePicker Storybook Stories
 * 
 * Stories for the CrossShotReferencePicker component which allows
 * borrowing references from other shots in the sequence.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { CrossShotReferencePicker } from './CrossShotReferencePicker';

// ============================================================================
// Types
// ============================================================================

interface ReferenceItem {
  id: string;
  url: string;
  source: 'character' | 'environment' | 'visual-style';
  sourceId: string;
  sourceName: string;
  shotId: string;
  shotName: string;
  type: 'character' | 'location' | 'style';
}

interface ShotReferenceSummary {
  shotId: string;
  shotName: string;
  thumbnailUrl: string;
  referenceCount: number;
  characterRefs: string[];
  locationRefs: string[];
  styleRefs: string[];
}

// ============================================================================
// Mock Data
// ============================================================================

const mockShotSummaries: ShotReferenceSummary[] = [
  {
    shotId: 'shot_1',
    shotName: 'Opening Scene',
    thumbnailUrl: 'https://picsum.photos/seed/shot1/200/150',
    referenceCount: 5,
    characterRefs: ['char_hero', 'char_villain'],
    locationRefs: ['loc_temple'],
    styleRefs: ['style_anime'],
  },
  {
    shotId: 'shot_2',
    shotName: 'City Chase',
    thumbnailUrl: 'https://picsum.photos/seed/shot2/200/150',
    referenceCount: 8,
    characterRefs: ['char_hero'],
    locationRefs: ['loc_city', 'loc_street'],
    styleRefs: ['style_anime', 'style_action'],
  },
  {
    shotId: 'shot_3',
    shotName: 'Cliffhanger',
    thumbnailUrl: 'https://picsum.photos/seed/shot3/200/150',
    referenceCount: 3,
    characterRefs: ['char_hero', 'char_sidekick'],
    locationRefs: ['loc_cliff'],
    styleRefs: ['style_dramatic'],
  },
  {
    shotId: 'shot_4',
    shotName: 'Flashback',
    thumbnailUrl: 'https://picsum.photos/seed/shot4/200/150',
    referenceCount: 6,
    characterRefs: ['char_young_hero'],
    locationRefs: ['loc_village'],
    styleRefs: ['style_vintage'],
  },
  {
    shotId: 'shot_5',
    shotName: 'Final Battle',
    thumbnailUrl: 'https://picsum.photos/seed/shot5/200/150',
    referenceCount: 10,
    characterRefs: ['char_hero', 'char_villain', 'char_sidekick'],
    locationRefs: ['loc_battlefield'],
    styleRefs: ['style_epic'],
  },
];

const mockReferences: ReferenceItem[] = [
  {
    id: 'ref_1',
    url: 'https://picsum.photos/seed/ref1/400/300',
    source: 'character',
    sourceId: 'char_1',
    sourceName: 'Hero Protagonist',
    shotId: 'shot_1',
    shotName: 'Opening Scene',
    type: 'character',
  },
  {
    id: 'ref_2',
    url: 'https://picsum.photos/seed/ref2/400/300',
    source: 'environment',
    sourceId: 'loc_1',
    sourceName: 'Ancient Temple',
    shotId: 'shot_1',
    shotName: 'Opening Scene',
    type: 'location',
  },
  {
    id: 'ref_3',
    url: 'https://picsum.photos/seed/ref3/400/300',
    source: 'visual-style',
    sourceId: 'style_1',
    sourceName: 'Anime Style',
    shotId: 'shot_2',
    shotName: 'City Chase',
    type: 'style',
  },
  {
    id: 'ref_4',
    url: 'https://picsum.photos/seed/ref4/400/300',
    source: 'character',
    sourceId: 'char_2',
    sourceName: 'Mysterious Villain',
    shotId: 'shot_2',
    shotName: 'City Chase',
    type: 'character',
  },
  {
    id: 'ref_5',
    url: 'https://picsum.photos/seed/ref5/400/300',
    source: 'environment',
    sourceId: 'loc_2',
    sourceName: 'City Street',
    shotId: 'shot_2',
    shotName: 'City Chase',
    type: 'location',
  },
];

// ============================================================================
// Storybook Configuration
// ============================================================================

const meta = {
  title: 'Reference/CrossShotReferencePicker',
  component: CrossShotReferencePicker,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'UI component for borrowing references from other shots in the sequence.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    currentShotId: {
      control: 'text',
      description: 'The ID of the current shot',
    },
    sequenceId: {
      control: 'text',
      description: 'The ID of the sequence',
    },
    onSelect: {
      action: 'references-selected',
      description: 'Callback when references are selected',
    },
    onClose: {
      action: 'closed',
      description: 'Callback when picker is closed',
    },
  },
  args: {
    currentShotId: 'current_shot',
    sequenceId: 'sequence_1',
    onSelect: (references) => console.log('References selected:', references),
    onClose: () => console.log('Picker closed'),
  },
} satisfies Meta<typeof CrossShotReferencePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// Stories
// ============================================================================

/**
 * Default story showing the picker with all shots
 */
export const Default: Story = {
  name: 'Default View',
  args: {
    currentShotId: 'current_shot',
    sequenceId: 'sequence_1',
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
 * Story showing filtered by characters
 */
export const FilteredByCharacters: Story = {
  name: 'Filtered by Characters',
  args: {
    currentShotId: 'current_shot',
    sequenceId: 'sequence_1',
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
 * Story showing filtered by locations
 */
export const FilteredByLocations: Story = {
  name: 'Filtered by Locations',
  args: {
    currentShotId: 'current_shot',
    sequenceId: 'sequence_1',
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
 * Story showing filtered by styles
 */
export const FilteredByStyles: Story = {
  name: 'Filtered by Styles',
  args: {
    currentShotId: 'current_shot',
    sequenceId: 'sequence_1',
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
 * Story with search query
 */
export const WithSearchQuery: Story = {
  name: 'With Search Query',
  args: {
    currentShotId: 'current_shot',
    sequenceId: 'sequence_1',
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
 * Story with multiple references selected
 */
export const MultipleSelections: Story = {
  name: 'Multiple Selections',
  args: {
    currentShotId: 'current_shot',
    sequenceId: 'sequence_1',
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
 * Story with expanded shot view
 */
export const ExpandedShotView: Story = {
  name: 'Expanded Shot View',
  args: {
    currentShotId: 'current_shot',
    sequenceId: 'sequence_1',
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
 * Story showing reference preview
 */
export const WithReferencePreview: Story = {
  name: 'With Reference Preview',
  args: {
    currentShotId: 'current_shot',
    sequenceId: 'sequence_1',
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
 * Story with many shots in sequence
 */
export const ManyShots: Story = {
  name: 'Many Shots in Sequence',
  args: {
    currentShotId: 'current_shot',
    sequenceId: 'sequence_1',
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
 * Story with no other shots (only current shot)
 */
export const NoOtherShots: Story = {
  name: 'No Other Shots',
  args: {
    currentShotId: 'current_shot',
    sequenceId: 'sequence_1',
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
 * Story in loading state
 */
export const Loading: Story = {
  name: 'Loading State',
  args: {
    currentShotId: 'current_shot',
    sequenceId: 'sequence_1',
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
 * Story showing error state
 */
export const Error: Story = {
  name: 'Error State',
  args: {
    currentShotId: 'current_shot',
    sequenceId: 'sequence_1',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '80vh', width: '100%' }}>
        <Story />
      </div>
    ),
  ],
};
