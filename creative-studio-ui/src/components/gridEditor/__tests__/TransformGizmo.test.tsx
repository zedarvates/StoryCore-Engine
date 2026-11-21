/**
 * TransformGizmo Component Tests
 * 
 * Tests for the TransformGizmo component that renders interactive handles
 * for position, scale, and rotation transformations.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TransformGizmo } from '../TransformGizmo';
import { createEmptyPanel } from '../../../types/gridEditor.factories';
import type { Rectangle, Transform } from '../../../stores/gridEditorStore';

describe('TransformGizmo', () => {
  const mockBounds: Rectangle = {
    x: 100,
    y: 100,
    width: 200,
    height: 200,
  };

  const mockPanel = createEmptyPanel(0, 0);

  it('renders without crashing', () => {
    const { container } = render(
      <svg>
        <TransformGizmo panel={mockPanel} bounds={mockBounds} />
      </svg>
    );

    expect(container.querySelector('g')).toBeInTheDocument();
  });

  it('renders gizmo border', () => {
    const { container } = render(
      <svg>
        <TransformGizmo panel={mockPanel} bounds={mockBounds} />
      </svg>
    );

    const border = container.querySelector('rect[stroke="#3b82f6"]');
    expect(border).toBeInTheDocument();
    expect(border).toHaveAttribute('x', '100');
    expect(border).toHaveAttribute('y', '100');
    expect(border).toHaveAttribute('width', '200');
    expect(border).toHaveAttribute('height', '200');
  });

  it('renders 4 corner scale handles', () => {
    const { container } = render(
      <svg>
        <TransformGizmo panel={mockPanel} bounds={mockBounds} />
      </svg>
    );

    // Find all scale handles (8x8 rectangles for corners)
    const handles = container.querySelectorAll('rect[width="8"][height="8"]');
    expect(handles.length).toBe(4);
  });

  it('renders 4 edge position handles', () => {
    const { container } = render(
      <svg>
        <TransformGizmo panel={mockPanel} bounds={mockBounds} />
      </svg>
    );

    // Find all position handles (12x12 rectangles for edges)
    const handles = container.querySelectorAll('rect[width="12"][height="12"]');
    expect(handles.length).toBe(4);
  });

  it('renders rotation handle with connecting line', () => {
    const { container } = render(
      <svg>
        <TransformGizmo panel={mockPanel} bounds={mockBounds} />
      </svg>
    );

    // Check for rotation handle circle
    const circle = container.querySelector('circle[r="6"]');
    expect(circle).toBeInTheDocument();

    // Check for connecting line
    const line = container.querySelector('line[stroke-dasharray="3,3"]');
    expect(line).toBeInTheDocument();
  });

  it('displays numerical feedback for position transform', () => {
    const mockTransform: Transform = {
      position: { x: 150, y: 200 },
      scale: { x: 1, y: 1 },
      rotation: 0,
      pivot: { x: 0.5, y: 0.5 },
    };

    const { container } = render(
      <svg>
        <TransformGizmo
          panel={mockPanel}
          bounds={mockBounds}
          activeTransform={{ type: 'position', value: mockTransform }}
        />
      </svg>
    );

    const text = container.querySelector('text');
    expect(text).toBeInTheDocument();
    expect(text?.textContent).toContain('X: 150px, Y: 200px');
  });

  it('displays numerical feedback for scale transform', () => {
    const mockTransform: Transform = {
      position: { x: 0, y: 0 },
      scale: { x: 1.5, y: 2.0 },
      rotation: 0,
      pivot: { x: 0.5, y: 0.5 },
    };

    const { container } = render(
      <svg>
        <TransformGizmo
          panel={mockPanel}
          bounds={mockBounds}
          activeTransform={{ type: 'scale', value: mockTransform }}
        />
      </svg>
    );

    const text = container.querySelector('text');
    expect(text).toBeInTheDocument();
    expect(text?.textContent).toContain('Scale: 150% × 200%');
  });

  it('displays numerical feedback for rotation transform', () => {
    const mockTransform: Transform = {
      position: { x: 0, y: 0 },
      scale: { x: 1, y: 1 },
      rotation: 45,
      pivot: { x: 0.5, y: 0.5 },
    };

    const { container } = render(
      <svg>
        <TransformGizmo
          panel={mockPanel}
          bounds={mockBounds}
          activeTransform={{ type: 'rotation', value: mockTransform }}
        />
      </svg>
    );

    const text = container.querySelector('text');
    expect(text).toBeInTheDocument();
    expect(text?.textContent).toContain('Rotation: 45°');
  });

  it('calls onTransformStart when handle is clicked', () => {
    const onTransformStart = vi.fn();

    const { container } = render(
      <svg>
        <TransformGizmo
          panel={mockPanel}
          bounds={mockBounds}
          onTransformStart={onTransformStart}
        />
      </svg>
    );

    // Click on a scale handle
    const scaleHandle = container.querySelector('rect[width="8"][height="8"]');
    expect(scaleHandle).toBeInTheDocument();
    
    scaleHandle?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    
    expect(onTransformStart).toHaveBeenCalled();
  });

  it('does not display feedback when no active transform', () => {
    const { container } = render(
      <svg>
        <TransformGizmo panel={mockPanel} bounds={mockBounds} />
      </svg>
    );

    const text = container.querySelector('text');
    expect(text).not.toBeInTheDocument();
  });
});
