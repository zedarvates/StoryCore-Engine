import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VoiceLibrary } from '../VoiceLibrary';
import { ttsService, type Voice } from '../../services/ttsService';

// Mock the TTS service
vi.mock('../../services/ttsService', () => ({
  ttsService: {
    getAvailableVoices: vi.fn(),
  },
}));

const mockVoices: Voice[] = [
  {
    id: 'voice-1',
    name: 'Sarah',
    gender: 'female',
    language: 'en-US',
    previewUrl: 'https://example.com/preview1.mp3',
  },
  {
    id: 'voice-2',
    name: 'John',
    gender: 'male',
    language: 'en-US',
  },
  {
    id: 'voice-3',
    name: 'Alex',
    gender: 'neutral',
    language: 'en-GB',
    previewUrl: 'https://example.com/preview3.mp3',
  },
  {
    id: 'voice-4',
    name: 'Maria',
    gender: 'female',
    language: 'es-ES',
  },
];

describe('VoiceLibrary', () => {
  const onSelectVoice = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ttsService.getAvailableVoices).mockResolvedValue(mockVoices);
  });

  it('renders loading state initially', () => {
    render(<VoiceLibrary onSelectVoice={onSelectVoice} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('loads and displays voices', async () => {
    render(<VoiceLibrary onSelectVoice={onSelectVoice} />);

    await waitFor(() => {
      expect(screen.getByText('Sarah')).toBeInTheDocument();
    });

    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('Alex')).toBeInTheDocument();
    expect(screen.getByText('Maria')).toBeInTheDocument();
  });

  it('displays voice details correctly', async () => {
    render(<VoiceLibrary onSelectVoice={onSelectVoice} />);

    await waitFor(() => {
      expect(screen.getByText('Sarah')).toBeInTheDocument();
    });

    // Check gender badges
    expect(screen.getByText('female')).toBeInTheDocument();
    expect(screen.getByText('male')).toBeInTheDocument();
    expect(screen.getByText('neutral')).toBeInTheDocument();

    // Check languages
    expect(screen.getAllByText('en-US')).toHaveLength(2);
    expect(screen.getByText('en-GB')).toBeInTheDocument();
    expect(screen.getByText('es-ES')).toBeInTheDocument();
  });

  it('calls onSelectVoice when voice is clicked', async () => {
    render(<VoiceLibrary onSelectVoice={onSelectVoice} />);

    await waitFor(() => {
      expect(screen.getByText('Sarah')).toBeInTheDocument();
    });

    const voiceCard = screen.getByText('Sarah').closest('div');
    fireEvent.click(voiceCard!);

    expect(onSelectVoice).toHaveBeenCalledWith('voice-1');
  });

  it('highlights selected voice', async () => {
    render(<VoiceLibrary onSelectVoice={onSelectVoice} selectedVoice="voice-2" />);

    await waitFor(() => {
      expect(screen.getByText('John')).toBeInTheDocument();
    });

    const johnCard = screen.getByText('John').closest('div');
    expect(johnCard).toHaveClass('border-primary');
  });

  it('filters voices by search query', async () => {
    render(<VoiceLibrary onSelectVoice={onSelectVoice} />);

    await waitFor(() => {
      expect(screen.getByText('Sarah')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search by name/i);
    fireEvent.change(searchInput, { target: { value: 'john' } });

    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.queryByText('Sarah')).not.toBeInTheDocument();
    expect(screen.queryByText('Alex')).not.toBeInTheDocument();
  });

  it('filters voices by gender', async () => {
    render(<VoiceLibrary onSelectVoice={onSelectVoice} filterGender="female" />);

    await waitFor(() => {
      expect(screen.getByText('Sarah')).toBeInTheDocument();
    });

    expect(screen.getByText('Maria')).toBeInTheDocument();
    expect(screen.queryByText('John')).not.toBeInTheDocument();
    expect(screen.queryByText('Alex')).not.toBeInTheDocument();
  });

  it('filters voices by language', async () => {
    render(<VoiceLibrary onSelectVoice={onSelectVoice} filterLanguage="en" />);

    await waitFor(() => {
      expect(screen.getByText('Sarah')).toBeInTheDocument();
    });

    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('Alex')).toBeInTheDocument();
    expect(screen.queryByText('Maria')).not.toBeInTheDocument();
  });

  it('shows preview button for voices with preview URL', async () => {
    render(<VoiceLibrary onSelectVoice={onSelectVoice} />);

    await waitFor(() => {
      expect(screen.getByText('Sarah')).toBeInTheDocument();
    });

    const sarahCard = screen.getByText('Sarah').closest('div');
    const playButton = sarahCard?.querySelector('button');
    expect(playButton).toBeInTheDocument();

    const johnCard = screen.getByText('John').closest('div');
    const johnPlayButton = johnCard?.querySelector('button');
    expect(johnPlayButton).not.toBeInTheDocument();
  });

  it('displays voice count summary', async () => {
    render(<VoiceLibrary onSelectVoice={onSelectVoice} />);

    await waitFor(() => {
      expect(screen.getByText(/showing 4 of 4 voices/i)).toBeInTheDocument();
    });
  });

  it('updates summary when filtering', async () => {
    render(<VoiceLibrary onSelectVoice={onSelectVoice} />);

    await waitFor(() => {
      expect(screen.getByText('Sarah')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search by name/i);
    fireEvent.change(searchInput, { target: { value: 'a' } });

    await waitFor(() => {
      expect(screen.getByText(/showing 3 of 4 voices/i)).toBeInTheDocument();
    });
  });

  it('shows empty state when no voices match filter', async () => {
    render(<VoiceLibrary onSelectVoice={onSelectVoice} />);

    await waitFor(() => {
      expect(screen.getByText('Sarah')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search by name/i);
    fireEvent.change(searchInput, { target: { value: 'xyz' } });

    expect(screen.getByText(/no voices found matching your criteria/i)).toBeInTheDocument();
  });

  it('handles loading error', async () => {
    vi.mocked(ttsService.getAvailableVoices).mockRejectedValue(new Error('API Error'));

    render(<VoiceLibrary onSelectVoice={onSelectVoice} />);

    await waitFor(() => {
      expect(screen.getByText(/api error/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('retries loading voices on error', async () => {
    vi.mocked(ttsService.getAvailableVoices).mockRejectedValueOnce(new Error('API Error'));

    render(<VoiceLibrary onSelectVoice={onSelectVoice} />);

    await waitFor(() => {
      expect(screen.getByText(/api error/i)).toBeInTheDocument();
    });

    vi.mocked(ttsService.getAvailableVoices).mockResolvedValue(mockVoices);

    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Sarah')).toBeInTheDocument();
    });
  });
});
