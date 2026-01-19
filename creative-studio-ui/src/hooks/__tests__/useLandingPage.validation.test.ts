/**
 * Tests for project validation integration in useLandingPage hook
 * 
 * Task 4: Test project validation integration
 * Requirements: 4.1, 4.3, 5.3
 * 
 * This test suite verifies:
 * - Selected paths are validated before loading
 * - Validation with valid project directories
 * - Validation with invalid directories
 * - Validation with project.json files (parent directory should be validated)
 * - Error messages for validation failures
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useLandingPage } from '../useLandingPage';
import { useAppStore } from '@/stores/useAppStore';

// Mock the store
vi.mock('@/stores/useAppStore');

describe('useLandingPage - Project Validation Integration', () => {
  let mockSetProject: ReturnType<typeof vi.fn>;
  let mockSetShots: ReturnType<typeof vi.fn>;
  let mockElectronAPI: any;

  beforeEach(() => {
    // Reset mocks
    mockSetProject = vi.fn();
    mockSetShots = vi.fn();

    // Mock store - need to mock the selector function
    (useAppStore as any).mockImplementation((selector: any) => {
      const state = {
        setProject: mockSetProject,
        setShots: mockSetShots,
      };
      return selector(state);
    });

    // Mock Electron API
    mockElectronAPI = {
      project: {
        open: vi.fn(),
        selectForOpen: vi.fn(),
      },
      recentProjects: {
        get: vi.fn().mockResolvedValue([]),
      },
    };

    // Set up window.electronAPI
    (window as any).electronAPI = mockElectronAPI;
  });

  afterEach(() => {
    // Clean up
    delete (window as any).electronAPI;
    vi.clearAllMocks();
  });

  describe('Validation with valid project directories', () => {
    it('should successfully open a valid project directory', async () => {
      // Arrange
      const validProjectPath = '/path/to/valid/project';
      const mockProject = {
        id: 'test-id',
        name: 'Test Project',
        path: validProjectPath,
        version: '1.0.0',
        createdAt: new Date(),
        modifiedAt: new Date(),
        config: {
          schema_version: '1.0',
          project_name: 'Test Project',
          capabilities: {
            grid_generation: true,
            promotion_engine: true,
            qa_engine: true,
            autofix_engine: true,
          },
          generation_status: {
            grid: 'pending' as const,
            promotion: 'pending' as const,
          },
        },
      };

      mockElectronAPI.project.open.mockResolvedValue(mockProject);

      const { result } = renderHook(() => useLandingPage());

      // Act
      await act(async () => {
        await result.current.handleOpenProjectSubmit(validProjectPath);
      });

      // Assert
      expect(mockElectronAPI.project.open).toHaveBeenCalledWith(validProjectPath);
      expect(mockSetProject).toHaveBeenCalled();
      expect(mockSetShots).toHaveBeenCalled();
      expect(result.current.error).toBeNull();
    });

    it('should handle project with all required fields', async () => {
      // Arrange
      const projectPath = '/path/to/complete/project';
      const completeProject = {
        id: 'complete-id',
        name: 'Complete Project',
        path: projectPath,
        version: '1.0.0',
        createdAt: new Date(),
        modifiedAt: new Date(),
        config: {
          schema_version: '1.0',
          project_name: 'Complete Project',
          shots: [{ id: 'shot1', name: 'Shot 1' }],
          assets: [{ id: 'asset1', name: 'Asset 1' }],
          capabilities: {
            grid_generation: true,
            promotion_engine: true,
            qa_engine: true,
            autofix_engine: true,
          },
          generation_status: {
            grid: 'done' as const,
            promotion: 'done' as const,
          },
          metadata: {
            id: 'complete-id',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        },
      };

      mockElectronAPI.project.open.mockResolvedValue(completeProject);

      const { result } = renderHook(() => useLandingPage());

      // Act
      await act(async () => {
        await result.current.handleOpenProjectSubmit(projectPath);
      });

      // Assert
      expect(mockElectronAPI.project.open).toHaveBeenCalledWith(projectPath);
      expect(mockSetProject).toHaveBeenCalled();
      expect(result.current.error).toBeNull();
    });
  });

  describe('Validation with invalid directories', () => {
    it('should display error for non-existent directory', async () => {
      // Arrange
      const invalidPath = '/path/to/nonexistent/project';
      const errorMessage = 'Project directory does not exist';

      mockElectronAPI.project.open.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useLandingPage());

      // Act
      await act(async () => {
        try {
          await result.current.handleOpenProjectSubmit(invalidPath);
        } catch (error) {
          // Expected to throw
        }
      });

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
      });
      expect(mockElectronAPI.project.open).toHaveBeenCalledWith(invalidPath);
      expect(mockSetProject).not.toHaveBeenCalled();
    });

    it('should display error for directory without project.json', async () => {
      // Arrange
      const invalidPath = '/path/to/empty/directory';
      const errorMessage = "Required file 'project.json' is missing";

      mockElectronAPI.project.open.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useLandingPage());

      // Act
      await act(async () => {
        try {
          await result.current.handleOpenProjectSubmit(invalidPath);
        } catch (error) {
          // Expected to throw
        }
      });

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
      });
      expect(mockSetProject).not.toHaveBeenCalled();
    });

    it('should display error for corrupted project.json', async () => {
      // Arrange
      const invalidPath = '/path/to/corrupted/project';
      const errorMessage = 'Invalid JSON syntax';

      mockElectronAPI.project.open.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useLandingPage());

      // Act
      await act(async () => {
        try {
          await result.current.handleOpenProjectSubmit(invalidPath);
        } catch (error) {
          // Expected to throw
        }
      });

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
      });
      expect(mockSetProject).not.toHaveBeenCalled();
    });

    it('should display error for project with missing required fields', async () => {
      // Arrange
      const invalidPath = '/path/to/incomplete/project';
      const errorMessage = 'Missing or invalid project_name';

      mockElectronAPI.project.open.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useLandingPage());

      // Act
      await act(async () => {
        try {
          await result.current.handleOpenProjectSubmit(invalidPath);
        } catch (error) {
          // Expected to throw
        }
      });

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
      });
      expect(mockSetProject).not.toHaveBeenCalled();
    });

    it('should display error for permission denied', async () => {
      // Arrange
      const restrictedPath = '/path/to/restricted/project';
      const errorMessage = 'Insufficient permissions to access project directory';

      mockElectronAPI.project.open.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useLandingPage());

      // Act
      await act(async () => {
        try {
          await result.current.handleOpenProjectSubmit(restrictedPath);
        } catch (error) {
          // Expected to throw
        }
      });

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
      });
      expect(mockSetProject).not.toHaveBeenCalled();
    });
  });

  describe('Validation with project.json files', () => {
    it('should validate parent directory when project.json file is selected', async () => {
      // Arrange
      const parentDirectory = '/path/to/project';
      
      // Mock selectForOpen to return the parent directory (as IPC handler does path normalization)
      mockElectronAPI.project.selectForOpen.mockResolvedValue(parentDirectory);
      
      const mockProject = {
        id: 'test-id',
        name: 'Test Project',
        path: parentDirectory,
        version: '1.0.0',
        createdAt: new Date(),
        modifiedAt: new Date(),
        config: {
          schema_version: '1.0',
          project_name: 'Test Project',
          capabilities: {
            grid_generation: true,
            promotion_engine: true,
            qa_engine: true,
            autofix_engine: true,
          },
          generation_status: {
            grid: 'pending' as const,
            promotion: 'pending' as const,
          },
        },
      };

      mockElectronAPI.project.open.mockResolvedValue(mockProject);

      const { result } = renderHook(() => useLandingPage());

      // Act
      await act(async () => {
        await result.current.handleOpenProject();
      });

      // Assert
      expect(mockElectronAPI.project.selectForOpen).toHaveBeenCalled();
      expect(mockElectronAPI.project.open).toHaveBeenCalledWith(parentDirectory);
      expect(mockSetProject).toHaveBeenCalled();
      expect(result.current.error).toBeNull();
    });

    it('should handle validation failure when parent directory is invalid', async () => {
      // Arrange
      const parentDirectory = '/path/to/invalid';
      
      mockElectronAPI.project.selectForOpen.mockResolvedValue(parentDirectory);
      
      const errorMessage = 'Missing or invalid capabilities object';
      mockElectronAPI.project.open.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useLandingPage());

      // Act
      await act(async () => {
        await result.current.handleOpenProject();
      });

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
      });
      expect(mockElectronAPI.project.open).toHaveBeenCalledWith(parentDirectory);
      expect(mockSetProject).not.toHaveBeenCalled();
    });
  });

  describe('Error message verification', () => {
    it('should display descriptive error for missing files', async () => {
      // Arrange
      const projectPath = '/path/to/project';
      const errorMessage = "Required file 'project.json' is missing";

      mockElectronAPI.project.open.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useLandingPage());

      // Act
      await act(async () => {
        try {
          await result.current.handleOpenProjectSubmit(projectPath);
        } catch (error) {
          // Expected to throw
        }
      });

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
        expect(result.current.error).toContain('project.json');
      });
    });

    it('should display descriptive error for configuration issues', async () => {
      // Arrange
      const projectPath = '/path/to/project';
      const errorMessage = 'Configuration errors: 3 issue(s)';

      mockElectronAPI.project.open.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useLandingPage());

      // Act
      await act(async () => {
        try {
          await result.current.handleOpenProjectSubmit(projectPath);
        } catch (error) {
          // Expected to throw
        }
      });

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
        expect(result.current.error).toContain('Configuration');
      });
    });

    it('should display descriptive error for permission issues', async () => {
      // Arrange
      const projectPath = '/path/to/project';
      const errorMessage = 'Permission denied';

      mockElectronAPI.project.open.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useLandingPage());

      // Act
      await act(async () => {
        try {
          await result.current.handleOpenProjectSubmit(projectPath);
        } catch (error) {
          // Expected to throw
        }
      });

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
        expect(result.current.error).toContain('Permission');
      });
    });

    it('should clear error when clearError is called', async () => {
      // Arrange
      const projectPath = '/path/to/project';
      const errorMessage = 'Test error';

      mockElectronAPI.project.open.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useLandingPage());

      // Act - trigger error
      await act(async () => {
        try {
          await result.current.handleOpenProjectSubmit(projectPath);
        } catch (error) {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
      });

      // Act - clear error
      act(() => {
        result.current.clearError();
      });

      // Assert
      expect(result.current.error).toBeNull();
    });
  });

  describe('Validation precedes loading', () => {
    it('should call project.open (which validates) before updating store', async () => {
      // Arrange
      const projectPath = '/path/to/project';
      const callOrder: string[] = [];

      mockElectronAPI.project.open.mockImplementation(async () => {
        callOrder.push('validate');
        return {
          id: 'test-id',
          name: 'Test Project',
          path: projectPath,
          version: '1.0.0',
          createdAt: new Date(),
          modifiedAt: new Date(),
          config: {
            schema_version: '1.0',
            project_name: 'Test Project',
            capabilities: {
              grid_generation: true,
              promotion_engine: true,
              qa_engine: true,
              autofix_engine: true,
            },
            generation_status: {
              grid: 'pending' as const,
              promotion: 'pending' as const,
            },
          },
        };
      });

      mockSetProject.mockImplementation(() => {
        callOrder.push('setProject');
      });

      const { result } = renderHook(() => useLandingPage());

      // Act
      await act(async () => {
        await result.current.handleOpenProjectSubmit(projectPath);
      });

      // Assert
      expect(callOrder).toEqual(['validate', 'setProject']);
      expect(mockElectronAPI.project.open).toHaveBeenCalled();
      expect(mockSetProject).toHaveBeenCalled();
    });

    it('should not update store if validation fails', async () => {
      // Arrange
      const projectPath = '/path/to/invalid/project';
      const errorMessage = 'Validation failed';

      mockElectronAPI.project.open.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useLandingPage());

      // Act
      await act(async () => {
        try {
          await result.current.handleOpenProjectSubmit(projectPath);
        } catch (error) {
          // Expected to throw
        }
      });

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
      });
      expect(mockElectronAPI.project.open).toHaveBeenCalled();
      expect(mockSetProject).not.toHaveBeenCalled();
      expect(mockSetShots).not.toHaveBeenCalled();
    });
  });

  describe('Loading state during validation', () => {
    it('should set loading state during validation', async () => {
      // Arrange
      const projectPath = '/path/to/project';
      let resolveOpen: any;
      const openPromise = new Promise((resolve) => {
        resolveOpen = resolve;
      });

      mockElectronAPI.project.open.mockReturnValue(openPromise);

      const { result } = renderHook(() => useLandingPage());

      // Act - start opening
      act(() => {
        result.current.handleOpenProjectSubmit(projectPath);
      });

      // Assert - loading should be true
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Complete the operation
      await act(async () => {
        resolveOpen({
          id: 'test-id',
          name: 'Test Project',
          path: projectPath,
          version: '1.0.0',
          createdAt: new Date(),
          modifiedAt: new Date(),
          config: {
            schema_version: '1.0',
            project_name: 'Test Project',
            capabilities: {
              grid_generation: true,
              promotion_engine: true,
              qa_engine: true,
              autofix_engine: true,
            },
            generation_status: {
              grid: 'pending' as const,
              promotion: 'pending' as const,
            },
          },
        });
        await openPromise;
      });

      // Assert - loading should be false
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should clear loading state after validation failure', async () => {
      // Arrange
      const projectPath = '/path/to/invalid/project';
      const errorMessage = 'Validation failed';

      mockElectronAPI.project.open.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useLandingPage());

      // Act
      await act(async () => {
        try {
          await result.current.handleOpenProjectSubmit(projectPath);
        } catch (error) {
          // Expected to throw
        }
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBe(errorMessage);
      });
    });
  });
});
