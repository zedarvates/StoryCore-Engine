import React, { createContext, useContext, ReactNode } from 'react';
import { useSequencePlanStore } from '@/stores/sequencePlanStore';

const SequencePlanContext = createContext<ReturnType<typeof useSequencePlanStore> | null>(null);

interface SequencePlanProviderProps {
  children: ReactNode;
}

export function SequencePlanProvider({ children }: SequencePlanProviderProps) {
  const store = useSequencePlanStore();

  return (
    <SequencePlanContext.Provider value={store}>
      {children}
    </SequencePlanContext.Provider>
  );
}

export function useSequencePlanContext() {
  const context = useContext(SequencePlanContext);
  if (!context) {
    throw new Error('useSequencePlanContext must be used within SequencePlanProvider');
  }
  return context;
}