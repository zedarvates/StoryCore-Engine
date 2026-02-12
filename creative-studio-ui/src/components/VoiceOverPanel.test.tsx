import React from 'react';
import { render, screen } from '@testing-library/react';
import VoiceOverPanel from './VoiceOverPanel';

// Mock any heavy dependencies if needed
jest.mock('@/services/voiceService', () => ({
  getVoiceData: jest.fn().mockResolvedValue([]),
}));

test('renders VoiceOverPanel without crashing', () => {
  render(<VoiceOverPanel />);
  const container = screen.getByTestId('voice-over-panel');
  expect(container).toBeInTheDocument();
});
