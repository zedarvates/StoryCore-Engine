import { render, screen } from '@testing-library/react';
import { ResultsGallery } from './ResultsGallery';

describe('ResultsGallery', () => {
  it('renders without crashing', () => {
    render(<ResultsGallery results={[]} />);
    const container = screen.getByTestId('results-gallery');
    expect(container).toBeInTheDocument();
  });
});
