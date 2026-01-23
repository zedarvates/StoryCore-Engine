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

import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import type { Shot } from '@/types';
import { sequencePlanService } from '@/services/sequencePlanService';
import { migrationService } from '@/services/MigrationService';
import { syncManager } from '@/services/SyncManager';
import { useLLMConfig } from '@/services/llmConfigService';
import { buildSystemPrompt } from '@/utils/systemPromptBuilder';
import { projectService } from '@/services/project/ProjectService';
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
} from 'lucide-react';
import { LandingChatBox } from '@/components/launcher/LandingChatBox';
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
  const setShowCharacterWizard = useAppStore((state) => state.setShowCharacterWizard);
  const openSequencePlanWizard = useAppStore((state) => state.openSequencePlanWizard);

  // LLM Configuration
  const { config: llmConfig, service: llmService, isConfigured: isLLMConfigured } = useLLMConfig();

  const [globalResume, setGlobalResume] = useState(
    project?.metadata?.globalResume ||
    "Vidéo d'aventure dans le monde actuel avec une pointe de mystérisme..."
  );
  const [isEditingResume, setIsEditingResume] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [comfyuiStatus, setComfyuiStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [editingSequence, setEditingSequence] = useState<SequenceData | null>(null);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [chatterboxHeight, setChatterboxHeight] = useState<number>(() => {
    // Load saved height from localStorage, default to 400px
    const saved = localStorage.getItem('chatterboxHeight');
    return saved ? parseInt(saved, 10) : 400;
  });
  const showChat = useAppStore((state) => state.showChat);

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

  // Update global resume when project changes
  useEffect(() => {
    const loadGlobalResume = async () => {
      console.log('[ProjectDashboardNew] Loading global resume...', {
        projectPath: project?.metadata?.path,
        hasGlobalResume: !!project?.metadata?.globalResume
      });
      
      if (project?.metadata?.path) {
        try {
          console.log('[ProjectDashboardNew] Calling projectService.getGlobalResume...');
          const resume = await projectService.getGlobalResume(project.metadata.path);
          console.log('[ProjectDashboardNew] Resume loaded:', resume);
          if (resume) {
            setGlobalResume(resume);
          } else if (project.metadata.globalResume) {
            setGlobalResume(project.metadata.globalResume);
          }
        } catch (error) {
          console.error('[ProjectDashboardNew] Failed to load global resume:', error);
          if (project.metadata.globalResume) {
            setGlobalResume(project.metadata.globalResume);
          }
        }
      } else if (project?.metadata?.globalResume) {
        setGlobalResume(project.metadata.globalResume);
      }
    };

    loadGlobalResume();
  }, [project]);

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

  // Check Ollama and ComfyUI status
  useEffect(() => {
    const checkServices = async () => {
      // Check Ollama status
      try {
        const response = await fetch('http://localhost:11434/api/tags', {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        });
        if (response.ok) {
          setOllamaStatus('connected');
        } else {
          console.warn('[ProjectDashboard] Ollama responded with error:', response.status);
          setOllamaStatus('disconnected');
        }
      } catch (error) {
        console.warn('[ProjectDashboard] Ollama connection failed:', error);
        setOllamaStatus('disconnected');
      }

      // Check ComfyUI status using configured server
      try {
        // Import service dynamically to avoid circular dependencies
        const { getComfyUIServersService } = await import('@/services/comfyuiServersService');
        const service = getComfyUIServersService();
        const activeServer = service.getActiveServer();

        if (activeServer) {
          // Use the configured server URL
          const serverUrl = activeServer.serverUrl.replace(/\/$/, ''); // Remove trailing slash

          try {
            const response = await fetch(`${serverUrl}/system_stats`, {
              method: 'GET',
              signal: AbortSignal.timeout(5000),
            });

            if (response.ok) {
              setComfyuiStatus('connected');
            } else {
              console.warn('[ProjectDashboard] ComfyUI responded with error:', response.status);
              setComfyuiStatus('disconnected');
            }
          } catch (fetchError) {
            console.warn('[ProjectDashboard] ComfyUI fetch failed:', fetchError);
            setComfyuiStatus('disconnected');
          }
        } else {
          // No server configured, try default
          try {
            const response = await fetch('http://localhost:8188/system_stats', {
              method: 'GET',
              signal: AbortSignal.timeout(5000),
            });

            if (response.ok) {
              setComfyuiStatus('connected');
            } else {
              console.warn('[ProjectDashboard] Default ComfyUI responded with error:', response.status);
              setComfyuiStatus('disconnected');
            }
          } catch (fetchError) {
            console.warn('[ProjectDashboard] Default ComfyUI fetch failed:', fetchError);
            setComfyuiStatus('disconnected');
          }
        }
      } catch (error) {
        console.error('[ProjectDashboard] ComfyUI status check error:', error);
        setComfyuiStatus('disconnected');
      }
    };

    // Check immediately
    checkServices();

    // Check every 30 seconds
    const interval = setInterval(checkServices, 30000);

    return () => clearInterval(interval);
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
            console.error('[ProjectDashboard] Migration failed:', migrationResult.errors);

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
        console.error('[ProjectDashboard] Auto-migration error:', error);
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
    switch (wizardId) {
      case 'world-building':
        setShowWorldWizard(true);
        break;
      case 'character-creation':
        setShowCharacterWizard(true);
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
      case 'style-transfer':
        openWizard('style-transfer');
        break;
    }
  };

  // Handle force update sequences from JSON files
  const handleForceUpdateSequences = async () => {
    try {
      if (!project?.metadata?.path) {
        alert('Project path not found. Please ensure the project is properly loaded.');
        return;
      }

      const projectPath = project.metadata.path;
      const sequencesDir = `${projectPath}/sequences`;

      // Load sequences from JSON files
      const loadedSequences = await loadSequencesFromFiles(sequencesDir);

      if (loadedSequences.length === 0) {
        alert('Aucune séquence trouvée dans les fichiers JSON.');
        return;
      }

      // Update shots with sequence information
      const updatedShots = [...shots];
      for (const sequence of loadedSequences) {
        // Update shots that belong to this sequence
        if (sequence.shot_ids && Array.isArray(sequence.shot_ids)) {
          const sequenceShots = updatedShots.filter((shot: any) => sequence.shot_ids && sequence.shot_ids.includes(shot.id));
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
          console.warn(`Sequence ${sequence.id} has no shot_ids array`);
        }
      }

      // Update shots in store
      setShots(updatedShots);

      // Force re-render
      setForceUpdate(prev => prev + 1);

      alert(`✅ ${loadedSequences.length} séquence(s) mise(s) à jour depuis les fichiers JSON.`);

    } catch (error) {
      console.error('Failed to force update sequences:', error);
      alert(`Erreur lors de la mise à jour forcée : ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  // Handle adding sequence
  const handleAddSequence = async () => {
    try {
      if (!project?.metadata?.path) {
        alert('Project path not found. Please ensure the project is properly loaded.');
        return;
      }

      const projectPath = project.metadata.path;
      const sequencesDir = `${projectPath}/sequences`;

      // Ensure sequences directory exists
      if (window.electronAPI?.fs?.ensureDir) {
        await window.electronAPI.fs.ensureDir(sequencesDir);
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

      // Update project metadata to trigger refresh
      if (window.electronAPI?.project?.updateMetadata) {
        await window.electronAPI.project.updateMetadata(projectPath, {
          lastSequenceUpdate: new Date().toISOString(),
        });
      }

      ;

    } catch (error) {
      console.error('Failed to create sequence:', error);
      alert(`Failed to create sequence. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handle removing sequence
  const handleRemoveSequence = async (sequenceId: string, e?: React.MouseEvent) => {
    // Stop propagation to prevent opening editor
    if (e) {
      e.stopPropagation();
    }

    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette séquence ?')) {
      return;
    }

    try {
      if (!project?.metadata?.path) {
        alert('Project path not found. Please ensure the project is properly loaded.');
        return;
      }

      const projectPath = project.metadata.path;
      const sequencesDir = `${projectPath}/sequences`;

      // Find the sequence
      const sequence = sequences.find(seq => seq.id === sequenceId);
      if (!sequence) {
        alert('Sequence not found.');
        return;
      }

      // Delete sequence JSON file
      const fileName = `sequence_${sequenceId.padStart(3, '0')}.json`;
      const filePath = `${sequencesDir}/${fileName}`;
      if ((window.electronAPI?.fs as any)?.unlink) {
        await (window.electronAPI.fs as any).unlink(filePath);
      }

      // Find associated shots
      const associatedShots = shots.filter((shot: any) => shot.sequence_id === sequenceId);

      // Delete shot JSON files
      const shotsDir = `${projectPath}/shots`;
      for (const shot of associatedShots) {
        const shotFileName = `shot_${shot.id}.json`;
        const shotFilePath = `${shotsDir}/${shotFileName}`;
        if ((window.electronAPI?.fs as any)?.unlink) {
          await (window.electronAPI.fs as any).unlink(shotFilePath);
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

      ;
    } catch (error) {
      console.error('Failed to delete sequence:', error);
      alert(`Failed to delete sequence. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        alert('Project path not found. Please ensure the project is properly loaded.');
        return;
      }

      const projectPath = project.metadata.path;
      const sequencesDir = `${projectPath}/sequences`;

      // Ensure sequences directory exists
      if (window.electronAPI?.fs?.ensureDir) {
        await window.electronAPI.fs.ensureDir(sequencesDir);
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
      console.error('Failed to save sequence:', error);
      alert(`Failed to save sequence. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Helper function to load sequences from JSON files
  const loadSequencesFromFiles = async (sequencesDir: string): Promise<any[]> => {
    try {
      // Read directory contents
      if (!window.electronAPI?.fs?.readdir) {
        throw new Error('File system API not available');
      }

      const files = await window.electronAPI.fs.readdir(sequencesDir);

      // Filter sequence JSON files
      const sequenceFiles = files.filter((file: string) => file.startsWith('sequence_') && file.endsWith('.json'));

      const loadedSequences: any[] = [];

      for (const fileName of sequenceFiles) {
        try {
          const filePath = `${sequencesDir}/${fileName}`;

          if (!window.electronAPI?.fs?.readFile) {
            continue;
          }

          // Read file content
          const buffer = await window.electronAPI.fs.readFile(filePath);
          const decoder = new TextDecoder();
          const jsonString = decoder.decode(buffer);
          const sequenceData = JSON.parse(jsonString);

          // Ensure shot_ids is an array
          if (!sequenceData.shot_ids || !Array.isArray(sequenceData.shot_ids)) {
            sequenceData.shot_ids = [];
          }

          loadedSequences.push(sequenceData);
        } catch (fileError) {
          console.error(`Failed to load sequence file ${fileName}:`, fileError);
        }
      }

      // Sort by order
      loadedSequences.sort((a, b) => a.order - b.order);

      return loadedSequences;
    } catch (error) {
      console.error('Failed to load sequences from files:', error);
      throw error;
    }
  };

  // Helper function to save sequence to file
  const saveSequenceToFile = async (sequence: SequenceData, sequencesDir: string) => {
    const fileName = `sequence_${sequence.id.padStart(3, '0')}.json`;
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

  // Handle LLM create/improve resume
  const handleCreateResumeWithAI = async () => {
    if (ollamaStatus !== 'connected') {
      alert('L\'assistant IA n\'est pas disponible. Veuillez vérifier qu\'Ollama est en cours d\'exécution.');
      return;
    }

    try {
      // Show loading state
      setIsEditingResume(true);

      // Gather project information for context
      const projectInfo = {
        sequences: sequences.length,
        shots: shots?.length || 0,
        characters: project?.characters?.length || 0,
        worlds: project?.worlds?.length || 0,
        currentResume: globalResume,
        projectName: project?.metadata?.name || 'Projet StoryCore'
      };

      // Build AI prompt for resume generation
      const aiPrompt = `En tant qu'assistant créatif pour StoryCore, générez un résumé global captivant pour ce projet vidéo.

Informations du projet :
- Nom du projet : ${projectInfo.projectName}
- Nombre de séquences : ${projectInfo.sequences}
- Nombre de plans : ${projectInfo.shots}
- Nombre de personnages : ${projectInfo.characters}
- Nombre de mondes : ${projectInfo.worlds}

Résumé actuel : "${projectInfo.currentResume}"

Générez un nouveau résumé global de 300-400 caractères maximum qui :
1. Capture l'essence et l'atmosphère du projet
2. Met en avant les éléments clés (séquences, personnages, mondes)
3. Est engageant et professionnel
4. Utilise un langage cinématographique approprié

Le résumé doit être en français et commencer par une accroche forte.`;

      if (!llmService || !llmConfig) {
        throw new Error('Service LLM non configuré');
      }

      const systemPrompt = buildSystemPrompt('fr');

      // Create LLM request
      const request = {
        prompt: aiPrompt,
        systemPrompt,
        stream: false, // Non-streaming for resume generation
      };

      // Call LLM service
      const response = await llmService.generateCompletion(request, `resume-gen-${Date.now()}`);

      if (response.success && response.data?.content) {
        // Extract and clean the generated resume
        let generatedResume = response.data.content.trim();

        // Remove any markdown formatting or extra text
        generatedResume = generatedResume.replace(/^[""]|[""]$/g, ''); // Remove quotes
        generatedResume = generatedResume.replace(/^\*\*.*?\*\*\s*/g, ''); // Remove bold markdown
        generatedResume = generatedResume.replace(/^#+\s*/gm, ''); // Remove headers

        // Limit to 500 characters
        if (generatedResume.length > 500) {
          generatedResume = generatedResume.substring(0, 497) + '...';
        }

        // Update the resume
        setGlobalResume(generatedResume);

        // Auto-save
        await handleSaveResume();

        alert('✅ Résumé généré avec succès par l\'assistant IA !');
      } else {
        throw new Error(response.error || 'Erreur lors de la génération du résumé');
      }

    } catch (error) {
      console.error('Erreur lors de la génération du résumé IA:', error);
      alert(`Erreur lors de la génération du résumé : ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsEditingResume(false);
    }
  };

  // Handle save resume
  const handleSaveResume = async () => {
    ;
    setIsEditingResume(false);

    // Update project metadata in store
    if (project) {
      const updatedProject = {
        ...project,
        metadata: {
          ...project.metadata,
          globalResume: globalResume,
          updated_at: new Date().toISOString(),
        },
      };

      setProject(updatedProject);

      // Save to file system via ProjectService
      try {
        if (project.metadata?.path) {
          await projectService.updateGlobalResume(project.metadata.path, globalResume);
          ;
        }
      } catch (error) {
        console.error('Failed to save resume to file:', error);
        alert('Erreur lors de la sauvegarde du résumé. Vérifiez la console pour plus de détails.');
      }
    }
  };

  // Handle chatterbox resize
  const handleChatterboxResize = (newHeight: number) => {
    setChatterboxHeight(newHeight);
    localStorage.setItem('chatterboxHeight', newHeight.toString());
  };

  return (
    <div className="project-dashboard-new">
        {/* Top Section: Quick Access (Compact) */}
        <div className="dashboard-header">
        <div className="quick-access-compact">
          <button className="quick-btn" title="Scenes">
            <span>Scenes ({shots?.length || 0})</span>
            <Film className="w-4 h-4" />
          </button>
          <button className="quick-btn" title="Characters">
            <span>Characters ({project?.characters?.length || 0})</span>
            <Users className="w-4 h-4" />
          </button>
          <button className="quick-btn" title="Assets">
            <span>Assets ({project?.assets?.length || 0})</span>
            <FileText className="w-4 h-4" />
          </button>
          <button className="quick-btn" title="Settings">
            <span>Settings</span>
            <Wand2 className="w-4 h-4" />
          </button>
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
           title={`Ollama: ${ollamaStatus === 'connected' ? 'Connecté' : ollamaStatus === 'checking' ? 'Vérification...' : 'Déconnecté'}`}
         >
           <div className={`status-indicator status-ollama ${ollamaStatus === 'connected' ? 'connected' : 'disconnected'}`}></div>
           <span>Ollama</span>
         </div>
         <div
           className="status-item status-service"
           title={`ComfyUI: ${comfyuiStatus === 'connected' ? 'Connecté' : comfyuiStatus === 'checking' ? 'Vérification...' : 'Déconnecté (optionnel)'}`}
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
          {/* Global Resume Section */}
          <div className="global-resume-section">
            <div className="section-header">
              <h2>Globale Resume</h2>
              <span className="char-count">(sur 500 characteres)</span>
              <button
                className="btn-improve"
                onClick={handleCreateResumeWithAI}
                title="Créer le résumé avec l'assistant IA"
                disabled={ollamaStatus !== 'connected'}
              >
                <Sparkles className="w-4 h-4" />
                <span>CRÉER LE RÉSUMÉ AVEC L'ASSISTANT</span>
              </button>
            </div>
            
            {isEditingResume ? (
              <div>
                <textarea
                  className="resume-editor"
                  value={globalResume}
                  onChange={(e) => setGlobalResume(e.target.value)}
                  maxLength={500}
                  autoFocus
                  placeholder="Enter your global resume here..."
                />
                <div className="resume-edit-actions">
                  <button 
                    className="btn-save"
                    onClick={handleSaveResume}
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div 
                className="resume-display"
                onClick={() => setIsEditingResume(true)}
              >
                {globalResume}
              </div>
            )}
          </div>

          {/* Creative Wizards */}
          <div className="creative-wizards-section">
            <h3>Creative Wizards</h3>
            <p className="section-subtitle">Quick access to AI-powered creative tools</p>
            
            <div className="wizards-grid">
              <div className="wizard-card" onClick={() => handleLaunchWizard('world-building')}>
                <Globe className="wizard-icon" />
                <div className="wizard-content">
                  <h4>World Building</h4>
                  <p>Create comprehensive world settings, locations, and lore for your story</p>
                </div>
                <button className="btn-wizard-action">Use</button>
              </div>

              <div className="wizard-card" onClick={() => handleLaunchWizard('character-creation')}>
                <Users className="wizard-icon" />
                <div className="wizard-content">
                  <h4>Character Creation</h4>
                  <p>Design characters with personalities, backgrounds, and visual traits</p>
                </div>
                <button className="btn-wizard-action">Use</button>
              </div>

              <div className="wizard-card" onClick={() => handleLaunchWizard('scene-generator')}>
                <Film className="wizard-icon" />
                <div className="wizard-content">
                  <h4>Scene Generator</h4>
                  <p>Generate complete scenes with AI assistance</p>
                </div>
                <button className="btn-wizard-action">Use</button>
              </div>

              <div className="wizard-card" onClick={() => handleLaunchWizard('dialogue-writer')}>
                <MessageSquare className="wizard-icon" />
                <div className="wizard-content">
                  <h4>Dialogue Writer</h4>
                  <p>Create natural dialogue aligned with character personalities</p>
                </div>
                <button className="btn-wizard-action">Use</button>
              </div>

              <div className="wizard-card" onClick={() => handleLaunchWizard('storyboard-creator')}>
                <FileText className="wizard-icon" />
                <div className="wizard-content">
                  <h4>Storyboard Creator</h4>
                  <p>Transform scripts into visual storyboards</p>
                </div>
                <button className="btn-wizard-action">Use</button>
              </div>

              <div className="wizard-card" onClick={() => handleLaunchWizard('style-transfer')}>
                <Wand2 className="wizard-icon" />
                <div className="wizard-content">
                  <h4>Style Transfer</h4>
                  <p>Apply artistic styles to your project</p>
                </div>
                <button className="btn-wizard-action">Use</button>
              </div>
            </div>
          </div>

          {/* Plan Sequences */}
          <div className="plan-sequences-section">
            <div className="section-header">
              <h3>Plan Sequences</h3>
              <div className="sequence-controls">
                <button
                  className="btn-sequence-control refresh"
                  onClick={handleForceUpdateSequences}
                  title="Forcer la mise à jour des séquences depuis les fichiers JSON"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Actualiser</span>
                </button>
                <button
                  className="btn-sequence-control new-plan"
                  onClick={handleNewPlan}
                  title="Nouveau plan"
                >
                  <FileText className="w-4 h-4" />
                  <span>Nouveau plan</span>
                </button>
                <button
                  className="btn-sequence-control add"
                  onClick={handleAddSequence}
                  title="Ajouter une séquence"
                >
                  <Plus className="w-4 h-4" />
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
                      <span>Ordre: #{seq.order}</span>
                      <span>Durée: {seq.duration}s</span>
                      <span>Plans: {seq.shots}</span>
                    </div>
                    <div className="sequence-resume">
                      <strong>Resume:</strong> {seq.resume}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chatterbox Assistant LLM - Reusing LandingChatBox */}
          {showChat && (
            <div className="chatterbox-section">
              <div className="chatterbox-header">
                <h3>Chatterbox Assistant LLM</h3>
                <p className="chatterbox-subtitle">
                  Ask questions about your project, request modifications, or get help
                </p>
                <p className="chatterbox-subtitle text-xs text-gray-400 mt-1">
                  Available wizards: World Building, Character Creation, Scene Generator
                </p>
              </div>
              <div className="chatterboxcontainer resizable">
                <LandingChatBox
                  placeholder="Ask for modifications, ask questions about your project..."
                  height={chatterboxHeight}
                />
                <div className="chatterboxresizehandle">
                  <div className="resizegrip"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const startY = e.clientY;
                      const startHeight = chatterboxHeight;

                      const handleMouseMove = (moveEvent: MouseEvent) => {
                        const newHeight = Math.max(200, startHeight + (moveEvent.clientY - startY));
                        handleChatterboxResize(newHeight);
                      };

                      const handleMouseUp = () => {
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };

                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                    title="Resize Chatterbox"
                  >
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="chatterbox-section">
            <div className="chatterbox-header">
              <h3>Chatterbox Assistant LLM</h3>
              <p className="chatterbox-subtitle">
                Ask questions about your project, request modifications, or get help
              </p>
              <p className="chatterbox-subtitle text-xs text-gray-400 mt-1">
                Available wizards: World Building, Character Creation, Scene Generator
              </p>
            </div>
            <div className="chatterboxcontainer resizable">
              <LandingChatBox
                placeholder="Ask for modifications, ask questions about your project..."
                height={chatterboxHeight}
              />
              <div className="chatterboxresizehandle">
                <div className="resizegrip"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const startY = e.clientY;
                    const startHeight = chatterboxHeight;

                    const handleMouseMove = (moveEvent: MouseEvent) => {
                      const newHeight = Math.max(200, startHeight + (moveEvent.clientY - startY));
                      handleChatterboxResize(newHeight);
                    };

                    const handleMouseUp = () => {
                      document.removeEventListener('mousemove', handleMouseMove);
                      document.removeEventListener('mouseup', handleMouseUp);
                    };

                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                  }}
                  title="Resize Chatterbox"
                >
                </div>
              </div>
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
    </div>
  );
}
