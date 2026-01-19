import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PropertiesPanel } from '../PropertiesPanel';
import { useStore } from '../../store';
import type { Shot, Project } from '../../types';

// Mock the store
vi.mock('../../store', () => ({
  useStore: vi.fn(),
  useSelectedShot: vi.fn(),
}));

describe('PropertiesPanel', () => {
  const mockShot: Shot = {
    id: 'shot-1',
    title: 'Test Shot',
    description: 'Test description',
    duration: 5,
    audioTracks: [
      {
        id: 'audio-1',
        name: 'Background Music',
        type: 'music',
        url: '/audio/music.mp3',
        startTime: 0,
        duration: 5,
        offset: 0,
        volume: 80,
        fadeIn: 0,
        fadeOut: 0,
        pan: 0,
        muted: false,
        solo: false,
        effects: [],
      },
    ],
    effects: [
      {
        id: 'effect-1',
        type: 'filter',
        name: 'Vintage',
        enabled: true,
        intensity: 50,
        parameters: {},
      },
    ],
    textLayers: [
      {
        id: 'text-1',
        content: 'Title Text',
        font: 'Arial',
        fontSize: 24,
        color: '#ffffff',
        position: { x: 50, y: 50 },
        alignment: 'center',
        startTime: 0,
        duration: 5,
        style: {},
      },
    ],
    animations: [],
    position: 0,
  };

  const mockProject: Project = {
    schema_version: '1.0',
    project_name: 'Test Project',
    shots: [mockShot],
    assets: [],
    capabilities: {
      grid_generation: true,
      promotion_engine: true,
      qa_engine: false,
      autofix_engine: false,
    },
    generation_status: {
      grid: 'done',
      promotion: 'pending',
    },
  };

  const mockUpdateShot = vi.fn();
  const mockUpdateProject = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Shot Properties Form', () => {
    beforeEach(() => {
      const { useSelectedShot } = require('../../store');
      
      // Mock store to return selected shot
      vi.mocked(useStore).mockImplementation((selector: any) => {
        const state = {
          project: mockProject,
          updateShot: mockUpdateShot,
          updateProject: mockUpdateProject,
        };
        return selector ? selector(state) : state;
      });

      // Mock useSelectedShot to return the mock shot
      vi.mocked(useSelectedShot).mockReturnValue(mockShot);
    });

    it('renders shot properties form when shot is selected', () => {
      render(<PropertiesPanel />);

      expect(screen.getByText('Shot Properties')).toBeInTheDocument();
      expect(screen.getByLabelText('Title')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByLabelText(/Duration/)).toBeInTheDocument();
    });

    it('displays shot title and description', () => {
      render(<PropertiesPanel />);

      const titleInput = screen.getByLabelText('Title') as HTMLInputElement;
      const descriptionInput = screen.getByLabelText('Description') as HTMLTextAreaElement;

      expect(titleInput.value).toBe('Test Shot');
      expect(descriptionInput.value).toBe('Test description');
    });

    it('displays shot duration', () => {
      render(<PropertiesPanel />);

      const durationInput = screen.getByLabelText(/Duration/) as HTMLInputElement;
      expect(durationInput.value).toBe('5');
    });

    it('updates shot title when input changes', () => {
      render(<PropertiesPanel />);

      const titleInput = screen.getByLabelText('Title') as HTMLInputElement;
      fireEvent.change(titleInput, { target: { value: 'New Title' } });

      expect(mockUpdateShot).toHaveBeenCalledWith('shot-1', { title: 'New Title' });
    });

    it('updates shot description when textarea changes', () => {
      render(<PropertiesPanel />);

      const descriptionInput = screen.getByLabelText('Description') as HTMLTextAreaElement;
      fireEvent.change(descriptionInput, { target: { value: 'New description' } });

      expect(mockUpdateShot).toHaveBeenCalledWith('shot-1', {
        description: 'New description',
      });
    });

    it('updates shot duration when input changes', () => {
      render(<PropertiesPanel />);

      const durationInput = screen.getByLabelText(/Duration/) as HTMLInputElement;
      fireEvent.change(durationInput, { target: { value: '10' } });

      expect(mockUpdateShot).toHaveBeenCalledWith('shot-1', { duration: 10 });
    });

    it('does not update duration with invalid values', () => {
      render(<PropertiesPanel />);

      const durationInput = screen.getByLabelText(/Duration/) as HTMLInputElement;
      
      // Try negative value
      fireEvent.change(durationInput, { target: { value: '-5' } });
      expect(mockUpdateShot).not.toHaveBeenCalled();

      // Try zero
      fireEvent.change(durationInput, { target: { value: '0' } });
      expect(mockUpdateShot).not.toHaveBeenCalled();

      // Try non-numeric
      fireEvent.change(durationInput, { target: { value: 'abc' } });
      expect(mockUpdateShot).not.toHaveBeenCalled();
    });

    it('displays audio tracks count', () => {
      render(<PropertiesPanel />);

      expect(screen.getByText('Audio Tracks')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('displays effects count', () => {
      render(<PropertiesPanel />);

      expect(screen.getByText('Effects')).toBeInTheDocument();
      // Should show count of 1 for effects
      const badges = screen.getAllByText('1');
      expect(badges.length).toBeGreaterThan(0);
    });

    it('displays text layers count', () => {
      render(<PropertiesPanel />);

      expect(screen.getByText('Text Layers')).toBeInTheDocument();
      // Should show count of 1 for text layers
      const badges = screen.getAllByText('1');
      expect(badges.length).toBeGreaterThan(0);
    });

    it('displays shot ID and position', () => {
      render(<PropertiesPanel />);

      expect(screen.getByText('Shot ID:')).toBeInTheDocument();
      expect(screen.getByText('shot-1')).toBeInTheDocument();
      expect(screen.getByText('Position:')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // position + 1
    });

    it('displays transition information when present', () => {
      const shotWithTransition = {
        ...mockShot,
        transitionOut: {
          id: 'transition-1',
          type: 'fade' as const,
          duration: 1,
        },
      };

      const { useSelectedShot } = require('../../store');
      vi.mocked(useSelectedShot).mockReturnValue(shotWithTransition);

      render(<PropertiesPanel />);

      expect(screen.getByText('Transition:')).toBeInTheDocument();
      expect(screen.getByText('fade')).toBeInTheDocument();
    });
  });

  describe('Project Settings', () => {
    beforeEach(() => {
      const { useSelectedShot } = require('../../store');
      
      // Mock store to return no selected shot
      vi.mocked(useStore).mockImplementation((selector: any) => {
        const state = {
          project: mockProject,
          updateShot: mockUpdateShot,
          updateProject: mockUpdateProject,
        };
        return selector ? selector(state) : state;
      });

      // Mock useSelectedShot to return null
      vi.mocked(useSelectedShot).mockReturnValue(null);
    });

    it('renders project settings when no shot is selected', () => {
      render(<PropertiesPanel />);

      expect(screen.getByText('Project Settings')).toBeInTheDocument();
      expect(screen.getByText('Project Name')).toBeInTheDocument();
    });

    it('displays project name', () => {
      render(<PropertiesPanel />);

      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    it('displays schema version', () => {
      render(<PropertiesPanel />);

      expect(screen.getByText('Schema Version')).toBeInTheDocument();
      expect(screen.getByText('1.0')).toBeInTheDocument();
    });

    it('displays all capability toggles', () => {
      render(<PropertiesPanel />);

      expect(screen.getByText('Grid Generation')).toBeInTheDocument();
      expect(screen.getByText('Promotion Engine')).toBeInTheDocument();
      expect(screen.getByText('QA Engine')).toBeInTheDocument();
      expect(screen.getByText('Autofix Engine')).toBeInTheDocument();
    });

    it('shows correct capability states', () => {
      render(<PropertiesPanel />);

      const gridSwitch = screen.getByLabelText('Grid Generation') as HTMLButtonElement;
      const promotionSwitch = screen.getByLabelText('Promotion Engine') as HTMLButtonElement;
      const qaSwitch = screen.getByLabelText('QA Engine') as HTMLButtonElement;
      const autofixSwitch = screen.getByLabelText('Autofix Engine') as HTMLButtonElement;

      expect(gridSwitch.getAttribute('data-state')).toBe('checked');
      expect(promotionSwitch.getAttribute('data-state')).toBe('checked');
      expect(qaSwitch.getAttribute('data-state')).toBe('unchecked');
      expect(autofixSwitch.getAttribute('data-state')).toBe('unchecked');
    });

    it('toggles capability when switch is clicked', () => {
      render(<PropertiesPanel />);

      const qaSwitch = screen.getByLabelText('QA Engine');
      fireEvent.click(qaSwitch);

      expect(mockUpdateProject).toHaveBeenCalledWith({
        capabilities: {
          grid_generation: true,
          promotion_engine: true,
          qa_engine: true,
          autofix_engine: false,
        },
      });
    });

    it('displays generation status', () => {
      render(<PropertiesPanel />);

      expect(screen.getByText('Generation Status')).toBeInTheDocument();
      expect(screen.getByText('Grid Generation')).toBeInTheDocument();
      expect(screen.getByText('Promotion')).toBeInTheDocument();
      expect(screen.getByText('done')).toBeInTheDocument();
      expect(screen.getByText('pending')).toBeInTheDocument();
    });

    it('shows correct status colors', () => {
      render(<PropertiesPanel />);

      const doneBadge = screen.getByText('done');
      const pendingBadge = screen.getByText('pending');

      expect(doneBadge.className).toContain('green');
      expect(pendingBadge.className).toContain('yellow');
    });

    it('displays no project message when project is null', () => {
      vi.mocked(useStore).mockImplementation((selector: any) => {
        const state = {
          project: null,
          updateShot: mockUpdateShot,
          updateProject: mockUpdateProject,
        };
        return selector ? selector(state) : state;
      });

      render(<PropertiesPanel />);

      expect(screen.getByText('No Project Loaded')).toBeInTheDocument();
      expect(screen.getByText('Create or open a project to view settings')).toBeInTheDocument();
    });

    it('displays project metadata when present', () => {
      const projectWithMetadata = {
        ...mockProject,
        metadata: {
          created_at: '2024-01-01',
          author: 'Test User',
        },
      };

      vi.mocked(useStore).mockImplementation((selector: any) => {
        const state = {
          project: projectWithMetadata,
          updateShot: mockUpdateShot,
          updateProject: mockUpdateProject,
        };
        return selector ? selector(state) : state;
      });

      render(<PropertiesPanel />);

      expect(screen.getByText('Metadata')).toBeInTheDocument();
      expect(screen.getByText('Created at:')).toBeInTheDocument();
      expect(screen.getByText('2024-01-01')).toBeInTheDocument();
      expect(screen.getByText('Author:')).toBeInTheDocument();
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
  });

  describe('Conditional Rendering', () => {
    it('switches between shot properties and project settings', () => {
      const { useSelectedShot } = require('../../store');
      const { rerender } = render(<PropertiesPanel />);

      // Initially with selected shot
      vi.mocked(useSelectedShot).mockReturnValue(mockShot);
      rerender(<PropertiesPanel />);
      expect(screen.getByText('Shot Properties')).toBeInTheDocument();

      // Then without selected shot
      vi.mocked(useSelectedShot).mockReturnValue(null);
      rerender(<PropertiesPanel />);
      expect(screen.getByText('Project Settings')).toBeInTheDocument();
    });
  });

  describe('Image Upload', () => {
    beforeEach(() => {
      const { useSelectedShot } = require('../../store');
      
      // Mock store to return selected shot
      vi.mocked(useStore).mockImplementation((selector: any) => {
        const state = {
          project: mockProject,
          updateShot: mockUpdateShot,
          updateProject: mockUpdateProject,
        };
        return selector ? selector(state) : state;
      });

      // Mock useSelectedShot to return the mock shot
      vi.mocked(useSelectedShot).mockReturnValue(mockShot);
    });

    it('displays image upload section', () => {
      render(<PropertiesPanel />);

      expect(screen.getByText('Shot Image')).toBeInTheDocument();
    });

    it('shows upload button when no image is present', () => {
      render(<PropertiesPanel />);

      expect(screen.getByText('Upload Shot Image')).toBeInTheDocument();
      expect(screen.getByText('Select Image')).toBeInTheDocument();
    });

    it('shows current image when image is present', () => {
      const shotWithImage = {
        ...mockShot,
        image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      };

      const { useSelectedShot } = require('../../store');
      vi.mocked(useSelectedShot).mockReturnValue(shotWithImage);

      render(<PropertiesPanel />);

      const image = screen.getByAltText('Test Shot');
      expect(image).toBeInTheDocument();
      expect(image.getAttribute('src')).toBe(shotWithImage.image);
    });

    it('shows remove button when image is present', () => {
      const shotWithImage = {
        ...mockShot,
        image: 'data:image/png;base64,test',
      };

      const { useSelectedShot } = require('../../store');
      vi.mocked(useSelectedShot).mockReturnValue(shotWithImage);

      render(<PropertiesPanel />);

      expect(screen.getByText('Remove')).toBeInTheDocument();
    });

    it('removes image when remove button is clicked', () => {
      const shotWithImage = {
        ...mockShot,
        image: 'data:image/png;base64,test',
      };

      const { useSelectedShot } = require('../../store');
      vi.mocked(useSelectedShot).mockReturnValue(shotWithImage);

      render(<PropertiesPanel />);

      const removeButton = screen.getByText('Remove');
      fireEvent.click(removeButton);

      expect(mockUpdateShot).toHaveBeenCalledWith('shot-1', { image: undefined });
    });

    it('shows change image button when image is present', () => {
      const shotWithImage = {
        ...mockShot,
        image: 'data:image/png;base64,test',
      };

      const { useSelectedShot } = require('../../store');
      vi.mocked(useSelectedShot).mockReturnValue(shotWithImage);

      render(<PropertiesPanel />);

      expect(screen.getByText('Change Image')).toBeInTheDocument();
    });

    it('handles valid image file upload', async () => {
      render(<PropertiesPanel />);

      // Create a mock file
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      
      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: vi.fn(),
        onload: null as any,
        onerror: null as any,
        result: 'data:image/png;base64,testdata',
      };

      vi.spyOn(global, 'FileReader').mockImplementation(() => mockFileReader as any);

      // Find the hidden file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeTruthy();

      // Trigger file selection
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      // Simulate FileReader onload
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: mockFileReader } as any);
      }

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockUpdateShot).toHaveBeenCalledWith('shot-1', {
        image: 'data:image/png;base64,testdata',
      });
    });

    it('shows error for non-image files', async () => {
      render(<PropertiesPanel />);

      // Create a mock non-image file
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      
      // Find the hidden file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      // Trigger file selection
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(screen.getByText('Please select a valid image file')).toBeInTheDocument();
      expect(mockUpdateShot).not.toHaveBeenCalled();
    });

    it('shows error for files larger than 5MB', async () => {
      render(<PropertiesPanel />);

      // Create a mock large file (6MB)
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.png', {
        type: 'image/png',
      });
      
      // Find the hidden file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      // Trigger file selection
      Object.defineProperty(fileInput, 'files', {
        value: [largeFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(screen.getByText('Image size must be less than 5MB')).toBeInTheDocument();
      expect(mockUpdateShot).not.toHaveBeenCalled();
    });

    it('shows uploading state during upload', async () => {
      render(<PropertiesPanel />);

      // Create a mock file
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      
      // Mock FileReader with delayed onload
      const mockFileReader = {
        readAsDataURL: vi.fn(),
        onload: null as any,
        onerror: null as any,
        result: 'data:image/png;base64,testdata',
      };

      vi.spyOn(global, 'FileReader').mockImplementation(() => mockFileReader as any);

      // Find the hidden file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      // Trigger file selection
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      // Check for uploading state (before onload is called)
      // Note: This is a simplified test - in real scenario, we'd need to check timing
      expect(screen.queryByText('Uploading...')).toBeTruthy();
    });

    it('accepts only image file types', () => {
      render(<PropertiesPanel />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput.getAttribute('accept')).toBe('image/*');
    });

    it('clears error when new upload starts', async () => {
      render(<PropertiesPanel />);

      // First upload with error
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      Object.defineProperty(fileInput, 'files', {
        value: [invalidFile],
        writable: false,
      });

      fireEvent.change(fileInput);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(screen.getByText('Please select a valid image file')).toBeInTheDocument();

      // Second upload with valid file
      const validFile = new File(['test'], 'test.png', { type: 'image/png' });
      
      const mockFileReader = {
        readAsDataURL: vi.fn(),
        onload: null as any,
        onerror: null as any,
        result: 'data:image/png;base64,testdata',
      };

      vi.spyOn(global, 'FileReader').mockImplementation(() => mockFileReader as any);

      Object.defineProperty(fileInput, 'files', {
        value: [validFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      // Error should be cleared
      expect(screen.queryByText('Please select a valid image file')).not.toBeInTheDocument();
    });
  });
});
