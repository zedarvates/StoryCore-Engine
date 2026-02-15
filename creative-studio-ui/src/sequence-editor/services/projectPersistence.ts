/**
 * Project Persistence Service
 * 
 * Handles file-based project save/load operations with Data Contract v1 compliance.
 * Provides manual save (Ctrl/Cmd+S) and project file management.
 * 
 * Requirements: 19.4, 19.6, 19.7
 */

import type { RootState } from '../store';

/**
 * Project file format (Data Contract v1)
 */
export interface ProjectFile {
  version: string;
  schema_version: string;
  created: string;
  modified: string;
  project: {
    metadata: {
      name: string;
      path: string;
      created: number;
      modified: number;
      author: string;
      description: string;
    };
    settings: {
      resolution: { width: number; height: number };
      format: 'mp4' | 'mov' | 'webm';
      quality: 'draft' | 'preview' | 'final';
      fps: number;
    };
    saveStatus: {
      state: 'saved' | 'modified' | 'saving' | 'error';
      lastSaveTime?: number; // Timestamp in milliseconds
      error?: string;
    };
  };
  timeline: {
    shots: unknown[];
    tracks: unknown[];
    playheadPosition: number;
    zoomLevel: number;
    selectedElements: string[];
    duration: number;
  };
  assets: {
    categories: unknown[];
    activeCategory: string;
    searchQuery: string;
  };
  panels: {
    layout: unknown;
    activePanel: string | null;
    shotConfigTarget: string | null;
  };
  tools: {
    activeTool: string;
    toolSettings: unknown;
  };
}

/**
 * Export project state to JSON file format
 * Requirement 19.6: Save complete project state
 * Requirement 19.7: Data Contract v1 compliance
 */
export function exportProjectToJSON(state: RootState): ProjectFile {
  const now = Date.now();

  // Handle null metadata by creating default values
  const metadata = state.project.metadata || {
    name: 'Untitled Project',
    path: '',
    created: now,
    modified: now,
    author: '',
    description: '',
  };

  return {
    version: '1.0.0',
    schema_version: '1.0',
    created: new Date(metadata.created).toISOString(),
    modified: new Date(now).toISOString(),
    project: {
      metadata: {
        ...metadata,
        modified: now,
      },
      settings: state.project.settings,
      saveStatus: {
        ...state.project.saveStatus,
        lastSaveTime: now, // Store timestamp directly
      },
    },
    timeline: {
      shots: state.timeline.shots,
      tracks: state.timeline.tracks,
      playheadPosition: state.timeline.playheadPosition,
      zoomLevel: state.timeline.zoomLevel,
      selectedElements: state.timeline.selectedElements,
      duration: state.timeline.duration,
    },
    assets: {
      categories: state.assets.categories,
      activeCategory: state.assets.activeCategory,
      searchQuery: state.assets.searchQuery,
    },
    panels: {
      layout: state.panels.layout,
      activePanel: state.panels.activePanel,
      shotConfigTarget: state.panels.shotConfigTarget,
    },
    tools: {
      activeTool: state.tools.activeTool,
      toolSettings: state.tools.toolSettings,
    },
  };
}

/**
 * Parse and validate project file
 * Requirement 19.7: Data Contract v1 compliance
 */
export function parseProjectFile(jsonString: string): ProjectFile {
  try {
    const data = JSON.parse(jsonString);

    // Validate required fields
    if (!data.version || !data.schema_version) {
      throw new Error('Invalid project file: missing version information');
    }

    if (data.schema_version !== '1.0') {
      throw new Error(`Unsupported schema version: ${data.schema_version}`);
    }

    if (!data.project || !data.timeline || !data.assets) {
      throw new Error('Invalid project file: missing required sections');
    }

    return data as ProjectFile;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON format');
    }
    throw error;
  }
}

/**
 * Save project to file (browser download)
 * Requirement 19.4: Manual save option
 */
export function saveProjectToFile(state: RootState, filename?: string): void {
  try {
    const projectData = exportProjectToJSON(state);
    const jsonString = JSON.stringify(projectData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    // Generate filename if not provided
    const projectName = state.project.metadata?.name || 'untitled';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const finalFilename = filename || `${projectName}-${timestamp}.json`;

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFilename;

    // Trigger download
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to save project file:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to save project file'
    );
  }
}

/**
 * Load project from file
 * Requirement 19.4: Manual save option (load counterpart)
 */
export function loadProjectFromFile(file: File): Promise<ProjectFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const jsonString = event.target?.result as string;
        const projectData = parseProjectFile(jsonString);
        resolve(projectData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

/**
 * Generate project filename
 */
export function generateProjectFilename(projectName: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const safeName = projectName.replace(/[^a-z0-9-_]/gi, '-').toLowerCase();
  return `${safeName}-${timestamp}.json`;
}

/**
 * Validate project file compatibility
 */
export function validateProjectCompatibility(projectData: ProjectFile): {
  compatible: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check schema version
  if (projectData.schema_version !== '1.0') {
    errors.push(`Unsupported schema version: ${projectData.schema_version}`);
  }

  // Check for required sections
  if (!projectData.project) {
    errors.push('Missing project section');
  }
  if (!projectData.timeline) {
    errors.push('Missing timeline section');
  }
  if (!projectData.assets) {
    errors.push('Missing assets section');
  }

  // Check version compatibility
  const [major] = projectData.version.split('.').map(Number);
  if (major > 1) {
    warnings.push(`Project was created with a newer version (${projectData.version})`);
  }

  return {
    compatible: errors.length === 0,
    warnings,
    errors,
  };
}



