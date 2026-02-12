Ah./**
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
import { useAppStore } from '@/stores/useAppStore';
import type { Shot } from '@/types';
import { sequencePlanService } from '@/services/sequencePlanService';
import { migrationService } from '@/services/MigrationService';
import { syncManager } from '@/services/SyncManager';
import { videoEditorAPI } from '@/services/videoEditorAPI';
import { useLLMConfig } from '@/services/llmConfigService';
import { buildSystemPrompt } from '@/utils/systemPromptBuilder';
import { projectService } from '@/services/project/ProjectService';
import { getEnabledWizards } from '@/data/wizardDefinitions';
import { WizardLauncher } from '@/components/wizard/WizardLauncher';
import { MarketingWizard, type MarketingPlan } from '@/components/wizard/marketing/MarketingWizard';
import { CreateProjectWizard } from '@/components/wizard/CreateProjectWizard';
import { SequencePlanWizardModal, ShotWizardModal } from '@/components/wizard';
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
import { GenerationButtonToolbar } from '@/components/generation-buttons/GenerationButtonToolbar';
import { ProjectResumeSection } from './ProjectResumeSection';
import { useNotifications } from '@/components/NotificationSystem';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { InlineLoading } from '@/components/ui/LoadingFeedback';
import type { Character } from '@/types/character';
import type { GeneratedAsset } from '@/types/generation';
import {
  Film,
  Map,
  Users,
  Globe,
  MessageSquare,
  FileText,
  Wand2,
  Plus,
  Sparkles,
  CheckCircle2,
  Trash2,
  Edit3,
  Database,
  RefreshCw,
  AlertTriangle,
  BookOpen,
  Settings,
  Play,
  Clapperboard,
} from 'lucide-react';
import { SequenceEditModal } from './SequenceEditModal';
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
 * Film type configurations
 */
const FILM_TYPE_CONFIGS: FilmTypeConfig[] = [
  {
    type: 'short_film',
    name: 'Court-métrage (3-20 min)',
    minDuration: 3,
    maxDuration: 20,
    introLongTake: true,
    endingLongTake: true,
    avgSequences: 3,
    avgChapters: 3,
    description: 'Le plan-séquence est souvent utilisé comme signature.',
  },
  {
    type: 'medium_film',
    name: 'Moyen métrage (20-60 min)',
    minDuration: 20,
    maxDuration: 60,
    introLongTake: true,
    endingLongTake: true,
    avgSequences: 5,
    avgChapters: 5,
    description: 'Un plan-séquence notable pour l\'intro et un autre pour la fin.',
  },
  {
    type: 'feature_film',
    name: 'Long métrage (60+ min)',
    minDuration: 60,
    maxDuration: 300,
    introLongTake: false,
    endingLongTake: false,
    avgSequences: 12,
    avgChapters: 8,
    description: '0-1 plan-séquence notable pour poser le ton à l\'intro.',
  },
];

/**
 * Chapter approach configurations
 * Defines how many long takes per chapter based on cinematic style
 */
const CHAPTER_APPROACHES: Record<ChapterApproach, {
  name: string;
  description: string;
  longTakesPerChapter: { min: number; max: number };
  effect: string;
  suitableFor: string[];
}> = {
  classic: {
    name: 'Approche Classique',
    description: '1 plan-séquence par chapitre',
    longTakesPerChapter: { min: 1, max: 1 },
    effect: 'Chaque chapitre a une identité forte, un moment immersif',
    suitableFor: ['films narratifs', 'courts-métrages structurés', 'roman visuel'],
  },
  immersive: {
    name: 'Approche Immersive',
    description: '2-3 plans-séquences par chapitre',
    longTakesPerChapter: { min: 2, max: 3 },
    effect: 'Le chapitre devient une mini-expérience fluide',
    suitableFor: ['films chorégraphiés', 'films d\'action stylisés', 'contemplatifs'],
  },
  extreme: {
    name: 'Approche Extrême',
    description: 'Chapitre entier en plans-séquences',
    longTakesPerChapter: { min: 4, max: 10 },
    effect: 'Bloc narratif continu, très immersif, presque hypnotique',
    suitableFor: ['films d\'auteur', 'films expérimentaux', 'tension continue'],
  },
};

