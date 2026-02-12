import { render, screen } from '@testing-library/react';
import { TextEditor } from './TextEditor';

describe('TextEditor', () => {
  it('renders without crashing', () => {
    render(<TextEditor />);
    // Assuming TextEditor renders a textarea or similar
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
  });
});
