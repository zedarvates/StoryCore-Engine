import { LegacyAny } from '@/types/legacy';
import { render, screen } from '@testing-library/react';
import { ShotDeletionDialog } from './ShotDeletionDialog';

describe('ShotDeletionDialog', () => {
  const mockShot = { id: 'shot-1' } as LegacyAny;
  const mockPhrases: LegacyAny[] = [];
  it('renders when open', () => {
    render(
      <ShotDeletionDialog
        shot={mockShot}
        associatedPhrases={mockPhrases}
        isOpen={true}
        onConfirmDelete={() => {}}
        onCancel={() => {}}
      />
    );
    const title = screen.getByText('Delete Shot?');
    expect(title).toBeInTheDocument();
  });
});
