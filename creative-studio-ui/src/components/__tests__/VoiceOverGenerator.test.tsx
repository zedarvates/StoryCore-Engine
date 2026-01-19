import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VoiceOverGenerator } from '../VoiceOverGenerator';
import type { VoiceOver } from '../../types';

describe('VoiceOverGenerator', () => {
  it('renders all form controls', () => {
    const onGenerate = vi.fn();
    render(<VoiceOverGenerator onGenerate={onGenerate} />);

    expect(screen.getByLabelText(/text to speech/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/voice/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/language/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/speed/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/pitch/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/emotion/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate voiceover/i })).toBeInTheDocument();
  });

  it('disables generate button when text is empty', () => {
    const onGenerate = vi.fn();
    render(<VoiceOverGenerator onGenerate={onGenerate} />);

    const generateButton = screen.getByRole('button', { name: /generate voiceover/i });
    expect(generateButton).toBeDisabled();
  });

  it('enables generate button when text is entered', () => {
    const onGenerate = vi.fn();
    render(<VoiceOverGenerator onGenerate={onGenerate} />);

    const textInput = screen.getByLabelText(/text to speech/i);
    fireEvent.change(textInput, { target: { value: 'Hello world' } });

    const generateButton = screen.getByRole('button', { name: /generate voiceover/i });
    expect(generateButton).toBeEnabled();
  });

  it('calls onGenerate with correct voiceover data', async () => {
    const onGenerate = vi.fn();
    render(<VoiceOverGenerator onGenerate={onGenerate} />);

    // Enter text
    const textInput = screen.getByLabelText(/text to speech/i);
    fireEvent.change(textInput, { target: { value: 'Test voiceover text' } });

    // Click generate
    const generateButton = screen.getByRole('button', { name: /generate voiceover/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(onGenerate).toHaveBeenCalledTimes(1);
    });

    const voiceOver: VoiceOver = onGenerate.mock.calls[0][0];
    expect(voiceOver.text).toBe('Test voiceover text');
    expect(voiceOver.voice).toBe('female'); // default
    expect(voiceOver.language).toBe('en-US'); // default
    expect(voiceOver.speed).toBe(1.0); // default
    expect(voiceOver.pitch).toBe(0); // default
    expect(voiceOver.emotion).toBe('neutral'); // default
    expect(voiceOver.id).toMatch(/^voiceover-\d+$/);
  });

  it('updates speed value when slider is changed', () => {
    const onGenerate = vi.fn();
    render(<VoiceOverGenerator onGenerate={onGenerate} />);

    const speedSlider = screen.getByLabelText(/speed/i);
    fireEvent.change(speedSlider, { target: { value: '1.5' } });

    expect(screen.getByText('1.5x')).toBeInTheDocument();
  });

  it('updates pitch value when slider is changed', () => {
    const onGenerate = vi.fn();
    render(<VoiceOverGenerator onGenerate={onGenerate} />);

    const pitchSlider = screen.getByLabelText(/pitch/i);
    fireEvent.change(pitchSlider, { target: { value: '5' } });

    expect(screen.getByText('+5')).toBeInTheDocument();
  });

  it('displays character count', () => {
    const onGenerate = vi.fn();
    render(<VoiceOverGenerator onGenerate={onGenerate} />);

    const textInput = screen.getByLabelText(/text to speech/i);
    fireEvent.change(textInput, { target: { value: 'Hello' } });

    expect(screen.getByText('5 characters')).toBeInTheDocument();
  });

  it('shows loading state when isGenerating is true', () => {
    const onGenerate = vi.fn();
    render(<VoiceOverGenerator onGenerate={onGenerate} isGenerating={true} />);

    expect(screen.getByText(/generating\.\.\./i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generating/i })).toBeDisabled();
  });

  it('disables all controls when isGenerating is true', () => {
    const onGenerate = vi.fn();
    render(<VoiceOverGenerator onGenerate={onGenerate} isGenerating={true} />);

    expect(screen.getByLabelText(/text to speech/i)).toBeDisabled();
    expect(screen.getByLabelText(/speed/i)).toBeDisabled();
    expect(screen.getByLabelText(/pitch/i)).toBeDisabled();
  });

  it('renders cancel button when onCancel is provided', () => {
    const onGenerate = vi.fn();
    const onCancel = vi.fn();
    render(<VoiceOverGenerator onGenerate={onGenerate} onCancel={onCancel} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    expect(cancelButton).toBeInTheDocument();

    fireEvent.click(cancelButton);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('does not render cancel button when onCancel is not provided', () => {
    const onGenerate = vi.fn();
    render(<VoiceOverGenerator onGenerate={onGenerate} />);

    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
  });

  it('trims whitespace from text before generating', async () => {
    const onGenerate = vi.fn();
    render(<VoiceOverGenerator onGenerate={onGenerate} />);

    const textInput = screen.getByLabelText(/text to speech/i);
    fireEvent.change(textInput, { target: { value: '  Test text  ' } });

    const generateButton = screen.getByRole('button', { name: /generate voiceover/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(onGenerate).toHaveBeenCalledTimes(1);
    });

    const voiceOver: VoiceOver = onGenerate.mock.calls[0][0];
    expect(voiceOver.text).toBe('Test text');
  });
});
