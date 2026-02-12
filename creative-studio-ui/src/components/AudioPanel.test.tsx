import React from 'react';
import { render, screen } from '@testing-library/react';
import AudioPanel from './AudioPanel';

// Mock any heavy services used by AudioPanel
jest.mock('@/services/audioService', () => ({
  getAudioData: jest.fn().mockResolvedValue([]),
}));

test('renders AudioPanel without crashing', () => {
  render(<AudioPanel />);
  const container = screen.getByTestId('audio-panel');
  expect(container).toBeInTheDocument();
});
