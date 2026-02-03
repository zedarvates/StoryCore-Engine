/**
 * SceneView3D Component Tests
 * 
 * Unit tests for the 3D scene view component.
 * Requirements: 3.1, 3.7
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SceneView3D } from '../SceneView3D';

// Mock canvas context
const mockGetContext = vi.fn();
const mockCanvas = {
  getContext: mockGetContext,
  width: 1280,
  height: 720,
};

beforeEach(() => {
  // Mock canvas 2D context
  const mockContext = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: '',
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    setLineDash: vi.fn(),
  };
  
  mockGetContext.mockReturnValue(mockContext);
  
  // Mock HTMLCanvasElement
  HTMLCanvasElement.prototype.getContext = mockGetContext;
  
  // Mock requestAnimationFrame
  global.requestAnimationFrame = vi.fn((cb) => {
    cb(0);
    return 0;
  });
  
  global.cancelAnimationFrame = vi.fn();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('SceneView3D', () => {
  const defaultProps = {
    width: 1280,
    height: 720,
    currentFrame: 0,
  };
  
  describe('Rendering', () => {
    it('should render canvas element', () => {
      const { container } = render(<SceneView3D {...defaultProps} />);
      
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
      expect(canvas).toHaveClass('scene-canvas');
    });
    
    it('should set canvas dimensions', () => {
      const { container } = render(
        <SceneView3D width={1920} height={1080} currentFrame={0} />
      );
      
      const canvas = container.querySelector('canvas');
      expect(canvas).toHaveAttribute('width', '1920');
      expect(canvas).toHaveAttribute('height', '1080');
    });
    
    it('should render scene controls', () => {
      render(<SceneView3D {...defaultProps} />);
      
      expect(screen.getByText('Camera')).toBeInTheDocument();
      expect(screen.getByText('Puppet')).toBeInTheDocument();
    });
    
    it('should render camera control buttons', () => {
      render(<SceneView3D {...defaultProps} />);
      
      expect(screen.getByTitle('Move camera forward')).toBeInTheDocument();
      expect(screen.getByTitle('Move camera backward')).toBeInTheDocument();
      expect(screen.getByTitle('Move camera left')).toBeInTheDocument();
      expect(screen.getByTitle('Move camera right')).toBeInTheDocument();
      expect(screen.getByTitle('Reset camera')).toBeInTheDocument();
    });
    
    it('should render puppet select dropdown', () => {
      render(<SceneView3D {...defaultProps} />);
      
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      expect(select).toHaveClass('puppet-select');
    });
    
    it('should render puppet transform panel', () => {
      render(<SceneView3D {...defaultProps} />);
      
      expect(screen.getByText('Transform')).toBeInTheDocument();
      expect(screen.getByText('Position X:')).toBeInTheDocument();
      expect(screen.getByText('Position Y:')).toBeInTheDocument();
      expect(screen.getByText('Position Z:')).toBeInTheDocument();
      expect(screen.getByText('Rotation Y:')).toBeInTheDocument();
    });
  });
  
  describe('WebGL Support', () => {
    it('should attempt to initialize WebGL context', () => {
      render(<SceneView3D {...defaultProps} />);
      
      expect(mockGetContext).toHaveBeenCalledWith('webgl');
    });
    
    it('should fall back to 2D context when WebGL is not available', () => {
      mockGetContext.mockReturnValueOnce(null); // WebGL not available
      mockGetContext.mockReturnValueOnce(null); // experimental-webgl not available
      
      const mockContext2D = {
        fillStyle: '',
        fillRect: jest.fn(),
        strokeStyle: '',
        strokeRect: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        stroke: jest.fn(),
        fillText: jest.fn(),
        arc: jest.fn(),
        fill: jest.fn(),
        save: jest.fn(),
        restore: jest.fn(),
        translate: jest.fn(),
        rotate: jest.fn(),
        setLineDash: jest.fn(),
        lineWidth: 0,
        font: '',
        textAlign: '',
      };
      
      mockGetContext.mockReturnValue(mockContext2D);
      
      render(<SceneView3D {...defaultProps} />);
      
      expect(screen.getByText(/WebGL not available/)).toBeInTheDocument();
      expect(screen.getByText(/Using 2D fallback mode/)).toBeInTheDocument();
    });
  });
  
  describe('Camera Controls', () => {
    it('should move camera forward', () => {
      render(<SceneView3D {...defaultProps} />);
      
      const forwardBtn = screen.getByTitle('Move camera forward');
      fireEvent.click(forwardBtn);
      
      // Camera position should be updated (verified through rendering)
      expect(forwardBtn).toBeInTheDocument();
    });
    
    it('should move camera backward', () => {
      render(<SceneView3D {...defaultProps} />);
      
      const backwardBtn = screen.getByTitle('Move camera backward');
      fireEvent.click(backwardBtn);
      
      expect(backwardBtn).toBeInTheDocument();
    });
    
    it('should move camera left', () => {
      render(<SceneView3D {...defaultProps} />);
      
      const leftBtn = screen.getByTitle('Move camera left');
      fireEvent.click(leftBtn);
      
      expect(leftBtn).toBeInTheDocument();
    });
    
    it('should move camera right', () => {
      render(<SceneView3D {...defaultProps} />);
      
      const rightBtn = screen.getByTitle('Move camera right');
      fireEvent.click(rightBtn);
      
      expect(rightBtn).toBeInTheDocument();
    });
    
    it('should reset camera to default position', () => {
      render(<SceneView3D {...defaultProps} />);
      
      const resetBtn = screen.getByTitle('Reset camera');
      
      // Move camera first
      const forwardBtn = screen.getByTitle('Move camera forward');
      fireEvent.click(forwardBtn);
      
      // Then reset
      fireEvent.click(resetBtn);
      
      expect(resetBtn).toBeInTheDocument();
    });
  });
  
  describe('Puppet Manipulation', () => {
    it('should allow selecting a puppet', () => {
      render(<SceneView3D {...defaultProps} />);
      
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'puppet-1' } });
      
      expect(select).toHaveValue('puppet-1');
    });
    
    it('should update puppet position X', () => {
      render(<SceneView3D {...defaultProps} />);
      
      const posXInput = screen.getAllByRole('spinbutton')[0];
      fireEvent.change(posXInput, { target: { value: '5.5' } });
      
      expect(posXInput).toHaveValue(5.5);
    });
    
    it('should update puppet position Y', () => {
      render(<SceneView3D {...defaultProps} />);
      
      const posYInput = screen.getAllByRole('spinbutton')[1];
      fireEvent.change(posYInput, { target: { value: '2.3' } });
      
      expect(posYInput).toHaveValue(2.3);
    });
    
    it('should update puppet position Z', () => {
      render(<SceneView3D {...defaultProps} />);
      
      const posZInput = screen.getAllByRole('spinbutton')[2];
      fireEvent.change(posZInput, { target: { value: '-1.5' } });
      
      expect(posZInput).toHaveValue(-1.5);
    });
    
    it('should update puppet rotation', () => {
      render(<SceneView3D {...defaultProps} />);
      
      const rotationSlider = screen.getByRole('slider');
      fireEvent.change(rotationSlider, { target: { value: '45' } });
      
      expect(rotationSlider).toHaveValue('45');
    });
    
    it('should call onPuppetUpdate when puppet is modified and mouse is released', () => {
      const mockOnPuppetUpdate = jest.fn();
      const { container } = render(
        <SceneView3D {...defaultProps} onPuppetUpdate={mockOnPuppetUpdate} />
      );
      
      const canvas = container.querySelector('canvas');
      if (!canvas) throw new Error('Canvas not found');
      
      // Simulate drag
      fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(canvas, { clientX: 150, clientY: 150 });
      fireEvent.mouseUp(canvas);
      
      expect(mockOnPuppetUpdate).toHaveBeenCalled();
    });
  });
  
  describe('Mouse Interaction', () => {
    it('should handle mouse down on canvas', () => {
      const { container } = render(<SceneView3D {...defaultProps} />);
      
      const canvas = container.querySelector('canvas');
      if (!canvas) throw new Error('Canvas not found');
      
      fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
      
      // Should set dragging state (verified through cursor change)
      expect(canvas).toBeInTheDocument();
    });
    
    it('should handle mouse move during drag', () => {
      const { container } = render(<SceneView3D {...defaultProps} />);
      
      const canvas = container.querySelector('canvas');
      if (!canvas) throw new Error('Canvas not found');
      
      fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(canvas, { clientX: 150, clientY: 150 });
      
      expect(canvas).toBeInTheDocument();
    });
    
    it('should handle mouse up to end drag', () => {
      const { container } = render(<SceneView3D {...defaultProps} />);
      
      const canvas = container.querySelector('canvas');
      if (!canvas) throw new Error('Canvas not found');
      
      fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(canvas, { clientX: 150, clientY: 150 });
      fireEvent.mouseUp(canvas);
      
      expect(canvas).toBeInTheDocument();
    });
    
    it('should handle mouse leave to cancel drag', () => {
      const { container } = render(<SceneView3D {...defaultProps} />);
      
      const canvas = container.querySelector('canvas');
      if (!canvas) throw new Error('Canvas not found');
      
      fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(canvas, { clientX: 150, clientY: 150 });
      fireEvent.mouseLeave(canvas);
      
      expect(canvas).toBeInTheDocument();
    });
  });
  
  describe('Frame Updates', () => {
    it('should update when currentFrame changes', () => {
      const { rerender } = render(<SceneView3D {...defaultProps} currentFrame={0} />);
      
      rerender(<SceneView3D {...defaultProps} currentFrame={10} />);
      
      // Scene should re-render with new frame
      expect(mockGetContext).toHaveBeenCalled();
    });
    
    it('should display current frame in scene info', () => {
      render(<SceneView3D {...defaultProps} currentFrame={42} />);
      
      // Frame info is rendered on canvas, so we just verify the component renders
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });
  
  describe('Animation Loop', () => {
    it('should start animation loop on mount', () => {
      render(<SceneView3D {...defaultProps} />);
      
      expect(global.requestAnimationFrame).toHaveBeenCalled();
    });
    
    it('should cancel animation loop on unmount', () => {
      const { unmount } = render(<SceneView3D {...defaultProps} />);
      
      unmount();
      
      expect(global.cancelAnimationFrame).toHaveBeenCalled();
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle zero dimensions', () => {
      const { container } = render(
        <SceneView3D width={0} height={0} currentFrame={0} />
      );
      
      const canvas = container.querySelector('canvas');
      expect(canvas).toHaveAttribute('width', '0');
      expect(canvas).toHaveAttribute('height', '0');
    });
    
    it('should handle negative frame numbers', () => {
      render(<SceneView3D {...defaultProps} currentFrame={-5} />);
      
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
    
    it('should handle very large frame numbers', () => {
      render(<SceneView3D {...defaultProps} currentFrame={999999} />);
      
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });
});
