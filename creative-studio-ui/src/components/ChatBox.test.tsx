import React from 'react';
import { render } from '@testing-library/react';
import ChatBox from './ChatBox';

// Mock any heavy dependencies if needed
jest.mock('@/services/chatService', () => ({
  sendMessage: jest.fn(),
}));

test('renders ChatBox without crashing', () => {
  const { container } = render(<ChatBox />);
  expect(container).toBeTruthy();
});
