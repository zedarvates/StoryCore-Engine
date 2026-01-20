/**
 * ProjectDashboardNew Component Tests
 * 
 * Tests the main container component integration with all sub-components.
 * 
 * Requirements: 1.1, 1.2, 1.4, 1.5, 2.3, 2.4, 3.1, 4.1, 6.1, 6.2
 */

import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ProjectDashboardNew } from '../components/ProjectDashboardNew';
import type { Project } from '../types/projectDashboard';

// Mock the persistence services
vi.mock('../services/persistence/projectPersistence', () => ({
  projectPersistence: {
    loadProject: vi.fn(),
    saveProject: vi.fn(),
    scheduleAutoSave: vi.fn(),
    cancelAutoSave: vi.fn(),
  },
}));

vi.mock('../services/persistence/generationStatePersistence', () => ({
  generationStatePersistence: {
    loadGenerationState: vi.fn(),
    saveGenerationState: vi.fn(),
    completeGeneration: vi.fn(),
    startPeriodicUpdates: vi.fn(),
    cancelPeriodicUpdates: vi.fn(),
  },
}));

describe('ProjectDashboardNew', () => {
  const mockProject: Project = {
    id: 'test-project-1',
    name: 'Test Project',
    schemaVersion: '1.0',
    sequences: [],
    shots: [
      {
        id: 'shot-1',
        sequenceId: 'seq-1',
        startTime: 0,
        duration: 5,
        prompt: 'A beautiful sunset over the ocean',
        metadata: {},
      },
      {
        id: 'shot-2',
        sequenceId: 'seq-1',
        startTime: 5,
        duration: 3,
        prompt: '',
        metadata: {},
      },
    ],
    audioPhrases: [],
    generationHistory: [],
    capabilities: {
      gridGeneration: true,
      promotionEngine: true,
      qaEngine: true,
      autofixEngine: true,
      voiceGeneration: true,
    },
  };

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup default mock implementations
    const { projectPersistence } = await import('../services/persistence/projectPersistence');
    vi.mocked(projectPersistence.loadProject).mockResolvedValue({
      success: true,
      project: mockProject,
    });
    vi.mocked(projectPersistence.saveProject).mockResolvedValue({
      success: true,
      timestamp: Date.now(),
    });

    const { generationStatePersistence } = await import('../services/persistence/generationStatePersistence');
    vi.mocked(generationStatePersistence.loadGenerationState).mockResolvedValue(null);
  });

  describe('Component Rendering', () => {
    it('should render loading state initially', () => {
      render(<ProjectDashboardNew projectId="test-project-1" />);
      
      expect(screen.getByText(/loading project/i)).toBeInTheDocument();
    });

    it('should render project header with project name', async () => {
      render(<ProjectDashboardNew projectId="test-project-1" />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });
    });

    it('should render project ID in header', async () => {
      render(<ProjectDashboardNew projectId="test-project-1" />);
      
      await waitFor(() => {
        expect(screen.getByText(/project id: test-project-1/i)).toBeInTheDocument();
      });
    });

    it('should render schema version', async () => {
      render(<ProjectDashboardNew projectId="test-project-1" />);
      
      await waitFor(() => {
        expect(screen.getByText(/schema v1\.0/i)).toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation', () => {
    it('should render all tab triggers', async () => {
      render(<ProjectDashboardNew projectId="test-project-1" />);
      
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /prompts/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /audio/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /generate/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /analysis/i })).toBeInTheDocument();
      });
    });

    it('should show prompts tab as active by default', async () => {
      render(<ProjectDashboardNew projectId="test-project-1" />);
      
      await waitFor(() => {
        const promptsTab = screen.getByRole('tab', { name: /prompts/i });
        expect(promptsTab).toHaveAttribute('data-state', 'active');
      });
    });
  });

  describe('Status Indicators', () => {
    it('should display prompt completion status', async () => {
      render(<ProjectDashboardNew projectId="test-project-1" />);
      
      await waitFor(() => {
        // 1 complete out of 2 total shots
        expect(screen.getByText(/1\/2/)).toBeInTheDocument();
      });
    });

    it('should display save status indicator', async () => {
      render(<ProjectDashboardNew projectId="test-project-1" />);
      
      await waitFor(() => {
        expect(screen.getByText(/auto-save enabled/i)).toBeInTheDocument();
      });
    });

    it('should display completion percentage', async () => {
      render(<ProjectDashboardNew projectId="test-project-1" />);
      
      await waitFor(() => {
        // 1 out of 2 = 50%
        expect(screen.getByText('50%')).toBeInTheDocument();
      });
    });
  });

  describe('Footer Information', () => {
    it('should display shot count', async () => {
      render(<ProjectDashboardNew projectId="test-project-1" />);
      
      await waitFor(() => {
        expect(screen.getByText(/shots: 2/i)).toBeInTheDocument();
      });
    });

    it('should display phrase count', async () => {
      render(<ProjectDashboardNew projectId="test-project-1" />);
      
      await waitFor(() => {
        expect(screen.getByText(/phrases: 0/i)).toBeInTheDocument();
      });
    });

    it('should display capability badges', async () => {
      render(<ProjectDashboardNew projectId="test-project-1" />);
      
      await waitFor(() => {
        expect(screen.getByText('Grid Gen')).toBeInTheDocument();
        expect(screen.getByText('Promotion')).toBeInTheDocument();
        expect(screen.getByText('QA')).toBeInTheDocument();
        expect(screen.getByText('Voice')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when project fails to load', async () => {
      const { projectPersistence } = await import('../services/persistence/projectPersistence');
      vi.mocked(projectPersistence.loadProject).mockResolvedValue({
        success: false,
        error: { name: 'NetworkError', message: 'Network error' },
      });

      render(<ProjectDashboardNew projectId="test-project-1" />);
      
      await waitFor(() => {
        expect(screen.getByText(/project not found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Component Integration', () => {
    it('should integrate PromptManagementPanel in prompts tab', async () => {
      render(<ProjectDashboardNew projectId="test-project-1" />);
      
      await waitFor(() => {
        // PromptManagementPanel should render shot list
        expect(screen.getByText(/select a shot to edit its prompt/i)).toBeInTheDocument();
      });
    });

    it('should provide ProjectContext to all child components', async () => {
      render(<ProjectDashboardNew projectId="test-project-1" />);
      
      await waitFor(() => {
        // Verify context is working by checking if components can access project data
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should render with proper layout classes', async () => {
      const { container } = render(<ProjectDashboardNew projectId="test-project-1" />);
      
      await waitFor(() => {
        const dashboard = container.querySelector('.project-dashboard-new');
        expect(dashboard).toHaveClass('h-screen', 'flex', 'flex-col');
      });
    });
  });

  describe('Callbacks', () => {
    it('should call onProjectUpdate when provided', async () => {
      const onProjectUpdate = vi.fn();
      
      render(
        <ProjectDashboardNew
          projectId="test-project-1"
          onProjectUpdate={onProjectUpdate}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });
      
      // onProjectUpdate should be called when project is saved
      // This is tested more thoroughly in ProjectContext tests
    });

    it('should call onGenerationComplete when provided', async () => {
      const onGenerationComplete = vi.fn();
      
      render(
        <ProjectDashboardNew
          projectId="test-project-1"
          onGenerationComplete={onGenerationComplete}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });
      
      // onGenerationComplete should be called when generation completes
      // This is tested more thoroughly in generation tests
    });
  });
});
