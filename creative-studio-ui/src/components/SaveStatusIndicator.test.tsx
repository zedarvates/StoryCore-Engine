import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { SaveStatusIndicator } from './SaveStatusIndicator';

vi.mock('@/contexts/ProjectContext', () => ({
  useProject: () => ({ saveStatus: 'saved', isSaving: false, error: null }),
}));

describe('SaveStatusIndicator', () => {
  it('renders without crashing', () => {
    render(<SaveStatusIndicator />);
    const element = screen.getByRole('status');
    expect(element).toHaveTextContent('Saved');
  });
});
