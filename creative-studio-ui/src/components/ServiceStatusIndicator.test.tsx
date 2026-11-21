import React from 'react';
import { render, screen } from '@testing-library/react';
import { ServiceStatusIndicator } from './ServiceStatusIndicator';

test('renders ServiceStatusIndicator without crashing', () => {
  render(<ServiceStatusIndicator service="both" showDetails />);
  expect(screen.getByRole('button', { name: 'Check Status' })).toBeInTheDocument();
});
