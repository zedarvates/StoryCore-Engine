/**
 * Generation Store - Zustand store for generation-buttons-ui feature
 * 
 * This store manages:
 * - Pipeline state (currentPipeline, stages)
 * - Queue management (tasks, activeTask)
 * - History tracking (delegated to GenerationHistoryService)
 * - Asset associations (relatedAssets graph)
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import { create } from 'zustand';
import { generationHistoryService } from '../services/GenerationHistoryService';
import { PipelineStateMachine } from '../services/PipelineStateMachine';
import type { PipelineStage } from '../services/PipelineStateMachine';
import type {
  GenerationPipelineState,
  GenerationQueue,
  GenerationTask,
  GeneratedAsset,
  GeneratedPrompt,
  GenerationHistory,
  HistoryEntry,
  StageState,
  GenerationProgress,
  BatchGenerationConfig,
  BatchGenerationTask,
  BatchGenerationState,
} from '../types/generation';

/**
 * Asset graph for tracking relationships
 */
interface AssetGraph {
  nodes: Map<string, GeneratedAsset>;
  edges: Map<string, string[]>; // assetId -> [relatedAssetIds]
}

/**
 * Generation store state interface
 */
interface GenerationStore {
  // Pipeline state
  currentPipeline: GenerationPipelineState | null;
  
  // Queue management
  queue: GenerationQueue;
  
  // Batch generation state
  batchConfig: BatchGenerationConfig;
  activeBatch: BatchGenerationState | null;
  batchHistory: BatchGenerationState[];
  
  // History (delegated to GenerationHistoryService)
  // Use generationHistoryService for history operations
  
  // Asset graph
  assetGraph: AssetGraph;
  
  // Actions - Pipeline Management
  startPipeline: () => string;
  completeStage: (stage: 'prompt' | 'image' | 'video' | 'audio', result: GeneratedPrompt | GeneratedAsset) => void;
  failStage: (stage: 'prompt' | 'image' | 'video' | 'audio', error: string) => void;
  skipStage: (stage: 'prompt' | 'image' | 'video' | 'audio') => void;
  updateStageProgress: (stage: 'prompt' | 'image' | 'video' | 'audio', progress: GenerationProgress) => void;
  resetPipeline: () => void;
  
  // Actions - Pipeline State Machine
  progressToNextStage: () => void;
  restartFromStage: (stage: PipelineStage) => void;
  getAvailableActions: () => ReturnType<typeof PipelineStateMachine.getAvailableActions>;
  getPipelineProgress: () => number;
  getAllPipelineAssets: () => ReturnType<typeof PipelineStateMachine.getAllAssets>;
  
  // Actions - Queue Management
  addToQueue: (task: Omit<GenerationTask, 'id' | 'createdAt' | 'status' | 'progress'>) => string;
  removeFromQueue: (taskId: string) => void;
  updateTaskStatus: (taskId: string, status: GenerationTask['status']) => void;
  updateTaskProgress: (taskId: string, progress: GenerationProgress) => void;
  completeTask: (taskId: string, result: GeneratedAsset) => void;
  failTask: (taskId: string, error: string) => void;
  cancelTask: (taskId: string) => void;
  clearQueue: () => void;
  reorderQueue: (taskId: string, newIndex: number) => void;
  
  // Actions - Batch Generation Management
  setBatchConfig: (config: Partial<BatchGenerationConfig>) => void;
  startBatch: (type: 'image' | 'video' | 'audio', baseParams: Record<string, unknown>) => string;
  cancelBatch: (batchId: string) => void;
  updateBatchTaskStatus: (batchId: string, taskId: string, status: BatchGenerationTask['status']) => void;
  completeBatchTask: (batchId: string, taskId: string, result: GeneratedAsset) => void;
  failBatchTask: (batchId: string, taskId: string, error: string) => void;
  markAsFavorite: (batchId: string, assetId: string) => void;
  markAsDiscarded: (batchId: string, assetId: string) => void;
  clearBatchSelections: (batchId: string) => void;
  
  // Actions - History Management (delegated to service)
  // Use generationHistoryService.logGeneration() instead of addToHistory()
  // Use generationHistoryService.queryHistory() instead of getHistoryByType()
  // Use generationHistoryService.getEntriesByPipelineId() instead of getHistoryByPipeline()
  
