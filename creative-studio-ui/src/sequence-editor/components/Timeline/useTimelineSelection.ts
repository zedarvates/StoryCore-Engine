/**
 * Timeline Selection Hook
 * Manages shot selection state and operations.
 */
import { useCallback, useState } from 'react';
import type { Shot } from '../../types';

interface UseTimelineSelectionOptions {
  shots?: Shot[];
  onSelectionChange?: (selectedIds: string[]) => void;
}

export const useTimelineSelection = (options: UseTimelineSelectionOptions = {}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setLastSelectedId(null);
    options.onSelectionChange?.([]);
  }, [options]);

  const selectOne = useCallback((id: string, addToSelection = false) => {
    const newSelection = addToSelection
      ? new Set(selectedIds)
      : new Set<string>();
    newSelection.add(id);
    setSelectedIds(newSelection);
    setLastSelectedId(id);
    options.onSelectionChange?.(Array.from(newSelection));
  }, [selectedIds, options]);

  const selectRange = useCallback((startId: string, endId: string) => {
    if (!options.shots) return;
    const shotsArray = options.shots;
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
    options.onSelectionChange?.(Array.from(newSelection));
  }, [options.shots, options]);

  const toggleSelection = useCallback((id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
    setLastSelectedId(id);
    options.onSelectionChange?.(Array.from(newSelection));
  }, [selectedIds, options]);

  const handleItemClick = useCallback((id: string, event: React.MouseEvent | React.KeyboardEvent) => {
    const isMulti = event.shiftKey || event.ctrlKey || event.metaKey;
    const isRange = event.shiftKey && lastSelectedId;
    if (isRange && options.shots) {
      selectRange(lastSelectedId, id);
    } else if (isMulti) {
      toggleSelection(id);
    } else {
      selectOne(id, false);
    }
  }, [lastSelectedId, options.shots, selectRange, toggleSelection, selectOne]);

  const selectAll = useCallback(() => {
    if (!options.shots) return;
    const allIds = new Set(options.shots.map((s) => s.id));
    setSelectedIds(allIds);
    options.onSelectionChange?.(Array.from(allIds));
  }, [options.shots, options]);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  const getSelectedItems = useCallback(() => {
    if (!options.shots) return [];
    return options.shots.filter((s) => selectedIds.has(s.id));
  }, [options.shots, selectedIds]);

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
