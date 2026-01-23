import React, { useState, useRef, useEffect } from 'react';

export interface PanelConfig {
  id: string;
  minSize: number; // percentage
  maxSize: number; // percentage
  defaultSize: number; // percentage
  content: React.ReactNode;
}

interface ResizablePanelGroupProps {
  panels: PanelConfig[];
  direction?: 'horizontal' | 'vertical';
  className?: string;
  onResize?: (sizes: Record<string, number>) => void;
}

export const ResizablePanelGroup: React.FC<ResizablePanelGroupProps> = ({
  panels,
  direction = 'horizontal',
  className = '',
  onResize,
}) => {
  const [panelSizes, setPanelSizes] = useState<Record<string, number>>(() => {
    const initialSizes: Record<string, number> = {};
    panels.forEach((panel) => {
      initialSizes[panel.id] = panel.defaultSize;
    });
    return initialSizes;
  });

  const [isDragging, setIsDragging] = useState(false);
  const [activeHandle, setActiveHandle] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef<number>(0);
  const startSizesRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => {
        if (activeHandle === null || !containerRef.current) return;

        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        const currentPos =
          direction === 'horizontal'
            ? ((e.clientX - rect.left) / rect.width) * 100
            : ((e.clientY - rect.top) / rect.height) * 100;

        const delta = currentPos - startPosRef.current;

        const leftPanel = panels[activeHandle];
        const rightPanel = panels[activeHandle + 1];

        const newLeftSize = Math.max(
          leftPanel.minSize,
          Math.min(leftPanel.maxSize, startSizesRef.current[leftPanel.id] + delta)
        );

        const newRightSize = Math.max(
          rightPanel.minSize,
          Math.min(rightPanel.maxSize, startSizesRef.current[rightPanel.id] - delta)
        );

        // Check if both panels can accommodate the new sizes
        const leftDelta = newLeftSize - startSizesRef.current[leftPanel.id];
        const rightDelta = startSizesRef.current[rightPanel.id] - newRightSize;

        if (Math.abs(leftDelta - rightDelta) < 0.1) {
          const newSizes = { ...panelSizes };
          newSizes[leftPanel.id] = newLeftSize;
          newSizes[rightPanel.id] = newRightSize;

          setPanelSizes(newSizes);
          onResize?.(newSizes);
        }
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        setActiveHandle(null);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, activeHandle, direction, panels, panelSizes, onResize]);

  const handleMouseDown = (e: React.MouseEvent, handleIndex: number) => {
    e.preventDefault();

    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const startPos =
      direction === 'horizontal'
        ? ((e.clientX - rect.left) / rect.width) * 100
        : ((e.clientY - rect.top) / rect.height) * 100;

    startPosRef.current = startPos;
    startSizesRef.current = { ...panelSizes };
    setActiveHandle(handleIndex);
    setIsDragging(true);

    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <div
      ref={containerRef}
      className={`flex ${direction === 'horizontal' ? 'flex-row' : 'flex-col'} w-full h-full ${className}`}
    >
      {panels.map((panel, index) => (
        <React.Fragment key={panel.id}>
          {/* Panel */}
          <div
            className="overflow-hidden"
            style={{
              [direction === 'horizontal' ? 'width' : 'height']: `${panelSizes[panel.id]}%`,
              minWidth: direction === 'horizontal' ? `${panel.minSize}%` : undefined,
              maxWidth: direction === 'horizontal' ? `${panel.maxSize}%` : undefined,
              minHeight: direction === 'vertical' ? `${panel.minSize}%` : undefined,
              maxHeight: direction === 'vertical' ? `${panel.maxSize}%` : undefined,
            }}
          >
            {panel.content}
          </div>

          {/* Resize Handle */}
          {index < panels.length - 1 && (
            <div
              className={`flex-shrink-0 ${
                direction === 'horizontal'
                  ? 'w-1 cursor-col-resize hover:bg-purple-500 active:bg-purple-600'
                  : 'h-1 cursor-row-resize hover:bg-purple-500 active:bg-purple-600'
              } bg-gray-300 transition-colors ${
                activeHandle === index ? 'bg-purple-600' : ''
              }`}
              onMouseDown={(e) => handleMouseDown(e, index)}
              role="separator"
              aria-orientation={direction}
              aria-valuenow={panelSizes[panel.id].toString()}
              aria-valuemin={panel.minSize.toString()}
              aria-valuemax={panel.maxSize.toString()}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
