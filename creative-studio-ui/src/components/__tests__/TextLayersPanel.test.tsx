import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TextLayersPanel } from '../TextLayersPanel';
import { useStore, useSelectedShot } from '../../store';
import type { Shot, TextLayer } from '../../types';

// Mock the store
vi.mock('../../store', () => ({
  useStore: vi.fn(),
  useSelectedShot: vi.fn(),
}));

describe('TextLayersPanel', () => {
  const mockAddTextLayer = vi.fn();
  const mockDeleteTextLayer = vi.fn();
  const mockUpdateTextLayer = vi.fn();
  const mockSelectTextLayer = vi.fn();

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

  describe('No Shot Selected', () => {
    beforeEach(() => {
      vi.mocked(useStore).mockImplementation((selector: any) => {
        const state = {
          addTextLayer: mockAddTextLayer,
          deleteTextLayer: mockDeleteTextLayer,
          updateTextLayer: mockUpdateTextLayer,
          selectTextLayer: mockSelectTextLayer,
          selectedTextLayerId: null,
        };
        return selector ? selector(state) : state;
      });

      vi.mocked(useSelectedShot).mockReturnValue(null);
    });

    it('should display "No Shot Selected" message when no shot is selected', () => {
      render(<TextLayersPanel />);

      expect(screen.getByText('No Shot Selected')).toBeInTheDocument();
      expect(screen.getByText('Select a shot to manage text layers')).toBeInTheDocument();
    });
  });

  describe('Empty Text Layers', () => {
    const shot = createMockShot('shot-1', []);

    beforeEach(() => {
      vi.mocked(useStore).mockImplementation((selector: any) => {
        const state = {
          addTextLayer: mockAddTextLayer,
          deleteTextLayer: mockDeleteTextLayer,
          updateTextLayer: mockUpdateTextLayer,
          selectTextLayer: mockSelectTextLayer,
          selectedTextLayerId: null,
        };
        return selector ? selector(state) : state;
      });

      vi.mocked(useSelectedShot).mockReturnValue(shot);
    });

    it('should display header with text layers count', () => {
      render(<TextLayersPanel />);

      expect(screen.getByText('Text Layers')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should display "Add Text Layer" button', () => {
      render(<TextLayersPanel />);

      expect(screen.getByRole('button', { name: /Add Text Layer/i })).toBeInTheDocument();
    });

    it('should display empty state message', () => {
      render(<TextLayersPanel />);

      expect(screen.getByText('No Text Layers')).toBeInTheDocument();
      expect(screen.getByText('Add a text layer to display titles, captions, or annotations')).toBeInTheDocument();
    });

    it('should call addTextLayer when "Add Text Layer" button is clicked', () => {
      render(<TextLayersPanel />);

      const addButton = screen.getByRole('button', { name: /Add Text Layer/i });
      fireEvent.click(addButton);

      expect(mockAddTextLayer).toHaveBeenCalledWith(
        'shot-1',
        expect.objectContaining({
          content: 'New Text',
          font: 'Arial',
          fontSize: 48,
          color: '#ffffff',
          alignment: 'center',
        })
      );
    });

    it('should select newly created text layer', () => {
      render(<TextLayersPanel />);

      const addButton = screen.getByRole('button', { name: /Add Text Layer/i });
      fireEvent.click(addButton);

      expect(mockSelectTextLayer).toHaveBeenCalled();
    });
  });

  describe('With Text Layers', () => {
    const textLayer1 = createMockTextLayer({
      id: 'text-layer-1',
      content: 'Title Text',
      font: 'Arial',
      fontSize: 48,
      startTime: 0,
      duration: 5,
    });

    const textLayer2 = createMockTextLayer({
      id: 'text-layer-2',
      content: 'Subtitle Text',
      font: 'Helvetica',
      fontSize: 24,
      startTime: 2,
      duration: 3,
      style: {
        bold: true,
        italic: false,
        underline: false,
      },
    });

    const shot = createMockShot('shot-1', [textLayer1, textLayer2]);

    beforeEach(() => {
      vi.mocked(useStore).mockImplementation((selector: any) => {
        const state = {
          addTextLayer: mockAddTextLayer,
          deleteTextLayer: mockDeleteTextLayer,
          updateTextLayer: mockUpdateTextLayer,
          selectTextLayer: mockSelectTextLayer,
          selectedTextLayerId: null,
        };
        return selector ? selector(state) : state;
      });

      vi.mocked(useSelectedShot).mockReturnValue(shot);
    });

    it('should display correct text layers count', () => {
      render(<TextLayersPanel />);

      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should display all text layers', () => {
      render(<TextLayersPanel />);

      expect(screen.getByText('Title Text')).toBeInTheDocument();
      expect(screen.getByText('Subtitle Text')).toBeInTheDocument();
    });

    it('should display text layer properties', () => {
      render(<TextLayersPanel />);

      expect(screen.getByText('Arial')).toBeInTheDocument();
      expect(screen.getByText('48px')).toBeInTheDocument();
      expect(screen.getByText('Helvetica')).toBeInTheDocument();
      expect(screen.getByText('24px')).toBeInTheDocument();
    });

    it('should display timing information', () => {
      render(<TextLayersPanel />);

      // Check for formatted time strings
      expect(screen.getByText(/0:00\.0 - 0:05\.0/)).toBeInTheDocument();
      expect(screen.getByText(/0:02\.0 - 0:05\.0/)).toBeInTheDocument();
    });

    it('should display style badges for styled text', () => {
      render(<TextLayersPanel />);

      expect(screen.getByText('Bold')).toBeInTheDocument();
    });

    it('should call selectTextLayer when a layer is clicked', () => {
      render(<TextLayersPanel />);

      const layerItem = screen.getByText('Title Text').closest('div[class*="cursor-pointer"]');
      if (layerItem) {
        fireEvent.click(layerItem);
      }

      expect(mockSelectTextLayer).toHaveBeenCalledWith('text-layer-1');
    });

    it('should call deleteTextLayer when delete button is clicked', () => {
      render(<TextLayersPanel />);

      const deleteButtons = screen.getAllByRole('button');
      const deleteButton = deleteButtons.find(btn => 
        btn.querySelector('svg')?.classList.contains('lucide-trash')
      );

      if (deleteButton) {
        fireEvent.click(deleteButton);
      }

      expect(mockDeleteTextLayer).toHaveBeenCalledWith('shot-1', expect.any(String));
    });
  });

  describe('Selected Text Layer', () => {
    const textLayer = createMockTextLayer({
      id: 'text-layer-1',
      content: 'Selected Text',
    });

    const shot = createMockShot('shot-1', [textLayer]);

    beforeEach(() => {
      vi.mocked(useStore).mockImplementation((selector: any) => {
        const state = {
          addTextLayer: mockAddTextLayer,
          deleteTextLayer: mockDeleteTextLayer,
          updateTextLayer: mockUpdateTextLayer,
          selectTextLayer: mockSelectTextLayer,
          selectedTextLayerId: 'text-layer-1',
        };
        return selector ? selector(state) : state;
      });

      vi.mocked(useSelectedShot).mockReturnValue(shot);
    });

    it('should display "Selected" badge for selected layer', () => {
      render(<TextLayersPanel />);

      expect(screen.getByText('Selected')).toBeInTheDocument();
    });

    it('should apply selected styling to selected layer', () => {
      render(<TextLayersPanel />);

      const layerItem = screen.getByText('Selected Text').closest('div[class*="cursor-pointer"]');
      expect(layerItem?.className).toContain('border-primary');
    });
  });

  describe('Text Layer with Animation', () => {
    const textLayer = createMockTextLayer({
      id: 'text-layer-1',
      content: 'Animated Text',
      animation: {
        type: 'fade-in',
        duration: 1,
        delay: 0,
        easing: 'ease-in-out',
      },
    });

    const shot = createMockShot('shot-1', [textLayer]);

    beforeEach(() => {
      vi.mocked(useStore).mockImplementation((selector: any) => {
        const state = {
          addTextLayer: mockAddTextLayer,
          deleteTextLayer: mockDeleteTextLayer,
          updateTextLayer: mockUpdateTextLayer,
          selectTextLayer: mockSelectTextLayer,
          selectedTextLayerId: null,
        };
        return selector ? selector(state) : state;
      });

      vi.mocked(useSelectedShot).mockReturnValue(shot);
    });

    it('should display animation badge when layer has animation', () => {
      render(<TextLayersPanel />);

      expect(screen.getByText('fade-in')).toBeInTheDocument();
    });
  });
});
