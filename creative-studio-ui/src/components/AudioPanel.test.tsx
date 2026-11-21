import { vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AudioPanel } from './AudioPanel';

// Mock any heavy services used by AudioPanel
vi.mock('@/services/audioService', () => ({
  getAudioData: vi.fn().mockResolvedValue([]),
}));

test('renders AudioPanel without crashing', () => {
  render(<AudioPanel shotId="unknown-shot" />);
  const container = screen.getByText(/no shot selected/i);
  expect(container).toBeInTheDocument();
});
