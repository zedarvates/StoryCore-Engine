import { render, screen } from '@testing-library/react';
import { ToggleButton } from './ToggleButton';

describe('ToggleButton', () => {
  it('renders without crashing', () => {
    render(<ToggleButton label="Test" onClick={() => {}} />);
    const button = screen.getByText('Test');
    expect(button).toBeInTheDocument();
  });
});
