/**
 * TimelineMixer Component - Right Zone of Timeline (Point 5.3)
 * 
 * Displays VU-meters for master and individual tracks.
 */

import React, { useRef, useEffect } from 'react';
import './TimelineMixer.css';

export const TimelineMixer: React.FC = () => {
  const [levels, setLevels] = React.useState<Record<string, number>>({
    'V1': 0, 'A1': 0, 'A2': 0, 'A3': 0, 'M': 0
  });
  
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setLevels(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(ch => {
          // Simulate some motion
          const base = -10 - Math.random() * 30;
          next[ch] = base;
        });
        return next;
      });
    }, 120);
    return () => clearInterval(interval);
  }, []);

  const channels = ['V1', 'A1', 'A2', 'A3', 'M'];

  const getMeterHeight = (db: number) => {
    // Map -60 - 0 to 0 - 100%
    return Math.max(0, Math.min(100, (db + 60) * 1.666));
  };

  return (
    <div className="timeline-mixer" ref={containerRef}>
      <div className="mixer-header">
        <span>Mixer</span>
      </div>
      <div className="mixer-meters">
        {channels.map(ch => {
          const db = levels[ch] || -60;
          const h = getMeterHeight(db);
          const isClipping = db > -3;

          return (
            <div key={ch} className="mixer-channel">
              <div className="meter-container">
                <div className={`clip-indicator ${isClipping ? 'active' : ''}`} />
                <div className="meter-bar">
                  <div 
                    className="meter-fill green" 
                    style={{ '--meter-h': `${Math.min(h, 70)}%` } as React.CSSProperties} 
                  />
                  {h > 70 && (
                    <div 
                        className="meter-fill yellow" 
                        style={{ '--meter-h': `${Math.min(h - 70, 15)}%`, '--meter-bottom': '70%' } as React.CSSProperties} 
                    />
                  )}
                  {h > 85 && (
                    <div 
                        className="meter-fill red" 
                        style={{ '--meter-h': `${Math.min(h - 85, 15)}%`, '--meter-bottom': '85%' } as React.CSSProperties} 
                    />
                  )}
                </div>
                <div className="meter-ticks">
                  {[0, -10, -20, -30, -40, -50].map(v => (
                    <span key={v} className="tick">{v}</span>
                  ))}
                </div>
              </div>
              <div className="channel-label">{ch}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimelineMixer;
