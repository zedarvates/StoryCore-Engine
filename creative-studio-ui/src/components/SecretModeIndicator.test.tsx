import React from 'react';
import { render, screen } from '@testing-library/react';
import { SecretModeIndicator } from './SecretModeIndicator';

import { SecretModeProvider } from '@/contexts/SecretModeContext';
import { act } from 'react-dom/test-utils';

test('renders SecretModeIndicator when keys are held', async () => {
  render(
    <SecretModeProvider>
      <SecretModeIndicator />
    </SecretModeProvider>
  );
  
  // Initially null
  expect(screen.queryByTestId('secret-mode-indicator')).not.toBeInTheDocument();
  
  // Dispatch keys wrapped in act
  await act(async () => {
    const event = new KeyboardEvent('keydown', {
      ctrlKey: true,
      shiftKey: true,
      altKey: true,
      key: 'Alt',
      bubbles: true
    });
    window.dispatchEvent(event);
  });
  
  const element = await screen.findByTestId('secret-mode-indicator');
  expect(element).toBeInTheDocument();
  expect(element).toHaveTextContent('Secret Mode Active');
});
