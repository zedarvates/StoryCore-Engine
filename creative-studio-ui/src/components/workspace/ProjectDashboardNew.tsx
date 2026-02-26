/* cspell:ignore ella spanish él */
/**
 * New Project Dashboard Component
 * 
 * Redesigned dashboard with:
 * - Compact Quick Access at top
 * - Smaller Pipeline Status
 * - Large Global Story Resume (editable with LLM)
 * - Vertical Recent Activity on right
 * - Chatterbox LLM Assistant
 * - Sequence Plans display with +/- buttons
 * - Click on sequence to open editor
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppStore, type WizardType } from '@/stores/useAppStore';
import type { Shot } from '@/types';
import { isRecord } from '@/utils/typeGuards';
import { sequencePlanService } from '@/services/sequencePlanService';
import { migrationService } from '@/services/MigrationService';
import { syncManager } from '@/services/SyncManager';
import { videoEditorAPI } from '@/services/videoEditorAPI';
import { useLLMConfig } from '@/services/llmConfigService';
import { getEnabledWizards } from '@/data/wizardDefinitions';
import { sequenceService } from '@/services/sequenceService';
import { useStore } from '@/store';
import { logger } from '@/utils/logging';
import { StoryCard } from './StoryCard';
import { StoryDetailView } from './StoryDetailView';
import { StoryPartsSection } from './StoryPartsSection';
import { CharactersSection } from '../character/CharactersSection';
import { CharacterEditor } from '../character/CharacterEditor';
import { LocationSection } from '../location/LocationSection';
import { ObjectsSection } from '../objects/ObjectsSection';
import { LocationsModal } from '../modals/LocationsModal';
import { ObjectsModal } from '../modals/ObjectsModal';
import { ObjectWizard } from '../wizard/object/ObjectWizard';
import { GenerationButtonToolbar } from '@/components/generation-buttons/GenerationButtonToolbar';
import { ProjectResumeSection } from './ProjectResumeSection';
import { useNotifications } from '@/components/NotificationSystem';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { InlineLoading } from '@/components/ui/LoadingFeedback';
import { useObjectStore } from '@/stores/objectStore';
import type { Character } from '@/types/character';
import type { GeneratedAsset } from '@/types/generation';
import type { StoryObject } from '@/types/object';
import {
  Film,
  Map,
  Users,
  Puzzle,
  Globe,
  CheckCircle2,
  Trash2,
  Edit3,
  Database,
  RefreshCw,
  BookOpen,
  Settings,
  Clapperboard,
  Wand2,
  FileText,
  Sparkles,
  Plus,
} from 'lucide-react';
import { SequenceEditModal } from './SequenceEditModal';
import { DashboardAddonsSection } from './DashboardAddonsSection';
import { CollapsibleSection } from '@/components/ui';
import { ProductionGuide } from './ProductionGuide';
import { NeuralProductionAssistant } from './NeuralProductionAssistant';
import { WizardLauncher } from '../wizard/WizardLauncher';
import { Badge } from '@/components/ui/badge';
import './ProjectDashboardNew.css';

// ============================================================================
// Film Type and Sequence Templates
// ============================================================================

/**
 * Film duration categories based on industry standards
 */
export type FilmType = 'short_film' | 'medium_film' | 'feature_film';

/**
 * Special sequence types for cinematic purposes
 */
export type SequenceType = 'standard' | 'intro_long_take' | 'ending_long_take' | 'action_sequence' | 'emotional_beat';

/**
 * Chapter structure approach - how long takes are distributed per chapter
 */
export type ChapterApproach = 'classic' | 'immersive' | 'extreme';

/**
 * Internal shot complexity level within a long take
 */
export type ShotComplexity = 'simple' | 'rich' | 'complex';

/**
 * Film type configuration with chapter support
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface FilmTypeConfig {
  type: FilmType;
  name: string;
  minDuration: number;
  maxDuration: number;
  introLongTake: boolean;
  endingLongTake: boolean;
  avgSequences: number;
  avgChapters: number;
  description: string;
}

/**
 * Chapter data structure
 */
export interface ChapterData {
  id: string;
  name: string;
  order: number;
  approach: ChapterApproach;
  longTakesCount: number;
  complexity: ShotComplexity;
  internalShotsCount: number;
  description: string;
  sequences: string[]; // Sequence IDs in this chapter
  storySegment?: string; // Content segment from the story
}

/**
 * Enhanced SequenceData with long take metadata
 */
export interface LongTakeSequenceData extends SequenceData {
  isLongTake: boolean;
  complexity: ShotComplexity;
  internalShotsCount: number;
  chapterId?: string;
  purpose?: 'intro' | 'body' | 'outro' | 'action' | 'emotional';
  cameraMovement?: string;
  characteristics?: string[];
}

interface ProjectDashboardNewProps {
  onOpenEditor: (sequenceId?: string) => void;
}

interface SequenceData {
  id: string;
  name: string;
  duration: number;
  shots: number;
  resume: string;
  order: number;
}

// Helper type for sequence plan from store
interface SequencePlanFromStore {
  id: string;
  name: string;
  description?: string;
  resume?: string;
  targetDuration?: number;
  totalDuration?: number;
  shots?: unknown[];
  order?: number;
}

// Helper type for shot with sequence_id
interface ShotWithSequenceId {
  id: string;
  sequence_id?: string;
  duration?: number;
  description?: string;
  metadata?: Record<string, unknown>;
}

// Helper type for mutable shot (allows setting sequence_id dynamically)
// Used when updating shot metadata dynamically
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface MutableShot extends Shot {
  sequence_id?: string;
  metadata?: Record<string, unknown>;
}

// Asset type from API
interface RecentAsset {
  id: string;
  path: string;
  type: string;
  added_at?: string;
}

