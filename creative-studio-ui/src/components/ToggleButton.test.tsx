import { render, screen } from '@testing-library/react';
import { ToggleButton } from './ToggleButton';

describe('ToggleButton', () => {
  it('renders without crashing', () => {
    render(<ToggleButton />);
    const button = screen.getByRole('button', { name: /ai assistant/i });
    expect(button).toBeInTheDocument();
  });
});
