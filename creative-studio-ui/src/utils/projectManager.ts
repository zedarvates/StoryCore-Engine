import type { Project, Shot } from '@/types';

// ============================================================================
// Project Validation
// ============================================================================

/**
 * Validates a project against the Data Contract v1 schema
 */
export function validateProject(project: unknown): project is Project {
  if (!project || typeof project !== 'object') {
    return false;
  }

  const p = project as Partial<Project>;

  // Check required fields
  if (!p.schema_version || typeof p.schema_version !== 'string') {
    return false;
  }

  if (!p.project_name || typeof p.project_name !== 'string') {
    return false;
  }

  if (!Array.isArray(p.shots)) {
    return false;
  }

  if (!Array.isArray(p.assets)) {
    return false;
  }

  if (!p.capabilities || typeof p.capabilities !== 'object') {
    return false;
  }

  if (!p.generation_status || typeof p.generation_status !== 'object') {
    return false;
  }

  // Validate capabilities
  const caps = p.capabilities;
  if (
    typeof caps.grid_generation !== 'boolean' ||
    typeof caps.promotion_engine !== 'boolean' ||
    typeof caps.qa_engine !== 'boolean' ||
    typeof caps.autofix_engine !== 'boolean'
  ) {
    return false;
  }

  // Validate generation_status
  const status = p.generation_status;
  const validStatuses = ['pending', 'done', 'failed', 'passed'];
  if (
    !validStatuses.includes(status.grid) ||
    !validStatuses.includes(status.promotion)
  ) {
    return false;
  }

  return true;
}

// ============================================================================
// Project Serialization
// ============================================================================

/**
 * Converts internal Shot format to Data Contract v1 format
 */
function serializeShot(shot: Shot): Record<string, unknown> {
  return {
    id: shot.id,
    title: shot.title,
    description: shot.description,
    duration: shot.duration,
    image: shot.image,
    audio: shot.audioTracks.map((track) => track.url),
    position: shot.position,
    metadata: {
      audioTracks: shot.audioTracks,
      effects: shot.effects,
      textLayers: shot.textLayers,
      animations: shot.animations,
      transitionOut: shot.transitionOut,
    },
  };
}

/**
 * Saves a project to JSON format (Data Contract v1)
 */
export function saveProjectToJSON(project: Project): string {
  const serialized = {
    schema_version: project.schema_version,
    project_name: project.project_name,
    shots: project.shots.map(serializeShot),
    assets: project.assets,
    capabilities: project.capabilities,
    generation_status: project.generation_status,
    metadata: project.metadata,
  };

  return JSON.stringify(serialized, null, 2);
}

/**
 * Downloads a project as a JSON file
 */
