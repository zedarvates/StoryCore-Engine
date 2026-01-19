/**
 * @fileoverview Main application state store using Zustand
 * 
 * This file defines the global application state and actions for the Creative Studio UI.
 * It uses Zustand for state management with middleware for persistence and devtools.
 * 
 * @module stores/useStore
 * @requires zustand
 * @requires zustand/middleware
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Shot, Asset, Project, GenerationTask, PanelSizes } from '@/types';

/**
 * Application state interface
 * 
 * Defines the complete state structure for the Creative Studio application.
 * Includes project data, UI state, playback state, and undo/redo history.
 */
interface AppState {
  // ============================================================================
  // Project Data
  // ============================================================================
  
  /**
   * Current project data
   * Null when no project is loaded
   */
  project: Project | null;
  
  /**
   * Array of all shots in the current project
   * Ordered by position property
   */
  shots: Shot[];
  
  /**
   * Array of all assets available in the project
   * Includes images, audio files, and templates
   */
  assets: Asset[];
  
  // ============================================================================
  // UI State
  // ============================================================================
  
  /**
   * ID of the currently selected shot
   * Null when no shot is selected
   */
  selectedShotId: string | null;
  
  /**
   * Current playhead position in seconds
   * Used for timeline scrubbing and preview
   */
  currentTime: number;
  
  /**
   * Whether the chat assistant panel is visible
   */
  showChat: boolean;
  
  /**
   * Whether the task queue modal is open
   */
  showTaskQueue: boolean;
  
  /**
   * Panel size configuration as percentages
   * Must sum to 100
   */
  panelSizes: PanelSizes;
  
  // ============================================================================
  // Task Queue
  // ============================================================================
  
  /**
   * Array of generation tasks to be processed by backend
   * Ordered by priority (lower number = higher priority)
   */
  taskQueue: GenerationTask[];
  
  // ============================================================================
  // Playback State
  // ============================================================================
  
  /**
   * Whether the timeline is currently playing
   */
  isPlaying: boolean;
  
  /**
   * Playback speed multiplier
   * 1.0 = normal speed, 0.5 = half speed, 2.0 = double speed
   */
  playbackSpeed: number;
  
  // ============================================================================
  // Undo/Redo State
  // ============================================================================
  
  /**
   * Array of historical states for undo functionality
   * Limited to 50 entries to prevent memory issues
   */
  history: AppState[];
  
  /**
   * Current position in history array
   * Used to track undo/redo position
   */
  historyIndex: number;
  
  // ============================================================================
  // Project Actions
  // ============================================================================
  
  /**
   * Creates a new project with default settings
   * 
   * @param name - Project name
   * @param settings - Optional project settings
   * @returns void
   * 
   * @example
   * ```typescript
   * createProject('My Video', { resolution: '1920x1080', frameRate: 30 });
   * ```
   */
  createProject: (name: string, settings?: ProjectSettings) => void;
  
  /**
   * Loads an existing project from JSON data
   * 
   * @param projectData - Project data conforming to Data Contract v1
   * @returns void
   * 
   * @example
   * ```typescript
   * const projectData = JSON.parse(jsonString);
   * loadProject(projectData);
   * ```
   */
  loadProject: (projectData: Project) => void;
  
  /**
   * Saves the current project
   * 
   * @returns Promise that resolves when save is complete
   * 
   * @example
   * ```typescript
   * await saveProject();
   * console.log('Project saved successfully');
   * ```
   */
  saveProject: () => Promise<void>;
  
  /**
   * Exports the project in specified format
   * 
   * @param format - Export format ('json', 'pdf', or 'video')
   * @returns Promise resolving to Blob of exported data
   * 
   * @example
   * ```typescript
   * const blob = await exportProject('json');
   * const url = URL.createObjectURL(blob);
   * ```
   */
  exportProject: (format: 'json' | 'pdf' | 'video') => Promise<Blob>;
  
  // ============================================================================
  // Shot Actions
  // ============================================================================
  
  /**
   * Adds a new shot to the project
   * 
   * @param shot - Partial shot data (id and position will be auto-generated)
   * @returns ID of the newly created shot
   * 
   * @example
   * ```typescript
   * const shotId = addShot({
   *   title: 'Opening Scene',
   *   description: 'Sunrise over the city',
   *   duration: 5
   * });
   * ```
   */
  addShot: (shot: Partial<Shot>) => string;
  
  /**
   * Updates an existing shot with new data
   * 
   * @param shotId - ID of the shot to update
   * @param updates - Partial shot data to merge with existing
   * @returns void
   * 
   * @example
   * ```typescript
   * updateShot('shot-123', { title: 'New Title', duration: 8 });
   * ```
   */
  updateShot: (shotId: string, updates: Partial<Shot>) => void;
  
