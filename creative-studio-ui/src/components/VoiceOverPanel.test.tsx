import { vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { VoiceOverPanel } from './VoiceOverPanel';

// Mock any heavy dependencies if needed
vi.mock('@/services/voiceService', () => ({
  getVoiceData: vi.fn().mockResolvedValue([]),
}));

test('renders VoiceOverPanel without crashing', () => {
  render(<VoiceOverPanel shotId="shot-1" />);
  const container = screen.getByRole('tab', { name: 'Voice Library' });
  expect(container).toBeInTheDocument();
});