export function downloadProject(project: Project): void {
  const json = saveProjectToJSON(project);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${project.project_name}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// Project Deserialization
// ============================================================================

/**
 * Converts Data Contract v1 format to internal Shot format
 */
function deserializeShot(data: Record<string, unknown>): Shot {
  const metadata = (data.metadata as Record<string, unknown>) || {};

  return {
    id: String(data.id || ''),
    title: String(data.title || ''),
    description: String(data.description || ''),
    duration: Number(data.duration || 5),
    image: data.image as string | undefined,
    position: Number(data.position || 0),
    audioTracks: (metadata.audioTracks as Shot['audioTracks']) || [],
    effects: (metadata.effects as Shot['effects']) || [],
    textLayers: (metadata.textLayers as Shot['textLayers']) || [],
    animations: (metadata.animations as Shot['animations']) || [],
    transitionOut: metadata.transitionOut as Shot['transitionOut'],
    metadata: data.metadata as Record<string, unknown> | undefined,
  };
}

/**
 * Loads a project from JSON string
 */
export function loadProjectFromJSON(json: string): Project {
  const data = JSON.parse(json);

  if (!validateProject(data)) {
    throw new Error('Invalid project format');
  }

  return {
    id: String(data.id || crypto.randomUUID()),
    schema_version: data.schema_version,
    project_name: data.project_name,
    shots: (data.shots as unknown[]).map((shot) => deserializeShot(shot as Record<string, unknown>)),
    assets: data.assets,
    capabilities: data.capabilities,
    generation_status: data.generation_status,
    metadata: data.metadata,
  };
}

/**
 * Loads a project from a File object
 */
export async function loadProjectFromFile(file: File): Promise<Project> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const project = loadProjectFromJSON(json);
        resolve(project);
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

// ============================================================================
// Project Creation
// ============================================================================

/**
 * Creates a new empty project with default settings
 */
export function createEmptyProject(name: string): Project {
  return {
    id: crypto.randomUUID(),
    schema_version: '1.0',
    project_name: name,
    shots: [],
    assets: [],
    capabilities: {
      grid_generation: true,
      promotion_engine: true,
      qa_engine: true,
      autofix_engine: true,
    },
    generation_status: {
      grid: 'pending',
      promotion: 'pending',
    },
    metadata: {
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

/**
 * Creates a new project on disk via Electron IPC
 * This is the main function that creates the actual project files
 * 
 * @param data - Project creation data (name is required, location defaults to Documents/StoryCore Projects)
 * @returns Promise resolving to created project info
 * @throws Error if project creation fails
 */
export async function createProjectOnDisk(data: {
  name: string;
  location?: string;
  format?: unknown;
  initialShots?: unknown[];
}): Promise<{
  id: string;
  name: string;
  path: string;
  version: string;
}> {
  // Check if we're running in Electron environment
  if (!window.electronAPI?.project?.create) {
    console.warn('[projectManager] Not running in Electron environment, project will not be saved to disk');
    throw new Error('Not running in Electron environment');
  }

  console.log('[projectManager] Creating project on disk via IPC:', data);

  try {
    // Prepare project data - only include defined properties
    // Use type assertion to avoid TypeScript strict optional type checking issues
    const projectData = {
      name: data.name,
      ...(data.location && { location: data.location }),
      ...(data.format ? { format: data.format } : {}),
      ...(data.initialShots ? { initialShots: data.initialShots } : {}),
    };

    const project = await window.electronAPI.project.create(projectData as any);
    console.log('[projectManager] Project created successfully on disk:', project.path);
    return project;
  } catch (error) {
    console.error('[projectManager] Failed to create project on disk:', error);
    throw new Error(`Failed to create project: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get the default projects directory path
 * @returns Promise resolving to the default projects directory path
 */
export async function getDefaultProjectsDirectory(): Promise<string> {
  if (!window.electronAPI?.project?.selectDirectory) {
    // Fallback to common path if not in Electron
    return 'C:\\Users\\redga\\Documents\\StoryCore Projects';
  }

  // Select directory using the file picker
  const path = await window.electronAPI.project.selectDirectory();
  return path || 'C:\\Users\\redga\\Documents\\StoryCore Projects';
}

// ============================================================================
// Local Storage Helpers
// ============================================================================

const RECENT_PROJECTS_KEY = 'creative-studio-recent-projects';
const MAX_RECENT_PROJECTS = 10;

export interface RecentProject {
  id: string;
  name: string;
  path: string;
  lastAccessed: Date;
  exists?: boolean;
}

/**
 * Gets the list of recently opened projects
 */
export function getRecentProjects(): RecentProject[] {
  try {
    const json = localStorage.getItem(RECENT_PROJECTS_KEY);
    if (!json) return [];
    const projects = JSON.parse(json);
    // Convert lastAccessed strings back to Date objects
    // Using 'any' for parsed JSON data before type validation
    return projects.map((p: any) => ({
      ...p,
      lastAccessed: new Date(p.lastAccessed),
    }));
  } catch {
    return [];
  }
}

/**
 * Adds a project to the recent projects list
 */
export function addRecentProject(project: {
  id?: string;
  name: string;
  path: string;
}): void {
  try {
    const recent = getRecentProjects();
    const filtered = recent.filter((p) => p.path !== project.path);
    const newProject: RecentProject = {
      id: project.id || crypto.randomUUID(),
      name: project.name,
      path: project.path,
      lastAccessed: new Date(),
      exists: true,
    };
    const updated = [newProject, ...filtered].slice(0, MAX_RECENT_PROJECTS);
    localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save recent project:', error);
  }
}

/**
 * Clears the recent projects list
 */
export function clearRecentProjects(): void {
  try {
    localStorage.removeItem(RECENT_PROJECTS_KEY);
  } catch (error) {
    console.error('Failed to clear recent projects:', error);
  }
}



