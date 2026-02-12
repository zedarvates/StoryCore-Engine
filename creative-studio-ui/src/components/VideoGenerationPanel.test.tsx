import React from 'react';
import { render, screen } from '@testing-library/react';
import VideoGenerationPanel from './VideoGenerationPanel';

// Mock any heavy services if needed
jest.mock('@/services/videoService', () => ({
  generateVideo: jest.fn().mockResolvedValue(null),
}));

test('renders VideoGenerationPanel without crashing', () => {
  render(<VideoGenerationPanel />);
  const container = screen.getByTestId('video-generation-panel');
  expect(container).toBeInTheDocument();
});
