import { useEffect } from 'react';
import { CanvasElement, calculateAudioProperties } from './types';

export const useAudioSpatialization = (
  elements: CanvasElement[],
  surroundMode: '5.1' | '7.1',
  enabled: boolean,
  onElementUpdate: (elementId: string, updates: Partial<CanvasElement>) => void
) => {
  useEffect(() => {
    if (!enabled) return;

    // Update audio properties for all puppet elements when their position changes
    elements.forEach(element => {
      if (element.type === 'puppet' && element.audio?.spatialization) {
        const audioProps = calculateAudioProperties(element.position, surroundMode);

        // Only update if audio properties have actually changed
        const currentAudio = element.audio;
        const needsUpdate =
          !currentAudio ||
          currentAudio.speakerAssignment !== audioProps.speakerAssignment ||
          Math.abs(currentAudio.volume - audioProps.volume) > 0.01 ||
          Math.abs(currentAudio.reverb - audioProps.reverb) > 0.01 ||
          Math.abs(currentAudio.delay - audioProps.delay) > 1;

        if (needsUpdate) {
          onElementUpdate(element.id, {
            audio: {
              ...currentAudio,
              ...audioProps,
              enabled: currentAudio?.enabled ?? true,
              spatialization: true
            }
          });
        }
      }
    });
  }, [elements, surroundMode, enabled, onElementUpdate]);
};