export function ProjectDashboardNew({
  onOpenEditor,
}: ProjectDashboardNewProps) {
  const project = useAppStore((state) => state.project);
  const shots = useAppStore((state) => state.shots);
  const setShots = useAppStore((state) => state.setShots);
  const openWizard = useAppStore((state) => state.openWizard);
  const showWorldWizard = useAppStore((state) => state.showWorldWizard);
  const showCharacterWizard = useAppStore((state) => state.showCharacterWizard);
  const showStorytellerWizard = useAppStore((state) => state.showStorytellerWizard);
  const setShowCharactersModal = useAppStore((state) => state.setShowCharactersModal);
  const setShowImageGalleryModal = useAppStore((state) => state.setShowImageGalleryModal);
  const showLocationsModal = useAppStore((state) => state.showLocationsModal);
  const setShowLocationsModal = useAppStore((state) => state.setShowLocationsModal);
  const showObjectsModal = useAppStore((state) => state.showObjectsModal);
  const setShowObjectsModal = useAppStore((state) => state.setShowObjectsModal);
  const showObjectWizard = useAppStore((state) => state.showObjectWizard);
  const setShowObjectWizard = useAppStore((state) => state.setShowObjectWizard);
  const openSequencePlanWizard = useAppStore((state) => state.openSequencePlanWizard);
  const openShotWizard = useAppStore((state) => state.openShotWizard);
  const setShowProjectSetupWizard = useAppStore((state) => state.setShowProjectSetupWizard);
  const setShowWorldWizard = useAppStore((state) => state.setShowWorldWizard);
  const setShowCharacterWizard = useAppStore((state) => state.setShowCharacterWizard);
  const setShowStorytellerWizard = useAppStore((state) => state.setShowStorytellerWizard);
  const setShowGeneralSettings = useAppStore((state) => state.setShowGeneralSettings);
  const setShowAudioProductionWizard = useAppStore((state) => state.setShowAudioProductionWizard);
  const setShowVideoEditorWizard = useAppStore((state) => state.setShowVideoEditorWizard);
  const setShowComicToSequenceWizard = useAppStore((state) => state.setShowComicToSequenceWizard);
  const setShowMarketingWizard = useAppStore((state) => state.setShowMarketingWizard);

  // Character editor state
  const isCharacterEditorOpen = useAppStore((state) => state.isCharacterEditorOpen);
  const editingCharacterId = useAppStore((state) => state.editingCharacterId);
  const openCharacterEditor = useAppStore((state) => state.openCharacterEditor);
  const closeCharacterEditor = useAppStore((state) => state.closeCharacterEditor);

  // Story management from Zustand store
  const stories = useStore((state) => state.stories);
  const getStoryById = useStore((state) => state.getStoryById);

  // Character management from Zustand store
  const characters = useStore((state) => state.characters);

  // Sequence Plans from Zustand store
  const sequencePlans = useStore((state) => state.sequencePlans || []);
  
  // Add shot function from Zustand store
  const addShot = useStore((state) => state.addShot);

  // LLM Configuration
 
 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { config: llmConfig, service: llmService, isConfigured: isLLMConfigured } = useLLMConfig();

  // Notification system
  const { showSuccess, showError, showWarning } = useNotifications();

  // Confirmation modal state
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    variant?: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    variant: 'info',
    isLoading: false,
  });

  // Loading states for async operations
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Missing local state variables - used for future features
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoadingSequences, setIsLoadingSequences] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isAddingSequence, setIsAddingSequence] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [editingStoryData, setEditingStoryData] = useState<unknown>(null);
  
  // Chatterbox height state
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [chatterboxHeight, setChatterboxHeight] = useState<number>(300);

  // Helper function to open confirmation modal
  const openConfirmation = (
    title: string,
    message: string,
    onConfirm: () => void,
    variant: 'danger' | 'warning' | 'info' = 'info'
  ) => {
    setConfirmationModal({
      isOpen: true,
      title,
      message,
      onConfirm,
      variant,
      isLoading: false,
    });
  };

  // Helper function to close confirmation modal
  const closeConfirmation = () => {
    setConfirmationModal(prev => ({ ...prev, isOpen: false }));
  };

  // Service Status from Store
  const ollamaStatus = useAppStore((state) => state.ollamaStatus);
  const comfyuiStatus = useAppStore((state) => state.comfyuiStatus);

  const [editingSequence, setEditingSequence] = useState<SequenceData | null>(null);
  const [forceUpdate, setForceUpdate] = useState(0);

  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);

  // Expanded story view state - shows story parts when a story is selected
  const [expandedStoryId, setExpandedStoryId] = useState<string | null>(null);

  const [recentAssets, setRecentAssets] = useState<RecentAsset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);

  // Get enabled wizards for dynamic display
  const enabledWizards = useMemo(() => getEnabledWizards(), []);

  // Generate sequences from project shots
  const sequences = useMemo<SequenceData[]>(() => {
    if (!shots || shots.length === 0) {
      return [];
    }

    // Group shots by sequence_id (use plain object instead of Map for better compatibility)
    const sequenceMap: Record<string, ShotWithSequenceId[]> = {};
    shots.forEach(shot => {
      const seqId = (shot as ShotWithSequenceId).sequence_id || 'default';
      if (!sequenceMap[seqId]) {
        sequenceMap[seqId] = [];
      }
      sequenceMap[seqId].push(shot as ShotWithSequenceId);
    });


    // Convert to sequence data array
    const sequenceArray: (SequenceData & { isFormal?: boolean })[] = [];

    // 1. Add formal plans from the store (highest priority)
    const plansArray = Array.isArray(sequencePlans) ? sequencePlans : Object.values(sequencePlans || {});
    plansArray.forEach((plan: SequencePlanFromStore | unknown, index: number) => {
      const typedPlan = plan as SequencePlanFromStore;
      sequenceArray.push({
        id: typedPlan.id,
        name: typedPlan.name,
        duration: typedPlan.targetDuration || typedPlan.totalDuration || 0,
        shots: typedPlan.shots?.length || 0,
        resume: typedPlan.description || typedPlan.resume || '',
        order: typedPlan.order || (index + 1),
        isFormal: true
      });
    });

    // 2. Add legacy sequences from shots (only if not already present as formal plan)
    let order = sequenceArray.length + 1;
    for (const sequenceId in sequenceMap) {
      if (sequenceArray.some(s => s.id === sequenceId)) continue;

      const seqShots = sequenceMap[sequenceId];
      const totalDuration = seqShots.reduce((sum, shot) => sum + (shot.duration || 0), 0);
      const sequenceName = `Sequence ${order}`;
      const firstShot = seqShots[0];
      const resume = firstShot?.description || `Sequence ${order} with ${seqShots.length} shot(s)`;

      sequenceArray.push({
        id: sequenceId,
        name: sequenceName,
        duration: totalDuration,
        shots: seqShots.length,
        resume: resume,
        order: order,
      });

      order++;
    }

    // Sort by order
    return [...sequenceArray].sort((a, b) => a.order - b.order);
  }, [shots, sequencePlans]);

  // Subscribe to sequence plan updates
  useEffect(() => {

    const planUpdateUnsubscribe = sequencePlanService.subscribeToPlanUpdates(() => {
      // Force re-render by updating state
      setForceUpdate(prev => prev + 1);
    });

    const planListUnsubscribe = sequencePlanService.subscribeToPlanList(() => {
      // Force re-render by updating state
      setForceUpdate(prev => prev + 1);
    });

    return () => {
      planUpdateUnsubscribe();
      planListUnsubscribe();
    };
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl/Cmd + Shift modifier
      if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case 'p':
            e.preventDefault();
            console.log('[Shortcut] Opening Sequence Plan Wizard');
            openSequencePlanWizard();
            break;
          case 's':
            e.preventDefault();
            console.log('[Shortcut] Opening Shot Wizard');
            openShotWizard();
            break;
          case 'q':
            e.preventDefault();
            console.log('[Shortcut] Quick Shot initiated');
            // Quick Shot opens the shot wizard in create mode
            openShotWizard();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [openSequencePlanWizard, openShotWizard]);

  // Listen for wizard launch events from chat
  useEffect(() => {
    const handleLaunchWizard = (event: CustomEvent) => {
      const { wizardType } = event.detail;
      handleLaunchWizard(wizardType);
    };

    window.addEventListener('launch-wizard', handleLaunchWizard as EventListener);

    return () => {
      window.removeEventListener('launch-wizard', handleLaunchWizard as EventListener);
    };
  }, []);

  // Automatic data migration on project load
  useEffect(() => {
    const performAutoMigration = async () => {
      if (!project?.metadata?.path) {
        return; // Pas de projet chargé
      }

      try {
        const projectPath = (project?.metadata?.path || project?.path) as string;
        const migrationNeeded = await migrationService.isMigrationNeeded(projectPath);

        if (migrationNeeded) {
          // Démarrer la migration
          const migrationResult = await migrationService.migrateAllData(projectPath);

          if (migrationResult.success) {

            // Déclencher une synchronisation complète
            await syncManager.fullSync(projectPath);

          } else {
            logger.error('[ProjectDashboard] Migration failed:', migrationResult.errors);
          }
        }
      } catch (error) {
        logger.error('[ProjectDashboard] Auto-migration error:', error);
      }
    };

    // Délai pour laisser le temps au projet de se charger complètement
    const migrationTimeout = setTimeout(performAutoMigration, 2000);

    return () => clearTimeout(migrationTimeout);
  }, [project?.metadata?.path, project?.path]);

  // Fetch recent assets
  const fetchRecentAssets = useCallback(async () => {
    if (!project?.id) return;
    setIsLoadingAssets(true);
    try {
      const response = await videoEditorAPI.listProjectAssets(project.id);
      if (response && response.assets) {
        // Sort by date (newest first) and take top 5
        type AssetWithDate = { added_at?: string | Date };
        const sorted = [...(response.assets as AssetWithDate[])].sort((a, b) =>
          new Date(b.added_at || 0).getTime() - new Date(a.added_at || 0).getTime()
        );
        setRecentAssets(sorted.slice(0, 5) as RecentAsset[]);
      }
    } catch (error) {
      console.error('[ProjectDashboard] Failed to fetch recent assets:', error);
    } finally {
      setIsLoadingAssets(false);
    }
  }, [project?.id]);

  useEffect(() => {
    fetchRecentAssets();
  }, [fetchRecentAssets, forceUpdate]);

  // Real recent activity based on project events and assets
  const recentActivity = useMemo(() => {
    const activities = [];

    // 1. Project Creation
    if (project?.metadata?.created_at) {
      activities.push({
        id: 'creation',
        action: 'Project initialized',
        time: new Date(project.metadata.created_at as string | number | Date).toLocaleDateString(),
        icon: CheckCircle2,
      });
    }

    // 2. Asset Generations
    recentAssets.forEach((asset, idx) => {
      activities.push({
        id: `asset-${idx}`,
        action: `Generated ${asset.type.replace('generated_', '')}: ${asset.path.split('/').pop()}`,
        time: asset.added_at ? new Date(asset.added_at).toLocaleTimeString() : 'Recently',
        icon: Wand2,
      });
    });

    // 3. Sequences/Shots status
    if (sequences.length > 0) {
      activities.push({
        id: 'sequences',
        action: `${sequences.length} sequences active`,
        time: 'Active',
        icon: Film,
      });
    }

    return activities;
  }, [project, recentAssets, sequences.length]);

  // Handle wizard launches
  const handleLaunchWizard = (wizardId: string) => {
    logger.info('[ProjectDashboard] Launching wizard:', { wizardId });

    // Get the closeActiveWizard function from store
    const closeActiveWizard = useAppStore.getState().closeActiveWizard;

    // Close ALL wizards first (mutual exclusion)
    closeActiveWizard();

    switch (wizardId) {
      case 'project-init':
        setShowProjectSetupWizard(true);
        break;
      case 'world-building':
        setShowWorldWizard(true);
        break;
      case 'character-creation':
        setShowCharacterWizard(true);
        break;
      case 'storyteller-wizard':
        setShowStorytellerWizard(true);
        break;
      case 'scene-generator':
        openWizard('scene-generator');
        break;
      case 'storyboard-creator':
        openWizard('storyboard-creator');
        break;
      case 'dialogue-writer':
        openWizard('dialogue-writer');
        break;
      case 'dialogue-wizard':
        openWizard('dialogue-writer');
        break;
      case 'style-transfer':
        openWizard('style-transfer');
        break;
      case 'marketing-wizard':
        setShowMarketingWizard(true, {
          projectId: project?.id || '',
          projectName: project?.project_name || 'My Project',
          storySummary: project?.metadata?.description as string | undefined,
          characters: project?.characters?.map(c => c.name),
        });
        break;
      case 'shot-planning':
        openSequencePlanWizard();
        break;
      case 'audio-production-wizard':
        setShowAudioProductionWizard(true);
        break;
      case 'video-editor-wizard':
        setShowVideoEditorWizard(true);
        break;
      case 'comic-to-sequence-wizard':
        setShowComicToSequenceWizard(true);
        break;
      default:
        // Attempt to launch via generic wizard system if not specifically handled
        // or show warning if it's truly unrecognized
        if (wizardId === 'video-editor-wizard' || wizardId === 'comic-to-sequence-wizard') {
          // These should have been handled above, but just in case
          logger.warn('[ProjectDashboard] Wizard not yet implemented:', { wizardId });
          showWarning(`The ${wizardId} wizard is not yet implemented. Coming soon!`);
        } else {
          try {
            // Safe cast as we check for unrecognized wizards
            openWizard(wizardId as WizardType);
          } catch (err) {
            logger.warn('[ProjectDashboard] Wizard launch failed:', { wizardId, err });
          }
        }
        break;
    }
  };

  // Handle force update sequences from JSON files
  const handleForceUpdateSequences = async () => {
    try {
      if (!project?.metadata?.path) {
        showError('Project path not found. Please ensure the project is properly loaded.');
        return;
      }

      const projectPath = (project?.metadata?.path as string) || '';

      // Use the sequence service which handles both Electron and Web API
      const loadedSequences = await sequenceService.loadSequences(projectPath);

      if (loadedSequences.length === 0) {
        // Check if we're in web mode without backend
        const isElectron = !!(window as Window & { electronAPI?: { fs?: { readdir?: unknown } } }).electronAPI?.fs?.readdir;
        if (!isElectron) {
          showWarning('No sequences found. Note: Sequence loading from files requires either:\n1. Running in Electron mode, or\n2. A backend API server running on http://localhost:8000\n\nCurrently running in web mode without backend.');
        } else {
          showWarning('No sequences found dans les fichiers JSON.');
        }
        return;
      }

      // Update shots with sequence information
      const updatedShots = [...shots];
      for (const sequence of loadedSequences) {
        // Update shots that belong to this sequence
        if (sequence.shot_ids && Array.isArray(sequence.shot_ids)) {
          const sequenceShots = updatedShots.filter((shot: Shot) =>
            sequence.shot_ids && (sequence.shot_ids as string[]).includes(shot.id)
          );
          sequenceShots.forEach((shot: Shot) => {
            (shot as ShotWithSequenceId).sequence_id = sequence.id;
            // Update sequence metadata in shot
            (shot as ShotWithSequenceId).metadata = {
              ...(shot.metadata || {}),
              sequence_order: sequence.order,
              sequence_duration: sequence.duration,
              sequence_shots_count: sequence.shots_count,
              sequence_resume: sequence.resume,
            };
          });
        } else {
          logger.warn(`Sequence ${sequence.id} has no shot_ids array`);
        }
      }

      // Update shots in store
      setShots(updatedShots);

      // Force re-render
      setForceUpdate(prev => prev + 1);

      showSuccess(`${loadedSequences.length} sequence(s) updated from JSON files.`);

    } catch (error) {
      logger.error('Failed to force update sequences:', error);
      const isElectron = !!(window as Window & { electronAPI?: { fs?: { readdir?: unknown } } }).electronAPI?.fs?.readdir;
      if (isElectron) {
        const errorMessage = error instanceof Error
          ? error.message
          : isRecord(error) && typeof error.message === 'string'
            ? error.message
            : 'Unknown error';
        showError('Error updating sequences', errorMessage);
      } else {
        showError('Cannot load sequences', 'Cannot load sequences in web mode without a backend server. Please run in Electron mode or start the backend API server.');
      }
    }
  };

  // Helper function to save sequence to file
  const saveSequenceToFile = useCallback(async (sequence: SequenceData, sequencesDir: string) => {
    const fileName = `sequence_${String(sequence.order).padStart(3, '0')}.json`;
    const filePath = `${sequencesDir}/${fileName}`;

    // Get shots for this sequence
    const sequenceShots = shots?.filter((shot): shot is Shot & { sequence_id: string } => 
      'sequence_id' in shot && (shot as ShotWithSequenceId).sequence_id === sequence.id
    ) || [];
    const shotIds = sequenceShots.map((shot) => shot.id);

    const sequenceData = {
      id: sequence.id,
      name: sequence.name,
      order: sequence.order,
      duration: sequence.duration,
      shots_count: sequence.shots,
      resume: sequence.resume,
      shot_ids: shotIds,
      created_at: project?.metadata?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const jsonString = JSON.stringify(sequenceData, null, 2);

    if (window.electronAPI?.fs?.writeFile) {
      // Pass string directly - the Electron API accepts strings
      await window.electronAPI.fs.writeFile(filePath, jsonString);
    }
  }, [shots, project]);

  // Helper function to save shot to file
  const saveShotToFile = useCallback(async (shot: Shot & { sequence_id: string }, shotsDir: string) => {
    const fileName = `shot_${shot.id}.json`;
    const filePath = `${shotsDir}/${fileName}`;

    const shotData = {
      id: shot.id,
      title: shot.title,
      description: shot.description,
      duration: shot.duration,
      position: shot.position,
      sequence_id: shot.sequence_id,
      audioTracks: shot.audioTracks || [],
      effects: shot.effects || [],
      textLayers: shot.textLayers || [],
      animations: shot.animations || [],
      metadata: {
        ...shot.metadata,
        updated_at: new Date().toISOString(),
      },
    };

    const jsonString = JSON.stringify(shotData, null, 2);

    if (window.electronAPI?.fs?.writeFile) {
      // Pass string directly - the Electron API accepts strings
      await window.electronAPI.fs.writeFile(filePath, jsonString);
    }
  }, []);

  // Handle save sequence edit
  const handleSaveSequenceEdit = useCallback(async (updatedSequence: {
    id: string;
    order: number;
    duration: number;
    shots: number;
    resume: string;
  }) => {
    try {
      if (!project?.metadata?.path) {
        showError('Project path not found. Please ensure the project is properly loaded.');
        return;
      }

      const projectPath = (project?.metadata?.path as string) || '';
      const sequencesDir = `${projectPath}/sequences`;

      // Ensure sequences directory exists
      if (window.electronAPI?.fs?.mkdir) {
        try {
          await window.electronAPI.fs.mkdir(sequencesDir, { recursive: true });
// eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
          // Directory might already exist, ignore error
        }
      }

      // Get original sequence data to check if order changed
      const originalSequence = sequences.find(seq => seq.id === updatedSequence.id);
      const orderChanged = originalSequence && originalSequence.order !== updatedSequence.order;

      // If order changed, reorganize all sequences
      if (orderChanged) {
        const allSequences = [...sequences];
        const currentIndex = allSequences.findIndex(seq => seq.id === updatedSequence.id);
        if (currentIndex !== -1) {
          allSequences.splice(currentIndex, 1);
          allSequences.splice(updatedSequence.order - 1, 0, {
            ...originalSequence,
            order: updatedSequence.order,
            duration: updatedSequence.duration,
            shots: updatedSequence.shots,
            resume: updatedSequence.resume,
          });

          // Update order numbers for all sequences
          allSequences.forEach((seq, index) => {
            seq.order = index + 1;
          });

          // Save all sequences
          for (const seq of allSequences) {
            await saveSequenceToFile(seq, sequencesDir);
          }
        }
      } else {
        // Just update the current sequence
        const sequenceToSave = {
          ...originalSequence,
          ...updatedSequence,
          name: originalSequence?.name || `Sequence ${updatedSequence.order}`,
        };
        await saveSequenceToFile(sequenceToSave, sequencesDir);
      }

      // Update shots associated with this sequence
      if (shots && shots.length > 0) {
        const sequenceShots = shots.filter((shot: unknown) => (shot as ShotWithSequenceId).sequence_id === updatedSequence.id);
        for (const shot of sequenceShots) {
          const typedShot = shot as ShotWithSequenceId;
          if (window.electronAPI?.sequence?.updateShot) {
            await window.electronAPI.sequence.updateShot(projectPath, updatedSequence.id, typedShot.id, {
              sequence_order: updatedSequence.order,
              sequence_duration: updatedSequence.duration,
              sequence_shots_count: updatedSequence.shots,
              sequence_resume: updatedSequence.resume,
            });
          }
        }
      }

      // Force refresh by updating project metadata (triggers re-render of sequences)
      const projectPathStr = (project?.metadata?.path as string) || '';
      if (window.electronAPI?.project?.updateMetadata) {
        await window.electronAPI.project.updateMetadata(projectPathStr, {
          lastSequenceUpdate: new Date().toISOString(),
        });
      }

      setEditingSequence(null);

    } catch (error) {
      logger.error('Failed to save sequence:', error);
      logger.error('Failed to save sequence:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : isRecord(error) && typeof error.message === 'string'
          ? error.message
          : 'Unknown error';
      showError('Failed to save sequence', errorMessage);
    }
  }, [project, sequences, shots, saveSequenceToFile, showError, setEditingSequence]);

  // Handle adding sequence
  const handleAddSequence = async () => {
    try {
      if (!project?.metadata?.path) {
        showError('Project path not found. Please ensure the project is properly loaded.');
        return;
      }

      const projectPath = (project.metadata.path as string) || '';
      const sequencesDir = `${projectPath}/sequences`;

      // Ensure sequences directory exists
      if (window.electronAPI?.fs?.mkdir) {
        try {
          await window.electronAPI.fs.mkdir(sequencesDir, { recursive: true });
// eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
          // Directory might already exist, ignore error
        }
      }

      // Generate unique IDs
      const sequenceId = crypto.randomUUID();
      const shotId = crypto.randomUUID();

      // Determine next order number
      const nextOrder = sequences.length + 1;

      // Create sequence object
      const sequence: SequenceData = {
        id: sequenceId,
        name: `Sequence ${nextOrder}`,
        duration: 0,
        shots: 1,
        resume: '',
        order: nextOrder,
      };

      // Create default shot
      const defaultShot: Shot & { sequence_id: string } = {
        id: shotId,
        title: 'Default Shot',
        description: 'Default shot for new sequence',
        duration: 0,
        position: 1,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: [],
        sequence_id: sequenceId,
        metadata: {},
      };

      // Add shot to store
      addShot(defaultShot);

      // Save sequence to file
      await saveSequenceToFile(sequence, sequencesDir);

      // Save shot to file
      const shotsDir = `${projectPath}/shots`;
      if (window.electronAPI?.fs?.mkdir) {
        try {
          await window.electronAPI.fs.mkdir(shotsDir, { recursive: true });
// eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
          // Directory might already exist, ignore error
        }
      }
      await saveShotToFile(defaultShot, shotsDir);

      // Update project metadata to trigger refresh
      if (window.electronAPI?.project?.updateMetadata) {
        await window.electronAPI.project.updateMetadata(projectPath, {
          lastSequenceUpdate: new Date().toISOString(),
        });
      }

      // Force UI update to show new sequence
      setForceUpdate(prev => prev + 1);

      showSuccess(`Sequence "${sequence.name}" created successfully`);
    } catch (error) {
      logger.error('Failed to create sequence:', error);
      logger.error('Failed to create sequence:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : isRecord(error) && typeof error.message === 'string'
          ? error.message
          : 'Unknown error';
      showError('Failed to create sequence', errorMessage);
    }
  };

  // Handle removing sequence
  const handleRemoveSequence = async (sequenceId: string, e?: React.MouseEvent) => {
    // Stop propagation to prevent opening editor
    if (e) {
      e.stopPropagation();
    }

    // Find the sequence first to get its name
    const sequence = sequences.find(seq => seq.id === sequenceId);
    if (!sequence) {
      showError('Sequence not found', 'The sequence you are trying to delete could not be found.');
      return;
    }

    // Open confirmation modal instead of window.confirm
    openConfirmation(
      'Delete Sequence',
      `Are you sure you want to delete "${sequence.name}"? This will also delete all associated shots and cannot be undone.`,
      async () => {
        // Set loading state
        setConfirmationModal(prev => ({ ...prev, isLoading: true }));
        try {
          await performDeleteSequence(sequenceId);
        } finally {
          // Reset loading state
          setConfirmationModal(prev => ({ ...prev, isLoading: false }));
        }
      },
      'danger'
    );
  };

  // Actual delete sequence logic (called after confirmation)
  const performDeleteSequence = async (sequenceId: string) => {
    try {
      if (!project?.metadata?.path) {
        showError('Project path not found. Please ensure the project is properly loaded.');
        return;
      }

      const projectPath = (project?.metadata?.path as string) || '';
      const sequencesDir = `${projectPath}/sequences`;

      // Find the sequence
      const sequence = sequences.find(seq => seq.id === sequenceId);
      if (!sequence) {
        showError('Sequence not found', 'The sequence you are trying to delete could not be found.');
        return;
      }

      // Delete sequence JSON file
      const fileName = `sequence_${sequenceId.padStart(3, '0')}.json`;
      const filePath = `${sequencesDir}/${fileName}`;

      try {
        if (window.electronAPI?.fs?.unlink) {
          await window.electronAPI.fs.unlink(filePath);
          logger.info(`Deleted sequence file: ${filePath}`);
        } else {
          logger.warn('electronAPI.fs.unlink not available');
        }
      } catch (error) {
        // Type guard pour 'unknown' error
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorDetail = isRecord(error) && typeof error.code === 'string' ? error.code : 'UNKNOWN';
        logger.warn(`Failed to delete sequence file ${filePath}`, { error: errorMessage, code: errorDetail });
        // Continue with deletion even if file deletion fails
      }

      // Find associated shots
      const associatedShots = shots.filter((shot) => 
        'sequence_id' in shot && (shot as ShotWithSequenceId).sequence_id === sequenceId
      );

      // Delete shot JSON files
      const shotsDir = `${projectPath}/shots`;
      for (const shot of associatedShots) {
        const typedShot = shot as ShotWithSequenceId;
        const shotFileName = `shot_${typedShot.id}.json`;
        const shotFilePath = `${shotsDir}/${shotFileName}`;

        try {
          if (window.electronAPI?.fs?.unlink) {
            await window.electronAPI.fs.unlink(shotFilePath);
            logger.info(`Deleted shot file: ${shotFilePath}`);
          }
        } catch (error) {
          // Type guard pour 'unknown' error
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorDetail = isRecord(error) && typeof error.code === 'string' ? error.code : 'UNKNOWN';
          logger.warn(`Failed to delete shot file ${shotFilePath}`, { error: errorMessage, code: errorDetail });
          // Continue with deletion even if file deletion fails
        }
      }

      // Remove shots from store
      const updatedShots = shots.filter((shot) => !('sequence_id' in shot) || (shot as ShotWithSequenceId).sequence_id !== sequenceId);
      setShots(updatedShots);

      // Check if reordering needed
      const needsReordering = sequence.order < sequences.length;
      if (needsReordering) {
        // Get remaining sequences, sort by order
        const remainingSequences = sequences.filter(seq => seq.id !== sequenceId).sort((a, b) => a.order - b.order);

        // Reassign order
        remainingSequences.forEach((seq, index) => {
          seq.order = index + 1;
        });

        // Save each sequence JSON
        for (const seq of remainingSequences) {
          await saveSequenceToFile(seq, sequencesDir);
        }

        // Update shots for remaining sequences
        for (const seq of remainingSequences) {
          const seqShots = updatedShots.filter((shot) => 
            'sequence_id' in shot && (shot as ShotWithSequenceId).sequence_id === seq.id
          );
          for (const shot of seqShots) {
            const typedShot = shot as ShotWithSequenceId;
            if (window.electronAPI?.sequence?.updateShot) {
              await window.electronAPI.sequence.updateShot(projectPath, seq.id, typedShot.id, {
                sequence_order: seq.order,
              });
            }
          }
        }
      }

      // Update project metadata to trigger refresh
      if (window.electronAPI?.project?.updateMetadata) {
        await window.electronAPI.project.updateMetadata(projectPath, {
          lastSequenceUpdate: new Date().toISOString(),
        });
      }

      // Force UI update by triggering sequences recalculation
      setForceUpdate(prev => prev + 1);

      // Close confirmation modal
      closeConfirmation();

      showSuccess('Sequence deleted successfully');
    } catch (error) {
      logger.error('Failed to delete sequence:', error);
      logger.error('Failed to delete sequence:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : isRecord(error) && typeof error.message === 'string'
          ? error.message
          : 'Unknown error';
      showError('Failed to delete sequence', errorMessage);
    }
  };

  /**
   * Handle synchronizing sequences with story content and dialogues
   * Updates shot descriptions, image prompts, and audio/TTS prompts
   */
  const handleSyncSequences = useCallback(async () => {
    if (sequences.length === 0) {
      showWarning('No sequences to synchronize. Please create sequences first.');
      return;
    }

    if (stories.length === 0) {
      showWarning('No stories found. Please create a story first to synchronize sequences.');
      return;
    }

    setIsSyncing(true);
    logger.info('[ProjectDashboard] Starting sequence synchronization...');

    try {
      // Get the main story (first one or selected)
      const mainStory = stories[0];

      // Extract story content for analysis
      const storyContent = mainStory.content || '';
      const storySummary = mainStory.summary || '';
      const storyGenre = mainStory.genre?.join(', ') || '';
      const storyTone = mainStory.tone?.join(', ') || '';

      // Get characters for the story
      const characters = useStore.getState().characters;
      const characterNames = characters.map(c => c.name).join(', ');

      let updatedShotsCount = 0;
      let updatedSequencesCount = 0;

      // Process each sequence and its associated shots
      for (const sequence of sequences) {
        // Find shots associated with this sequence
        const sequenceShots = shots.filter((shot) => 
          'sequence_id' in shot && (shot as ShotWithSequenceId).sequence_id === sequence.id
        );

        if (sequenceShots.length === 0) {
          continue;
        }

        // Calculate content segment for this sequence based on its order
        const contentSegment = distributeStoryContent(storyContent, sequence.order, sequences.length);

        // Generate image prompt from story content
        const imagePrompt = generateImagePrompt(
          contentSegment,
          storyGenre,
          storyTone,
          characterNames
        );

        // Generate TTS/dialogue prompt from story content
        const ttsPrompt = extractDialogueContent(contentSegment);

        // Update each shot in the sequence
        for (const shot of sequenceShots) {
          const updatedShot = {
            ...shot,
            description: contentSegment || (shot as Shot).description,
            metadata: {
              ...(shot.metadata || {}),
              imagePrompt: imagePrompt,
              ttsPrompt: ttsPrompt,
              syncedFromStory: true,
              lastSyncedAt: new Date().toISOString(),
              storyId: mainStory.id,
              sequenceOrder: sequence.order,
            },
          };

          // Update shot in store
          useStore.getState().updateShot((shot as ShotWithSequenceId).id, updatedShot);
          updatedShotsCount++;
        }

        // Update sequence resume from story summary
        const sequenceResume = generateSequenceResume(
          storySummary,
          sequence.order,
          sequences.length
        );

        await handleSaveSequenceEdit({
          id: sequence.id,
          order: sequence.order,
          duration: sequence.duration,
          shots: sequence.shots,
          resume: sequenceResume,
        });

        updatedSequencesCount++;
      }

      // Save all shots to files
      if (project?.metadata?.path) {
        const shotsDir = `${project.metadata.path}/shots`;
        if (window.electronAPI?.fs?.mkdir) {
          try {
            await window.electronAPI.fs.mkdir(shotsDir, { recursive: true });
// eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (error) {
            // Directory might already exist
          }
        }

        // Get all updated shots from store
        const allUpdatedShots = useStore.getState().shots;
        for (const shot of allUpdatedShots) {
          await saveShotToFile(shot as Shot & { sequence_id: string }, shotsDir);
        }
      }

      // Force UI update
      setForceUpdate(prev => prev + 1);

      logger.info('[ProjectDashboard] Sequence synchronization completed', {
        sequencesUpdated: updatedSequencesCount,
        shotsUpdated: updatedShotsCount,
      });

      showSuccess(
        `Synchronization complete!`,
        `${updatedSequencesCount} sequence(s) and ${updatedShotsCount} shot(s) updated with story content, image prompts, and dialogue prompts.`
      );

    } catch (error) {
      logger.error('Failed to synchronize sequences:', error);
      logger.error('Failed to synchronize sequences:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : isRecord(error) && typeof error.message === 'string'
          ? error.message
          : 'Unknown error';
      showError('Synchronization failed', errorMessage);
    } finally {
      setIsSyncing(false);
    }
  }, [sequences, stories, shots, project, handleSaveSequenceEdit, showWarning, showError, showSuccess, setIsSyncing, setForceUpdate, saveShotToFile]);


  // Handle editing sequence
  const handleEditSequence = (sequence: SequenceData, e: React.MouseEvent) => {
    // Stop propagation to prevent opening editor
    e.stopPropagation();
    setEditingSequence(sequence);
  };


  // Handle sequence click
  const handleSequenceClick = (sequenceId: string) => {
    onOpenEditor(sequenceId);
  };

  // Handle new plan creation - opens Sequence Plan Wizard
  const handleNewPlan = () => {
    openSequencePlanWizard({
      mode: 'create',
      sequenceId: sequences.length > 0 ? sequences[0].id : undefined
    });
  };

  // Handle chatterbox resize
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleChatterboxResize = (newHeight: number) => {
    setChatterboxHeight(newHeight);
    localStorage.setItem('chatterboxHeight', newHeight.toString());
  };

  // Handle create new story - opens Storyteller Wizard
  const handleCreateNewStory = () => {
    console.log('[ProjectDashboard] handleCreateNewStory called - opening StorytellerWizard');
    console.log('[ProjectDashboard] Current showStorytellerWizard state:', showStorytellerWizard);

    // Close all other wizards first (mutual exclusion)
    const closeActiveWizard = useAppStore.getState().closeActiveWizard;
    closeActiveWizard();

    // Open the Storyteller Wizard to create a new story
    setShowStorytellerWizard(true);
    console.log('[ProjectDashboard] setShowStorytellerWizard(true) called');
  };

  // Handle story card click - expands to show parts
  const handleStoryClick = (storyId: string) => {
    if (expandedStoryId === storyId) {
      setExpandedStoryId(null);
    } else {
      setExpandedStoryId(storyId);
      setSelectedStoryId(storyId);
    }
  };

  // Handle close story detail view
  const handleCloseStoryDetail = () => {
    setSelectedStoryId(null);
    setExpandedStoryId(null);
  };

  // Handle story parts update (from inline editing)
  const handleUpdateStoryParts = (storyId: string, updatedParts: unknown[]) => {
    const story = getStoryById(storyId);
    if (story) {
      const updatedStory = {
        ...story,
        parts: updatedParts as unknown[],
        updatedAt: new Date(),
        version: story.version + 1,
      };
      // Update in store
      useStore.getState().updateStory(storyId, updatedStory as unknown);
      console.log('[ProjectDashboard] Story parts updated:', updatedStory);
    }
  };

  // Handle edit story - opens wizard with existing story data
  const handleEditStory = () => {
    // Close all other wizards first (mutual exclusion)
    const closeActiveWizard = useAppStore.getState().closeActiveWizard;
    closeActiveWizard();

    if (selectedStoryId) {
      // Store the story data to be edited
      const story = getStoryById(selectedStoryId);
      if (story) {
        setEditingStoryData(story);
        console.log('[ProjectDashboard] Opening story editor with existing data:', story);
      }
    }
    setSelectedStoryId(null);
    setShowStorytellerWizard(true);
  };

  // Get selected story
  const selectedStory = selectedStoryId ? getStoryById(selectedStoryId) : null;

  // ============================================================================
  // Character Management Handlers
  // ============================================================================

  /**
   * Handle create character button click
   * Opens the Character Wizard
   * Requirement: 3.1
   */
  const handleCreateCharacter = () => {
    console.log('[ProjectDashboard] handleCreateCharacter called');
    console.log('[ProjectDashboard] Current showCharacterWizard:', showCharacterWizard);
    console.log('[ProjectDashboard] Current showWorldWizard:', showWorldWizard);

    // Close all other wizards first (mutual exclusion)
    const closeActiveWizard = useAppStore.getState().closeActiveWizard;
    closeActiveWizard();

    setShowCharacterWizard(true);
    console.log('[ProjectDashboard] setShowCharacterWizard(true) called');
  };

  /**
   * Handle character card click
   * Opens the Character Editor
   * Requirement: 2.1
   */
  const handleCharacterClick = (character: Character) => {
    openCharacterEditor(character.character_id);
  };

  /**
   * Handle character editor close
   * Requirement: 2.6
   */
  const handleCharacterEditorClose = () => {
    closeCharacterEditor();
  };

  /**
   * Handle character save from editor
   * Requirement: 2.5
   */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleCharacterSave = (character: Character) => {
    // Character is already saved by the editor via useCharacterManager
    // Just close the editor
    closeCharacterEditor();
  };

  /**
   * Handle character delete from editor
   * Requirement: 7.4
   */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleCharacterDelete = (characterId: string) => {
    // Character is already deleted by the editor via useCharacterManager
    // Just close the editor
    closeCharacterEditor();
  };

  /**
   * Handle generation completion from toolbar
   * Integrates generated assets into the project
   */
  const handleGenerationComplete = (asset: GeneratedAsset) => {
    console.log('[ProjectDashboard] Generation completed:', asset);
    // Asset will be automatically saved by the generation services
    // and integrated into the project
  };

  // wizards are now handled globally in App.tsx

  /**
   * Open Sequence Plan Wizard Modal
   */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const openSequencePlanModal = () => {
    openSequencePlanWizard();
  };

  /**
   * Open Shot Wizard Modal for creating a new shot
   */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const openShotModal = (sequenceId?: string) => {
    openShotWizard({
      mode: 'create',
      sequenceId
    });
  };

  /**
     * Open Shot Wizard Modal for editing an existing shot
     */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const editShot = (shot: unknown) => {
    const typedShot = shot as ShotWithSequenceId;
    openShotWizard({
      mode: 'edit',
      existingShot: shot,
      sequenceId: typedShot.sequence_id
    });
  };

  // Listen for production guide sync request
  useEffect(() => {
    const handleSyncRequest = () => {
      handleSyncSequences();
    };
    window.addEventListener('storycore:sync-production-guide', handleSyncRequest);
    return () => window.removeEventListener('storycore:sync-production-guide', handleSyncRequest);
  }, [sequences, stories, handleSyncSequences]); // Re-bind when data changes

  return (
    <div className="project-dashboard-new">
      {/* Top Section: Quick Access (Compact) */}
      <div className="dashboard-header">
        <div className="quick-access-compact">
          <button
            className="quick-btn quick-btn-primary"
            onClick={() => {
              const closeActiveWizard = useAppStore.getState().closeActiveWizard;
              closeActiveWizard();
              setShowProjectSetupWizard(true);
            }}
            title="Project Setup"
            aria-label="Project Setup - Configure project settings"
          >
            <span>Project Setup</span>
            <Settings className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            className="quick-btn"
            title="Scenes"
            aria-label="Scenes - View all scenes"
            onClick={() => {
              const closeActiveWizard = useAppStore.getState().closeActiveWizard;
              closeActiveWizard();
              openSequencePlanWizard();
            }}
          >
            <span>Scenes ({shots?.length || 0})</span>
            <Film className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            className="quick-btn"
            title="Characters"
            aria-label="Characters - View all characters"
            onClick={() => {
              const closeActiveWizard = useAppStore.getState().closeActiveWizard;
              closeActiveWizard();
              setShowCharactersModal(true);
            }}
          >
            <span>Characters ({characters?.length || 0})</span>
            <Users className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            className="quick-btn"
            title="Assets"
            aria-label="Assets - View all assets"
            onClick={() => {
              const closeActiveWizard = useAppStore.getState().closeActiveWizard;
              closeActiveWizard();
              // Open image gallery modal as a proxy for assets management
              setShowImageGalleryModal(true);
            }}
          >
            <span>Assets ({project?.assets?.length || 0})</span>
            <FileText className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            className="quick-btn"
            title="Settings"
            aria-label="Settings - Open settings"
            onClick={() => {
              const closeActiveWizard = useAppStore.getState().closeActiveWizard;
              closeActiveWizard();
              setShowGeneralSettings(true);
            }}
          >
            <span>Settings</span>
            <Wand2 className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Generation Toolbar */}
        <div className="generation-toolbar-container">
          <GenerationButtonToolbar
            context="dashboard"
            onGenerationComplete={handleGenerationComplete}
          />
        </div>

        {/* Pipeline Status (Compact) */}
        <div className="pipeline-status-compact">
          <div className="status-item">
            <Film className="w-4 h-4" />
            <span>Sequences: {sequences.length}</span>
          </div>
          <div className="status-item">
            <FileText className="w-4 h-4" />
            <span>Shots: {shots?.length || 0}</span>
          </div>
          <div className="status-item status-ready">
            <CheckCircle2 className="w-4 h-4" />
            <span>Ready</span>
          </div>

          {/* Board Name Display */}
          <div className="status-item board-name">
            <span>Board: {(project?.metadata?.name as string) || 'My First Story'}</span>
          </div>

          {/* Service Status Indicators */}
          <div className="status-divider"></div>
          <div
            className="status-item status-service"
            title={`Ollama: ${ollamaStatus === 'connected' ? 'Connecté' : ollamaStatus === 'connecting' ? 'Vérification...' : 'Déconnecté'}`}
          >
            <div className={`status-indicator status-ollama ${ollamaStatus === 'connected' ? 'connected' : 'disconnected'}`}></div>
            <span>Ollama</span>
          </div>
          <div
            className="status-item status-service"
            title={`ComfyUI: ${comfyuiStatus === 'connected' ? 'Connecté' : comfyuiStatus === 'connecting' ? 'Vérification...' : 'Déconnecté (optionnel)'}`}
          >
            <div className={`status-indicator status-comfyui ${comfyuiStatus === 'connected' ? 'connected' : 'disconnected'}`}></div>
            <span>ComfyUI</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="dashboard-main">
        {/* Left Column: Main Content */}
        <div className="dashboard-left">
          {/* Creative Resume Section */}
          <ProjectResumeSection />

          {/* Tips Section */}
          <div className="tips-section compact-tips">
            <div className="tips-header">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h3>Tips & Tricks</h3>
            </div>
            <div className="tips-content">
              <p className="tips-intro text-sm italic opacity-80 mb-4 px-2">
                4 Steps to Manifest Your Vision:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-2">
                 <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <Globe className="w-5 h-5 text-indigo-400 mb-2" />
                    <span className="text-[10px] font-black uppercase tracking-widest">World</span>
                 </div>
                 <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <Users className="w-5 h-5 text-purple-400 mb-2" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Actors</span>
                 </div>
                 <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <BookOpen className="w-5 h-5 text-amber-400 mb-2" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Lore</span>
                 </div>
                 <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <Film className="w-5 h-5 text-emerald-400 mb-2" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Studio</span>
                 </div>
              </div>
            </div>
          </div>

          {/* Creative Wizards */}
          <CollapsibleSection
            title="Creative Wizards"
            icon={<Sparkles className="w-5 h-5" />}
            defaultExpanded={false}
          >
            <div className="creative-wizards-section" style={{ border: 'none', background: 'transparent', padding: 0, margin: 0 }}>
              <WizardLauncher
                availableWizards={enabledWizards}
                onLaunchWizard={handleLaunchWizard}
              />
            </div>
          </CollapsibleSection>

          {/* Active Add-ons Section */}
          <CollapsibleSection
            title="Active Add-ons"
            icon={<Puzzle className="w-5 h-5" />}
            defaultExpanded={false}
          >
            <DashboardAddonsSection
// eslint-disable-next-line @typescript-eslint/no-unused-vars
              onLaunchWizard={(wizardType, initialData) => {
                // Close all other wizards first
                const closeActiveWizard = useAppStore.getState().closeActiveWizard;
                closeActiveWizard();

                // Launch the wizard based on type
                handleLaunchWizard(wizardType);
              }}
              hideHeader={true}
              style={{ padding: 0, border: 'none', background: 'transparent', margin: 0 }}
            />
          </CollapsibleSection>

          {/* Stories Section */}
          <CollapsibleSection
            title="Stories"
            icon={<BookOpen className="w-5 h-5" />}
            defaultExpanded={false}
            headerActions={
              <button
                className="btn-create-story"
                onClick={handleCreateNewStory}
                title="Create a new story"
                style={{ padding: '4px 12px', height: '32px' }}
              >
                <BookOpen className="w-4 h-4" />
                <span style={{ fontSize: '0.8rem' }}>Create New Story</span>
              </button>
            }
          >
            <div className="stories-section" style={{ border: 'none', background: 'transparent', padding: 0, margin: 0 }}>
              {/* Expanded Story Parts View */}
              {expandedStoryId && (
                <StoryPartsSection
                  story={getStoryById(expandedStoryId)!}
                  onPartsUpdated={(parts) => handleUpdateStoryParts(expandedStoryId, parts)}
                  onClose={() => {
                    setExpandedStoryId(null);
                    setSelectedStoryId(null);
                  }}
                />
              )}

              {/* Stories Grid - shown when no story is expanded */}
              {!expandedStoryId && (
                <div className="stories-grid">
                  {stories.length === 0 ? (
                    <div className="no-stories-message">
                      <p>No stories yet. Click "Create New Story" to begin your first narrative.</p>
                    </div>
                  ) : (
                    stories.map((story) => (
                      <StoryCard
                        key={story.id}
                        story={story}
                        onClick={() => handleStoryClick(story.id)}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Plan Sequences */}
          <CollapsibleSection
            title="Plan Sequences"
            icon={<Film className="w-5 h-5" />}
            defaultExpanded={false}
            headerActions={
              <div className="sequence-controls">
                <button
                  className="btn-sequence-control sync"
                  onClick={handleSyncSequences}
                  disabled={isSyncing || sequences.length === 0}
                  title="Synchronize sequence plans with story and dialogues"
                  style={{ padding: '4px 10px', height: '28px' }}
                >
                  {isSyncing ? (
                    <InlineLoading message="Sync..." />
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3" />
                      <span style={{ fontSize: '0.75rem' }}>Sync</span>
                    </>
                  )}
                </button>
                <button
                  className="btn-sequence-control refresh"
                  onClick={handleForceUpdateSequences}
                  disabled={isLoadingSequences}
                  title="Refresh sequences from JSON files"
                  style={{ padding: '4px 10px', height: '28px' }}
                >
                  {isLoadingSequences ? (
                    <InlineLoading message="Loading..." />
                  ) : (
                    <>
                      <RefreshCw className="w-3 h-3" />
                      <span style={{ fontSize: '0.75rem' }}>Refresh</span>
                    </>
                  )}
                </button>
                <button
                  className="btn-sequence-control new-plan"
                  onClick={handleNewPlan}
                  title="Create a new sequence plan"
                  style={{ padding: '4px 10px', height: '28px' }}
                >
                  <FileText className="w-3 h-3" />
                  <span style={{ fontSize: '0.75rem' }}>New Plan</span>
                </button>
                <button
                  className="btn-sequence-control add"
                  onClick={handleAddSequence}
                  disabled={isAddingSequence}
                  title="Add a new sequence"
                  style={{ width: '28px', height: '28px' }}
                >
                  {isAddingSequence ? (
                    <InlineLoading message="..." />
                  ) : (
                    <Plus className="w-3 h-3" />
                  )}
                </button>
              </div>
            }
          >
            <div className="plan-sequences-section" style={{ border: 'none', background: 'transparent', padding: 0, margin: 0 }}>
              <div className="sequences-grid">
                {sequences.length === 0 ? (
                  <div className="no-sequences-message">
                    <p>No sequences yet. Click + to add your first sequence.</p>
                  </div>
                ) : (
                  sequences.map((seq) => {
                    const seqWithFlag = seq as SequenceData & { isFormal?: boolean };
                    return (
                      <div
                        key={seq.id}
                        className={`sequence-card ${seqWithFlag.isFormal ? 'formal-plan' : ''}`}
                        onClick={() => handleSequenceClick(seq.id)}
                      >
                      <div className="sequence-header">
                        <div className="flex flex-col gap-1">
                          <h4>{seq.name}</h4>
                          {seqWithFlag.isFormal && (
                            <Badge className="w-fit bg-primary/20 text-primary border-primary/30 text-[8px] uppercase font-black tracking-widest leading-none py-0.5 px-1.5">
                              Formal Plan
                            </Badge>
                          )}
                        </div>
                        <div className="sequence-actions">
                          <button
                            className="btn-sequence-action edit"
                            onClick={(e) => handleEditSequence(seq, e)}
                            title="Éditer la séquence"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            className="btn-sequence-action delete"
                            onClick={(e) => handleRemoveSequence(seq.id, e)}
                            title="Supprimer la séquence"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="sequence-info">
                        <span>Order: #{seq.order}</span>
                        <span>Duration: {seq.duration}s</span>
                        <span>Shots: {seq.shots}</span>
                      </div>
                      <div className="sequence-resume">
                        <strong>Resume:</strong> {seq.resume}
                      </div>
                    </div>
                  )})
                )}
              </div>
            </div>
          </CollapsibleSection>

          {/* Production Guide (Cine Mode) */}
          <CollapsibleSection
            title="Production Guide"
            icon={<Clapperboard className="w-5 h-5 text-primary" />}
            defaultExpanded={true}
            className="production-guide-section-wrapper"
          >
            <ProductionGuide onEditCharacter={openCharacterEditor} />
          </CollapsibleSection>

          {/* Locations Section */}
          <CollapsibleSection
            title="Locations"
            icon={<Map className="w-5 h-5" />}
            defaultExpanded={false}
          >
            <LocationSection
              onCreateLocation={() => {
                // Open location creation wizard
                openWizard('location-creation' as Parameters<typeof openWizard>[0]);
              }}
              hideHeader={true}
              style={{ border: 'none', background: 'transparent', padding: 0, margin: 0 }}
            />
          </CollapsibleSection>

          {/* Characters Section */}
          <CollapsibleSection
            title="Characters"
            icon={<Users className="w-5 h-5" />}
            defaultExpanded={false}
          >
            <CharactersSection
              onCreateCharacter={handleCreateCharacter}
              onCharacterClick={handleCharacterClick}
              onEditCharacter={handleCharacterClick}
              onDeleteCharacter={(character) => {
                // Deletion is handled by the CharacterEditor
                // This is just for the delete button on cards if shown
                openCharacterEditor(character.character_id);
              }}
              showActions={true}
              hideHeader={true}
              style={{ border: 'none', background: 'transparent', padding: 0, margin: 0 }}
            />
          </CollapsibleSection>

          {/* Objects Section */}
          <CollapsibleSection
            title="Objects"
            icon={<Database className="w-5 h-5" />}
            defaultExpanded={false}
          >
            <ObjectsSection
              onCreateObject={() => {
                console.log('[ProjectDashboardNew] Opening object wizard');
                setShowObjectWizard(true);
              }}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
              onObjectClick={(objectId) => {
                // Open objects collection modal
                setShowObjectsModal(true);
              }}
              hideHeader={true}
              style={{ border: 'none', background: 'transparent', padding: 0, margin: 0 }}
            />
          </CollapsibleSection>
        </div>

        {/* Right Column: Recent Activity & Asset Quick View */}
        <div className="dashboard-right">
          {/* Neural Production Assistant */}
          <div className="mb-6">
            <NeuralProductionAssistant />
          </div>

          {/* Recent Assets Quick View */}
          <div className="recent-assets-section mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3>Recent Assets</h3>
              <button
                className="text-xs text-primary hover:underline flex items-center gap-1"
                onClick={() => useAppStore.getState().setShowVaultModal(true)}
              >
                View Vault <Plus className="w-3 h-3" />
              </button>
            </div>

            <div className="recent-assets-grid grid grid-cols-1 gap-3">
              {isLoadingAssets ? (
                <div className="col-span-1 py-10 flex justify-center">
                  <InlineLoading message="Loading assets..." />
                </div>
              ) : recentAssets.length === 0 ? (
                <div className="bg-gray-800/50 rounded-lg p-4 text-center border border-dashed border-gray-700">
                  <p className="text-xs text-gray-400">No assets yet. Start generating!</p>
                </div>
              ) : (
                recentAssets.map((asset, idx) => (
                  <div key={idx} className="recent-asset-card group">
                    <div className="aspect-video bg-gray-900 rounded-md overflow-hidden relative border border-gray-800 group-hover:border-primary transition-colors">
                      <img
                        src={`/api/video-editor/projects/${project?.id}/media-raw?path=${asset.path}`}
                        alt={asset.path}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to placeholder if thumbnail doesn't exist or is video
                          (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/1a1a1a/404040?text=Generating...';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-[10px] text-white font-medium bg-black/60 px-2 py-1 rounded">
                          {asset.type.replace('generated_', '').toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1 flex justify-between items-center">
                      <span className="text-[10px] text-gray-400 truncate max-w-[150px]">{asset.path.split('/').pop()}</span>
                      <span className="text-[8px] text-gray-500">{asset.added_at ? new Date(asset.added_at).toLocaleDateString() : 'Recent'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="recent-activity-section">
            <h3>Recent Activity</h3>
            <div className="activity-list">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="activity-item">
                  <activity.icon className="activity-icon" />
                  <div className="activity-content">
                    <p className="activity-action">{activity.action}</p>
                    <span className="activity-time">{activity.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sequence Edit Modal */}
      {editingSequence && (
        <SequenceEditModal
          sequence={editingSequence}
          onSave={handleSaveSequenceEdit}
          onClose={() => setEditingSequence(null)}
        />
      )}

      {/* Story Detail View */}
      {selectedStory && (
        <StoryDetailView
          story={selectedStory}
          onClose={handleCloseStoryDetail}
          onEdit={handleEditStory}
        />
      )}

      {/* Character Editor Modal */}
      {isCharacterEditorOpen && editingCharacterId && (
        <CharacterEditor
          characterId={editingCharacterId}
          onClose={handleCharacterEditorClose}
          onSave={handleCharacterSave}
          onDelete={handleCharacterDelete}
        />
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmationModal.onConfirm}
        title={confirmationModal.title}
        message={confirmationModal.message}
        variant={confirmationModal.variant}
        isLoading={confirmationModal.isLoading}
      />


      {/* Locations Modal */}
      {showLocationsModal && (
        <LocationsModal
          isOpen={showLocationsModal}
          onClose={() => setShowLocationsModal(false)}
        />
      )}

      {/* Objects Modal */}
      {showObjectsModal && (
        <ObjectsModal
          isOpen={showObjectsModal}
          onClose={() => setShowObjectsModal(false)}
        />
      )}

      {/* Object Wizard Modal */}
      {showObjectWizard && (
        <ObjectWizard
          onComplete={async (object: StoryObject) => {
            const projectId = project?.id || 'unknown';
            await useObjectStore.getState().addObject(projectId, object);
            setShowObjectWizard(false);
            showSuccess(`Object "${object.name}" created successfully`);
          }}
          onCancel={() => setShowObjectWizard(false)}
        />
      )}
    </div>
  );
}

// ============================================================================
// Helper Functions (Pure)
// ============================================================================

/**
 * Distribute story content across sequences based on order
 */
function distributeStoryContent(content: string, sequenceOrder: number, totalSequences: number): string {
  if (!content) return '';

  // Split content by paragraphs or sentences
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim());

  if (paragraphs.length === 0) return content;

  // Calculate distribution
  const itemsPerSequence = Math.ceil(paragraphs.length / totalSequences);
  const startIndex = (sequenceOrder - 1) * itemsPerSequence;
  const endIndex = startIndex + itemsPerSequence;

  return paragraphs.slice(startIndex, endIndex).join('\n\n');
}

/**
 * Generate image prompt from story content
 */
function generateImagePrompt(content: string, genre: string, tone: string, characters: string): string {
  // Extract key visual elements from content
  const visualKeywords = extractVisualKeywords(content);

  // Build prompt
  const promptParts = [];

  if (visualKeywords) {
    promptParts.push(visualKeywords);
  }

  if (genre) {
    promptParts.push(`genre: ${genre}`);
  }

  if (tone) {
    promptParts.push(`tone: ${tone}`);
  }

  if (characters) {
    promptParts.push(`characters: ${characters}`);
  }

  return promptParts.join(', ');
}

/**
 * Extract visual keywords from content
 */
function extractVisualKeywords(content: string): string {
  // Simple keyword extraction - could be enhanced with NLP
  const visualPatterns = [
    /inside\s+([^.]+)/gi,
    /outside\s+([^.]+)/gi,
    /dark\s+([^.]+)/gi,
    /bright\s+([^.]+)/gi,
    /close-up\s+of\s+([^.]+)/gi,
    /wide\s+shot\s+of\s+([^.]+)/gi,
  ];

  const keywords: string[] = [];

  for (const pattern of visualPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      keywords.push(...matches.slice(0, 2)); // Take up to 2 matches per pattern
    }
  }

  // Clean up and limit
  return keywords.slice(0, 5).join(' ').substring(0, 500);
}

/**
 * Extract dialogue content from story for TTS
 */
function extractDialogueContent(content: string): string {
  // Extract dialogue lines (text between quotes)
  const dialoguePattern = /"([^"]+)"/g;
  const matches = [...content.matchAll(dialoguePattern)];

  if (matches.length > 0) {
    return matches.map(m => m[1]).join(' ');
  }

  return '';
}

/**
 * Generate sequence resume from story summary
 */
function generateSequenceResume(summary: string, order: number, total: number): string {
  if (!summary) return `Sequence ${order} of ${total}`;

  // Take a portion of the summary based on sequence order
  const parts = summary.split('. ').filter(p => p.length > 10);

  if (parts.length === 0) return `Sequence ${order} of ${total}`;

  const itemsPerSequence = Math.ceil(parts.length / total);
  const startIndex = (order - 1) * itemsPerSequence;
  const endIndex = startIndex + itemsPerSequence;

  return parts.slice(startIndex, endIndex).join('. ') + (parts.slice(startIndex, endIndex).length > 0 ? '.' : '');
}



