import React from 'react';
import { render, screen } from '@testing-library/react';
import SecretModeIndicator from './SecretModeIndicator';

test('renders SecretModeIndicator without crashing', () => {
  render(<SecretModeIndicator />);
  const element = screen.getByTestId('secret-mode-indicator');
  expect(element).toBeInTheDocument();
});
