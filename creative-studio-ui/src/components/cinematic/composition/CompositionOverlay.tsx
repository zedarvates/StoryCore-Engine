import React from 'react';
import './CompositionOverlay.css';

interface CompositionOverlayProps {
  type: 'thirds' | 'golden' | 'perspective' | 'diagonal' | 'center' | 'safe_areas';
  visible: boolean;
  color?: string;
  opacity?: number;
}

export const CompositionOverlay: React.FC<CompositionOverlayProps> = ({
  type,
  visible,
  color = 'rgba(255, 255, 255, 0.3)',
  opacity = 1
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.setProperty('--overlay-color', color);
      containerRef.current.style.setProperty('--overlay-opacity', opacity.toString());
    }
  }, [color, opacity, visible]);

  if (!visible) return null;

  const renderThirds = () => (
    <div className="overlay-grid thirds" ref={containerRef}>
      <div className="line-v v1" />
      <div className="line-v v2" />
      <div className="line-h h1" />
      <div className="line-h h2" />
    </div>
  );

  const renderCenter = () => (
    <div className="overlay-center" ref={containerRef}>
      <div className="cross-v" />
      <div className="cross-h" />
      <div className="circle" />
    </div>
  );

  const renderDiagonal = () => (
    <svg className="overlay-svg" viewBox="0 0 100 100" preserveAspectRatio="none" ref={containerRef as unknown as React.RefObject<SVGSVGElement>}>
      <line x1="0" y1="0" x2="100" y2="100" stroke="currentColor" strokeWidth="0.5" />
      <line x1="100" y1="0" x2="0" y2="100" stroke="currentColor" strokeWidth="0.5" />
    </svg>
  );

  const renderGolden = () => (
    <div className="overlay-golden" ref={containerRef}>
       <div className="golden-v1" />
       <div className="golden-v2" />
       <div className="golden-h1" />
       <div className="golden-h2" />
    </div>
  );

  const renderPerspective = () => (
    <svg className="overlay-perspective" viewBox="0 0 100 100" preserveAspectRatio="none" ref={containerRef as unknown as React.RefObject<SVGSVGElement>}>
      <line x1="50" y1="50" x2="0" y2="0" stroke="currentColor" strokeWidth="0.3" />
      <line x1="50" y1="50" x2="100" y2="0" stroke="currentColor" strokeWidth="0.3" />
      <line x1="50" y1="50" x2="0" y2="100" stroke="currentColor" strokeWidth="0.3" />
      <line x1="50" y1="50" x2="100" y2="100" stroke="currentColor" strokeWidth="0.3" />
      <circle cx="50" cy="50" r="1.5" fill="currentColor" opacity="0.5" />
    </svg>
  );

  const renderSafeAreas = () => (
    <div className="overlay-safe-areas" ref={containerRef}>
        <div className="safe-action" />
        <div className="safe-title" />
    </div>
  );

  switch (type) {
    case 'thirds': return renderThirds();
    case 'center': return renderCenter();
    case 'diagonal': return renderDiagonal();
    case 'golden': return renderGolden();
    case 'perspective': return renderPerspective();
    case 'safe_areas': return renderSafeAreas();
    default: return null;
  }
};