/**
 * Shot complexity configurations
 * Defines the number of internal shots within a long take
 */
const SHOT_COMPLEXITY: Record<ShotComplexity, {
  name: string;
  internalShots: { min: number; max: number };
  description: string;
  examples: string[];
  effect: string;
}> = {
  simple: {
    name: 'Simple (1-3 shots internes)',
    internalShots: { min: 1, max: 3 },
    description: 'Le plus classique',
    examples: ['mouvement d\'épaule', 'travelling léger', 'panoramique'],
    effect: 'Fluide, lisible, naturel',
  },
  rich: {
    name: 'Riche (4-8 shots internes)',
    internalShots: { min: 4, max: 8 },
    description: 'Plusieurs micro-moments dans un seul plan',
    examples: ['entrée → déplacement → interaction → révélation → sortie'],
    effect: 'Choragraphié, dynamique, très cinématographique',
  },
  complex: {
    name: 'Complexe (9+ shots internes)',
    internalShots: { min: 9, max: 50 },
    description: 'Niveau expert',
    examples: ['traversée de plusieurs pièces', 'plusieurs groupes', 'actions simultanées'],
    effect: 'Spectaculaire, immersif, signature visuelle forte',
  },
};

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

/**
 * Film type configuration
 */
interface FilmTypeConfig {
  type: FilmType;
  name: string;
  minDuration: number;
  maxDuration: number;
  introLongTake: boolean;
  endingLongTake: boolean;
  avgSequences: number;
  description: string;
}

/**
 * Film type configurations
 */
const FILM_TYPE_CONFIGS: FilmTypeConfig[] = [
  {
    type: 'short_film',
    name: 'Court-métrage (3-20 min)',
    minDuration: 3,
    maxDuration: 20,
    introLongTake: true,
    endingLongTake: true,
    avgSequences: 3,
    description: 'Le plan-séquence est souvent utilisé comme signature.',
  },
  {
    type: 'medium_film',
    name: 'Moyen métrage (20-60 min)',
    minDuration: 20,
    maxDuration: 60,
    introLongTake: true,
    endingLongTake: true,
    avgSequences: 5,
    description: 'Un plan-séquence notable pour l\'intro et un autre pour la fin.',
  },
  {
    type: 'feature_film',
    name: 'Long métrage (60+ min)',
    minDuration: 60,
    maxDuration: 300,
    introLongTake: false,
    endingLongTake: false,
    avgSequences: 12,
    description: '0-1 plan-séquence notable pour poser le ton à l\'intro.',
  },
];

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

