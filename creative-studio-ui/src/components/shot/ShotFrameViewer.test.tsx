import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ShotFrameViewer, type ShotMetadata } from './ShotFrameViewer';

it('keeps the input shot immutable while updating and saving resolution', () => {
  const shot: ShotMetadata = {
    id: 'clip', name: 'Clip', duration: 2, startTime: 0, endTime: 2, frameRate: 24,
    resolution: { width: 1280, height: 720 }, position: 0, track: 0,
    inPoint: 0, outPoint: 48, tags: [], status: 'ready', locked: false,
    createdAt: 1, updatedAt: 1, version: 1,
  };
  const onUpdate = vi.fn();
  render(<ShotFrameViewer shot={shot} onUpdate={onUpdate} />);
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Largeur' }), { target: { value: '1920' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sauvegarder' }));

  expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
    resolution: { width: 1920, height: 720 },
    version: 2,
  }));
  expect(shot.resolution).toEqual({ width: 1280, height: 720 });
});
