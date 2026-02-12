import { render, screen } from '@testing-library/react';
import { ShotEditModal } from './ShotEditModal';

describe('ShotEditModal', () => {
  it('renders without crashing', () => {
    render(<ShotEditModal isOpen={true} onClose={() => {}} />);
    // Assuming modal has a role dialog
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
  });
});
