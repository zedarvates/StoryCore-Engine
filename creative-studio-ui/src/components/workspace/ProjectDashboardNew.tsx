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
import { useAppStore } from '@/stores/useAppStore';
import type { Shot } from '@/types';
import { sequencePlanService } from '@/services/sequencePlanService';
import { migrationService } from '@/services/MigrationService';
import { syncManager } from '@/services/SyncManager';
import { useLLMConfig } from '@/services/llmConfigService';
import { buildSystemPrompt } from '@/utils/systemPromptBuilder';
import { projectService } from '@/services/project/ProjectService';
import { getEnabledWizards } from '@/data/wizardDefinitions';
import { WizardLauncher } from '@/components/wizard/WizardLauncher';
import { MarketingWizard, type MarketingPlan } from '@/components/wizard/marketing/MarketingWizard';
import { CreateProjectWizard } from '@/components/wizard/CreateProjectWizard';
import { sequenceService } from '@/services/sequenceService';
import { useStore } from '@/store';
import { logger } from '@/utils/logging';
import { StoryCard } from './StoryCard';
import { StoryDetailView } from './StoryDetailView';
import { CharactersSection } from '@/components/character/CharactersSection';
import { CharacterEditor } from '@/components/character/CharacterEditor';
import { GenerationButtonToolbar } from '@/components/generation-buttons/GenerationButtonToolbar';
import { ProjectResumeSection } from './ProjectResumeSection';
import { useNotifications } from '@/components/NotificationSystem';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { InlineLoading } from '@/components/ui/LoadingFeedback';
import type { Character } from '@/types/character';
import type { GeneratedAsset } from '@/types/generation';
import {
  Film,
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
} from 'lucide-react';
import { SequenceEditModal } from './SequenceEditModal';
import './ProjectDashboardNew.css';

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

  // Marketing Wizard state
  const [showMarketingWizard, setShowMarketingWizard] = useState(false);
  const [marketingPlan, setMarketingPlan] = useState<MarketingPlan | null>(null);

  // Get enabled wizards for dynamic display
  const enabledWizards = useMemo(() => getEnabledWizards(), []);

  // Generate sequences from project shots
  const sequences = useMemo<SequenceData[]>(() => {
    if (!shots || shots.length === 0) {
      return [];
    }

    // Group shots by sequence_id
    const sequenceMap = new Map<string, any[]>();
    shots.forEach(shot => {
      const seqId = (shot as any).sequence_id || 'default';
      if (!sequenceMap.has(seqId)) {
        sequenceMap.set(seqId, []);
      }
      sequenceMap.get(seqId)!.push(shot);
    });


    // Convert to sequence data array
    const sequenceArray: SequenceData[] = [];
    let order = 1;

    for (const [sequenceId, seqShots] of sequenceMap.entries()) {
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

  // Mock recent activity
  const recentActivity = useMemo(() => {
    const activities = [];

    if (project?.metadata?.created_at) {
      const createdDate = new Date(project.metadata.created_at);
      const now = new Date();
      const diffMs = now.getTime() - createdDate.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      let timeStr = 'Just now';
      if (diffDays > 0) {
        timeStr = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      } else if (diffHours > 0) {
        timeStr = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      }

      activities.push({
        id: 1,
        action: 'Project created',
        time: timeStr,
        icon: CheckCircle2,
      });
    }

    activities.push({
      id: 2,
      action: `${sequences.length} sequence${sequences.length !== 1 ? 's' : ''} loaded`,
      time: 'Just now',
      icon: CheckCircle2,
    });

    if (shots && shots.length > 0) {
      activities.push({
        id: 3,
        action: `${shots.length} shot${shots.length !== 1 ? 's' : ''} ready`,
        time: 'Just now',
        icon: CheckCircle2,
      });
    }

    return activities;
  }, [project, sequences.length, shots]);

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
          const sequenceShots = updatedShots.filter((shot: any) =>
            sequence.shot_ids && sequence.shot_ids.includes(shot.id)
          );
          sequenceShots.forEach((shot: any) => {
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
      const associatedShots = shots.filter((shot: any) => shot.sequence_id === sequenceId);

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
      const updatedShots = shots.filter((shot: any) => shot.sequence_id !== sequenceId);
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
          const seqShots = updatedShots.filter((shot: any) => shot.sequence_id === seq.id);
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
        const sequenceShots = shots.filter((shot: any) => shot.sequence_id === updatedSequence.id);
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
    const sequenceShots = shots?.filter((shot: any) => shot.sequence_id === sequence.id) || [];
    const shotIds = sequenceShots.map((shot: any) => shot.id);

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

  // Handle create new story
  const handleCreateNewStory = () => {
    console.log('[ProjectDashboard] handleCreateNewStory called - opening WorldWizard');
    console.log('[ProjectDashboard] Current showWorldWizard state:', showWorldWizard);

    // Close all other wizards first (mutual exclusion)
    const closeActiveWizard = useAppStore.getState().closeActiveWizard;
    closeActiveWizard();

    setShowWorldWizard(true);
    console.log('[ProjectDashboard] setShowWorldWizard(true) called');
  };

  // Handle story card click
  const handleStoryClick = (storyId: string) => {
    setSelectedStoryId(storyId);
  };

  // Handle close story detail view
  const handleCloseStoryDetail = () => {
    setSelectedStoryId(null);
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
          <button className="quick-btn" title="Scenes" aria-label="Scenes - View all scenes">
            <span>Scenes ({shots?.length || 0})</span>
            <Film className="w-4 h-4" aria-hidden="true" />
          </button>
          <button className="quick-btn" title="Characters" aria-label="Characters - View all characters">
            <span>Characters ({project?.characters?.length || 0})</span>
            <Users className="w-4 h-4" aria-hidden="true" />
          </button>
          <button className="quick-btn" title="Assets" aria-label="Assets - View all assets">
            <span>Assets ({project?.assets?.length || 0})</span>
            <FileText className="w-4 h-4" aria-hidden="true" />
          </button>
          <button className="quick-btn" title="Settings" aria-label="Settings - Open settings">
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
          </div>

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

          {/* Plan Sequences */}
          <div className="plan-sequences-section">
            <div className="section-header">
              <h3>Plan Sequences</h3>
              <div className="sequence-controls">
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
        </div>

        {/* Right Column: Recent Activity */}
        <div className="dashboard-right">
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
            characters: project?.characters?.map(c => c.name) || [],
            scenes: shots?.map(s => s.title) || []
          }}
        />
      )}
    </div>
  );
}

