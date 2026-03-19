import { render, screen } from '@testing-library/react';
import { ChatBox } from './ChatBox';
import { vi, expect, test } from 'vitest';

// Mock the store
vi.mock('@/stores/useAppStore', () => ({
  useAppStore: () => ({
    chatMessages: [],
    addChatMessage: vi.fn(),
    shots: [],
    addShot: vi.fn(),
    updateShot: vi.fn(),
  }),
}));

// Mock ollama status check
vi.mock('@/services/ollamaConfig', () => ({
  checkOllamaStatus: vi.fn().mockResolvedValue(true),
}));

test('renders ChatBox title and greeting', () => {
  render(<ChatBox />);
  expect(screen.getByText(/StoryCore AI Assistant/i)).toBeInTheDocument();
  expect(screen.getByText(/Hi! I'm your AI assistant/i)).toBeInTheDocument();
});
