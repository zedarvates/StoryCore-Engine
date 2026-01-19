import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { WaveformDisplay, generateWaveformData } from '../WaveformDisplay';
import type { AudioTrack } from '../../types';

// Mock AudioContext
class MockAudioContext {
  decodeAudioData = vi.fn();
  close = vi.fn().mockResolvedValue(undefined);
}

class MockAudioBuffer {
  length = 44100;
  numberOfChannels = 2;
  sampleRate = 44100;
  duration = 1;
  
  getChannelData(channel: number): Float32Array {
    // Return mock audio data (sine wave)
    const data = new Float32Array(this.length);
    for (let i = 0; i < this.length; i++) {
      data[i] = Math.sin((i / this.length) * Math.PI * 2) * 0.5;
    }
    return data;
  }
  
  copyFromChannel = vi.fn();
  copyToChannel = vi.fn();
}

describe('WaveformDisplay', () => {
  let mockAudioContext: MockAudioContext;
  let originalAudioContext: any;

  beforeEach(() => {
    mockAudioContext = new MockAudioContext();
    originalAudioContext = (window as any).AudioContext;
    (window as any).AudioContext = vi.fn(() => mockAudioContext);
    
    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    });
    
    // Mock decodeAudioData to return mock audio buffer
    mockAudioContext.decodeAudioData.mockResolvedValue(new MockAudioBuffer());
  });

  afterEach(() => {
    (window as any).AudioContext = originalAudioContext;
    vi.clearAllMocks();
  });

  const createMockTrack = (overrides?: Partial<AudioTrack>): AudioTrack => ({
    id: 'track-1',
    name: 'Test Track',
    type: 'music',
    url: 'https://example.com/audio.mp3',
    startTime: 0,
    duration: 10,
    offset: 0,
    volume: 80,
    fadeIn: 0,
    fadeOut: 0,
    pan: 0,
    muted: false,
    solo: false,
    effects: [],
    ...overrides,
  });

  it('renders canvas element', () => {
    const track = createMockTrack();
    render(<WaveformDisplay track={track} />);
    
    const canvas = screen.getByRole('img', { hidden: true }) || document.querySelector('canvas');
    expect(canvas).toBeTruthy();
  });

  it('uses provided width and height', () => {
    const track = createMockTrack();
    render(<WaveformDisplay track={track} width={400} height={80} />);
    
    const canvas = document.querySelector('canvas');
    expect(canvas?.width).toBe(400);
    expect(canvas?.height).toBe(80);
  });

  it('uses default width and height when not provided', () => {
    const track = createMockTrack();
    render(<WaveformDisplay track={track} />);
    
    const canvas = document.querySelector('canvas');
    expect(canvas?.width).toBe(300);
    expect(canvas?.height).toBe(60);
  });

  it('displays placeholder when no URL or waveform data', () => {
    const track = createMockTrack({ url: '', waveformData: undefined });
    render(<WaveformDisplay track={track} />);
    
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeTruthy();
  });

  it('generates waveform when URL is provided', async () => {
    const track = createMockTrack();
    const onGenerate = vi.fn();
    
    render(<WaveformDisplay track={track} onGenerate={onGenerate} />);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(track.url);
    });
    
    await waitFor(() => {
      expect(mockAudioContext.decodeAudioData).toHaveBeenCalled();
    });
    
    await waitFor(() => {
      expect(onGenerate).toHaveBeenCalled();
    });
  });

  it('uses existing waveform data when available', () => {
    const waveformData = [0.1, 0.5, 0.8, 0.3, 0.6];
    const track = createMockTrack({ waveformData });
    
    render(<WaveformDisplay track={track} />);
    
    // Should not fetch audio file
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('displays loading state while generating', async () => {
    const track = createMockTrack();
    
    // Make decodeAudioData take time
    mockAudioContext.decodeAudioData.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(new MockAudioBuffer()), 100))
    );
    
    render(<WaveformDisplay track={track} />);
    
    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText(/generating waveform/i)).toBeTruthy();
    });
  });

  it('displays error when fetch fails', async () => {
    const track = createMockTrack();
    
    // Mock fetch to fail
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });
    
    render(<WaveformDisplay track={track} />);
    
    await waitFor(() => {
      expect(screen.getByText(/failed to generate waveform/i)).toBeTruthy();
    });
  });

  it('displays error when audio decoding fails', async () => {
    const track = createMockTrack();
    
    // Mock decodeAudioData to fail
    mockAudioContext.decodeAudioData.mockRejectedValue(new Error('Decode error'));
    
    render(<WaveformDisplay track={track} />);
    
    await waitFor(() => {
      expect(screen.getByText(/failed to generate waveform/i)).toBeTruthy();
    });
  });

  it('calls onGenerate callback with waveform data', async () => {
    const track = createMockTrack();
    const onGenerate = vi.fn();
    
    render(<WaveformDisplay track={track} onGenerate={onGenerate} />);
    
    await waitFor(() => {
      expect(onGenerate).toHaveBeenCalled();
    });
    
    const waveformData = onGenerate.mock.calls[0][0];
    expect(Array.isArray(waveformData)).toBe(true);
    expect(waveformData.length).toBeGreaterThan(0);
    expect(waveformData.every((v: number) => v >= 0 && v <= 1)).toBe(true);
  });

  it('closes audio context after generating waveform', async () => {
    const track = createMockTrack();
    
    render(<WaveformDisplay track={track} />);
    
    await waitFor(() => {
      expect(mockAudioContext.close).toHaveBeenCalled();
    });
  });
});

describe('generateWaveformData', () => {
  let mockAudioContext: MockAudioContext;
  let originalAudioContext: any;

  beforeEach(() => {
    mockAudioContext = new MockAudioContext();
    originalAudioContext = (window as any).AudioContext;
    (window as any).AudioContext = vi.fn(() => mockAudioContext);
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    });
    
    mockAudioContext.decodeAudioData.mockResolvedValue(new MockAudioBuffer());
  });

  afterEach(() => {
    (window as any).AudioContext = originalAudioContext;
    vi.clearAllMocks();
  });

  it('generates waveform data from audio URL', async () => {
    const audioUrl = 'https://example.com/audio.mp3';
    const waveformData = await generateWaveformData(audioUrl, 100);
    
    expect(Array.isArray(waveformData)).toBe(true);
    expect(waveformData.length).toBe(100);
    expect(waveformData.every((v) => v >= 0 && v <= 1)).toBe(true);
  });

  it('normalizes waveform data to 0-1 range', async () => {
    const audioUrl = 'https://example.com/audio.mp3';
    const waveformData = await generateWaveformData(audioUrl);
    
    const max = Math.max(...waveformData);
    expect(max).toBeLessThanOrEqual(1);
    expect(max).toBeGreaterThan(0);
  });

  it('uses default sample count when not provided', async () => {
    const audioUrl = 'https://example.com/audio.mp3';
    const waveformData = await generateWaveformData(audioUrl);
    
    expect(waveformData.length).toBe(1000);
  });

  it('throws error when fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });
    
    const audioUrl = 'https://example.com/audio.mp3';
    
    await expect(generateWaveformData(audioUrl)).rejects.toThrow();
  });

  it('closes audio context even when error occurs', async () => {
    mockAudioContext.decodeAudioData.mockRejectedValue(new Error('Decode error'));
    
    const audioUrl = 'https://example.com/audio.mp3';
    
    try {
      await generateWaveformData(audioUrl);
    } catch (error) {
      // Expected to throw
    }
    
    expect(mockAudioContext.close).toHaveBeenCalled();
  });
});
