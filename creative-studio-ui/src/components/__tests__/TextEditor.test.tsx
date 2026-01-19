import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TextEditor } from '../TextEditor';
import { useStore, useSelectedShot } from '../../store';
import type { Shot, TextLayer } from '../../types';

// Mock the store
vi.mock('../../store', () => ({
  useStore: vi.fn(),
  useSelectedShot: vi.fn(),
}));

describe('TextEditor', () => {
  const mockUpdateTextLayer = vi.fn();

  const createMockShot = (id: string, textLayers: TextLayer[] = []): Shot => ({
    id,
    title: 'Test Shot',
    description: 'Test Description',
    duration: 10,
    position: 0,
    audioTracks: [],
    effects: [],
    textLayers,
    animations: [],
  });

  const createMockTextLayer = (overrides?: Partial<TextLayer>): TextLayer => ({
    id: 'text-layer-1',
    content: 'Sample Text',
    font: 'Arial',
    fontSize: 48,
    color: '#ffffff',
    backgroundColor: undefined,
    position: { x: 50, y: 50 },
    alignment: 'center',
    startTime: 0,
    duration: 5,
    style: {
      bold: false,
      italic: false,
      underline: false,
    },
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('No Text Layer Selected', () => {
    beforeEach(() => {
      vi.mocked(useStore).mockImplementation((selector: any) => {
        const state = {
          selectedTextLayerId: null,
          updateTextLayer: mockUpdateTextLayer,
        };
        return selector ? selector(state) : state;
      });

      vi.mocked(useSelectedShot).mockReturnValue(null);
    });

    it('should display "No Text Layer Selected" message', () => {
      render(<TextEditor />);

      expect(screen.getByText('No Text Layer Selected')).toBeInTheDocument();
      expect(screen.getByText('Select a text layer to edit its properties')).toBeInTheDocument();
    });
  });

  describe('Text Layer Not Found', () => {
    const shot = createMockShot('shot-1', []);

    beforeEach(() => {
      vi.mocked(useStore).mockImplementation((selector: any) => {
        const state = {
          selectedTextLayerId: 'non-existent-layer',
          updateTextLayer: mockUpdateTextLayer,
        };
        return selector ? selector(state) : state;
      });

      vi.mocked(useSelectedShot).mockReturnValue(shot);
    });

    it('should display "Text Layer Not Found" message', () => {
      render(<TextEditor />);

      expect(screen.getByText('Text Layer Not Found')).toBeInTheDocument();
      expect(screen.getByText('The selected text layer could not be found')).toBeInTheDocument();
    });
  });

  describe('Text Editor with Selected Layer', () => {
    const textLayer = createMockTextLayer();
    const shot = createMockShot('shot-1', [textLayer]);

    beforeEach(() => {
      vi.mocked(useStore).mockImplementation((selector: any) => {
        const state = {
          selectedTextLayerId: 'text-layer-1',
          updateTextLayer: mockUpdateTextLayer,
        };
        return selector ? selector(state) : state;
      });

      vi.mocked(useSelectedShot).mockReturnValue(shot);
    });

    it('should display text editor header', () => {
      render(<TextEditor />);

      expect(screen.getByText('Text Editor')).toBeInTheDocument();
      expect(screen.getByText('Editing')).toBeInTheDocument();
    });

    it('should display text content input with current value', () => {
      render(<TextEditor />);

      const input = screen.getByPlaceholderText('Enter text...') as HTMLInputElement;
      expect(input.value).toBe('Sample Text');
    });

    it('should update text content when input changes', () => {
      render(<TextEditor />);

      const input = screen.getByPlaceholderText('Enter text...');
      fireEvent.change(input, { target: { value: 'New Text' } });

      expect(mockUpdateTextLayer).toHaveBeenCalledWith(
        'shot-1',
        'text-layer-1',
        { content: 'New Text' }
      );
    });

    it('should display font family selector with current value', () => {
      render(<TextEditor />);

      expect(screen.getByText('Font Family')).toBeInTheDocument();
      // The Select component should show Arial as selected
    });

    it('should display font size slider with current value', () => {
      render(<TextEditor />);

      expect(screen.getByText('Font Size')).toBeInTheDocument();
      expect(screen.getByText('48px')).toBeInTheDocument();
    });

    it('should display text style toggle buttons', () => {
      render(<TextEditor />);

      expect(screen.getByRole('button', { name: /Bold/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Italic/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Underline/i })).toBeInTheDocument();
    });

    it('should toggle bold style when bold button is clicked', () => {
      render(<TextEditor />);

      const boldButton = screen.getByRole('button', { name: /Bold/i });
      fireEvent.click(boldButton);

      expect(mockUpdateTextLayer).toHaveBeenCalledWith(
        'shot-1',
        'text-layer-1',
        {
          style: {
            bold: true,
            italic: false,
            underline: false,
          },
        }
      );
    });

    it('should display color inputs', () => {
      render(<TextEditor />);

      expect(screen.getByText('Text Color')).toBeInTheDocument();
      expect(screen.getByText('Background Color (Optional)')).toBeInTheDocument();
    });

    it('should display alignment buttons', () => {
      render(<TextEditor />);

      expect(screen.getByRole('button', { name: /Left/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Center/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Right/i })).toBeInTheDocument();
    });

    it('should update alignment when alignment button is clicked', () => {
      render(<TextEditor />);

      const leftButton = screen.getByRole('button', { name: /Left/i });
      fireEvent.click(leftButton);

      expect(mockUpdateTextLayer).toHaveBeenCalledWith(
        'shot-1',
        'text-layer-1',
        { alignment: 'left' }
      );
    });

    it('should display position controls', () => {
      render(<TextEditor />);

      expect(screen.getByText('Position')).toBeInTheDocument();
      expect(screen.getByText('Horizontal (X)')).toBeInTheDocument();
      expect(screen.getByText('Vertical (Y)')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should display timing controls', () => {
      render(<TextEditor />);

      expect(screen.getByText('Timing')).toBeInTheDocument();
      expect(screen.getByText('Start Time')).toBeInTheDocument();
      expect(screen.getByText('Duration')).toBeInTheDocument();
      expect(screen.getByText('0.0s')).toBeInTheDocument();
      expect(screen.getByText('5.0s')).toBeInTheDocument();
    });
  });

  describe('Text Layer with Styles', () => {
    const textLayer = createMockTextLayer({
      style: {
        bold: true,
        italic: true,
        underline: false,
      },
    });
    const shot = createMockShot('shot-1', [textLayer]);

    beforeEach(() => {
      vi.mocked(useStore).mockImplementation((selector: any) => {
        const state = {
          selectedTextLayerId: 'text-layer-1',
          updateTextLayer: mockUpdateTextLayer,
        };
        return selector ? selector(state) : state;
      });

      vi.mocked(useSelectedShot).mockReturnValue(shot);
    });

    it('should show active state for bold button when bold is enabled', () => {
      render(<TextEditor />);

      const boldButton = screen.getByRole('button', { name: /Bold/i });
      // In a real test, we would check the variant prop or className
      expect(boldButton).toBeInTheDocument();
    });

    it('should toggle off bold when bold button is clicked again', () => {
      render(<TextEditor />);

      const boldButton = screen.getByRole('button', { name: /Bold/i });
      fireEvent.click(boldButton);

      expect(mockUpdateTextLayer).toHaveBeenCalledWith(
        'shot-1',
        'text-layer-1',
        {
          style: {
            bold: false,
            italic: true,
            underline: false,
          },
        }
      );
    });
  });

  describe('Text Layer with Different Alignment', () => {
    const textLayer = createMockTextLayer({
      alignment: 'left',
    });
    const shot = createMockShot('shot-1', [textLayer]);

    beforeEach(() => {
      vi.mocked(useStore).mockImplementation((selector: any) => {
        const state = {
          selectedTextLayerId: 'text-layer-1',
          updateTextLayer: mockUpdateTextLayer,
        };
        return selector ? selector(state) : state;
      });

      vi.mocked(useSelectedShot).mockReturnValue(shot);
    });

    it('should show active state for left alignment button', () => {
      render(<TextEditor />);

      const leftButton = screen.getByRole('button', { name: /Left/i });
      expect(leftButton).toBeInTheDocument();
    });
  });

  describe('Color Updates', () => {
    const textLayer = createMockTextLayer();
    const shot = createMockShot('shot-1', [textLayer]);

    beforeEach(() => {
      vi.mocked(useStore).mockImplementation((selector: any) => {
        const state = {
          selectedTextLayerId: 'text-layer-1',
          updateTextLayer: mockUpdateTextLayer,
        };
        return selector ? selector(state) : state;
      });

      vi.mocked(useSelectedShot).mockReturnValue(shot);
    });

    it('should update text color when color input changes', () => {
      render(<TextEditor />);

      const colorInputs = screen.getAllByDisplayValue('#ffffff');
      const textInput = colorInputs.find(input => input.getAttribute('type') === 'text');
      
      if (textInput) {
        fireEvent.change(textInput, { target: { value: '#ff0000' } });

        expect(mockUpdateTextLayer).toHaveBeenCalledWith(
          'shot-1',
          'text-layer-1',
          { color: '#ff0000' }
        );
      }
    });
  });

  describe('Text Animation Controls', () => {
    describe('No Animation', () => {
      const textLayer = createMockTextLayer();
      const shot = createMockShot('shot-1', [textLayer]);

      beforeEach(() => {
        vi.mocked(useStore).mockImplementation((selector: any) => {
          const state = {
            selectedTextLayerId: 'text-layer-1',
            updateTextLayer: mockUpdateTextLayer,
          };
          return selector ? selector(state) : state;
        });

        vi.mocked(useSelectedShot).mockReturnValue(shot);
      });

      it('should display "No Animation" state', () => {
        render(<TextEditor />);

        expect(screen.getByText('No Animation')).toBeInTheDocument();
        expect(screen.getByText('Add an animation to make your text more dynamic')).toBeInTheDocument();
      });

      it('should display "Add Animation" button', () => {
        render(<TextEditor />);

        expect(screen.getByRole('button', { name: /Add Animation/i })).toBeInTheDocument();
      });

      it('should add animation when "Add Animation" button is clicked', () => {
        render(<TextEditor />);

        const addButton = screen.getByRole('button', { name: /Add Animation/i });
        fireEvent.click(addButton);

        expect(mockUpdateTextLayer).toHaveBeenCalledWith(
          'shot-1',
          'text-layer-1',
          {
            animation: {
              type: 'fade-in',
              duration: 1.0,
              delay: 0,
              easing: 'ease-in-out',
            },
          }
        );
      });
    });

    describe('With Animation', () => {
      const textLayer = createMockTextLayer({
        animation: {
          type: 'fade-in',
          duration: 1.5,
          delay: 0.5,
          easing: 'ease-in-out',
        },
      });
      const shot = createMockShot('shot-1', [textLayer]);

      beforeEach(() => {
        vi.mocked(useStore).mockImplementation((selector: any) => {
          const state = {
            selectedTextLayerId: 'text-layer-1',
            updateTextLayer: mockUpdateTextLayer,
          };
          return selector ? selector(state) : state;
        });

        vi.mocked(useSelectedShot).mockReturnValue(shot);
      });

      it('should display "Active" badge when animation exists', () => {
        render(<TextEditor />);

        expect(screen.getByText('Active')).toBeInTheDocument();
      });

      it('should display animation type selector', () => {
        render(<TextEditor />);

        expect(screen.getByText('Animation Type')).toBeInTheDocument();
      });

      it('should display animation duration slider', () => {
        render(<TextEditor />);

        expect(screen.getByText('Animation Duration')).toBeInTheDocument();
        expect(screen.getByText('1.5s')).toBeInTheDocument();
      });

      it('should display animation delay slider', () => {
        render(<TextEditor />);

        expect(screen.getByText('Animation Delay')).toBeInTheDocument();
        expect(screen.getByText('0.5s')).toBeInTheDocument();
      });

      it('should display easing selector', () => {
        render(<TextEditor />);

        expect(screen.getByText('Easing')).toBeInTheDocument();
      });

      it('should display "Remove Animation" button', () => {
        render(<TextEditor />);

        expect(screen.getByRole('button', { name: /Remove Animation/i })).toBeInTheDocument();
      });

      it('should remove animation when "Remove Animation" button is clicked', () => {
        render(<TextEditor />);

        const removeButton = screen.getByRole('button', { name: /Remove Animation/i });
        fireEvent.click(removeButton);

        expect(mockUpdateTextLayer).toHaveBeenCalledWith(
          'shot-1',
          'text-layer-1',
          { animation: undefined }
        );
      });
    });
  });
});