  /**
   * Deletes a shot from the project
   * 
   * Also removes the shot from timeline and updates positions of remaining shots
   * 
   * @param shotId - ID of the shot to delete
   * @returns void
   * 
   * @example
   * ```typescript
   * deleteShot('shot-123');
   * ```
   */
  deleteShot: (shotId: string) => void;
  
  /**
   * Reorders shots based on new array of IDs
   * 
   * @param shotIds - Array of shot IDs in desired order
   * @returns void
   * 
   * @example
   * ```typescript
   * reorderShots(['shot-2', 'shot-1', 'shot-3']);
   * ```
   */
  reorderShots: (shotIds: string[]) => void;
  
  /**
   * Selects a shot for editing
   * 
   * @param shotId - ID of shot to select, or null to deselect
   * @returns void
   * 
   * @example
   * ```typescript
   * selectShot('shot-123'); // Select shot
   * selectShot(null);       // Deselect all
   * ```
   */
  selectShot: (shotId: string | null) => void;
  
  // ============================================================================
  // Asset Actions
  // ============================================================================
  
  /**
   * Adds a new asset to the library
   * 
   * @param asset - Partial asset data (id will be auto-generated)
   * @returns ID of the newly created asset
   * 
   * @example
   * ```typescript
   * const assetId = addAsset({
   *   name: 'Background Music',
   *   type: 'audio',
   *   url: '/assets/music.mp3'
   * });
   * ```
   */
  addAsset: (asset: Partial<Asset>) => string;
  
  /**
   * Uploads an asset file and adds it to the library
   * 
   * @param file - File object to upload
   * @returns Promise resolving to asset ID
   * 
   * @example
   * ```typescript
   * const assetId = await uploadAsset(file);
   * console.log('Asset uploaded:', assetId);
   * ```
   */
  uploadAsset: (file: File) => Promise<string>;
  
  /**
   * Deletes an asset from the library
   * 
   * Warning: This does not remove the asset from shots that use it
   * 
   * @param assetId - ID of the asset to delete
   * @returns void
   * 
   * @example
   * ```typescript
   * deleteAsset('asset-456');
   * ```
   */
  deleteAsset: (assetId: string) => void;
  
  /**
   * Searches assets by name or metadata
   * 
   * @param query - Search query string
   * @returns Array of matching assets
   * 
   * @example
   * ```typescript
   * const results = searchAssets('music');
   * console.log(`Found ${results.length} assets`);
   * ```
   */
  searchAssets: (query: string) => Asset[];
  
  // ============================================================================
  // Audio Actions
  // ============================================================================
  
  /**
   * Adds an audio track to a shot
   * 
   * @param shotId - ID of the shot
   * @param track - Partial audio track data
   * @returns ID of the newly created audio track
   * 
   * @example
   * ```typescript
   * const trackId = addAudioTrack('shot-123', {
   *   name: 'Background Music',
   *   type: 'music',
   *   url: '/assets/music.mp3',
   *   volume: 80
   * });
   * ```
   */
  addAudioTrack: (shotId: string, track: Partial<AudioTrack>) => string;
  
  /**
   * Updates an audio track
   * 
   * @param shotId - ID of the shot containing the track
   * @param trackId - ID of the track to update
   * @param updates - Partial audio track data to merge
   * @returns void
   * 
   * @example
   * ```typescript
   * updateAudioTrack('shot-123', 'track-456', { volume: 90, pan: -20 });
   * ```
   */
  updateAudioTrack: (shotId: string, trackId: string, updates: Partial<AudioTrack>) => void;
  
  /**
   * Deletes an audio track from a shot
   * 
   * @param shotId - ID of the shot containing the track
   * @param trackId - ID of the track to delete
   * @returns void
   * 
   * @example
   * ```typescript
   * deleteAudioTrack('shot-123', 'track-456');
   * ```
   */
  deleteAudioTrack: (shotId: string, trackId: string) => void;
  
  // ============================================================================
  // UI Actions
  // ============================================================================
  
  /**
   * Toggles the chat assistant panel visibility
   * 
   * @returns void
   * 
   * @example
   * ```typescript
   * toggleChat(); // Opens chat if closed, closes if open
   * ```
   */
  toggleChat: () => void;
  
  /**
   * Toggles the task queue modal visibility
   * 
   * @returns void
   * 
   * @example
   * ```typescript
   * toggleTaskQueue();
   * ```
   */
  toggleTaskQueue: () => void;
  
  /**
   * Updates panel sizes
   * 
   * @param sizes - Partial panel sizes (percentages)
   * @returns void
   * 
   * @example
   * ```typescript
   * updatePanelSizes({ assetLibrary: 20, canvas: 60, propertiesOrChat: 20 });
   * ```
   */
  updatePanelSizes: (sizes: Partial<PanelSizes>) => void;
  
