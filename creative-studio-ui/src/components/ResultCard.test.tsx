import { render, screen } from '@testing-library/react';
import { ResultCard } from './ResultCard';

describe('ResultCard', () => {
  it('renders without crashing', () => {
    render(<ResultCard result={{ taskId: 'task-1', shotId: 'shot-1', type: 'image', status: 'success', assets: [], generatedAt: new Date(0) }} getPreviewUrl={() => ''} />);
    const title = screen.getByRole('heading', { name: 'IMAGE Result' });
    expect(title).toBeInTheDocument();
  });
});
