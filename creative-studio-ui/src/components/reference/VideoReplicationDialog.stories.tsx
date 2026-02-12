/**
 * VideoReplicationDialog Storybook Stories
 * 
 * Stories for the VideoReplicationDialog component which handles
 * uploading reference videos and configuring replication settings.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { VideoReplicationDialog } from './VideoReplicationDialog';
import type { ReferenceVideo, ShotInfo, DigitalHumanAnalysis, VideoStructureAnalysis } from '../../services/videoReplicationService';

// ============================================================================
// Mock Data
// ============================================================================

const mockShots: ShotInfo[] = [
  {
    id: 'shot_1',
    startTime: 0,
    endTime: 5,
    duration: 5,
    composition: {
      ruleOfThirds: true,
      centerComposition: false,
      leadingLines: [],
      framing: 'wide',
      aspectRatio: '16:9',
    },
    cameraMovement: 'static',
  },
  {
    id: 'shot_2',
    startTime: 5,
    endTime: 12,
    duration: 7,
    composition: {
      ruleOfThirds: false,
      centerComposition: true,
      leadingLines: [],
      framing: 'medium',
      aspectRatio: '16:9',
    },
    cameraMovement: 'pan_left',
  },
  {
    id: 'shot_3',
    startTime: 12,
    endTime: 18,
    duration: 6,
    composition: {
      ruleOfThirds: true,
      centerComposition: false,
      leadingLines: [],
      framing: 'close-up',
      aspectRatio: '16:9',
    },
    cameraMovement: 'static',
  },
  {
    id: 'shot_4',
    startTime: 18,
    endTime: 25,
    duration: 7,
    composition: {
      ruleOfThirds: true,
      centerComposition: false,
      leadingLines: [],
      framing: 'medium',
      aspectRatio: '16:9',
    },
    cameraMovement: 'tracking',
  },
  {
    id: 'shot_5',
    startTime: 25,
    endTime: 30,
    duration: 5,
    composition: {
      ruleOfThirds: true,
      centerComposition: false,
      leadingLines: [],
      framing: 'extreme-wide',
      aspectRatio: '16:9',
    },
    cameraMovement: 'static',
  },
];

const mockStructure: VideoStructureAnalysis = {
  totalDuration: 30,
  shots: mockShots,
  transitions: [],
  keyframeCount: 5,
  sceneChanges: [
    { timestamp: 5, confidence: 0.95 },
    { timestamp: 12, confidence: 0.92 },
    { timestamp: 18, confidence: 0.88 },
    { timestamp: 25, confidence: 0.91 },
  ],
};

const mockDigitalHumanAnalysis: DigitalHumanAnalysis = {
  hasDigitalHuman: true,
  subjects: [
    {
      id: 'subject_1',
      boundingBox: { x: 100, y: 200, width: 300, height: 400 },
      pose: 'standing',
      expression: 'neutral',
      clothing: 'casual',
      confidence: 0.95,
    },
    {
      id: 'subject_2',
      boundingBox: { x: 500, y: 200, width: 300, height: 400 },
      pose: 'sitting',
      expression: 'happy',
      clothing: 'formal',
      confidence: 0.87,
    },
  ],
  style: 'anime',
  overallQuality: 0.91,
};

const mockDigitalHumanAnalysisNoHuman: DigitalHumanAnalysis = {
  hasDigitalHuman: false,
  subjects: [],
  style: 'realistic',
  overallQuality: 0.95,
};

const mockReferenceVideo: ReferenceVideo = {
  id: 'ref_video_1',
  fileUrl: '/path/to/reference_video.mp4',
  duration: 30,
  resolution: { width: 1920, height: 1080 },
  fps: 30,
  uploadedAt: new Date('2024-03-15T10:30:00Z'),
  structure: mockStructure,
  digitalHumanAnalysis: mockDigitalHumanAnalysis,
};

const mockReferenceVideoNoHuman: ReferenceVideo = {
  id: 'ref_video_2',
  fileUrl: '/path/to/reference_video_no_human.mp4',
  duration: 25,
  resolution: { width: 1920, height: 1080 },
  fps: 24,
  uploadedAt: new Date('2024-03-14T14:20:00Z'),
  structure: {
    totalDuration: 25,
    shots: [
      {
        id: 'shot_nh_1',
        startTime: 0,
        endTime: 8,
        duration: 8,
        composition: {
          ruleOfThirds: true,
          centerComposition: false,
          leadingLines: [],
          framing: 'wide',
          aspectRatio: '16:9',
        },
        cameraMovement: 'static',
      },
      {
        id: 'shot_nh_2',
        startTime: 8,
        endTime: 16,
        duration: 8,
        composition: {
          ruleOfThirds: false,
          centerComposition: true,
          leadingLines: [],
          framing: 'medium',
          aspectRatio: '16:9',
        },
        cameraMovement: 'static',
      },
      {
        id: 'shot_nh_3',
        startTime: 16,
        endTime: 25,
        duration: 9,
        composition: {
          ruleOfThirds: true,
          centerComposition: false,
          leadingLines: [],
          framing: 'close-up',
          aspectRatio: '16:9',
        },
        cameraMovement: 'static',
      },
    ],
    transitions: [],
    keyframeCount: 3,
    sceneChanges: [
      { timestamp: 8, confidence: 0.93 },
      { timestamp: 16, confidence: 0.89 },
    ],
  },
  digitalHumanAnalysis: mockDigitalHumanAnalysisNoHuman,
};

// ============================================================================
// Storybook Configuration
// ============================================================================

const meta = {
  title: 'Reference/VideoReplicationDialog',
  component: VideoReplicationDialog,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'UI component for uploading reference videos and configuring replication settings.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    open: {
      control: 'boolean',
      description: 'Controls whether the dialog is open',
    },
    onClose: {
      action: 'closed',
      description: 'Callback when the dialog is closed',
    },
    onReplicationComplete: {
      action: 'replication-complete',
      description: 'Callback when replication is complete',
    },
  },
  args: {
    open: true,
    onClose: () => console.log('Dialog closed'),
    onReplicationComplete: (projectId: string) => console.log('Replication complete:', projectId),
  },
} satisfies Meta<typeof VideoReplicationDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// Stories
// ============================================================================

/**
 * Default story showing the upload tab
 */
