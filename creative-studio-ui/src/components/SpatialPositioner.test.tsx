import React from 'react';
import { render, screen } from '@testing-library/react';
import SpatialPositioner from './SpatialPositioner';

test('renders SpatialPositioner without crashing', () => {
  render(<SpatialPositioner />);
  const element = screen.getByTestId('spatial-positioner');
  expect(element).toBeInTheDocument();
});