  /**
   * Sets the playback state
   * 
   * @param isPlaying - Whether timeline should be playing
   * @returns void
   * 
   * @example
   * ```typescript
   * setPlaying(true);  // Start playback
   * setPlaying(false); // Pause playback
   * ```
   */
  setPlaying: (isPlaying: boolean) => void;
  
  /**
   * Sets the current playhead time
   * 
   * @param time - Time in seconds
   * @returns void
   * 
   * @example
   * ```typescript
   * setCurrentTime(10.5); // Jump to 10.5 seconds
   * ```
   */
  setCurrentTime: (time: number) => void;
  
  // ============================================================================
  // Undo/Redo Actions
  // ============================================================================
  
  /**
   * Undoes the last action
   * 
   * Reverts state to previous history entry
   * 
   * @returns void
   * 
   * @example
   * ```typescript
   * undo(); // Revert last change
   * ```
   */
  undo: () => void;
  
  /**
   * Redoes the last undone action
   * 
   * Moves forward in history
   * 
   * @returns void
   * 
   * @example
   * ```typescript
   * redo(); // Reapply undone change
   * ```
   */
  redo: () => void;
  
  /**
   * Checks if undo is available
   * 
   * @returns true if there are actions to undo
   * 
   * @example
   * ```typescript
   * if (canUndo()) {
   *   undo();
   * }
   * ```
   */
  canUndo: () => boolean;
  
  /**
   * Checks if redo is available
   * 
   * @returns true if there are actions to redo
   * 
   * @example
   * ```typescript
   * if (canRedo()) {
   *   redo();
   * }
   * ```
   */
  canRedo: () => boolean;
}

/**
 * Main application store
 * 
 * Uses Zustand with devtools and persistence middleware.
 * State is persisted to localStorage under 'creative-studio-state' key.
 * 
 * @example
 * ```typescript
 * // In a component
 * import { useStore } from '@/stores/useStore';
 * 
 * function MyComponent() {
 *   const shots = useStore((state) => state.shots);
 *   const addShot = useStore((state) => state.addShot);
 *   
 *   return <button onClick={() => addShot({ title: 'New Shot' })}>Add</button>;
 * }
 * ```
 */
