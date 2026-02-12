import { render, screen } from '@testing-library/react';
import { ShotPromptEditor } from './ShotPromptEditor';

describe('ShotPromptEditor', () => {
  it('renders without crashing', () => {
    render(<ShotPromptEditor />);
    // Assuming component renders a container with role 'textbox' or similar
    const container = screen.getByRole('textbox');
    expect(container).toBeInTheDocument();
  });
});
