/**
 * GridLayoutContainer Component
 * 
 * Complete grid layout system with toolbar and all features integrated
 * Combines GridLayout, GridLayoutToolbar, and selection management
 */

import React, { useState, useCallback } from 'react';
import { GridLayout } from './GridLayout';
import { GridLayoutToolbar } from './GridLayoutToolbar';
import type { GridLayoutConfig, GridPanel } from '../../types/gridEditorAdvanced';

interface GridLayoutContainerProps {
  initialConfig: GridLayoutConfig;
  initialItems: GridPanel[];
  onLayoutChange?: (items: GridPanel[]) => void;
  onConfigChange?: (config: GridLayoutConfig) => void;
}

export const GridLayoutContainer: React.FC<GridLayoutContainerProps> = ({
  initialConfig,
  initialItems,
  onLayoutChange,
  onConfigChange
}) => {
  const [config, setConfig] = useState<GridLayoutConfig>(initialConfig);
  const [items, setItems] = useState<GridPanel[]>(initialItems);
  const [selectedPanelIds, setSelectedPanelIds] = useState<string[]>([]);
  const gridLayoutRef = React.useRef<{ distributeEvenly: (ids: string[], direction: 'horizontal' | 'vertical') => void }>(null);

  const handleLayoutChange = useCallback((newItems: GridPanel[]) => {
    setItems(newItems);
    onLayoutChange?.(newItems);
  }, [onLayoutChange]);

  const handleDistributeHorizontally = useCallback(() => {
    if (selectedPanelIds.length < 2) return;
    
    // Calculate uniform spacing
    const selectedPanels = items.filter(item => selectedPanelIds.includes(item.id));
    const sorted = [...selectedPanels].sort((a, b) => a.position.x - b.position.x);
    
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const totalSpace = (last.position.x + last.size.width) - first.position.x;
    const totalPanelWidth = sorted.reduce((sum, panel) => sum + panel.size.width, 0);
    const spacing = (totalSpace - totalPanelWidth) / (sorted.length - 1);

    // Reposition with animation
    let currentX = first.position.x;
    const newItems = items.map(item => {
      const sortedIndex = sorted.findIndex(p => p.id === item.id);
      if (sortedIndex === -1) return item;

      const newItem = { ...item, position: { ...item.position, x: currentX } };
      currentX += item.size.width + spacing;
      return newItem;
    });

    setItems(newItems);
    onLayoutChange?.(newItems);
  }, [selectedPanelIds, items, onLayoutChange]);

  const handleDistributeVertically = useCallback(() => {
    if (selectedPanelIds.length < 2) return;
    
    // Calculate uniform spacing
    const selectedPanels = items.filter(item => selectedPanelIds.includes(item.id));
    const sorted = [...selectedPanels].sort((a, b) => a.position.y - b.position.y);
    
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const totalSpace = (last.position.y + last.size.height) - first.position.y;
    const totalPanelHeight = sorted.reduce((sum, panel) => sum + panel.size.height, 0);
    const spacing = (totalSpace - totalPanelHeight) / (sorted.length - 1);

    // Reposition with animation
    let currentY = first.position.y;
    const newItems = items.map(item => {
      const sortedIndex = sorted.findIndex(p => p.id === item.id);
      if (sortedIndex === -1) return item;

      const newItem = { ...item, position: { ...item.position, y: currentY } };
      currentY += item.size.height + spacing;
      return newItem;
    });

    setItems(newItems);
    onLayoutChange?.(newItems);
  }, [selectedPanelIds, items, onLayoutChange]);

  const handleToggleGridLines = useCallback(() => {
    const newConfig = { ...config, showGridLines: !config.showGridLines };
    setConfig(newConfig);
    onConfigChange?.(newConfig);
  }, [config, onConfigChange]);

  const handleToggleSnap = useCallback(() => {
    const newConfig = { ...config, snapEnabled: !config.snapEnabled };
    setConfig(newConfig);
    onConfigChange?.(newConfig);
  }, [config, onConfigChange]);

  // Handle panel selection (for future implementation)
  const handlePanelClick = useCallback((panelId: string, multiSelect: boolean) => {
    if (multiSelect) {
      setSelectedPanelIds(prev => 
        prev.includes(panelId) 
          ? prev.filter(id => id !== panelId)
          : [...prev, panelId]
      );
    } else {
      setSelectedPanelIds([panelId]);
    }
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <GridLayoutToolbar
        selectedPanelIds={selectedPanelIds}
        onDistributeHorizontally={handleDistributeHorizontally}
        onDistributeVertically={handleDistributeVertically}
        onToggleGridLines={handleToggleGridLines}
        onToggleSnap={handleToggleSnap}
        showGridLines={config.showGridLines}
        snapEnabled={config.snapEnabled}
      />

      <GridLayout
        config={config}
        items={items}
        onLayoutChange={handleLayoutChange}
      />
    </div>
  );
};
