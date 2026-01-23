import React from 'react';
import { Volume2, Speaker } from 'lucide-react';

export interface AudioSurroundPreviewProps {
  surroundMode: '5.1' | '7.1';
  elements: Array<{
    id: string;
    name: string;
    audio?: {
      enabled: boolean;
      speakerAssignment: string;
      volume: number;
    };
  }>;
  className?: string;
}

export const AudioSurroundPreview: React.FC<AudioSurroundPreviewProps> = ({
  surroundMode,
  elements,
  className = ''
}) => {
  const speakers = surroundMode === '5.1'
    ? ['front-left', 'front-center', 'front-right', 'surround-left', 'surround-right', 'lfe']
    : ['front-left', 'front-center', 'front-right', 'surround-left', 'surround-right', 'back-left', 'back-right', 'lfe'];

  const getElementsForSpeaker = (speaker: string) => {
    return elements.filter(el =>
      el.audio?.enabled &&
      (el.audio.speakerAssignment === speaker || el.audio.speakerAssignment === 'auto')
    );
  };

  return (
    <div className={`audio-surround-preview ${className}`}>
      <div className="preview-header">
        <Volume2 size={16} />
        <span>Configuration {surroundMode}</span>
      </div>

      <div className="surround-layout">
        {/* Front speakers */}
        <div className="speaker-row front">
          <div className="speaker front-left">
            <Speaker size={14} />
            <span>L</span>
            {getElementsForSpeaker('front-left').length > 0 && (
              <div className="speaker-elements">
                {getElementsForSpeaker('front-left').map(el => (
                  <div key={el.id} className="element-dot" title={el.name} />
                ))}
              </div>
            )}
          </div>

          <div className="speaker front-center">
            <Speaker size={14} />
            <span>C</span>
            {getElementsForSpeaker('front-center').length > 0 && (
              <div className="speaker-elements">
                {getElementsForSpeaker('front-center').map(el => (
                  <div key={el.id} className="element-dot" title={el.name} />
                ))}
              </div>
            )}
          </div>

          <div className="speaker front-right">
            <Speaker size={14} />
            <span>R</span>
            {getElementsForSpeaker('front-right').length > 0 && (
              <div className="speaker-elements">
                {getElementsForSpeaker('front-right').map(el => (
                  <div key={el.id} className="element-dot" title={el.name} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Surround speakers */}
        <div className="speaker-row surround">
          <div className="speaker surround-left">
            <Speaker size={14} />
            <span>SL</span>
            {getElementsForSpeaker('surround-left').length > 0 && (
              <div className="speaker-elements">
                {getElementsForSpeaker('surround-left').map(el => (
                  <div key={el.id} className="element-dot" title={el.name} />
                ))}
              </div>
            )}
          </div>

          <div className="speaker lfe">
            <Speaker size={14} />
            <span>LFE</span>
            {getElementsForSpeaker('lfe').length > 0 && (
              <div className="speaker-elements">
                {getElementsForSpeaker('lfe').map(el => (
                  <div key={el.id} className="element-dot" title={el.name} />
                ))}
              </div>
            )}
          </div>

          <div className="speaker surround-right">
            <Speaker size={14} />
            <span>SR</span>
            {getElementsForSpeaker('surround-right').length > 0 && (
              <div className="speaker-elements">
                {getElementsForSpeaker('surround-right').map(el => (
                  <div key={el.id} className="element-dot" title={el.name} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Back speakers (7.1 only) */}
        {surroundMode === '7.1' && (
          <div className="speaker-row back">
            <div className="speaker back-left">
              <Speaker size={14} />
              <span>BL</span>
              {getElementsForSpeaker('back-left').length > 0 && (
                <div className="speaker-elements">
                  {getElementsForSpeaker('back-left').map(el => (
                    <div key={el.id} className="element-dot" title={el.name} />
                  ))}
                </div>
              )}
            </div>

            <div className="speaker back-right">
              <Speaker size={14} />
              <span>BR</span>
              {getElementsForSpeaker('back-right').length > 0 && (
                <div className="speaker-elements">
                  {getElementsForSpeaker('back-right').map(el => (
                    <div key={el.id} className="element-dot" title={el.name} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};