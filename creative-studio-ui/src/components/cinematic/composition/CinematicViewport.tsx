import React from 'react';
import { CompositionOverlay } from './CompositionOverlay';
import './CinematicViewport.css';

interface CinematicViewportProps {
  src?: string;
  type?: 'video' | 'image' | 'mockup';
  overlays: Record<string, boolean>;
  zoom?: number;
  children?: React.ReactNode;
}

export const CinematicViewport: React.FC<CinematicViewportProps> = ({
  src,
  type = 'video',
  overlays,
  zoom = 1,
  children
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.setProperty('--viewport-zoom', zoom.toString());
    }
  }, [zoom]);

  return (
    <div className="cinematic-viewport-container" ref={containerRef}>
      <div className="viewport-main">
        {type === 'video' && src && (
          <video src={src} className="viewport-media" autoPlay loop muted />
        )}
        
        {type === 'image' && src && (
          <img src={src} alt="Shot Preview" className="viewport-media" />
        )}

        {type === 'mockup' && (
          <div className="viewport-mockup-bg">
            {children}
          </div>
        )}

        {/* Composition Layers */}
        <CompositionOverlay type="thirds" visible={overlays.thirds} />
        <CompositionOverlay type="golden" visible={overlays.golden} />
        <CompositionOverlay type="perspective" visible={overlays.perspective} />
        <CompositionOverlay type="center" visible={overlays.center} />
        <CompositionOverlay type="safe_areas" visible={overlays.safe_areas} />
      </div>
    </div>
  );
};
