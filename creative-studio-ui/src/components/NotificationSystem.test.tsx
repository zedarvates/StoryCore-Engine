import { vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import NotificationSystem from './NotificationSystem';

// Mock any heavy services if needed
vi.mock('@/services/notificationService', () => ({
  sendNotification: vi.fn(),
}));

test('renders NotificationSystem without crashing', () => {
  render(<NotificationSystem />);
  const container = screen.getByTestId('notification-system');
  expect(container).toBeInTheDocument();
});
