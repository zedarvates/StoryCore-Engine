/**
 * Menu Component Examples
 * 
 * Demonstrates various use cases for the Menu, MenuDropdown, and MenuItem components.
 */

import React, { useState } from 'react';
import { Menu } from './Menu';
import { Save, FolderOpen, FileText, Settings } from 'lucide-react';

/**
 * Basic File Menu Example
 */
export function BasicFileMenuExample() {
  const [project, setProject] = useState<any>(null);

  const fileMenuItems = [
    {
      id: 'new',
      label: 'New Project',
      shortcut: 'Ctrl+N',
      icon: <FileText className="w-4 h-4" />,
      onClick: () => {
        console.log('Creating new project');
        setProject({ name: 'New Project' });
      },
    },
    {
      id: 'open',
      label: 'Open Project',
      shortcut: 'Ctrl+O',
      icon: <FolderOpen className="w-4 h-4" />,
      onClick: () => {
        console.log('Opening project');
      },
    },
    {
      id: 'save',
      label: 'Save',
      shortcut: 'Ctrl+S',
      icon: <Save className="w-4 h-4" />,
      enabled: project !== null,
      onClick: () => {
        console.log('Saving project');
      },
    },
  ];

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">Basic File Menu</h3>
      <Menu id="file" label="File" items={fileMenuItems} />
      {project && (
        <p className="mt-4 text-sm text-gray-600">
          Current project: {project.name}
        </p>
      )}
    </div>
  );
}

/**
 * View Menu with Toggle Items Example
 */
export function ViewMenuWithTogglesExample() {
  const [viewState, setViewState] = useState({
    timeline: true,
    grid: false,
    properties: true,
    assets: true,
  });

  const viewMenuItems = [
    {
      id: 'timeline',
      label: 'Timeline',
      checked: viewState.timeline,
      onClick: () =>
        setViewState((prev) => ({ ...prev, timeline: !prev.timeline })),
    },
    {
      id: 'grid',
      label: 'Grid',
      checked: viewState.grid,
      onClick: () => setViewState((prev) => ({ ...prev, grid: !prev.grid })),
    },
    {
      id: 'properties',
      label: 'Properties Panel',
      checked: viewState.properties,
      onClick: () =>
        setViewState((prev) => ({ ...prev, properties: !prev.properties })),
    },
    {
      id: 'assets',
      label: 'Assets Panel',
      checked: viewState.assets,
      onClick: () => setViewState((prev) => ({ ...prev, assets: !prev.assets })),
    },
  ];

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">View Menu with Toggles</h3>
      <Menu id="view" label="View" items={viewMenuItems} />
      <div className="mt-4 text-sm text-gray-600">
        <p>Timeline: {viewState.timeline ? 'Visible' : 'Hidden'}</p>
        <p>Grid: {viewState.grid ? 'Visible' : 'Hidden'}</p>
        <p>Properties: {viewState.properties ? 'Visible' : 'Hidden'}</p>
        <p>Assets: {viewState.assets ? 'Visible' : 'Hidden'}</p>
      </div>
    </div>
  );
}

/**
 * Menu with Submenu Indicators Example
 */
export function MenuWithSubmenuExample() {
  const recentProjects = [
    { id: 'project1', name: 'My First Project' },
    { id: 'project2', name: 'Marketing Campaign' },
    { id: 'project3', name: 'Product Demo' },
  ];

  const fileMenuItems = [
    {
      id: 'new',
      label: 'New Project',
      shortcut: 'Ctrl+N',
      onClick: () => console.log('New project'),
    },
    {
      id: 'open',
      label: 'Open Project',
      shortcut: 'Ctrl+O',
      onClick: () => console.log('Open project'),
    },
    {
      id: 'recent',
      label: 'Recent Projects',
      hasSubmenu: true,
      // Note: Submenu functionality would be implemented in a future enhancement
      onClick: () => console.log('Show recent projects'),
    },
  ];

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">Menu with Submenu Indicator</h3>
      <Menu id="file" label="File" items={fileMenuItems} />
      <p className="mt-4 text-sm text-gray-600">
        Note: The "Recent Projects" item shows a submenu indicator (arrow)
      </p>
    </div>
  );
}

/**
 * Complete MenuBar Example
 */
export function CompleteMenuBarExample() {
  const [project, setProject] = useState<any>(null);
  const [viewState, setViewState] = useState({
    timeline: true,
    grid: false,
  });
  const [zoomLevel, setZoomLevel] = useState(100);

  const fileMenuItems = [
    {
      id: 'new',
      label: 'New Project',
      shortcut: 'Ctrl+N',
      onClick: () => setProject({ name: 'New Project' }),
    },
    {
      id: 'open',
      label: 'Open Project',
      shortcut: 'Ctrl+O',
      onClick: () => console.log('Open project'),
    },
    {
      id: 'save',
      label: 'Save',
      shortcut: 'Ctrl+S',
      enabled: project !== null,
      onClick: () => console.log('Save project'),
    },
  ];

  const viewMenuItems = [
    {
      id: 'timeline',
      label: 'Timeline',
      checked: viewState.timeline,
      onClick: () =>
        setViewState((prev) => ({ ...prev, timeline: !prev.timeline })),
    },
    {
      id: 'grid',
      label: 'Grid',
      checked: viewState.grid,
      onClick: () => setViewState((prev) => ({ ...prev, grid: !prev.grid })),
    },
    {
      id: 'zoom-in',
      label: 'Zoom In',
      shortcut: 'Ctrl++',
      enabled: zoomLevel < 400,
      onClick: () => setZoomLevel((prev) => Math.min(prev + 25, 400)),
    },
    {
      id: 'zoom-out',
      label: 'Zoom Out',
      shortcut: 'Ctrl+-',
      enabled: zoomLevel > 25,
      onClick: () => setZoomLevel((prev) => Math.max(prev - 25, 25)),
    },
    {
      id: 'zoom-reset',
      label: 'Reset Zoom',
      shortcut: 'Ctrl+0',
      onClick: () => setZoomLevel(100),
    },
  ];

  const settingsMenuItems = [
    {
      id: 'preferences',
      label: 'Preferences',
      icon: <Settings className="w-4 h-4" />,
      onClick: () => console.log('Open preferences'),
    },
  ];

  return (
    <div>
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center h-12 px-4 gap-2">
          <Menu id="file" label="File" items={fileMenuItems} />
          <Menu id="view" label="View" items={viewMenuItems} />
          <Menu id="settings" label="Settings" items={settingsMenuItems} />
        </div>
      </nav>

      <div className="p-4">
        <h3 className="text-lg font-semibold mb-4">Complete MenuBar</h3>
        <div className="text-sm text-gray-600 space-y-2">
          <p>Project: {project ? project.name : 'None'}</p>
          <p>Timeline: {viewState.timeline ? 'Visible' : 'Hidden'}</p>
          <p>Grid: {viewState.grid ? 'Visible' : 'Hidden'}</p>
          <p>Zoom: {zoomLevel}%</p>
        </div>
      </div>
    </div>
  );
}

/**
 * All Examples Container
 */
export function MenuExamples() {
  return (
    <div className="space-y-8 p-8">
      <h1 className="text-2xl font-bold mb-8">Menu Component Examples</h1>
      
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
        <BasicFileMenuExample />
      </div>

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
        <ViewMenuWithTogglesExample />
      </div>

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
        <MenuWithSubmenuExample />
      </div>

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
        <CompleteMenuBarExample />
      </div>
    </div>
  );
}

export default MenuExamples;
