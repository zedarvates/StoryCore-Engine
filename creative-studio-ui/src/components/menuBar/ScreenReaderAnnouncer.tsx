/**
 * Screen Reader Announcer Component
 * 
 * Provides accessibility announcements for screen readers.
 * Uses ARIA live regions to announce menu navigation and state changes.
 */

import React, { createContext, useContext, useCallback } from 'react';

interface ScreenReaderAnnouncerContextType {
  announce: (message: string, priority?: 'polite' | 'assertive', delay?: number) => void;
}

const ScreenReaderAnnouncerContext = createContext<ScreenReaderAnnouncerContextType | null>(null);

export const ScreenReaderAnnouncerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite', delay = 0) => {
    // Create a temporary live region for the announcement
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.style.position = 'absolute';
    liveRegion.style.left = '-10000px';
    liveRegion.style.width = '1px';
    liveRegion.style.height = '1px';
    liveRegion.style.overflow = 'hidden';
    
    document.body.appendChild(liveRegion);
    
    // Announce after delay
    setTimeout(() => {
      liveRegion.textContent = message;
    }, delay);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(liveRegion);
    }, delay + 1000);
  }, []);

  return (
    <ScreenReaderAnnouncerContext.Provider value={{ announce }}>
      {children}
    </ScreenReaderAnnouncerContext.Provider>
  );
};

export const useScreenReaderAnnouncer = () => {
  const context = useContext(ScreenReaderAnnouncerContext);
  if (!context) {
    throw new Error('useScreenReaderAnnouncer must be used within ScreenReaderAnnouncerProvider');
  }
  return context;
};
