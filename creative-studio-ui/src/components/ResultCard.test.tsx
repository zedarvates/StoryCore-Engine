import { render, screen } from '@testing-library/react';
import { ResultCard } from './ResultCard';

describe('ResultCard', () => {
  it('renders without crashing', () => {
    render(<ResultCard result={{ id: '1', title: 'Test', description: '' }} />);
    const title = screen.getByText('Test');
    expect(title).toBeInTheDocument();
  });
});
