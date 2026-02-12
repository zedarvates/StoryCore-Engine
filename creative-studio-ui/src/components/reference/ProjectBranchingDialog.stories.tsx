/**
 * ProjectBranchingDialog Storybook Stories
 * 
 * Stories for the ProjectBranchingDialog component which handles
 * project branching, context export/import, and branch management.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { ProjectBranchingDialog } from './ProjectBranchingDialog';
import type { BranchInfo, ContextScope } from '../../services/projectBranchingService';

// ============================================================================
// Mock Data
// ============================================================================

const mockBranches: BranchInfo[] = [
  {
    id: 'branch_1',
    projectId: 'project_1',
    name: 'Dark Timeline',
    branchPointId: 'shot_5',
    createdAt: new Date('2024-02-01'),
    status: 'active',
  },
  {
    id: 'branch_2',
    projectId: 'project_1',
    name: 'Victory Path',
    branchPointId: 'shot_5',
    createdAt: new Date('2024-02-05'),
    status: 'active',
  },
  {
    id: 'branch_3',
    projectId: 'project_1',
    name: 'Alternate Ending',
    branchPointId: 'shot_10',
    createdAt: new Date('2024-03-01'),
    status: 'archived',
  },
];

// ============================================================================
// Storybook Configuration
// ============================================================================

const meta = {
  title: 'Reference/ProjectBranchingDialog',
  component: ProjectBranchingDialog,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'UI component for managing project branching, context export/import, and branch management.',
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
    currentShotId: {
      control: 'text',
      description: 'The ID of the current shot (branching point)',
    },
    onClose: {
      action: 'closed',
      description: 'Callback when dialog is closed',
    },
    onBranchCreated: {
      action: 'branch-created',
      description: 'Callback when a new branch is created',
    },
    onContextImported: {
      action: 'context-imported',
      description: 'Callback when context is imported',
    },
  },
  args: {
    open: true,
    currentProjectId: 'project_1',
    currentShotId: 'shot_5',
    onClose: () => console.log('Dialog closed'),
    onBranchCreated: (branchInfo) => console.log('Branch created:', branchInfo),
    onContextImported: (context) => console.log('Context imported:', context),
  },
} satisfies Meta<typeof ProjectBranchingDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// Stories
// ============================================================================

/**
 * Default story showing the Create Branch tab
 */
export const Default: Story = {
  name: 'Create Branch Tab',
  args: {
    open: true,
    currentProjectId: 'project_1',
    currentShotId: 'shot_5',
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
 * Story showing the Import Context tab
 */
export const ImportContextTab: Story = {
  name: 'Import Context Tab',
  args: {
    open: true,
    currentProjectId: 'project_1',
    currentShotId: 'shot_5',
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
 * Story showing the Branch History tab
 */
export const BranchHistoryTab: Story = {
  name: 'Branch History Tab',
  args: {
    open: true,
    currentProjectId: 'project_1',
    currentShotId: 'shot_5',
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
 * Story with no current shot (project-level branching)
 */
export const ProjectLevelBranching: Story = {
  name: 'Project-Level Branching',
  args: {
    open: true,
    currentProjectId: 'project_1',
    currentShotId: undefined,
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
 * Story with branch name filled in
 */
export const WithBranchName: Story = {
  name: 'With Branch Name',
  args: {
    open: true,
    currentProjectId: 'project_1',
    currentShotId: 'shot_5',
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
 * Story with description filled in
 */
export const WithDescription: Story = {
  name: 'With Description',
  args: {
    open: true,
    currentProjectId: 'project_1',
    currentShotId: 'shot_5',
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
 * Story with all options selected
 */
export const AllOptionsSelected: Story = {
  name: 'All Options Selected',
  args: {
    open: true,
    currentProjectId: 'project_1',
    currentShotId: 'shot_5',
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
 * Story showing multiple existing branches
 */
export const MultipleBranches: Story = {
  name: 'Multiple Existing Branches',
  args: {
    open: true,
    currentProjectId: 'project_1',
    currentShotId: 'shot_10',
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
 * Story with shot-level scope selected
 */
export const ShotLevelScope: Story = {
  name: 'Shot-Level Scope',
  args: {
    open: true,
    currentProjectId: 'project_1',
    currentShotId: 'shot_5',
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
 * Story with project-level scope selected
 */
export const ProjectLevelScope: Story = {
  name: 'Project-Level Scope',
  args: {
    open: true,
    currentProjectId: 'project_1',
    currentShotId: 'shot_5',
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
 * Story showing archived branches
 */
export const ArchivedBranches: Story = {
  name: 'Archived Branches',
  args: {
    open: true,
    currentProjectId: 'project_1',
    currentShotId: 'shot_5',
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
 * Story with no branches
 */
export const NoBranches: Story = {
  name: 'No Existing Branches',
  args: {
    open: true,
    currentProjectId: 'project_new',
    currentShotId: undefined,
  },
  decorators: [
    (Story) => (
      <div style={{ height: '80vh' }}>
        <Story />
      </div>
    ),
  ],
};
