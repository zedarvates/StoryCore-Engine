import React from 'react';
import { render, screen } from '@testing-library/react';
import NotificationSystem from './NotificationSystem';

// Mock any heavy services if needed
jest.mock('@/services/notificationService', () => ({
  sendNotification: jest.fn(),
}));

test('renders NotificationSystem without crashing', () => {
  render(<NotificationSystem />);
  const container = screen.getByTestId('notification-system');
  expect(container).toBeInTheDocument();
});
