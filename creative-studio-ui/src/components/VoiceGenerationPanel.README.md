# VoiceGenerationPanel Component

## Overview

The `VoiceGenerationPanel` component provides a comprehensive UI for configuring and generating voice audio for dialogue phrases. It integrates with the voice generation service to provide preview and generation functionality with real-time feedback.

## Requirements

- **5.1**: Display voice generation options (voice type, speed, pitch)
- **5.4**: Allow users to preview generated voice audio before committing to the timeline

## Features

### Voice Configuration
- **Voice Type Selection**: Choose between male, female, or neutral voices
- **Language Selection**: Support for multiple languages (English, Spanish, French, German, Italian, Portuguese, Japanese, Chinese)
- **Speed Control**: Adjust speech speed from 0.5x (slower) to 2.0x (faster)
- **Pitch Control**: Adjust voice pitch from -12 to +12 semitones

### Generation Controls
- **Preview Button**: Generate and preview audio without committing
- **Generate Button**: Generate final audio and update dialogue phrase
- **Stop Preview**: Stop currently playing preview audio

### User Feedback
- **Progress Indicator**: Visual progress bar during generation
- **Estimated Duration**: Shows estimated audio duration based on text length and speed
- **Generated Badge**: Visual indicator when audio has been generated
- **Error Display**: Clear error messages for failed operations
- **Loading States**: Disabled controls during generation

## Props

```typescript
interface VoiceGenerationPanelProps {
  phrase: DialoguePhrase;           // Dialogue phrase to generate voice for
  onGenerate: (voiceParams: VoiceParameters) => Promise<void>;  // Generate callback
  onPreview?: (audioUrl: string) => void;  // Preview callback (optional)
  isGenerating?: boolean;            // External generating state (optional)
  className?: string;                // Additional CSS classes (optional)
}
```

## Usage Example

```tsx
import { VoiceGenerationPanel } from './components/VoiceGenerationPanel';
import { useProject } from './contexts/ProjectContext';

function AudioEditor() {
  const { updateDialoguePhrase } = useProject();
  const [selectedPhrase, setSelectedPhrase] = useState<DialoguePhrase | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async (voiceParams: VoiceParameters) => {
    if (!selectedPhrase) return;

    setIsGenerating(true);
    try {
      // Generate voice
      const result = await generateVoice({
        text: selectedPhrase.text,
        voiceParams,
      });

      if (result.success && result.audioUrl) {
        // Update phrase with generated audio
        updateDialoguePhrase(selectedPhrase.id, {
          voiceParameters: voiceParams,
          generatedAudioUrl: result.audioUrl,
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreview = (audioUrl: string) => {
    console.log('Preview audio:', audioUrl);
    // Optional: Add to timeline preview or show in modal
  };

  if (!selectedPhrase) {
    return <div>Select a phrase to generate voice</div>;
  }

  return (
    <VoiceGenerationPanel
      phrase={selectedPhrase}
      onGenerate={handleGenerate}
      onPreview={handlePreview}
      isGenerating={isGenerating}
    />
  );
}
```

## Integration with ProjectContext

The component is designed to work seamlessly with the ProjectContext:

```tsx
import { VoiceGenerationPanel } from './components/VoiceGenerationPanel';
import { useProject } from './contexts/ProjectContext';
import { generateVoice } from './services/voiceGenerationService';

function AudioTrackManager() {
  const { project, updateDialoguePhrase } = useProject();
  const [selectedPhrase, setSelectedPhrase] = useState<DialoguePhrase | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async (voiceParams: VoiceParameters) => {
    if (!selectedPhrase) return;

    setIsGenerating(true);
    try {
      const result = await generateVoice({
        text: selectedPhrase.text,
        voiceParams,
        onProgress: (progress) => {
          console.log(`Generation progress: ${progress}%`);
        },
      });

      if (result.success && result.audioUrl) {
        // Update phrase in project context
        updateDialoguePhrase(selectedPhrase.id, {
          voiceParameters: voiceParams,
          generatedAudioUrl: result.audioUrl,
        });
      } else {
        console.error('Generation failed:', result.error);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      {/* Phrase selection UI */}
      {selectedPhrase && (
        <VoiceGenerationPanel
          phrase={selectedPhrase}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
        />
      )}
    </div>
  );
}
```

## Voice Parameters

The component uses the `VoiceParameters` interface:

```typescript
interface VoiceParameters {
  voiceType: 'male' | 'female' | 'neutral';
  speed: number;      // 0.5 - 2.0
  pitch: number;      // -12 to +12 semitones
  language: string;   // ISO 639-1 code (2 characters)
}
```

## State Management

The component maintains local state for:
- Voice configuration parameters (type, speed, pitch, language)
- Preview generation state
- Preview audio URL
- Error messages
- Progress tracking

Local state is synchronized with the phrase's `voiceParameters` when they change.

## Audio Preview

The component includes a hidden `<audio>` element for preview playback:
- Preview audio is generated using the voice generation service
- Audio automatically plays when preview generation completes
- Preview audio URLs are properly cleaned up to prevent memory leaks
- Stop button allows canceling preview playback

## Error Handling

The component handles various error scenarios:
- Empty phrase text
- Voice generation failures
- Invalid voice parameters
- Network errors

Errors are displayed in a prominent error box with clear messaging.

## Accessibility

The component includes accessibility features:
- ARIA labels for all interactive elements
- Proper label associations for form controls
- Error role for error messages
- Disabled states for controls during generation
- Keyboard navigation support

## Styling

The component uses inline styles for consistency with other dashboard components:
- Dark theme with #1a1a1a background
- Clear visual hierarchy
- Responsive layout
- Visual feedback for all interactions

## Performance Considerations

- Audio URLs are properly cleaned up using `URL.revokeObjectURL()`
- Progress updates are throttled to prevent excessive re-renders
- Preview audio is cached until new preview is generated
- Debounced slider updates for smooth interaction

## Testing

The component should be tested for:
1. Voice parameter changes update local state
2. Preview button generates and plays audio
3. Generate button calls onGenerate callback with correct parameters
4. Error states display correctly
5. Loading states disable controls appropriately
6. Audio cleanup on unmount
7. Accessibility features work correctly

## Future Enhancements

Potential improvements:
- Voice sample preview before generation
- Waveform visualization
- Batch generation for multiple phrases
- Voice cloning support
- Emotion/style controls
- Advanced audio effects (reverb, EQ, etc.)
