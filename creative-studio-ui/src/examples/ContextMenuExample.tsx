import React, { useState } from 'react';
import { ContextMenu, useContextMenu } from '../components/contextMenu';
import { buildContextMenu, determineMenuContext } from '../services/contextMenu';
import { Shot } from '../types';

/**
 * Example component demonstrating the ContextMenu usage
 */
const ContextMenuExample: React.FC = () => {
  const { menuState, showContextMenu, hideContextMenu } = useContextMenu();
  const [shots, setShots] = useState<Shot[]>([
    {
      id: 'shot-1',
      title: 'Opening Scene',
      description: 'Wide establishing shot',
      duration: 5,
      position: 0,
      audioTracks: [],
      effects: [],
      textLayers: [],
      animations: []
    },
    {
      id: 'shot-2',
      title: 'Character Introduction',
      description: 'Close-up of protagonist',
      duration: 3,
      position: 1,
      audioTracks: [],
      effects: [],
      textLayers: [],
      animations: []
    },
    {
      id: 'shot-3',
      title: 'Action Sequence',
      description: 'Dynamic camera movement',
      duration: 8,
      position: 2,
      audioTracks: [],
      effects: [],
      textLayers: [],
      animations: []
    }
  ]);
  
  const [selectedShotIds, setSelectedShotIds] = useState<string[]>([]);

  // Get selected shots
  const selectedShots = shots.filter(shot => selectedShotIds.includes(shot.id));

  // Context menu handlers
  const handlers = {
    onDuplicate: (duplicatedShots: Shot[]) => {
      console.log('Duplicating shots:', duplicatedShots);
      setShots([...shots, ...duplicatedShots]);
      hideContextMenu();
    },
    onDelete: (shotIds: string[]) => {
      console.log('Deleting shots:', shotIds);
      setShots(shots.filter(shot => !shotIds.includes(shot.id)));
      setSelectedShotIds([]);
      hideContextMenu();
    },
    onExport: (exportedShots: Shot[]) => {
      console.log('Exporting shots:', exportedShots);
      hideContextMenu();
    },
    onTransform: (transformedShots: Shot[], transformType: string) => {
      console.log('Transforming shots:', transformedShots, 'Type:', transformType);
      hideContextMenu();
    },
    onTag: (taggedShots: Shot[], tag: string) => {
      console.log('Tagging shots:', taggedShots, 'Tag:', tag);
      const updatedShots = shots.map(shot => {
        if (taggedShots.find(s => s.id === shot.id)) {
          return {
            ...shot,
            metadata: {
              ...shot.metadata,
              tags: [...(shot.metadata?.tags || []), tag]
            }
          };
        }
        return shot;
      });
      setShots(updatedShots);
      hideContextMenu();
    },
    onCreate: () => {
      console.log('Creating new shot');
      const newShot: Shot = {
        id: `shot-${Date.now()}`,
        title: 'New Shot',
        description: 'New shot description',
        duration: 3,
        position: shots.length,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: []
      };
      setShots([...shots, newShot]);
      hideContextMenu();
    }
  };

  // Handle shot click
  const handleShotClick = (shotId: string, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      // Multi-select
      if (selectedShotIds.includes(shotId)) {
        setSelectedShotIds(selectedShotIds.filter(id => id !== shotId));
      } else {
        setSelectedShotIds([...selectedShotIds, shotId]);
      }
    } else {
      // Single select
      setSelectedShotIds([shotId]);
    }
  };

  // Handle shot context menu
  const handleShotContextMenu = (shotId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    // If right-clicked shot is not selected, select it
    let contextShots = selectedShots;
    if (!selectedShotIds.includes(shotId)) {
      const shot = shots.find(s => s.id === shotId);
      if (shot) {
        contextShots = [shot];
        setSelectedShotIds([shotId]);
      }
    }

    // Determine context and build menu
    const context = determineMenuContext(contextShots, true);
    const menuItems = buildContextMenu(context, contextShots, handlers);

    showContextMenu(event.clientX, event.clientY, menuItems, { shots: contextShots });
  };

  // Handle timeline context menu (empty area)
  const handleTimelineContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const context = determineMenuContext([], false);
    const menuItems = buildContextMenu(context, [], handlers);

    showContextMenu(event.clientX, event.clientY, menuItems);
  };

  return (
    <div className="p-8 bg-gray-900 min-h-screen text-white">
      <h1 className="text-3xl font-bold mb-6">Context Menu Example</h1>
      
      <div className="mb-4 text-gray-400">
        <p>• Right-click on a shot to see single-shot menu</p>
        <p>• Ctrl+Click to select multiple shots, then right-click for batch menu</p>
        <p>• Right-click on empty area to see creation menu</p>
      </div>

      {/* Timeline */}
      <div
        className="bg-gray-800 rounded-lg p-4 min-h-[400px]"
        onContextMenu={handleTimelineContextMenu}
      >
        <h2 className="text-xl font-semibold mb-4">Timeline</h2>
        
        <div className="space-y-2">
          {shots.map(shot => (
            <div
              key={shot.id}
              className={`
                p-4 rounded-lg cursor-pointer transition-colors
                ${selectedShotIds.includes(shot.id)
                  ? 'bg-blue-600 hover:bg-blue-500'
                  : 'bg-gray-700 hover:bg-gray-600'
                }
              `}
              onClick={(e) => handleShotClick(shot.id, e)}
              onContextMenu={(e) => handleShotContextMenu(shot.id, e)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{shot.title}</h3>
                  <p className="text-sm text-gray-300">{shot.description}</p>
                </div>
                <div className="text-sm text-gray-400">
                  {shot.duration}s
                </div>
              </div>
              {shot.metadata?.tags && shot.metadata.tags.length > 0 && (
                <div className="mt-2 flex gap-2">
                  {shot.metadata.tags.map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-600 rounded text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Context Menu */}
      {menuState.visible && (
        <ContextMenu
          items={menuState.items}
          position={menuState.position}
          onClose={hideContextMenu}
          visible={menuState.visible}
        />
      )}

      {/* Info Panel */}
      <div className="mt-6 p-4 bg-gray-800 rounded-lg">
        <h3 className="font-semibold mb-2">Selected Shots:</h3>
        {selectedShotIds.length === 0 ? (
          <p className="text-gray-400">None</p>
        ) : (
          <ul className="list-disc list-inside text-gray-300">
            {selectedShotIds.map(id => {
              const shot = shots.find(s => s.id === id);
              return shot ? <li key={id}>{shot.title}</li> : null;
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ContextMenuExample;
