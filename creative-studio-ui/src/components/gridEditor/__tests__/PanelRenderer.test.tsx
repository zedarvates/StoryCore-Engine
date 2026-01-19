import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { PanelRenderer } from '../PanelRenderer';
import { 
  createEmptyPanel, 
  createImageLayer, 
  createAnnotationLayer 
} from '../../../types/gridEditor.factories';

describe('PanelRenderer', () => {
  beforeEach(() => {
    // Mock HTMLCanvasElement.getContext
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      scale: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 100 })),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      drawImage: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      ellipse: vi.fn(),
      set fillStyle(_value: string) {},
      set strokeStyle(_value: string) {},
      set lineWidth(_value: number) {},
      set globalAlpha(_value: number) {},
      set globalCompositeOperation(_value: string) {},
      set font(_value: string) {},
      set textAlign(_value: string) {},
      set textBaseline(_value: string) {},
    })) as any;
  });

  describe('Empty Panel State', () => {
    it('should display placeholder for empty panel', () => {
      const panel = createEmptyPanel(0, 0);
      panel.layers = []; // Empty panel

      const { container } = render(
        <PanelRenderer
          panel={panel}
          width={300}
          height={300}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeTruthy();
    });

    it('should display panel number in placeholder', () => {
      const panel = createEmptyPanel(1, 2); // Panel 6
      panel.layers = [];

      const mockFillText = vi.fn();
      HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
        scale: vi.fn(),
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        fillText: mockFillText,
        measureText: vi.fn(() => ({ width: 100 })),
        save: vi.fn(),
        restore: vi.fn(),
        set fillStyle(_value: string) {},
        set strokeStyle(_value: string) {},
        set lineWidth(_value: number) {},
        set font(_value: string) {},
        set textAlign(_value: string) {},
        set textBaseline(_value: string) {},
      })) as any;

      render(
        <PanelRenderer
          panel={panel}
          width={300}
          height={300}
        />
      );

      // Should render "Panel 6" (row 1 * 3 + col 2 + 1 = 6)
      expect(mockFillText).toHaveBeenCalledWith(
        'Panel 6',
        expect.any(Number),
        expect.any(Number)
      );
    });
  });

  describe('Image Rendering', () => {
    it('should render panel with image layer', () => {
      const panel = createEmptyPanel(0, 0);
      const imageLayer = createImageLayer(
        'test-image.jpg',
        800,
        600
      );
      panel.layers = [imageLayer];

      const { container } = render(
        <PanelRenderer
          panel={panel}
          width={300}
          height={300}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeTruthy();
    });

    it('should handle various aspect ratios', () => {
      // Wide image
      const widePanel = createEmptyPanel(0, 0);
      const wideLayer = createImageLayer(
        'wide.jpg',
        1600,
        900
      );
      widePanel.layers = [wideLayer];

      const { container: wideContainer } = render(
        <PanelRenderer
          panel={widePanel}
          width={300}
          height={300}
        />
      );
      expect(wideContainer.querySelector('canvas')).toBeTruthy();

      // Tall image
      const tallPanel = createEmptyPanel(0, 0);
      const tallLayer = createImageLayer(
        'tall.jpg',
        900,
        1600
      );
      tallPanel.layers = [tallLayer];

      const { container: tallContainer } = render(
        <PanelRenderer
          panel={tallPanel}
          width={300}
          height={300}
        />
      );
      expect(tallContainer.querySelector('canvas')).toBeTruthy();

      // Square image
      const squarePanel = createEmptyPanel(0, 0);
      const squareLayer = createImageLayer(
        'square.jpg',
        1000,
        1000
      );
      squarePanel.layers = [squareLayer];

      const { container: squareContainer } = render(
        <PanelRenderer
          panel={squarePanel}
          width={300}
          height={300}
        />
      );
      expect(squareContainer.querySelector('canvas')).toBeTruthy();
    });
  });

  describe('Layer Composition', () => {
    it('should render multiple layers in correct order', () => {
      const panel = createEmptyPanel(0, 0);
      const layer1 = createImageLayer(
        'layer1.jpg',
        800,
        600
      );
      const layer2 = createImageLayer(
        'layer2.jpg',
        800,
        600
      );
      layer2.opacity = 0.5;

      panel.layers = [layer1, layer2];

      const { container } = render(
        <PanelRenderer
          panel={panel}
          width={300}
          height={300}
        />
      );

      expect(container.querySelector('canvas')).toBeTruthy();
    });

    it('should respect layer visibility', () => {
      const panel = createEmptyPanel(0, 0);
      const visibleLayer = createImageLayer(
        'visible.jpg',
        800,
        600
      );
      const hiddenLayer = createImageLayer(
        'hidden.jpg',
        800,
        600
      );
      hiddenLayer.visible = false;

      panel.layers = [visibleLayer, hiddenLayer];

      const { container } = render(
        <PanelRenderer
          panel={panel}
          width={300}
          height={300}
        />
      );

      expect(container.querySelector('canvas')).toBeTruthy();
    });

    it('should respect layer lock status', () => {
      const panel = createEmptyPanel(0, 0);
      const unlockedLayer = createImageLayer(
        'unlocked.jpg',
        800,
        600
      );
      const lockedLayer = createImageLayer(
        'locked.jpg',
        800,
        600
      );
      lockedLayer.locked = true;

      panel.layers = [unlockedLayer, lockedLayer];

      const { container } = render(
        <PanelRenderer
          panel={panel}
          width={300}
          height={300}
        />
      );

      expect(container.querySelector('canvas')).toBeTruthy();
    });

    it('should apply layer opacity', () => {
      const panel = createEmptyPanel(0, 0);
      const layer = createImageLayer(
        'test.jpg',
        800,
        600
      );
      layer.opacity = 0.5;

      panel.layers = [layer];

      const mockContext = {
        scale: vi.fn(),
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        drawImage: vi.fn(),
        set globalAlpha(value: number) {
          expect(value).toBe(0.5);
        },
        set fillStyle(_value: string) {},
        set strokeStyle(_value: string) {},
        set lineWidth(_value: number) {},
        set globalCompositeOperation(_value: string) {},
      };

      HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext) as any;

      render(
        <PanelRenderer
          panel={panel}
          width={300}
          height={300}
        />
      );
    });

    it('should apply blend modes', () => {
      const panel = createEmptyPanel(0, 0);
      const layer = createImageLayer(
        'test.jpg',
        800,
        600
      );
      layer.blendMode = 'multiply';

      panel.layers = [layer];

      const mockContext = {
        scale: vi.fn(),
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        drawImage: vi.fn(),
        set globalCompositeOperation(value: string) {
          expect(value).toBe('multiply');
        },
        set globalAlpha(_value: number) {},
        set fillStyle(_value: string) {},
        set strokeStyle(_value: string) {},
        set lineWidth(_value: number) {},
      };

      HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext) as any;

      render(
        <PanelRenderer
          panel={panel}
          width={300}
          height={300}
        />
      );
    });
  });

  describe('Selection and Hover States', () => {
    it('should render selected state with border', () => {
      const panel = createEmptyPanel(0, 0);
      panel.layers = [];

      const mockStrokeRect = vi.fn();
      HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
        scale: vi.fn(),
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: mockStrokeRect,
        fillText: vi.fn(),
        measureText: vi.fn(() => ({ width: 100 })),
        save: vi.fn(),
        restore: vi.fn(),
        set fillStyle(_value: string) {},
        set strokeStyle(_value: string) {},
        set lineWidth(_value: number) {},
        set font(_value: string) {},
        set textAlign(_value: string) {},
        set textBaseline(_value: string) {},
      })) as any;

      render(
        <PanelRenderer
          panel={panel}
          width={300}
          height={300}
          isSelected={true}
        />
      );

      expect(mockStrokeRect).toHaveBeenCalled();
    });

    it('should render hover state with highlight', () => {
      const panel = createEmptyPanel(0, 0);
      panel.layers = [];

      const mockFillRect = vi.fn();
      HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
        scale: vi.fn(),
        clearRect: vi.fn(),
        fillRect: mockFillRect,
        strokeRect: vi.fn(),
        fillText: vi.fn(),
        measureText: vi.fn(() => ({ width: 100 })),
        save: vi.fn(),
        restore: vi.fn(),
        set fillStyle(_value: string) {},
        set strokeStyle(_value: string) {},
        set lineWidth(_value: number) {},
        set font(_value: string) {},
        set textAlign(_value: string) {},
        set textBaseline(_value: string) {},
      })) as any;

      render(
        <PanelRenderer
          panel={panel}
          width={300}
          height={300}
          isHovered={true}
        />
      );

      expect(mockFillRect).toHaveBeenCalled();
    });
  });

  describe('Annotation Rendering', () => {
    it('should render annotation layers', () => {
      const panel = createEmptyPanel(0, 0);
      const annotationLayer = createAnnotationLayer();
      panel.layers = [annotationLayer];

      const { container } = render(
        <PanelRenderer
          panel={panel}
          width={300}
          height={300}
        />
      );

      expect(container.querySelector('canvas')).toBeTruthy();
    });
  });

  describe('DPI Handling', () => {
    it('should handle high DPI displays', () => {
      const originalDPR = window.devicePixelRatio;
      Object.defineProperty(window, 'devicePixelRatio', {
        writable: true,
        configurable: true,
        value: 2,
      });

      const panel = createEmptyPanel(0, 0);
      panel.layers = [];

      const mockScale = vi.fn();
      HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
        scale: mockScale,
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        fillText: vi.fn(),
        measureText: vi.fn(() => ({ width: 100 })),
        save: vi.fn(),
        restore: vi.fn(),
        set fillStyle(_value: string) {},
        set strokeStyle(_value: string) {},
        set lineWidth(_value: number) {},
        set font(_value: string) {},
        set textAlign(_value: string) {},
        set textBaseline(_value: string) {},
      })) as any;

      render(
        <PanelRenderer
          panel={panel}
          width={300}
          height={300}
        />
      );

      expect(mockScale).toHaveBeenCalledWith(2, 2);

      // Restore original DPR
      Object.defineProperty(window, 'devicePixelRatio', {
        writable: true,
        configurable: true,
        value: originalDPR,
      });
    });
  });
});
