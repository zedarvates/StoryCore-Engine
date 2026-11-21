import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { NotificationBanner } from './NotificationSystem';

test('shows the reason for a failed operation and offers a retry', () => {
  const retry = vi.fn();
  render(
    <NotificationBanner
      type="error"
      title="Generation failed"
      description="Connection interrupted"
      action={{ label: 'Retry', onClick: retry }}
    />,
  );
  expect(screen.getByRole('heading', { name: 'Generation failed' })).toBeInTheDocument();
  expect(screen.getByText('Connection interrupted')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(retry).toHaveBeenCalledOnce();
});
