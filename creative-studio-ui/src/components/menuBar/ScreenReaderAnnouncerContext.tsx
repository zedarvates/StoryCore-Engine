import { createContext, useContext } from 'react';

export interface ScreenReaderAnnouncerContextType {
  announce: (message: string, priority?: 'polite' | 'assertive', delay?: number) => void;
}

export const ScreenReaderAnnouncerContext = createContext<ScreenReaderAnnouncerContextType | null>(null);

export const useScreenReaderAnnouncer = () => {
  const context = useContext(ScreenReaderAnnouncerContext);
  if (!context) {
    throw new Error('useScreenReaderAnnouncer must be used within ScreenReaderAnnouncerProvider');
  }
  return context;
};

export const useOptionalScreenReaderAnnouncer = () => {
  return useContext(ScreenReaderAnnouncerContext);
};
