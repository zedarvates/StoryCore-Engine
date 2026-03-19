import { render, screen, fireEvent, act } from '@testing-library/react';
import { SecretServicesMenu } from './SecretServicesMenu';
import { SecretModeProvider } from '@/contexts/SecretModeContext';
import { expect, test } from 'vitest';

test('renders SecretServicesMenu and toggles dropdown when secret mode is active', async () => {
  render(
    <SecretModeProvider>
      <SecretServicesMenu />
    </SecretModeProvider>
  );

  // Activate secret mode via keyboard shortcut (Ctrl+Shift+Alt)
  // We need to dispatch an event that has ALL three flags set
  await act(async () => {
    const event = new KeyboardEvent('keydown', {
      key: 'Alt', // The last key pressed
      ctrlKey: true,
      shiftKey: true,
      altKey: true,
      bubbles: true 
    });
    window.dispatchEvent(event);
  });

  // Small delay to ensure state update
  await new Promise(r => setTimeout(r, 50));

  const trigger = screen.getByLabelText(/Secret Services/i);
  expect(trigger).toBeInTheDocument();

  // Click to open dropdown
  fireEvent.click(trigger);

  // Expect title to appear
  expect(screen.getByText(/Experimental Features/i)).toBeInTheDocument();
});