export const Default: Story = {
  name: 'Upload Tab',
  args: {
    open: true,
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
 * Story showing upload progress
 */
export const UploadProgress: Story = {
  name: 'Upload Progress',
  args: {
    open: true,
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
 * Story showing the review tab with digital human detected
 */
export const ReviewWithDigitalHuman: Story = {
  name: 'Review - Digital Human Detected',
  args: {
    open: true,
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
 * Story showing the review tab with no digital human
 */
export const ReviewNoDigitalHuman: Story = {
  name: 'Review - No Digital Human',
  args: {
    open: true,
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
 * Story showing the settings tab
 */
export const Settings: Story = {
  name: 'Settings Tab',
  args: {
    open: true,
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
 * Story showing all shots selected
 */
export const AllShotsSelected: Story = {
  name: 'All Shots Selected',
  args: {
    open: true,
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
 * Story showing partial shots selected
 */
export const PartialShotsSelected: Story = {
  name: 'Partial Shots Selected',
  args: {
    open: true,
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
 * Story with 4K resolution setting
 */
export const HighResolution: Story = {
  name: 'High Resolution (4K)',
  args: {
    open: true,
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
 * Story with custom style intensity
 */
export const CustomStyleIntensity: Story = {
  name: 'Custom Style Intensity',
  args: {
    open: true,
  },
  decorators: [
    (Story) => (
      <div style={{ height: '80vh' }}>
        <Story />
      </div>
    ),
  ],
};
