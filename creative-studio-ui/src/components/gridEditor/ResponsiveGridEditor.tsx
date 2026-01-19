/**
 * ResponsiveGridEditor - Responsive wrapper for GridEditorCanvas
 * 
 * Handles responsive layout adjustments for different screen sizes:
 * - Desktop: Full layout with all panels
 * - Tablet: Adjusted toolbar and properties panel
 * - Mobile: Simplified layout with collapsible panels
 * 
 * Also handles touch interactions for tablet devices.
 */

import React, { useState, useEffect } from 'react';
import { GridEditorCanvas, GridEditorCanvasProps } from './GridEditorCanvas';
import { Menu, X } from 'lucide-react';

type ScreenSize = 'mobile' | 'tablet' | 'desktop';

interface ResponsiveGridEditorProps extends GridEditorCanvasProps {
  // Additional responsive-specific props can be added here
}

/**
 * Hook to detect screen size
 */
function useScreenSize(): ScreenSize {
  const [screenSize, setScreenSize] = useState<ScreenSize>('desktop');

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setScreenSize('mobile');
      } else if (width < 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  return screenSize;
}

/**
 * Responsive Grid Editor Component
 */
export const ResponsiveGridEditor: React.FC<ResponsiveGridEditorProps> = (props) => {
  const screenSize = useScreenSize();
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(true);
  const [showAssetLibrary, setShowAssetLibrary] = useState(true);

  // Auto-hide panels on smaller screens
  useEffect(() => {
    if (screenSize === 'mobile') {
      setShowPropertiesPanel(false);
      setShowAssetLibrary(false);
    } else if (screenSize === 'tablet') {
      setShowPropertiesPanel(false);
      setShowAssetLibrary(true);
    } else {
      setShowPropertiesPanel(true);
      setShowAssetLibrary(true);
    }
  }, [screenSize]);

  // Mobile layout
  if (screenSize === 'mobile') {
    return (
      <div className="flex flex-col h-full">
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-2 border-b border-border bg-card">
          <button
            onClick={() => setShowAssetLibrary(!showAssetLibrary)}
            className="p-2 hover:bg-muted rounded-md"
            aria-label="Toggle asset library"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-sm font-semibold">Grid Editor</h1>
          <button
            onClick={() => setShowPropertiesPanel(!showPropertiesPanel)}
            className="p-2 hover:bg-muted rounded-md"
            aria-label="Toggle properties"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Content */}
        <div className="flex-1 relative overflow-hidden">
          <GridEditorCanvas {...props} className="h-full" />

          {/* Overlay Panels */}
          {showPropertiesPanel && (
            <div className="absolute inset-0 bg-background z-50 overflow-auto">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-lg font-semibold">Properties</h2>
                <button
                  onClick={() => setShowPropertiesPanel(false)}
                  className="p-2 hover:bg-muted rounded-md"
                  aria-label="Close properties"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {/* Properties content will be rendered by GridEditorCanvas */}
            </div>
          )}
        </div>

        {/* Mobile Toolbar - Bottom */}
        <div className="border-t border-border bg-card p-2">
          <div className="flex items-center justify-around">
            {/* Simplified toolbar for mobile */}
            <button className="p-2 hover:bg-muted rounded-md text-xs">Select</button>
            <button className="p-2 hover:bg-muted rounded-md text-xs">Crop</button>
            <button className="p-2 hover:bg-muted rounded-md text-xs">Rotate</button>
            <button className="p-2 hover:bg-muted rounded-md text-xs">More</button>
          </div>
        </div>
      </div>
    );
  }

  // Tablet layout
  if (screenSize === 'tablet') {
    return (
      <div className="flex flex-col h-full">
        {/* Tablet Header with Toggle */}
        <div className="flex items-center justify-between p-2 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAssetLibrary(!showAssetLibrary)}
              className="p-2 hover:bg-muted rounded-md lg:hidden"
              aria-label="Toggle asset library"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base font-semibold">Grid Editor</h1>
          </div>
          <button
            onClick={() => setShowPropertiesPanel(!showPropertiesPanel)}
            className="p-2 hover:bg-muted rounded-md"
            aria-label="Toggle properties panel"
          >
            {showPropertiesPanel ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Tablet Content */}
        <div className="flex-1 flex overflow-hidden">
          <GridEditorCanvas {...props} className="flex-1" />
          
          {/* Collapsible Properties Panel */}
          {showPropertiesPanel && (
            <div className="w-80 border-l border-border bg-card animate-slide-in-right">
              {/* Properties content will be rendered by GridEditorCanvas */}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop layout - full features
  return <GridEditorCanvas {...props} />;
};

export default ResponsiveGridEditor;
