/**
 * Timeline Selection Hook
 * Manages shot selection state and operations.
 */
import { useCallback, useState, useRef, useEffect } from 'react';
import type { Shot } from '../../types';

interface UseTimelineSelectionOptions {
  shots?: Shot[];
  onSelectionChange?: (selectedIds: string[]) => void;
}

export const useTimelineSelection = (options: UseTimelineSelectionOptions = {}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setLastSelectedId(null);
    optionsRef.current.onSelectionChange?.([]);
  }, []);

  const selectOne = useCallback((id: string, addToSelection = false) => {
    const newSelection = addToSelection
      ? new Set(selectedIds)
      : new Set<string>();
    newSelection.add(id);
    setSelectedIds(newSelection);
    setLastSelectedId(id);
    optionsRef.current.onSelectionChange?.(Array.from(newSelection));
  }, [selectedIds]);

  const selectRange = useCallback((startId: string, endId: string) => {
    if (!optionsRef.current.shots) return;
    const shotsArray = optionsRef.current.shots;
    const startIndex = shotsArray.findIndex((s) => s.id === startId);
    const endIndex = shotsArray.findIndex((s) => s.id === endId);
    if (startIndex === -1 || endIndex === -1) return;
    const [min, max] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
    const newSelection = new Set<string>();
    for (let i = min; i <= max; i++) {
      newSelection.add(shotsArray[i].id);
    }
    setSelectedIds(newSelection);
    setLastSelectedId(endId);
    optionsRef.current.onSelectionChange?.(Array.from(newSelection));
  }, []);

  const toggleSelection = useCallback((id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
    setLastSelectedId(id);
    optionsRef.current.onSelectionChange?.(Array.from(newSelection));
  }, [selectedIds]);

  const handleItemClick = useCallback((id: string, event: { shiftKey: boolean, ctrlKey: boolean, metaKey: boolean }) => {
    const isMulti = event.shiftKey || event.ctrlKey || event.metaKey;
    const isRange = event.shiftKey && lastSelectedId;
    if (isRange && optionsRef.current.shots) {
      selectRange(lastSelectedId, id);
    } else if (isMulti) {
      toggleSelection(id);
    } else {
      selectOne(id, false);
    }
  }, [lastSelectedId, selectRange, toggleSelection, selectOne]);

  const selectAll = useCallback(() => {
    if (!optionsRef.current.shots) return;
    const allIds = new Set(optionsRef.current.shots.map((s) => s.id));
    setSelectedIds(allIds);
    optionsRef.current.onSelectionChange?.(Array.from(allIds));
  }, []);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  const getSelectedItems = useCallback(() => {
    if (!optionsRef.current.shots) return [];
    return optionsRef.current.shots.filter((s) => selectedIds.has(s.id));
  }, [selectedIds]);

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    lastSelectedId,
    clearSelection,
    selectOne,
    selectRange,
    toggleSelection,
    handleItemClick,
    selectAll,
    isSelected,
    getSelectedItems,
  };
};

export default useTimelineSelection;