export const useStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        project: null,
        shots: [],
        assets: [],
        selectedShotId: null,
        currentTime: 0,
        showChat: false,
        showTaskQueue: false,
        panelSizes: {
          assetLibrary: 20,
          canvas: 60,
          propertiesOrChat: 20
        },
        taskQueue: [],
        isPlaying: false,
        playbackSpeed: 1.0,
        history: [],
        historyIndex: -1,
        
        // Project actions
        createProject: (name, settings) => {
          set({
            project: {
              schema_version: '1.0',
              project_name: name,
              shots: [],
              assets: [],
              capabilities: {
                grid_generation: true,
                promotion_engine: true,
                qa_engine: true,
                autofix_engine: true
              },
              generation_status: {
                grid: 'pending',
                promotion: 'pending'
              },
              metadata: settings
            },
            shots: [],
            assets: [],
            selectedShotId: null
          });
        },
        
        loadProject: (projectData) => {
          set({
            project: projectData,
            shots: projectData.shots,
            assets: projectData.assets,
            selectedShotId: null
          });
        },
        
        saveProject: async () => {
          const state = get();
          // Implementation would save to backend or localStorage
          console.log('Saving project:', state.project);
        },
        
        exportProject: async (format) => {
          const state = get();
          const json = JSON.stringify(state.project, null, 2);
          return new Blob([json], { type: 'application/json' });
        },
        
        // Shot actions
        addShot: (shot) => {
          const id = crypto.randomUUID();
          const newShot: Shot = {
            id,
            title: shot.title || 'New Shot',
            description: shot.description || '',
            duration: shot.duration || 5,
            image: shot.image,
            audioTracks: shot.audioTracks || [],
            effects: shot.effects || [],
            textLayers: shot.textLayers || [],
            animations: shot.animations || [],
            transitionOut: shot.transitionOut,
            position: get().shots.length,
            metadata: shot.metadata
          };
          
          set((state) => ({
            shots: [...state.shots, newShot]
          }));
          
          return id;
        },
        
        updateShot: (shotId, updates) => {
          set((state) => ({
            shots: state.shots.map((shot) =>
              shot.id === shotId ? { ...shot, ...updates } : shot
            )
          }));
        },
        
        deleteShot: (shotId) => {
          set((state) => ({
            shots: state.shots.filter((shot) => shot.id !== shotId),
            selectedShotId: state.selectedShotId === shotId ? null : state.selectedShotId
          }));
        },
        
        reorderShots: (shotIds) => {
          const state = get();
          const shotsMap = new Map(state.shots.map((shot) => [shot.id, shot]));
          const reorderedShots = shotIds
            .map((id) => shotsMap.get(id))
            .filter((shot): shot is Shot => shot !== undefined)
            .map((shot, index) => ({ ...shot, position: index }));
          
          set({ shots: reorderedShots });
        },
        
        selectShot: (shotId) => {
          set({ selectedShotId: shotId });
        },
        
        // Asset actions
        addAsset: (asset) => {
          const id = crypto.randomUUID();
          const newAsset: Asset = {
            id,
            name: asset.name || 'New Asset',
            type: asset.type || 'image',
            url: asset.url || '',
            thumbnail: asset.thumbnail,
            metadata: asset.metadata
          };
          
          set((state) => ({
            assets: [...state.assets, newAsset]
          }));
          
          return id;
        },
        
        uploadAsset: async (file) => {
          // Implementation would upload to backend
          const url = URL.createObjectURL(file);
          return get().addAsset({
            name: file.name,
            type: file.type.startsWith('image/') ? 'image' : 'audio',
            url
          });
        },
        
        deleteAsset: (assetId) => {
          set((state) => ({
            assets: state.assets.filter((asset) => asset.id !== assetId)
          }));
        },
        
        searchAssets: (query) => {
          const state = get();
          const lowerQuery = query.toLowerCase();
          return state.assets.filter((asset) =>
            asset.name.toLowerCase().includes(lowerQuery)
          );
        },
        
        // Audio actions
        addAudioTrack: (shotId, track) => {
          const trackId = crypto.randomUUID();
          const newTrack: AudioTrack = {
            id: trackId,
            name: track.name || 'Audio Track',
            type: track.type || 'music',
            url: track.url || '',
            startTime: track.startTime || 0,
            duration: track.duration || 10,
            offset: track.offset || 0,
            volume: track.volume || 80,
            fadeIn: track.fadeIn || 0,
            fadeOut: track.fadeOut || 0,
            pan: track.pan || 0,
            muted: track.muted || false,
            solo: track.solo || false,
            effects: track.effects || [],
            waveformData: track.waveformData
          };
          
          set((state) => ({
            shots: state.shots.map((shot) =>
              shot.id === shotId
                ? { ...shot, audioTracks: [...shot.audioTracks, newTrack] }
                : shot
            )
          }));
          
          return trackId;
        },
        
        updateAudioTrack: (shotId, trackId, updates) => {
          set((state) => ({
            shots: state.shots.map((shot) =>
              shot.id === shotId
                ? {
                    ...shot,
                    audioTracks: shot.audioTracks.map((track) =>
                      track.id === trackId ? { ...track, ...updates } : track
                    )
                  }
                : shot
            )
          }));
        },
        
        deleteAudioTrack: (shotId, trackId) => {
          set((state) => ({
            shots: state.shots.map((shot) =>
              shot.id === shotId
                ? {
                    ...shot,
                    audioTracks: shot.audioTracks.filter((track) => track.id !== trackId)
                  }
                : shot
            )
          }));
        },
        
        // UI actions
        toggleChat: () => {
          set((state) => ({ showChat: !state.showChat }));
        },
        
        toggleTaskQueue: () => {
          set((state) => ({ showTaskQueue: !state.showTaskQueue }));
        },
        
        updatePanelSizes: (sizes) => {
          set((state) => ({
            panelSizes: { ...state.panelSizes, ...sizes }
          }));
        },
        
        setPlaying: (isPlaying) => {
          set({ isPlaying });
        },
        
        setCurrentTime: (time) => {
          set({ currentTime: time });
        },
        
        // Undo/Redo actions
        undo: () => {
          const state = get();
          if (state.historyIndex > 0) {
            const previousState = state.history[state.historyIndex - 1];
            set({
              ...previousState,
              historyIndex: state.historyIndex - 1
            });
          }
        },
        
        redo: () => {
          const state = get();
          if (state.historyIndex < state.history.length - 1) {
            const nextState = state.history[state.historyIndex + 1];
            set({
              ...nextState,
              historyIndex: state.historyIndex + 1
            });
          }
        },
        
        canUndo: () => {
          return get().historyIndex > 0;
        },
        
        canRedo: () => {
          const state = get();
          return state.historyIndex < state.history.length - 1;
        }
      }),
      {
        name: 'creative-studio-state',
        partialize: (state) => ({
          // Only persist these fields
          project: state.project,
          shots: state.shots,
          assets: state.assets,
          panelSizes: state.panelSizes
        })
      }
    ),
    {
      name: 'Creative Studio Store'
    }
  )
);
