import { render, screen } from '@testing-library/react';
import { Timeline } from './Timeline';

describe('Timeline', () => {
  it('renders without crashing', () => {
    render(<Timeline />);
    // Assuming Timeline renders a container with role "region" or similar
    const container = screen.getByTestId('timeline-container');
    expect(container).toBeInTheDocument();
  });
});
