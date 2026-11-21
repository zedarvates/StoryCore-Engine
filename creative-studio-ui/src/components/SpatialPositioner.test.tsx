import React from 'react';
import { render, screen } from '@testing-library/react';
import { SpatialPositioner } from './SpatialPositioner';

test('renders SpatialPositioner without crashing', () => {
  render(<SpatialPositioner config={{ mode: 'stereo', channels: {} }} onChange={() => {}} />);
  const element = screen.getByRole('heading', { name: 'Spatial Positioning' });
  expect(element).toBeInTheDocument();
});
