import React from 'react';
import { render, screen } from '@testing-library/react';
import AssetCard from './AssetCard';

test('renders AssetCard without crashing and displays key element', () => {
  render(<AssetCard />);
  const element = screen.getByTestId('asset-card');
  expect(element).toBeInTheDocument();
});
