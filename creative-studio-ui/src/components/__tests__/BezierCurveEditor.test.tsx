import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BezierCurveEditor } from '../BezierCurveEditor';
import type { Point } from '../../types';

describe('BezierCurveEditor', () => {
  const mockOnChange = vi.fn();
  const defaultCp1: Point = { x: 0.25, y: 0.25 };
  const defaultCp2: Point = { x: 0.75, y: 0.75 };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render bezier curve editor with canvas', () => {
      render(
        <BezierCurveEditor
          controlPoint1={defaultCp1}
          controlPoint2={defaultCp2}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Bezier Curve')).toBeInTheDocument();
      expect(screen.getByText('Reset')).toBeInTheDocument();
      const canvas = document.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should render control point inputs', () => {
      render(
        <BezierCurveEditor
          controlPoint1={defaultCp1}
          controlPoint2={defaultCp2}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Control Point 1')).toBeInTheDocument();
      expect(screen.getByText('Control Point 2')).toBeInTheDocument();

      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs).toHaveLength(4); // 2 points × 2 coordinates (X, Y)
    });

    it('should display current control point values', () => {
      render(
        <BezierCurveEditor
          controlPoint1={{ x: 0.42, y: 0.58 }}
          controlPoint2={{ x: 0.67, y: 0.89 }}
          onChange={mockOnChange}
        />
      );

      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs[0]).toHaveValue(0.42);
      expect(inputs[1]).toHaveValue(0.58);
      expect(inputs[2]).toHaveValue(0.67);
      expect(inputs[3]).toHaveValue(0.89);
    });

    it('should render help text', () => {
      render(
        <BezierCurveEditor
          controlPoint1={defaultCp1}
          controlPoint2={defaultCp2}
          onChange={mockOnChange}
        />
      );

      expect(
        screen.getByText('Drag the blue control points to adjust the curve shape')
      ).toBeInTheDocument();
    });
  });

  describe('Control Point Updates', () => {
    it('should update control point 1 X coordinate', () => {
      render(
        <BezierCurveEditor
          controlPoint1={defaultCp1}
          controlPoint2={defaultCp2}
          onChange={mockOnChange}
        />
      );

      const inputs = screen.getAllByRole('spinbutton');
      const cp1XInput = inputs[0];

      fireEvent.change(cp1XInput, { target: { value: '0.5' } });

      expect(mockOnChange).toHaveBeenCalledWith(
        { x: 0.5, y: 0.25 },
        defaultCp2
      );
    });

    it('should update control point 1 Y coordinate', () => {
      render(
        <BezierCurveEditor
          controlPoint1={defaultCp1}
          controlPoint2={defaultCp2}
          onChange={mockOnChange}
        />
      );

      const inputs = screen.getAllByRole('spinbutton');
      const cp1YInput = inputs[1];

      fireEvent.change(cp1YInput, { target: { value: '0.6' } });

      expect(mockOnChange).toHaveBeenCalledWith(
        { x: 0.25, y: 0.6 },
        defaultCp2
      );
    });

    it('should update control point 2 X coordinate', () => {
      render(
        <BezierCurveEditor
          controlPoint1={defaultCp1}
          controlPoint2={defaultCp2}
          onChange={mockOnChange}
        />
      );

      const inputs = screen.getAllByRole('spinbutton');
      const cp2XInput = inputs[2];

      fireEvent.change(cp2XInput, { target: { value: '0.8' } });

      expect(mockOnChange).toHaveBeenCalledWith(
        defaultCp1,
        { x: 0.8, y: 0.75 }
      );
    });

    it('should update control point 2 Y coordinate', () => {
      render(
        <BezierCurveEditor
          controlPoint1={defaultCp1}
          controlPoint2={defaultCp2}
          onChange={mockOnChange}
        />
      );

      const inputs = screen.getAllByRole('spinbutton');
      const cp2YInput = inputs[3];

      fireEvent.change(cp2YInput, { target: { value: '0.9' } });

      expect(mockOnChange).toHaveBeenCalledWith(
        defaultCp1,
        { x: 0.75, y: 0.9 }
      );
    });
  });

  describe('Reset Functionality', () => {
    it('should reset control points to default values', () => {
      render(
        <BezierCurveEditor
          controlPoint1={{ x: 0.1, y: 0.2 }}
          controlPoint2={{ x: 0.8, y: 0.9 }}
          onChange={mockOnChange}
        />
      );

      const resetButton = screen.getByText('Reset');
      fireEvent.click(resetButton);

      expect(mockOnChange).toHaveBeenCalledWith(
        { x: 0.25, y: 0.25 },
        { x: 0.75, y: 0.75 }
      );
    });
  });

  describe('Canvas Interactions', () => {
    it('should render canvas with correct dimensions', () => {
      render(
        <BezierCurveEditor
          controlPoint1={defaultCp1}
          controlPoint2={defaultCp2}
          onChange={mockOnChange}
        />
      );

      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      expect(canvas).toBeInTheDocument();
      expect(canvas.width).toBe(200);
      expect(canvas.height).toBe(200);
    });

    it('should have crosshair cursor on canvas', () => {
      render(
        <BezierCurveEditor
          controlPoint1={defaultCp1}
          controlPoint2={defaultCp2}
          onChange={mockOnChange}
        />
      );

      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      expect(canvas).toHaveClass('cursor-crosshair');
    });

    it('should handle mouse down event', () => {
      render(
        <BezierCurveEditor
          controlPoint1={defaultCp1}
          controlPoint2={defaultCp2}
          onChange={mockOnChange}
        />
      );

      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });

      // Should not throw error
      expect(canvas).toBeInTheDocument();
    });

    it('should handle mouse move event', () => {
      render(
        <BezierCurveEditor
          controlPoint1={defaultCp1}
          controlPoint2={defaultCp2}
          onChange={mockOnChange}
        />
      );

      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      fireEvent.mouseMove(canvas, { clientX: 120, clientY: 120 });

      // Should not throw error
      expect(canvas).toBeInTheDocument();
    });

    it('should handle mouse up event', () => {
      render(
        <BezierCurveEditor
          controlPoint1={defaultCp1}
          controlPoint2={defaultCp2}
          onChange={mockOnChange}
        />
      );

      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      fireEvent.mouseUp(canvas);

      // Should not throw error
      expect(canvas).toBeInTheDocument();
    });

    it('should handle mouse leave event', () => {
      render(
        <BezierCurveEditor
          controlPoint1={defaultCp1}
          controlPoint2={defaultCp2}
          onChange={mockOnChange}
        />
      );

      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      fireEvent.mouseLeave(canvas);

      // Should not throw error
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Input Validation', () => {
    it('should have min and max constraints on inputs', () => {
      render(
        <BezierCurveEditor
          controlPoint1={defaultCp1}
          controlPoint2={defaultCp2}
          onChange={mockOnChange}
        />
      );

      const inputs = screen.getAllByRole('spinbutton');
      inputs.forEach((input) => {
        expect(input).toHaveAttribute('min', '0');
        expect(input).toHaveAttribute('max', '1');
        expect(input).toHaveAttribute('step', '0.01');
      });
    });

    it('should display values with 2 decimal places', () => {
      render(
        <BezierCurveEditor
          controlPoint1={{ x: 0.123456, y: 0.789012 }}
          controlPoint2={{ x: 0.345678, y: 0.901234 }}
          onChange={mockOnChange}
        />
      );

      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs[0]).toHaveValue(0.12); // Rounded to 2 decimals
      expect(inputs[1]).toHaveValue(0.79);
      expect(inputs[2]).toHaveValue(0.35);
      expect(inputs[3]).toHaveValue(0.9);
    });
  });

  describe('Visual Feedback', () => {
    it('should have white background on canvas', () => {
      render(
        <BezierCurveEditor
          controlPoint1={defaultCp1}
          controlPoint2={defaultCp2}
          onChange={mockOnChange}
        />
      );

      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      expect(canvas).toHaveClass('bg-white');
    });

    it('should have border and rounded corners on canvas', () => {
      render(
        <BezierCurveEditor
          controlPoint1={defaultCp1}
          controlPoint2={defaultCp2}
          onChange={mockOnChange}
        />
      );

      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      expect(canvas).toHaveClass('border');
      expect(canvas).toHaveClass('rounded');
    });
  });

  describe('Edge Cases', () => {
    it('should handle control points at boundaries', () => {
      render(
        <BezierCurveEditor
          controlPoint1={{ x: 0, y: 0 }}
          controlPoint2={{ x: 1, y: 1 }}
          onChange={mockOnChange}
        />
      );

      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs[0]).toHaveValue(0);
      expect(inputs[1]).toHaveValue(0);
      expect(inputs[2]).toHaveValue(1);
      expect(inputs[3]).toHaveValue(1);
    });

    it('should handle identical control points', () => {
      const samePoint: Point = { x: 0.5, y: 0.5 };
      render(
        <BezierCurveEditor
          controlPoint1={samePoint}
          controlPoint2={samePoint}
          onChange={mockOnChange}
        />
      );

      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs[0]).toHaveValue(0.5);
      expect(inputs[1]).toHaveValue(0.5);
      expect(inputs[2]).toHaveValue(0.5);
      expect(inputs[3]).toHaveValue(0.5);
    });
  });
});
