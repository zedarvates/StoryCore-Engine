import { render, screen } from '@testing-library/react';
import { SaveStatusIndicator } from './SaveStatusIndicator';

describe('SaveStatusIndicator', () => {
  it('renders without crashing', () => {
    render(<SaveStatusIndicator status="saved" />);
    const element = screen.getByTestId('save-status-indicator');
    expect(element).toBeInTheDocument();
  });
});
