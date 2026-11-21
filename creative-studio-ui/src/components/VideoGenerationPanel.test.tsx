import { vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import VideoGenerationPanel from './VideoGenerationPanel';

// Mock any heavy services if needed
vi.mock('@/services/videoService', () => ({
  generateVideo: vi.fn().mockResolvedValue(null),
}));

test('renders VideoGenerationPanel without crashing', () => {
  render(<VideoGenerationPanel />);
  const container = screen.getByTestId('video-generation-panel');
  expect(container).toBeInTheDocument();
});
