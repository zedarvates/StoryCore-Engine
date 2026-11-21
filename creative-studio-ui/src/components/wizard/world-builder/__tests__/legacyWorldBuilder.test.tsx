import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useWorldBuilderStore } from '@/stores/worldBuilderStore';
import { StepValidator } from '../steps/legacy/StepValidator';
import { WorldPreview } from '../steps/legacy/WorldPreview';

describe('legacy world builder store bindings', () => {
  afterEach(() => useWorldBuilderStore.getState().resetWorld());

  it('reads the selected world in the map and preview', () => {
    useWorldBuilderStore.getState().initializeWorld({
      foundations: { name: 'Ember Orchard', genre: 'fantasy', tone: '', setting: 'orchard', scale: 'small' },
      locations: [{
        id: 'pier',
        name: 'Ferry Pier',
        type: 'city',
        description: 'A ferry stop',
        coordinates: { x: 0, y: 0 },
      }],
    });

    render(<WorldPreview />);
    expect(screen.getByText('Ferry Pier')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '3D Preview' }));
    expect(screen.getByRole('heading', { name: 'Ember Orchard' })).toBeInTheDocument();
  });

  it('revalidates the foundations after the world is updated', () => {
    render(<StepValidator step="foundations" />);
    expect(screen.getByRole('alert')).toHaveTextContent('world name, genre, and setting');

    act(() => useWorldBuilderStore.getState().initializeWorld({
      foundations: { name: 'Ember Orchard', genre: 'fantasy', tone: '', setting: 'orchard', scale: 'small' },
    }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