export function ProjectDashboardNew({
  onOpenEditor,
}: ProjectDashboardNewProps) {
  const project = useAppStore((state) => state.project);
  const shots = useAppStore((state) => state.shots);
  const setShots = useAppStore((state) => state.setShots);
  const setProject = useAppStore((state) => state.setProject);
  const addShot = useAppStore((state) => state.addShot);
  const openWizard = useAppStore((state) => state.openWizard);
  const setShowWorldWizard = useAppStore((state) => state.setShowWorldWizard);
  const showWorldWizard = useAppStore((state) => state.showWorldWizard);
  const setShowCharacterWizard = useAppStore((state) => state.setShowCharacterWizard);
  const showCharacterWizard = useAppStore((state) => state.showCharacterWizard);
  const showStorytellerWizard = useAppStore((state) => state.showStorytellerWizard);
  const setShowStorytellerWizard = useAppStore((state) => state.setShowStorytellerWizard);
  const showProjectSetupWizard = useAppStore((state) => state.showProjectSetupWizard);
  const setShowProjectSetupWizard = useAppStore((state) => state.setShowProjectSetupWizard);
  const setShowCharactersModal = useAppStore((state) => state.setShowCharactersModal);
  const setShowWorldModal = useAppStore((state) => state.setShowWorldModal);
  const setShowGeneralSettings = useAppStore((state) => state.setShowGeneralSettings);
  const setShowImageGalleryModal = useAppStore((state) => state.setShowImageGalleryModal);
  const setShowObjectWizard = useAppStore((state) => state.setShowObjectWizard);
  const openSequencePlanWizard = useAppStore((state) => state.openSequencePlanWizard);

  // Character editor state
  const isCharacterEditorOpen = useAppStore((state) => state.isCharacterEditorOpen);
  const editingCharacterId = useAppStore((state) => state.editingCharacterId);
  const openCharacterEditor = useAppStore((state) => state.openCharacterEditor);
  const closeCharacterEditor = useAppStore((state) => state.closeCharacterEditor);

  // Story management from Zustand store
  const stories = useStore((state) => state.stories);
  const getAllStories = useStore((state) => state.getAllStories);
  const getStoryById = useStore((state) => state.getStoryById);

  // Character management from Zustand store
  const characters = useStore((state) => state.characters);

  // LLM Configuration
  const { config: llmConfig, service: llmService, isConfigured: isLLMConfigured } = useLLMConfig();

  // Notification system
  const { showSuccess, showError, showWarning, showInfo } = useNotifications();

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
  const [isLoadingSequences, setIsLoadingSequences] = useState(false);
  const [isAddingSequence, setIsAddingSequence] = useState(false);
  const [isDeletingSequence, setIsDeletingSequence] = useState<string | null>(null);
  const [isSavingSequence, setIsSavingSequence] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

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
  const [chatterboxHeight, setChatterboxHeight] = useState<number>(() => {
    // Load saved height from localStorage, default to 400px
    const saved = localStorage.getItem('chatterboxHeight');
    return saved ? parseInt(saved, 10) : 400;
  });
  const showChat = useAppStore((state) => state.showChat);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);

  // Story editing state - stores story data to be edited
  const [editingStoryData, setEditingStoryData] = useState<any>(null);

  // Expanded story view state - shows story parts when a story is selected
  const [expandedStoryId, setExpandedStoryId] = useState<string | null>(null);

  // Marketing Wizard state
  const [showMarketingWizard, setShowMarketingWizard] = useState(false);
  const [marketingPlan, setMarketingPlan] = useState<MarketingPlan | null>(null);

  // New Wizard Modal states
  const [showSequencePlanWizardModal, setShowSequencePlanWizardModal] = useState(false);
  const [showShotWizardModal, setShowShotWizardModal] = useState(false);
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | undefined>(undefined);
  const [editingShot, setEditingShot] = useState<Partial<Shot> | undefined>(undefined);
  const [recentAssets, setRecentAssets] = useState<any[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);

  // Get enabled wizards for dynamic display
  const enabledWizards = useMemo(() => getEnabledWizards(), []);

  // Generate sequences from project shots
  const sequences = useMemo<SequenceData[]>(() => {
    if (!shots || shots.length === 0) {
      return [];
    }

    // Group shots by sequence_id (use plain object instead of Map for better compatibility)
    const sequenceMap: Record<string, any[]> = {};
    shots.forEach(shot => {
      const seqId = (shot as any).sequence_id || 'default';
      if (!sequenceMap[seqId]) {
        sequenceMap[seqId] = [];
      }
      sequenceMap[seqId].push(shot);
    });


    // Convert to sequence data array
    const sequenceArray: SequenceData[] = [];
    let order = 1;

    for (const sequenceId in sequenceMap) {
      const seqShots = sequenceMap[sequenceId];
      // Calculate total duration
      const totalDuration = seqShots.reduce((sum, shot) => sum + (shot.duration || 0), 0);

      // Get sequence name from first shot or generate default
      const sequenceName = `Sequence ${order}`;

      // Get description from first shot or use default
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
    const sortedSequences = sequenceArray.sort((a, b) => a.order - b.order);
    return sortedSequences;
  }, [shots, forceUpdate]);

  // Subscribe to sequence plan updates
  useEffect(() => {

    const planUpdateUnsubscribe = sequencePlanService.subscribeToPlanUpdates((planId, plan) => {
      // Force re-render by updating state
      setForceUpdate(prev => prev + 1);
    });

    const planListUnsubscribe = sequencePlanService.subscribeToPlanList((plans) => {
      // Force re-render by updating state
      setForceUpdate(prev => prev + 1);
    });

    return () => {
      planUpdateUnsubscribe();
      planListUnsubscribe();
    };
  }, []);

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

        const migrationNeeded = await migrationService.isMigrationNeeded(project.metadata.path);

        if (migrationNeeded) {

          // Afficher une notification de migration en cours
          const migrationNotification = {
            id: 'migration-in-progress',
            type: 'system',
            content: '🔄 Migration automatique des données en cours... Veuillez patienter.',
            timestamp: new Date(),
          };

          // Démarrer la migration
          const migrationResult = await migrationService.migrateAllData(project.metadata.path);

          if (migrationResult.success) {

            // Notification de succès
            const successNotification = {
              id: 'migration-success',
              type: 'system',
              content: `Migration completed successfully! ${migrationResult.migrated} entities migrated.`,
              timestamp: new Date(),
            };

            // Déclencher une synchronisation complète
            await syncManager.fullSync(project.metadata.path);

          } else {
            logger.error('[ProjectDashboard] Migration failed:', migrationResult.errors);

            // Notification d'erreur avec option de retry
            const errorNotification = {
              id: 'migration-error',
              type: 'error',
              content: `Migration failed: ${migrationResult.errors.length} errors. Check console for more details.`,
              timestamp: new Date(),
              error: {
                message: `Migration failed with ${migrationResult.errors.length} errors`,
                userMessage: 'La migration automatique a échoué. Certaines données peuvent être manquantes.',
                category: 'migration',
                retryable: true,
                actions: [
                  {
                    label: 'Retry Migration',
                    action: async () => {
                      // Retry logic would go here
                    },
                    primary: true,
                  },
                  {
                    label: 'View Details',
                    action: () => {
                    },
                    primary: false,
                  },
                ],
              },
            };
          }
        } else {
        }
      } catch (error) {
        logger.error('[ProjectDashboard] Auto-migration error:', error);
      }
    };

    // Délai pour laisser le temps au projet de se charger complètement
    const migrationTimeout = setTimeout(performAutoMigration, 2000);

    return () => clearTimeout(migrationTimeout);
  }, [project?.metadata?.path]);

  // Fetch recent assets
  const fetchRecentAssets = useCallback(async () => {
    if (!project?.id) return;
    setIsLoadingAssets(true);
    try {
      const response = await videoEditorAPI.listProjectAssets(project.id);
      if (response && response.assets) {
        // Sort by date (newest first) and take top 5
        const sorted = [...response.assets].sort((a, b) =>
          new Date(b.added_at || 0).getTime() - new Date(a.added_at || 0).getTime()
        );
        setRecentAssets(sorted.slice(0, 5));
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
        time: new Date(project.metadata.created_at).toLocaleDateString(),
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
        setShowMarketingWizard(true);
        break;
      case 'shot-planning':
        openSequencePlanWizard();
        break;
      case 'audio-production-wizard':
      case 'video-editor-wizard':
      case 'comic-to-sequence-wizard':
        logger.warn('[ProjectDashboard] Wizard not yet implemented:', { wizardId });
        showWarning(`The ${wizardId} wizard is not yet implemented. Coming soon!`);
        break;
      default:
        // Generic wizard launch for new wizards
        openWizard(wizardId as any); // Use 'any' to bypass type checking for dynamic wizard IDs
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

      const projectPath = project.metadata.path;

      // Use the sequence service which handles both Electron and Web API
      const loadedSequences = await sequenceService.loadSequences(projectPath);

      if (loadedSequences.length === 0) {
        // Check if we're in web mode without backend
        const isElectron = !!(window as any).electronAPI?.fs?.readdir;
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
          const sequenceShots = updatedShots.filter((shot: unknown) =>
            sequence.shot_ids && sequence.shot_ids.includes(shot.id)
          );
          sequenceShots.forEach((shot: unknown) => {
            shot.sequence_id = sequence.id;
            // Update sequence metadata in shot
            shot.metadata = {
              ...shot.metadata,
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
      const isElectron = !!(window as any).electronAPI?.fs?.readdir;
      if (isElectron) {
        showError('Error updating sequences', error instanceof Error ? error.message : 'Unknown error');
      } else {
        showError('Cannot load sequences', 'Cannot load sequences in web mode without a backend server. Please run in Electron mode or start the backend API server.');
      }
    }
  };

  // Handle adding sequence
  const handleAddSequence = async () => {
    try {
      if (!project?.metadata?.path) {
        showError('Project path not found. Please ensure the project is properly loaded.');
        return;
      }

      const projectPath = project.metadata.path;
      const sequencesDir = `${projectPath}/sequences`;

      // Ensure sequences directory exists
      if (window.electronAPI?.fs?.mkdir) {
        try {
          await window.electronAPI.fs.mkdir(sequencesDir, { recursive: true });
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
      showError('Failed to create sequence', error instanceof Error ? error.message : 'Unknown error');
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

      const projectPath = project.metadata.path;
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
        logger.warn(`Failed to delete sequence file ${filePath}`, { error: errorMessage });
        // Continue with deletion even if file deletion fails
      }

      // Find associated shots
      const associatedShots = shots.filter((shot: unknown) => shot.sequence_id === sequenceId);

      // Delete shot JSON files
      const shotsDir = `${projectPath}/shots`;
      for (const shot of associatedShots) {
        const shotFileName = `shot_${shot.id}.json`;
        const shotFilePath = `${shotsDir}/${shotFileName}`;

        try {
          if (window.electronAPI?.fs?.unlink) {
            await window.electronAPI.fs.unlink(shotFilePath);
            logger.info(`Deleted shot file: ${shotFilePath}`);
          }
        } catch (error) {
          // Type guard pour 'unknown' error
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.warn(`Failed to delete shot file ${shotFilePath}`, { error: errorMessage });
          // Continue with deletion even if file deletion fails
        }
      }

      // Remove shots from store
      const updatedShots = shots.filter((shot: unknown) => shot.sequence_id !== sequenceId);
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
          const seqShots = updatedShots.filter((shot: unknown) => shot.sequence_id === seq.id);
          for (const shot of seqShots) {
            if (window.electronAPI?.sequence?.updateShot) {
              await window.electronAPI.sequence.updateShot(projectPath, seq.id, shot.id, {
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
      showError('Failed to delete sequence', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  /**
   * Handle synchronizing sequences with story content and dialogues
   * Updates shot descriptions, image prompts, and audio/TTS prompts
   */
  const handleSyncSequences = async () => {
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
        const sequenceShots = shots.filter((shot: unknown) => shot.sequence_id === sequence.id);
        
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
            // Update description from story content
            description: contentSegment || shot.description,
            // Store image generation prompt in metadata
            metadata: {
              ...(shot.metadata || {}),
              // Image generation prompts
              imagePrompt: imagePrompt,
              negativePrompt: generateNegativePrompt(storyTone),
              visualStyle: storyGenre,
              // TTS/Audio prompts
              ttsPrompt: ttsPrompt,
              voiceParameters: {
                language: detectLanguage(storyContent),
                speed: 1.0,
                pitch: 0,
              },
              // Sync metadata
              syncedFromStory: true,
              lastSyncedAt: new Date().toISOString(),
              storyId: mainStory.id,
              sequenceOrder: sequence.order,
            },
          };

          // Update shot in store
          useStore.getState().updateShot(shot.id, updatedShot);
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
          } catch (error) {
            // Directory might already exist
          }
        }

        // Get all updated shots from store
        const allUpdatedShots = useStore.getState().shots;
        for (const shot of allUpdatedShots) {
          await saveShotToFile(shot as any, shotsDir);
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
      showError('Synchronization failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsSyncing(false);
    }
  };

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
   * Generate negative prompt based on tone
   */
  function generateNegativePrompt(tone: string): string {
    const negatives = ['blurry', 'low quality', 'distorted', 'deformed'];
    
    // Add tone-specific negatives
    if (tone.toLowerCase().includes('dark')) {
      negatives.push('bright', 'cartoonish');
    } else if (tone.toLowerCase().includes('happy')) {
      negatives.push('sad', 'gloomy');
    }
    
    return negatives.join(', ');
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
   * Detect language from content
   */
  function detectLanguage(content: string): string {
    // Simple language detection based on common words
    const frenchWords = ['le', 'la', 'les', 'un', 'une', 'des', 'et', 'est', 'dans', 'qui', 'il', 'elle'];
    const spanishWords = ['el', 'la', 'los', 'las', 'un', 'una', 'y', 'es', 'en', 'que', 'él', 'ella'];
    
    const words = content.toLowerCase().split(/\s+/);
    
    let frenchCount = 0;
    let spanishCount = 0;
    
    for (const word of words.slice(0, 100)) { // Check first 100 words
      if (frenchWords.includes(word)) frenchCount++;
      if (spanishWords.includes(word)) spanishCount++;
    }
    
    if (frenchCount > spanishCount) return 'fr-FR';
    if (spanishCount > frenchCount) return 'es-ES';
    
    return 'en-US'; // Default to English
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

  // Handle editing sequence
  const handleEditSequence = (sequence: SequenceData, e: React.MouseEvent) => {
    // Stop propagation to prevent opening editor
    e.stopPropagation();
    setEditingSequence(sequence);
  };

  // Handle save sequence edit
  const handleSaveSequenceEdit = async (updatedSequence: {
    id: string;
    order: number;
    duration: number;
    shots: number;
    resume: string;
  }) => {
    ;

    try {
      if (!project?.metadata?.path) {
        showError('Project path not found. Please ensure the project is properly loaded.');
        return;
      }

      const projectPath = project.metadata.path;
      const sequencesDir = `${projectPath}/sequences`;

      // Ensure sequences directory exists
      if (window.electronAPI?.fs?.mkdir) {
        try {
          await window.electronAPI.fs.mkdir(sequencesDir, { recursive: true });
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
        const sequenceShots = shots.filter((shot: unknown) => shot.sequence_id === updatedSequence.id);
        for (const shot of sequenceShots) {
          if (window.electronAPI?.sequence?.updateShot) {
            await window.electronAPI.sequence.updateShot(projectPath, updatedSequence.id, shot.id, {
              sequence_order: updatedSequence.order,
              sequence_duration: updatedSequence.duration,
              sequence_shots_count: updatedSequence.shots,
              sequence_resume: updatedSequence.resume,
            });
          }
        }
      }

      // Force refresh by updating project metadata (triggers re-render of sequences)
      if (window.electronAPI?.project?.updateMetadata) {
        await window.electronAPI.project.updateMetadata(projectPath, {
          lastSequenceUpdate: new Date().toISOString(),
        });
      }

      ;
      setEditingSequence(null);

    } catch (error) {
      logger.error('Failed to save sequence:', error);
      showError('Failed to save sequence', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  // Helper function to save sequence to file
  const saveSequenceToFile = async (sequence: SequenceData, sequencesDir: string) => {
    const fileName = `sequence_${String(sequence.order).padStart(3, '0')}.json`;
    const filePath = `${sequencesDir}/${fileName}`;

    // Get shots for this sequence
    const sequenceShots = shots?.filter((shot: unknown) => shot.sequence_id === sequence.id) || [];
    const shotIds = sequenceShots.map((shot: unknown) => shot.id);

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
      // Convert string to Buffer for Electron API
      const encoder = new TextEncoder();
      const dataBuffer = Buffer.from(encoder.encode(jsonString));
      await window.electronAPI.fs.writeFile(filePath, dataBuffer);
    }
  };

  // Helper function to save shot to file
  const saveShotToFile = async (shot: Shot & { sequence_id: string }, shotsDir: string) => {
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
      // Convert string to Buffer for Electron API
      const encoder = new TextEncoder();
      const dataBuffer = Buffer.from(encoder.encode(jsonString));
      await window.electronAPI.fs.writeFile(filePath, dataBuffer);
    }
  };

  // Handle sequence click
  const handleSequenceClick = (sequenceId: string) => {
    ;
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
        parts: updatedParts,
        updatedAt: new Date(),
        version: story.version + 1,
      };
      // Update in store
      useStore.getState().updateStory(storyId, updatedStory);
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
  const handleCharacterSave = (character: Character) => {
    // Character is already saved by the editor via useCharacterManager
    // Just close the editor
    closeCharacterEditor();
  };

  /**
   * Handle character delete from editor
   * Requirement: 7.4
   */
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

  /**
     * Handle Marketing Wizard completion
     * Saves the marketing plan to the project
     */
  const handleMarketingWizardComplete = (plan: MarketingPlan) => {
    console.log('[ProjectDashboard] Marketing plan created:', plan);
    setMarketingPlan(plan);

    // TODO: Save marketing plan to project or generate assets
    // For now, just show success
    showSuccess('Plan marketing créé', `Votre plan est prêt!`);
  };

  // ============================================================================
  // New Wizard Modal Handlers
  // ============================================================================

  /**
   * Handle Sequence Plan Wizard completion
   */
  const handleSequencePlanComplete = (plan: unknown) => {
    console.log('[ProjectDashboard] Sequence plan created:', plan);
    setShowSequencePlanWizardModal(false);
    showSuccess('Plan de séquence créé avec succès!');
    setForceUpdate(prev => prev + 1);
  };

  /**
   * Handle Shot Wizard completion
   */
  const handleShotComplete = (shot: Shot) => {
    console.log('[ProjectDashboard] Shot created/updated:', shot);
    setShowShotWizardModal(false);
    setEditingShot(undefined);
    setSelectedSequenceId(undefined);

    // Add or update shot in store
    if (shot.id) {
      const existingShot = shots.find((s: unknown) => s.id === shot.id);
      if (existingShot) {
        // Update existing shot
        const updatedShots = shots.map((s: unknown) =>
          s.id === shot.id ? { ...s, ...shot } : s
        );
        setShots(updatedShots);
      } else {
        // Add new shot
        addShot(shot as any);
      }
    }

    showSuccess(`Plan "${shot.title}" créé avec succès!`);
    setForceUpdate(prev => prev + 1);
  };

  /**
   * Open Sequence Plan Wizard Modal
   */
  const openSequencePlanModal = () => {
    setShowSequencePlanWizardModal(true);
  };

  /**
   * Open Shot Wizard Modal for creating a new shot
   */
  const openShotModal = (sequenceId?: string) => {
    setSelectedSequenceId(sequenceId);
    setEditingShot(undefined);
    setShowShotWizardModal(true);
  };

  /**
     * Open Shot Wizard Modal for editing an existing shot
     */
  const editShot = (shot: unknown) => {
    setEditingShot(shot);
    setSelectedSequenceId(shot.sequence_id);
    setShowShotWizardModal(true);
  };

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
            <span>Board: {project?.metadata?.name || 'My First Story'}</span>
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
          <div className="tips-section">
            <div className="tips-header">
              <Sparkles className="w-5 h-5" />
              <h3>Tips & Tricks</h3>
            </div>
            <div className="tips-content">
              <p className="tips-intro">
                For a better experience after creating a new project, follow this recommended procedure:
              </p>
              <ol className="tips-list">
                <li>
                  <Globe className="w-4 h-4" />
                  <div>
                    <strong>World Building</strong>
                    <span>Create the universe and context for your story</span>
                  </div>
                </li>
                <li>
                  <Users className="w-4 h-4" />
                  <div>
                    <strong>Character Creation</strong>
                    <span>Define your main and secondary characters</span>
                  </div>
                </li>
                <li>
                  <BookOpen className="w-4 h-4" />
                  <div>
                    <strong>Story Generator + Global Resume</strong>
                    <span>Generate your story and create the global resume below</span>
                  </div>
                </li>
                <li>
                  <Film className="w-4 h-4" />
                  <div>
                    <strong>Shot Planning</strong>
                    <span>Plan your sequences and shots for production</span>
                  </div>
                </li>
              </ol>
            </div>
          </div>

          {/* Creative Wizards */}
          <div className="creative-wizards-section">
            <WizardLauncher
              availableWizards={enabledWizards}
              onLaunchWizard={handleLaunchWizard}
            />
          </div>

          {/* Stories Section */}
          <div className="stories-section">
            <div className="section-header">
              <h3>Stories</h3>
              <button
                className="btn-create-story"
                onClick={handleCreateNewStory}
                title="Create a new story"
              >
                <BookOpen className="w-4 h-4" />
                <span>Create New Story</span>
              </button>
            </div>

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

          {/* Plan Sequences */}
          <div className="plan-sequences-section">
            <div className="section-header">
              <h3>Plan Sequences</h3>
              <div className="sequence-controls">
                <button
                  className="btn-sequence-control sync"
                  onClick={handleSyncSequences}
                  disabled={isSyncing || sequences.length === 0}
                  title="Synchroniser les plans séquences avec l'histoire et les dialogues"
                >
                  {isSyncing ? (
                    <InlineLoading message="Sync..." />
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Sync</span>
                    </>
                  )}
                </button>
                <button
                  className="btn-sequence-control refresh"
                  onClick={handleForceUpdateSequences}
                  disabled={isLoadingSequences}
                  title="Refresh sequences from JSON files"
                >
                  {isLoadingSequences ? (
                    <InlineLoading message="Loading..." />
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Refresh</span>
                    </>
                  )}
                </button>
                <button
                  className="btn-sequence-control new-plan"
                  onClick={handleNewPlan}
                  title="Create a new sequence plan"
                >
                  <FileText className="w-4 h-4" />
                  <span>New Plan</span>
                </button>
                <button
                  className="btn-sequence-control add"
                  onClick={handleAddSequence}
                  disabled={isAddingSequence}
                  title="Add a new sequence"
                >
                  {isAddingSequence ? (
                    <InlineLoading message="Adding..." />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="sequences-grid">
              {sequences.length === 0 ? (
                <div className="no-sequences-message">
                  <p>No sequences yet. Click + to add your first sequence.</p>
                </div>
              ) : (
                sequences.map((seq) => (
                  <div
                    key={seq.id}
                    className="sequence-card"
                    onClick={() => handleSequenceClick(seq.id)}
                  >
                    <div className="sequence-header">
                      <h4>{seq.name}</h4>
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
                ))
              )}
            </div>
          </div>

          {/* Locations Section */}
          <LocationSection
            onCreateLocation={() => {
              // Open location creation wizard
              openWizard('location-creation' as any);
            }}
          />

          {/* Characters Section */}
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
          />

          {/* Objects Section */}
          <ObjectsSection
            onCreateObject={() => {
              console.log('[ProjectDashboardNew] Opening object wizard');
              setShowObjectWizard(true);
            }}
            onObjectClick={(objectId) => {
              // Open object editor
              console.log('Object clicked:', objectId);
            }}
          />
        </div>

        {/* Right Column: Recent Activity & Asset Quick View */}
        <div className="dashboard-right">
          {/* Recent Assets Quick View */}
          <div className="recent-assets-section mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3>Recent Assets</h3>
              <button
                className="text-xs text-primary hover:underline flex items-center gap-1"
                onClick={() => setShowImageGalleryModal(true)}
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

      {/* Marketing Wizard */}
      {showMarketingWizard && (
        <MarketingWizard
          isOpen={showMarketingWizard}
          onClose={() => setShowMarketingWizard(false)}
          onComplete={handleMarketingWizardComplete}
          projectData={{
            projectId: project?.id || 'default',
            projectName: project?.metadata?.name || 'Untitled Project',
            storySummary: project?.metadata?.description,
            characters: characters?.map(c => c.name) || [],
            scenes: shots?.map(s => s.title) || []
          }}
        />
      )}

      {/* Sequence Plan Wizard Modal */}
      {showSequencePlanWizardModal && (
        <SequencePlanWizardModal
          isOpen={showSequencePlanWizardModal}
          onClose={() => setShowSequencePlanWizardModal(false)}
          onComplete={handleSequencePlanComplete}
          mode="create"
        />
      )}

      {/* Shot Wizard Modal */}
      {showShotWizardModal && (
        <ShotWizardModal
          isOpen={showShotWizardModal}
          onClose={() => {
            setShowShotWizardModal(false);
            setEditingShot(undefined);
            setSelectedSequenceId(undefined);
          }}
          onComplete={handleShotComplete}
          initialShot={editingShot}
          sequenceId={selectedSequenceId}
          mode={editingShot ? 'edit' : 'create'}
        />
      )}
    </div>
  );
}



