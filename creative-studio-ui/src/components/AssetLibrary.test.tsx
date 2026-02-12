import { render, screen } from '@testing-library/react';
import { AssetLibrary } from './AssetLibrary';

describe('AssetLibrary', () => {
  it('renders without crashing', () => {
    render(<AssetLibrary assets={[]} />);
    const header = screen.getByText('Asset Library');
    expect(header).toBeInTheDocument();
  });
});
