/**
 * ReferenceSheetManager Storybook Stories
 * 
 * Stories for the ReferenceSheetManager component which manages
 * master reference sheets, character appearances, and location appearances.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { ReferenceSheetManager } from './ReferenceSheetManager';
import type { 
  MasterReferenceSheet, 
  CharacterAppearanceSheet, 
  LocationAppearanceSheet,
  GlobalStyleSheet,
  AppearanceImage,
} from '../../types/reference';

// ============================================================================
// Mock Data
// ============================================================================

const mockAppearanceImage: AppearanceImage = {
  id: 'img_1',
  url: 'https://picsum.photos/seed/hero1/200/300',
  viewType: 'portrait',
  description: 'Front view',
};

const mockCharacter1: CharacterAppearanceSheet = {
  id: 'char_1',
  characterId: 'char_def_1',
  characterName: 'Hero Protagonist',
  appearanceImages: [
    mockAppearanceImage,
    { id: 'img_2', url: 'https://picsum.photos/seed/hero2/200/300', viewType: 'side', description: 'Side view' },
    { id: 'img_3', url: 'https://picsum.photos/seed/hero3/200/300', viewType: 'portrait', description: 'Action pose' },
  ],
  styleGuidelines: ['Blue spiky hair', 'Red jacket', 'Scar on left cheek', 'Green eyes'],
  colorPalette: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B'],
  proportions: 'anime standard',
};

const mockCharacter2: CharacterAppearanceSheet = {
  id: 'char_2',
  characterId: 'char_def_2',
  characterName: 'Mysterious Villain',
  appearanceImages: [
    { id: 'img_4', url: 'https://picsum.photos/seed/villain1/200/300', viewType: 'portrait', description: 'Front view' },
  ],
  styleGuidelines: ['Black hooded cloak', 'Silver mask', 'Red eyes'],
  colorPalette: ['#1F2937', '#9CA3AF', '#DC2626'],
  proportions: 'anime standard',
};

const mockLocation1: LocationAppearanceSheet = {
  id: 'loc_1',
  locationId: 'loc_def_1',
  locationName: 'Ancient Temple',
  referenceImages: [
    { id: 'loc_img_1', url: 'https://picsum.photos/seed/temple1/400/300', weight: 0.8, source: 'environment' },
    { id: 'loc_img_2', url: 'https://picsum.photos/seed/temple2/400/300', weight: 0.7, source: 'environment' },
  ],
  environmentalGuidelines: ['Moss-covered stone', 'Mysterious glow', 'Vertical structures'],
};

const mockLocation2: LocationAppearanceSheet = {
  id: 'loc_2',
  locationId: 'loc_def_2',
  locationName: 'City Street',
  referenceImages: [
    { id: 'loc_img_3', url: 'https://picsum.photos/seed/city1/400/300', weight: 0.8, source: 'environment' },
  ],
  environmentalGuidelines: ['Neon lights', 'Rain-wet pavement', 'Cyberpunk architecture'],
};

const mockGlobalStyle: GlobalStyleSheet = {
  id: 'style_1',
  styleName: 'Cyberpunk Anime',
  artStyle: 'Anime',
  colorPalette: ['#00D4FF', '#FF00E5', '#1A1A2E', '#16213E'],
  lightingStyle: 'Neon-lit',
  compositionGuidelines: ['Dynamic angles', 'Depth of field', 'City silhouettes'],
  moodBoard: [],
};

const mockMasterSheet: MasterReferenceSheet = {
  id: 'master_1',
  projectId: 'project_1',
  characterSheets: [mockCharacter1, mockCharacter2],
  locationSheets: [mockLocation1, mockLocation2],
  styleSheet: mockGlobalStyle,
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-03-20'),
};

// ============================================================================
// Storybook Configuration
// ============================================================================

const meta = {
  title: 'Reference/ReferenceSheetManager',
  component: ReferenceSheetManager,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'UI component for managing master reference sheets, character appearances, and location appearances.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    open: {
      control: 'boolean',
      description: 'Controls whether the dialog is open',
    },
    projectId: {
      control: 'text',
      description: 'The ID of the current project',
    },
    projectPath: {
      control: 'text',
      description: 'Optional path to the project directory',
    },
    onClose: {
      action: 'closed',
      description: 'Callback when the dialog is closed',
    },
    onSheetUpdate: {
      action: 'sheet-updated',
      description: 'Callback when a sheet is updated',
    },
  },
  args: {
    open: true,
    onClose: () => console.log('Dialog closed'),
    onSheetUpdate: (sheetId: string) => console.log('Sheet updated:', sheetId),
  },
} satisfies Meta<typeof ReferenceSheetManager>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// Stories
// ============================================================================

/**
 * Default story showing the ReferenceSheetManager with populated data
 */
export const Default: Story = {
  name: 'Default - Populated',
  args: {
    open: true,
    projectId: 'project_1',
    projectPath: '/path/to/project',
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
 * Story showing empty state with no reference sheets
 */
export const Empty: Story = {
  name: 'Empty State',
  args: {
    open: true,
    projectId: 'project_empty',
    projectPath: '/path/to/empty/project',
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
 * Story showing the loading state
 */
export const Loading: Story = {
  name: 'Loading State',
  args: {
    open: true,
    projectId: 'project_loading',
    projectPath: '/path/to/project',
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
 * Story showing error state
 */
export const Error: Story = {
  name: 'Error State',
  args: {
    open: true,
    projectId: 'project_error',
    projectPath: '/path/to/error/project',
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
 * Story showing the Style tab
 */
export const StyleTab: Story = {
  name: 'Style Tab',
  args: {
    open: true,
    projectId: 'project_1',
    projectPath: '/path/to/project',
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
 * Story showing Overview tab
 */
export const OverviewTab: Story = {
  name: 'Overview Tab',
  args: {
    open: true,
    projectId: 'project_1',
    projectPath: '/path/to/project',
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
 * Story with many characters and locations
 */
export const ComplexProject: Story = {
  name: 'Complex Project',
  args: {
    open: true,
    projectId: 'project_complex',
    projectPath: '/path/to/complex/project',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '80vh' }}>
        <Story />
      </div>
    ),
  ],
};
