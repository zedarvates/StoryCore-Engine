import { render, screen } from '@testing-library/react';
import { ResultsGallery } from './ResultsGallery';

describe('ResultsGallery', () => {
  it('renders without crashing', () => {
    render(<ResultsGallery />);
    const container = screen.getByText('No results to display');
    expect(container).toBeInTheDocument();
  });
});
