import { render } from '@testing-library/react';
import { StoryboardCanvas } from './StoryboardCanvas';

// Mock heavy dependencies
jest.mock('../../stores/shotStore', () => ({
  useShotStore: () => ({
    shots: [],
    selectShot: jest.fn(),
  }),
}));


describe('StoryboardCanvas', () => {
  it('renders without crashing', () => {
    const { container } = render(<StoryboardCanvas />);
    expect(container).toBeTruthy();
  });
});
