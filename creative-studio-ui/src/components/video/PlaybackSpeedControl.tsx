import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface PlaybackSpeedControlProps {
  currentSpeed: number;
  onSpeedChange: (speed: number) => void;
  className?: string;
}

const PLAYBACK_SPEEDS = [0.25, 0.5, 1, 1.5, 2];

export const PlaybackSpeedControl: React.FC<PlaybackSpeedControlProps> = ({
  currentSpeed,
  onSpeedChange,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSpeedSelect = (speed: number) => {
    onSpeedChange(speed);
    setIsOpen(false);
  };

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      {/* Speed Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 hover:bg-white hover:bg-opacity-20 rounded transition-colors text-white text-sm font-medium"
        title="Vitesse de lecture"
      >
        {currentSpeed}x
      </button>

      {/* Speed Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden min-w-[120px]"
          >
            <div className="py-1">
              {PLAYBACK_SPEEDS.map((speed) => (
                <button
                  key={speed}
                  onClick={() => handleSpeedSelect(speed)}
                  className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                    speed === currentSpeed
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{speed}x</span>
                    {speed === 1 && (
                      <span className="text-xs text-gray-400">(Normal)</span>
                    )}
                    {speed === currentSpeed && (
                      <span className="text-blue-300">✓</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PlaybackSpeedControl;
