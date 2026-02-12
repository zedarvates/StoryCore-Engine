import { render, screen } from '@testing-library/react';
import { ShotDeletionDialog } from './ShotDeletionDialog';

describe('ShotDeletionDialog', () => {
  const mockShot = { id: 'shot-1' } as any;
  const mockPhrases: any[] = [];
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
