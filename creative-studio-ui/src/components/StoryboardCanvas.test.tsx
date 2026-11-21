import { vi } from 'vitest';
import { render } from '@testing-library/react';
import { StoryboardCanvas } from './StoryboardCanvas';

// Mock heavy dependencies
vi.mock('../../stores/shotStore', () => ({
  useShotStore: () => ({
    shots: [],
    selectShot: vi.fn(),
  }),
}));


describe('StoryboardCanvas', () => {
  it('renders without crashing', () => {
    const { container } = render(<StoryboardCanvas />);
    expect(container).toBeTruthy();
  });
});