  // Actions - Asset Graph Management
  linkAssets: (sourceId: string, targetId: string) => void;
  getRelatedAssets: (assetId: string) => GeneratedAsset[];
  addAssetToGraph: (asset: GeneratedAsset) => void;
  removeAssetFromGraph: (assetId: string) => void;
}

/**
 * Create initial stage state
 */
const createInitialStageState = <T>(): StageState<T> => ({
  status: 'pending',
  attempts: 0,
});

/**
 * Create initial pipeline state
 */
const createInitialPipeline = (): GenerationPipelineState => {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    currentStage: 'prompt',
    stages: {
      prompt: createInitialStageState<GeneratedPrompt>(),
      image: createInitialStageState<GeneratedAsset>(),
      video: createInitialStageState<GeneratedAsset>(),
      audio: createInitialStageState<GeneratedAsset>(),
    },
    createdAt: now,
    updatedAt: now,
  };
};

/**
 * Create generation store with Zustand
 */
export const useGenerationStore = create<GenerationStore>((set, get) => ({
  // Initial state
  currentPipeline: null,
  queue: {
    tasks: [],
    activeTask: null,
    maxConcurrent: 1,
  },
  batchConfig: {
    enabled: false,
    batchSize: 4,
    variationParams: {
      varySeeds: true,
      varyPrompts: false,
      varyParameters: false,
    },
  },
  activeBatch: null,
  batchHistory: [],
  assetGraph: {
    nodes: new Map(),
    edges: new Map(),
  },

  // ============================================================================
  // Pipeline Management Actions
  // ============================================================================

  startPipeline: () => {
    const pipeline = createInitialPipeline();
    set({ currentPipeline: pipeline });
    return pipeline.id;
  },

  completeStage: (stage, result) => {
    const state = get();
    if (!state.currentPipeline) return;

    const updatedPipeline = { ...state.currentPipeline };
    // Use type assertion to handle the union type assignment
    (updatedPipeline.stages[stage] as StageState<GeneratedPrompt | GeneratedAsset>) = {
      status: 'completed',
      result: result,
      attempts: updatedPipeline.stages[stage].attempts + 1,
    };

    // Determine next stage
    const stageOrder: Array<'prompt' | 'image' | 'video' | 'audio'> = ['prompt', 'image', 'video', 'audio'];
    const currentIndex = stageOrder.indexOf(stage);
    const nextStage = currentIndex < stageOrder.length - 1 ? stageOrder[currentIndex + 1] : 'complete';

    updatedPipeline.currentStage = nextStage as GenerationPipelineState['currentStage'];
    updatedPipeline.updatedAt = Date.now();

    set({ currentPipeline: updatedPipeline });

    // Add to history if result is an asset (using GenerationHistoryService)
    if ('url' in result) {
      generationHistoryService.logGeneration(
        updatedPipeline.id,
        stage as 'image' | 'video' | 'audio',
        result.metadata.generationParams,
        result as GeneratedAsset
      );

      // Add to asset graph
      get().addAssetToGraph(result as GeneratedAsset);
    }
  },

  failStage: (stage, error) => {
    const state = get();
    if (!state.currentPipeline) return;

    const updatedPipeline = { ...state.currentPipeline };
    (updatedPipeline.stages[stage] as StageState<GeneratedPrompt | GeneratedAsset>) = {
      ...updatedPipeline.stages[stage],
      status: 'failed',
      error,
      attempts: updatedPipeline.stages[stage].attempts + 1,
    };
    updatedPipeline.updatedAt = Date.now();

    set({ currentPipeline: updatedPipeline });
  },

  skipStage: (stage) => {
    const state = get();
    if (!state.currentPipeline) return;

    const updatedPipeline = { ...state.currentPipeline };
    (updatedPipeline.stages[stage] as StageState<GeneratedPrompt | GeneratedAsset>) = {
      ...updatedPipeline.stages[stage],
      status: 'skipped',
    };

    // Determine next stage
    const stageOrder: Array<'prompt' | 'image' | 'video' | 'audio'> = ['prompt', 'image', 'video', 'audio'];
    const currentIndex = stageOrder.indexOf(stage);
    const nextStage = currentIndex < stageOrder.length - 1 ? stageOrder[currentIndex + 1] : 'complete';

    updatedPipeline.currentStage = nextStage as GenerationPipelineState['currentStage'];
    updatedPipeline.updatedAt = Date.now();

    set({ currentPipeline: updatedPipeline });
  },

  updateStageProgress: (stage, progress) => {
    const state = get();
    if (!state.currentPipeline) return;

    const updatedPipeline = { ...state.currentPipeline };
    (updatedPipeline.stages[stage] as StageState<GeneratedPrompt | GeneratedAsset>) = {
      ...updatedPipeline.stages[stage],
      status: 'in_progress',
      progress,
    };
    updatedPipeline.updatedAt = Date.now();

    set({ currentPipeline: updatedPipeline });
  },

  resetPipeline: () => {
    set({ currentPipeline: null });
  },

  // ============================================================================
  // Pipeline State Machine Actions
  // ============================================================================

  progressToNextStage: () => {
    const state = get();
    if (!state.currentPipeline) return;

    const nextStage = PipelineStateMachine.getNextStage(state.currentPipeline.currentStage);
    if (!nextStage) return;

    const updatedPipeline = { ...state.currentPipeline };
    updatedPipeline.currentStage = nextStage;
    updatedPipeline.updatedAt = Date.now();

    set({ currentPipeline: updatedPipeline });
  },

  restartFromStage: (stage) => {
    const state = get();
    if (!state.currentPipeline) return;

    if (!PipelineStateMachine.canRestartFromStage(state.currentPipeline, stage)) {
      throw new Error(`Cannot restart from stage: ${stage}`);
    }

    const { clearSubsequent } = PipelineStateMachine.getRestartStage(state.currentPipeline, stage);
    const updatedPipeline = { ...state.currentPipeline };

    // Reset the target stage
    updatedPipeline.currentStage = stage;
    updatedPipeline.stages[stage as keyof typeof updatedPipeline.stages] = {
      status: 'pending',
      attempts: 0,
    };

    // Clear subsequent stages if needed
    if (clearSubsequent) {
      const allStages = PipelineStateMachine.getAllStages();
      const stageIndex = allStages.indexOf(stage);
      
      for (let i = stageIndex + 1; i < allStages.length; i++) {
        const stageToReset = allStages[i];
        if (stageToReset !== 'complete') {
          updatedPipeline.stages[stageToReset as keyof typeof updatedPipeline.stages] = {
            status: 'pending',
            attempts: 0,
          };
        }
      }
    }

    updatedPipeline.updatedAt = Date.now();
    set({ currentPipeline: updatedPipeline });
  },

  getAvailableActions: () => {
    const state = get();
    if (!state.currentPipeline) {
      return {
        canProgress: false,
        canSkip: false,
        canRestart: false,
        restartableStages: [],
      };
    }

    return PipelineStateMachine.getAvailableActions(state.currentPipeline);
  },

  getPipelineProgress: () => {
    const state = get();
    if (!state.currentPipeline) return 0;
    return PipelineStateMachine.calculateProgress(state.currentPipeline);
  },

  getAllPipelineAssets: () => {
    const state = get();
    if (!state.currentPipeline) {
      return {
        prompt: undefined,
        image: undefined,
        video: undefined,
        audio: undefined,
      };
    }

    return PipelineStateMachine.getAllAssets(state.currentPipeline);
  },

  // ============================================================================
  // Queue Management Actions
  // ============================================================================

  addToQueue: (taskData) => {
    const task: GenerationTask = {
      ...taskData,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      status: 'queued',
      progress: {
        stage: '',
        stageProgress: 0,
        overallProgress: 0,
        estimatedTimeRemaining: 0,
        message: 'Queued',
        cancellable: true,
      },
    };

    const state = get();
    set({
      queue: {
        ...state.queue,
        tasks: [...state.queue.tasks, task],
      },
    });

    return task.id;
  },

  removeFromQueue: (taskId) => {
    const state = get();
    set({
      queue: {
        ...state.queue,
        tasks: state.queue.tasks.filter(t => t.id !== taskId),
        activeTask: state.queue.activeTask === taskId ? null : state.queue.activeTask,
      },
    });
  },

  updateTaskStatus: (taskId, status) => {
    const state = get();
    const updatedTasks = state.queue.tasks.map(t =>
      t.id === taskId ? { ...t, status } : t
    );
    const activeTask = status === 'running' ? taskId : state.queue.activeTask;

    set({
      queue: {
        ...state.queue,
        tasks: updatedTasks,
        activeTask,
      },
    });
  },

  updateTaskProgress: (taskId, progress) => {
    const state = get();
    const updatedTasks = state.queue.tasks.map(t =>
      t.id === taskId ? { ...t, progress } : t
    );

    set({
      queue: {
        ...state.queue,
        tasks: updatedTasks,
      },
    });
  },

  completeTask: (taskId, result) => {
    const state = get();
    const updatedTasks = state.queue.tasks.map(t =>
      t.id === taskId
        ? { ...t, status: 'completed' as const, result, completedAt: Date.now() }
        : t
    );
    const activeTask = state.queue.activeTask === taskId ? null : state.queue.activeTask;

    set({
      queue: {
        ...state.queue,
        tasks: updatedTasks,
        activeTask,
      },
    });
  },

  failTask: (taskId, error) => {
    const state = get();
    const updatedTasks = state.queue.tasks.map(t =>
      t.id === taskId
        ? { ...t, status: 'failed' as const, error, completedAt: Date.now() }
        : t
    );
    const activeTask = state.queue.activeTask === taskId ? null : state.queue.activeTask;

    set({
      queue: {
        ...state.queue,
        tasks: updatedTasks,
        activeTask,
      },
    });
  },

  cancelTask: (taskId) => {
    const state = get();
    const updatedTasks = state.queue.tasks.map(t =>
      t.id === taskId
        ? { ...t, status: 'cancelled' as const, completedAt: Date.now() }
        : t
    );
    const activeTask = state.queue.activeTask === taskId ? null : state.queue.activeTask;

    set({
      queue: {
        ...state.queue,
        tasks: updatedTasks,
        activeTask,
      },
    });
  },

  clearQueue: () => {
    const state = get();
    set({
      queue: {
        ...state.queue,
        tasks: [],
        activeTask: null,
      },
    });
  },

  reorderQueue: (taskId, newIndex) => {
    const state = get();
    const tasks = [...state.queue.tasks];
    const currentIndex = tasks.findIndex(t => t.id === taskId);
    
    if (currentIndex === -1 || newIndex < 0 || newIndex >= tasks.length) {
      return;
    }

    const [task] = tasks.splice(currentIndex, 1);
    tasks.splice(newIndex, 0, task);

    set({
      queue: {
        ...state.queue,
        tasks,
      },
    });
  },

  // ============================================================================
  // Batch Generation Management Actions
  // ============================================================================

  setBatchConfig: (config) => {
    const state = get();
    set({
      batchConfig: {
        ...state.batchConfig,
        ...config,
      },
    });
  },

  startBatch: (type, baseParams) => {
    const state = get();
    const { batchConfig } = state;
    
    if (!batchConfig.enabled) {
      throw new Error('Batch generation is not enabled');
    }

    const batchId = crypto.randomUUID();
    const tasks: BatchGenerationTask[] = [];

    // Generate tasks based on batch configuration
    for (let i = 0; i < batchConfig.batchSize; i++) {
      const params = { ...baseParams };

      // Apply variations
      if (batchConfig.variationParams.varySeeds) {
        const seedRange = batchConfig.variationParams.seedRange || [0, 999999];
        params.seed = Math.floor(Math.random() * (seedRange[1] - seedRange[0] + 1)) + seedRange[0];
      }

      if (batchConfig.variationParams.varyPrompts && batchConfig.variationParams.promptVariations) {
        const variations = batchConfig.variationParams.promptVariations;
        params.prompt = variations[i % variations.length];
      }

      if (batchConfig.variationParams.varyParameters && batchConfig.variationParams.parameterRanges) {
        Object.entries(batchConfig.variationParams.parameterRanges).forEach(([key, [min, max]]) => {
          params[key] = Math.random() * (max - min) + min;
        });
      }

      tasks.push({
        id: crypto.randomUUID(),
        batchId,
        type,
        params,
        priority: 1,
        status: 'queued',
        progress: {
          stage: '',
          stageProgress: 0,
          overallProgress: 0,
          estimatedTimeRemaining: 0,
          message: 'Queued',
          cancellable: true,
        },
        createdAt: Date.now(),
        batchIndex: i,
      });
    }

    const batch: BatchGenerationState = {
      id: batchId,
      config: batchConfig,
      tasks,
      status: 'pending',
      completedCount: 0,
      failedCount: 0,
      results: [],
      favorites: new Set(),
      discarded: new Set(),
      createdAt: Date.now(),
    };

    set({ activeBatch: batch });
    return batchId;
  },

  cancelBatch: (batchId) => {
    const state = get();
    
    if (state.activeBatch?.id === batchId) {
      const cancelledBatch: BatchGenerationState = {
        ...state.activeBatch,
        status: 'cancelled',
        completedAt: Date.now(),
        tasks: state.activeBatch.tasks.map(t => 
          t.status === 'queued' || t.status === 'running'
            ? { ...t, status: 'cancelled' as const }
            : t
        ),
      };

      set({
        activeBatch: null,
        batchHistory: [...state.batchHistory, cancelledBatch],
      });
    }
  },

  updateBatchTaskStatus: (batchId, taskId, status) => {
    const state = get();
    
    if (state.activeBatch?.id !== batchId) return;

    const updatedTasks = state.activeBatch.tasks.map(t =>
      t.id === taskId ? { ...t, status, startedAt: status === 'running' ? Date.now() : t.startedAt } : t
    );

    set({
      activeBatch: {
        ...state.activeBatch,
        tasks: updatedTasks,
        status: updatedTasks.some(t => t.status === 'running') ? 'running' : state.activeBatch.status,
      },
    });
  },

  completeBatchTask: (batchId, taskId, result) => {
    const state = get();
    
    if (state.activeBatch?.id !== batchId) return;

    const updatedTasks = state.activeBatch.tasks.map(t =>
      t.id === taskId
        ? { ...t, status: 'completed' as const, result, completedAt: Date.now() }
        : t
    );

    const completedCount = updatedTasks.filter(t => t.status === 'completed').length;
    const failedCount = updatedTasks.filter(t => t.status === 'failed').length;
    const allDone = updatedTasks.every(t => 
      t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled'
    );

    const updatedBatch: BatchGenerationState = {
      ...state.activeBatch,
      tasks: updatedTasks,
      completedCount,
      failedCount,
      results: [...state.activeBatch.results, result],
      status: allDone ? 'completed' : 'running',
      completedAt: allDone ? Date.now() : undefined,
    };

    // Add result to asset graph
    get().addAssetToGraph(result);

    // If batch is complete, move to history
    if (allDone) {
      set({
        activeBatch: null,
        batchHistory: [...state.batchHistory, updatedBatch],
      });
    } else {
      set({ activeBatch: updatedBatch });
    }
  },

  failBatchTask: (batchId, taskId, error) => {
    const state = get();
    
    if (state.activeBatch?.id !== batchId) return;

    const updatedTasks = state.activeBatch.tasks.map(t =>
      t.id === taskId
        ? { ...t, status: 'failed' as const, error, completedAt: Date.now() }
        : t
    );

    const completedCount = updatedTasks.filter(t => t.status === 'completed').length;
    const failedCount = updatedTasks.filter(t => t.status === 'failed').length;
    const allDone = updatedTasks.every(t => 
      t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled'
    );

    const updatedBatch: BatchGenerationState = {
      ...state.activeBatch,
      tasks: updatedTasks,
      completedCount,
      failedCount,
      status: allDone ? (completedCount > 0 ? 'completed' : 'failed') : 'running',
      completedAt: allDone ? Date.now() : undefined,
    };

    // If batch is complete, move to history
    if (allDone) {
      set({
        activeBatch: null,
        batchHistory: [...state.batchHistory, updatedBatch],
      });
    } else {
      set({ activeBatch: updatedBatch });
    }
  },

  markAsFavorite: (batchId, assetId) => {
    const state = get();
    
    if (state.activeBatch?.id === batchId) {
      const favorites = new Set(state.activeBatch.favorites);
      const discarded = new Set(state.activeBatch.discarded);
      
      favorites.add(assetId);
      discarded.delete(assetId); // Remove from discarded if present

      set({
        activeBatch: {
          ...state.activeBatch,
          favorites,
          discarded,
        },
      });
    } else {
      // Check batch history
      const batchIndex = state.batchHistory.findIndex(b => b.id === batchId);
      if (batchIndex !== -1) {
        const updatedHistory = [...state.batchHistory];
        const batch = updatedHistory[batchIndex];
        const favorites = new Set(batch.favorites);
        const discarded = new Set(batch.discarded);
        
        favorites.add(assetId);
        discarded.delete(assetId);

        updatedHistory[batchIndex] = {
          ...batch,
          favorites,
          discarded,
        };

        set({ batchHistory: updatedHistory });
      }
    }
  },

  markAsDiscarded: (batchId, assetId) => {
    const state = get();
    
    if (state.activeBatch?.id === batchId) {
      const favorites = new Set(state.activeBatch.favorites);
      const discarded = new Set(state.activeBatch.discarded);
      
      discarded.add(assetId);
      favorites.delete(assetId); // Remove from favorites if present

      set({
        activeBatch: {
          ...state.activeBatch,
          favorites,
          discarded,
        },
      });
    } else {
      // Check batch history
      const batchIndex = state.batchHistory.findIndex(b => b.id === batchId);
      if (batchIndex !== -1) {
        const updatedHistory = [...state.batchHistory];
        const batch = updatedHistory[batchIndex];
        const favorites = new Set(batch.favorites);
        const discarded = new Set(batch.discarded);
        
        discarded.add(assetId);
        favorites.delete(assetId);

        updatedHistory[batchIndex] = {
          ...batch,
          favorites,
          discarded,
        };

        set({ batchHistory: updatedHistory });
      }
    }
  },

  clearBatchSelections: (batchId) => {
    const state = get();
    
    if (state.activeBatch?.id === batchId) {
      set({
        activeBatch: {
          ...state.activeBatch,
          favorites: new Set(),
          discarded: new Set(),
        },
      });
    } else {
      // Check batch history
      const batchIndex = state.batchHistory.findIndex(b => b.id === batchId);
      if (batchIndex !== -1) {
        const updatedHistory = [...state.batchHistory];
        updatedHistory[batchIndex] = {
          ...updatedHistory[batchIndex],
          favorites: new Set(),
          discarded: new Set(),
        };

        set({ batchHistory: updatedHistory });
      }
    }
  },

  // ============================================================================
  // Asset Graph Management Actions
  // ============================================================================

  linkAssets: (sourceId, targetId) => {
    const state = get();
    const edges = new Map(state.assetGraph.edges);
    const existing = edges.get(sourceId) || [];
    
    if (!existing.includes(targetId)) {
      edges.set(sourceId, [...existing, targetId]);
    }

    set({
      assetGraph: {
        ...state.assetGraph,
        edges,
      },
    });
  },

  getRelatedAssets: (assetId) => {
    const { assetGraph } = get();
    const relatedIds = assetGraph.edges.get(assetId) || [];
    return relatedIds
      .map(id => assetGraph.nodes.get(id))
      .filter((asset): asset is GeneratedAsset => asset !== undefined);
  },

  addAssetToGraph: (asset) => {
    const state = get();
    const nodes = new Map(state.assetGraph.nodes);
    nodes.set(asset.id, asset);

    set({
      assetGraph: {
        ...state.assetGraph,
        nodes,
      },
    });
  },

  removeAssetFromGraph: (assetId) => {
    const state = get();
    const nodes = new Map(state.assetGraph.nodes);
    const edges = new Map(state.assetGraph.edges);
    
    nodes.delete(assetId);
    edges.delete(assetId);
    
    // Remove from other assets' edges
    edges.forEach((targets, sourceId) => {
      const filtered = targets.filter(id => id !== assetId);
      if (filtered.length !== targets.length) {
        edges.set(sourceId, filtered);
      }
    });

    set({
      assetGraph: {
        nodes,
        edges,
      },
    });
  },
}));

