import { render, screen } from '@testing-library/react';
import { createShotFixture } from '@/__tests__/helpers/shotFactory';
import { ShotEditModal } from './ShotEditModal';

describe('ShotEditModal', () => {
  it('renders without crashing', () => {
    render(<ShotEditModal shot={createShotFixture({ title: 'Ferry Pier' })} isOpen onClose={() => {}} />);
    expect(screen.getByRole('heading', { name: 'Edit Shot' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Ferry Pier')).toBeInTheDocument();
  });
});
