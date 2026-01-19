import { DndProvider as ReactDndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import type { ReactNode } from 'react';

// ============================================================================
// DnD Provider Component
// ============================================================================

interface DndProviderProps {
  children: ReactNode;
}

export function DndProvider({ children }: DndProviderProps) {
  return <ReactDndProvider backend={HTML5Backend}>{children}</ReactDndProvider>;
}
