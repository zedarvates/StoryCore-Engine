import { render, screen } from '@testing-library/react';
import { AssetPanel } from './AssetPanel';

describe('AssetPanel', () => {
  it('renders without crashing', () => {
    render(<AssetPanel />);
    // Assuming it renders a container with testid 'asset-panel'
    const container = screen.getByTestId('asset-panel');
    expect(container).toBeInTheDocument();
  });
});
