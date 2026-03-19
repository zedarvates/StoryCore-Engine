import React from 'react';
import { render, screen } from '@testing-library/react';
import { AssetCard } from './AssetCard';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

const mockAsset = {
  id: 'test-asset',
  name: 'Test Image',
  type: 'image' as const,
  url: 'test.png',
  metadata: {
    category: 'character'
  }
};

test('renders AssetCard without crashing', () => {
  render(
    <DndProvider backend={HTML5Backend}>
      <AssetCard asset={mockAsset} />
    </DndProvider>
  );
  // The component might not have data-testid="asset-card" but we can check for asset name
  expect(screen.getByText('Test Image')).toBeInTheDocument();
});
