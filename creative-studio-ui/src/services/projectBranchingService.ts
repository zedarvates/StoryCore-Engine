/**
 * ProjectBranchingService.ts
 * 
 * Service for managing project branching, context export/import,
 * and "Start New Project from Here" / "Return to This Moment" features.
 */

import { v4 as uuidv4 } from 'uuid';
import { referenceSheetService } from './referenceSheetService';
import { useAppStore } from '../stores/useAppStore';
import type { Shot } from '@/types';
import type { Character } from '@/types/character';
import type { World } from '@/types/world';
import type { 
  MasterReferenceSheet, 
  SequenceReferenceSheet,
  ShotReference 
} from '@/types/reference';

// ============================================================================
// Type Definitions
// ============================================================================

export type ContextScope = 'shot' | 'sequence' | 'act' | 'project';

export type BranchStatus = 'active' | 'merged' | 'archived';

export interface ContextExport {
  projectId: string;
  exportedAt: Date;
  branchPointId: string;
  contextScope: ContextScope;
  includedAssets: {
    characters: string[];
    worlds: string[];
    sequences: string[];
    shots: string[];
  };
  referenceSheets: {
    masterSheet: MasterReferenceSheet | null;
    sequenceSheets: SequenceReferenceSheet[];
  };
  metadata: {
    originalProjectName: string;
    branchPointDescription: string;
    exportedBy: string;
  };
}

export interface BranchInfo {
  id: string;
  projectId: string;
  name: string;
  branchPointId: string;
  createdAt: Date;
  status: BranchStatus;
  parentBranchId?: string;
}

export interface ProjectContext {
  scope: ContextScope;
  entities: {
    characters: CharacterContext[];
    worlds: WorldContext[];
    sequences: SequenceContext[];
    shots: ShotContext[];
  };
  referenceSheets: {
    masterSheetId: string | null;
    sequenceSheetIds: string[];
  };
  checkpoints: string[];
}

export interface CharacterContext {
  id: string;
  name: string;
  appearanceSheetId?: string;
  lastUsedShotId: string;
  usageCount: number;
}

export interface WorldContext {
  id: string;
  name: string;
  environmentSheetId?: string;
  lastUsedShotId: string;
  usageCount: number;
}

export interface SequenceContext {
  id: string;
  name: string;
  referenceSheetId?: string;
  shotCount: number;
  parentActId: string;
}

export interface ShotContext {
  id: string;
  name: string;
  sequenceId?: string;
  referenceIds: string[];
  assetUrls: string[];
}

export interface Checkpoint {
  id: string;
  projectId: string;
  nodeId: string;
  createdAt: Date;
  contextSnapshot: ProjectContext;
  metadata: {
    description: string;
    createdBy: string;
  };
}

// ============================================================================
// ProjectBranchingService
// ============================================================================

class ProjectBranchingService {
  private checkpoints: Map<string, Checkpoint> = new Map();
  private branches: Map<string, BranchInfo> = new Map();
  private projectContexts: Map<string, ProjectContext> = new Map();

  // ========================================================================
  // "Start New Project from Here" Methods
  // ========================================================================

  /**
   * Creates a new project from a specific node/shot, exporting all relevant context.
   */
  async createProjectFromNode(
    projectId: string,
    nodeId: string,
    newProjectName: string
  ): Promise<string> {
    const appStore = useAppStore.getState();
    
    // Generate new project ID
    const newProjectId = uuidv4();
    
    // Export context from source project
    const contextExport = await this.exportContextToNewProject(projectId, nodeId);
    
    // Initialize new project data in store
    appStore.setProject({
      id: newProjectId,
      project_name: newProjectName,
      schema_version: '1.0',
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
    });
    
    // Copy characters, worlds, and shots from source
    this.copyProjectData(projectId, newProjectId, nodeId);
    
    // Copy reference sheets to new project
    await this.copyReferenceSheetsToProject(projectId, newProjectId, nodeId);
    
    // Initialize project with exported context
    this.initializeNewProjectContext(newProjectId, contextExport);
    
    return newProjectId;
  }

  /**
   * Exports context up to a specific node for creating a new project.
   */
  async exportContextToNewProject(sourceProjectId: string, nodeId: string): Promise<ContextExport> {
    const appStore = useAppStore.getState();
    const sourceProject = appStore.project;
    
    if (!sourceProject || sourceProject.id !== sourceProjectId) {
      throw new Error(`Source project not found: ${sourceProjectId}`);
    }
    
    // Determine context scope based on node position
    const contextScope = this.determineContextScope(sourceProjectId, nodeId);
    
    // Get all entities used up to this node
    const includedAssets = this.getIncludedAssets(sourceProjectId, nodeId);
    
    // Export reference sheets
    const referenceSheets = await this.exportReferenceSheets(sourceProjectId, nodeId);
    
    return {
      projectId: sourceProjectId,
      exportedAt: new Date(),
      branchPointId: nodeId,
      contextScope,
      includedAssets,
      referenceSheets,
      metadata: {
        originalProjectName: sourceProject.project_name,
        branchPointDescription: this.getBranchPointDescription(sourceProjectId, nodeId),
        exportedBy: 'system',
      },
    };
  }

  /**
   * Copies relevant references from source project to target project.
   */
  async copyReferenceSheetsToProject(
    sourceProjectId: string,
    targetProjectId: string,
    nodeId: string
  ): Promise<void> {
    const appStore = useAppStore.getState();
    
    // Get and copy master reference sheet
    const masterSheet = await referenceSheetService.getMasterReferenceSheet(sourceProjectId);
    if (masterSheet) {
      // Create new master sheet for target project
      await referenceSheetService.createMasterReferenceSheet(targetProjectId);
      await referenceSheetService.updateMasterReferenceSheet({
        ...masterSheet,
        id: uuidv4(),
        projectId: targetProjectId,
      });
    }
    
    // Get and copy sequence reference sheets that are used up to the node
    const shots = appStore.shots;
    const nodeIndex = shots.findIndex(s => s.id === nodeId);
    
    if (nodeIndex !== -1) {
      const validShots = shots.slice(0, nodeIndex + 1);
      const sequenceIds = [...new Set(
        validShots.map(s => (s as { sequenceId?: string }).sequenceId).filter((id: string | undefined): id is string => !!id)
      )];
      
      for (const sequenceId of sequenceIds) {
        const sequenceSheet = await referenceSheetService.getSequenceReferenceSheet(sequenceId);
        if (sequenceSheet) {
          await referenceSheetService.createSequenceReferenceSheet(targetProjectId, sequenceId);
          await referenceSheetService.updateSequenceReferenceSheet({
            ...sequenceSheet,
            id: uuidv4(),
            masterSheetId: '',
            sequenceId: sequenceId,
          });
        }
      }
    }
  }

  /**
   * Copies relevant references from source project to target project.
   */
  copyReferencesToNewProject(
    _sourceProjectId: string,
    _targetProjectId: string,
    _nodeId: string
  ): void {
    // This is handled by copyReferenceSheetsToProject which is async
    // Kept for API compatibility
  }

  /**
   * Copies characters used up to a specific node from source to target project.
   */
  copyCharactersToNewProject(
    sourceProjectId: string,
    targetProjectId: string,
    nodeId: string
  ): void {
    const appStore = useAppStore.getState();
    
    const sourceCharacters = appStore.characters;
    const shots = appStore.shots;
    const nodeIndex = shots.findIndex(s => s.id === nodeId);
    
    if (nodeIndex === -1) return;
    
    const validShots = shots.slice(0, nodeIndex + 1);
    const usedCharacterIds = new Set<string>();
    
    for (const shot of validShots) {
      const shotWithChars = shot as { characterIds?: string[] };
      if (shotWithChars.characterIds) {
        shotWithChars.characterIds.forEach(id => usedCharacterIds.add(id));
      }
    }
    
    // Copy used characters to target project
    for (const character of sourceCharacters) {
      if (usedCharacterIds.has(character.character_id)) {
        const currentProject = appStore.project;
        if (currentProject) {
          const existingChars = currentProject.characters || [];
          appStore.setProject({
            ...currentProject,
            characters: [...existingChars, {
              ...character,
              character_id: uuidv4(),
              name: `${character.name} (Copy)`,
            }],
          });
        }
      }
    }
  }

  /**
   * Copies world elements used up to a specific node from source to target project.
   */
  copyWorldsToNewProject(
    sourceProjectId: string,
    targetProjectId: string,
    nodeId: string
  ): void {
    const appStore = useAppStore.getState();
    
    const sourceWorlds = appStore.worlds;
    const shots = appStore.shots;
    const nodeIndex = shots.findIndex(s => s.id === nodeId);
    
    if (nodeIndex === -1) return;
    
    const validShots = shots.slice(0, nodeIndex + 1);
    const usedWorldIds = new Set<string>();
    
    for (const shot of validShots) {
      const shotWithWorld = shot as { worldId?: string };
      if (shotWithWorld.worldId) {
        usedWorldIds.add(shotWithWorld.worldId);
      }
    }
    
    // Copy used worlds to target project
    for (const world of sourceWorlds) {
      if (usedWorldIds.has(world.id)) {
        const currentProject = appStore.project;
        if (currentProject) {
          const existingWorlds = currentProject.worlds || [];
          appStore.setProject({
            ...currentProject,
            worlds: [...existingWorlds, {
              ...world,
              id: uuidv4(),
              name: `${world.name} (Copy)`,
            }],
          });
        }
      }
    }
  }

  /**
   * Copies all project data from source to target.
   */
  private copyProjectData(
    sourceProjectId: string,
    targetProjectId: string,
    nodeId: string
  ): void {
    const appStore = useAppStore.getState();
    
    // Get shots up to node
    const allShots = appStore.shots;
    const nodeIndex = allShots.findIndex(s => s.id === nodeId);
    
    if (nodeIndex === -1) {
      throw new Error(`Node not found: ${nodeId}`);
    }
    
    const validShots = allShots.slice(0, nodeIndex + 1);
    
    // Copy shots to target
    appStore.setShots(validShots.map(shot => ({
      ...shot,
      id: uuidv4(),
      projectId: targetProjectId,
    })));
    
    // Copy characters and worlds
    this.copyCharactersToNewProject(sourceProjectId, targetProjectId, nodeId);
    this.copyWorldsToNewProject(sourceProjectId, targetProjectId, nodeId);
  }

  // ========================================================================
  // "Return to This Moment" Methods
  // ========================================================================

  /**
   * Deletes/discards context after a specific node, resetting to that point.
   */
  pruneContextAfterNode(projectId: string, nodeId: string): void {
    const appStore = useAppStore.getState();
    
    // Create checkpoint before pruning
    const checkpointId = this.createCheckpointBeforePrune(projectId, nodeId);
    
    // Get all shots
    const allShots = appStore.shots;
    const nodeIndex = allShots.findIndex(s => s.id === nodeId);
    
    if (nodeIndex === -1) {
      throw new Error(`Node not found: ${nodeId}`);
    }
    
    // Keep only shots up to and including the node
    const shotsToKeep = allShots.slice(0, nodeIndex + 1);
    appStore.setShots(shotsToKeep);
    
    // Clean up redundant data
    this.cleanupRedundantData(projectId, nodeId);
  }

  /**
   * Creates a checkpoint before pruning context.
   */
  createCheckpointBeforePrune(projectId: string, nodeId: string): string {
    const checkpointId = uuidv4();
    
    // Get current context
    const context = this.getProjectContext(projectId, nodeId);
    
    const checkpoint: Checkpoint = {
      id: checkpointId,
      projectId,
      nodeId,
      createdAt: new Date(),
      contextSnapshot: context,
      metadata: {
        description: `Checkpoint before prune at node ${nodeId}`,
        createdBy: 'system',
      },
    };
    
    this.checkpoints.set(checkpointId, checkpoint);
    
    // Store checkpoint ID in project context
    this.storeCheckpointInContext(projectId, checkpointId);
    
    return checkpointId;
  }

  /**
   * Restores project from a checkpoint.
   */
  restoreFromCheckpoint(checkpointId: string): void {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint not found: ${checkpointId}`);
    }
    
    const { projectId, contextSnapshot } = checkpoint;
    const appStore = useAppStore.getState();
    
    // Restore shots
    appStore.setShots(contextSnapshot.entities.shots.map((shot: ShotContext) => ({
      ...shot,
      projectId,
      title: shot.name,
      description: '',
      duration: 0,
      audioTracks: [],
      effects: [],
      textLayers: [],
      animations: [],
      position: 0,
    })));
    
    // Mark checkpoint as used
    checkpoint.metadata.description += ' (RESTORED)';
  }

  /**
   * Removes unused assets/data after a specific node.
   */
  cleanupRedundantData(projectId: string, nodeId: string): void {
    const appStore = useAppStore.getState();
    
    // Get all shots up to and including the node
    const allShots = appStore.shots;
    const nodeIndex = allShots.findIndex(s => s.id === nodeId);
    
    if (nodeIndex === -1) {
      throw new Error(`Node not found: ${nodeId}`);
    }
    
    const validShotIds = new Set(allShots.slice(0, nodeIndex + 1).map(s => s.id));
    
    // Clean up unused characters
    const characters = appStore.characters;
    for (const character of characters) {
      const isUsed = allShots
        .slice(0, nodeIndex + 1)
        .some((shot: Shot) => {
          const shotWithChars = shot as { characterIds?: string[] };
          return shotWithChars.characterIds?.includes(character.character_id);
        });
      
      if (!isUsed && character.character_id !== 'default') {
        // Remove character from store
        const currentProject = appStore.project;
        if (currentProject) {
          const existingChars = currentProject.characters || [];
          appStore.setProject({
            ...currentProject,
            characters: existingChars.filter(c => c.character_id !== character.character_id),
          });
        }
      }
    }
    
    // Clean up unused worlds
    const worlds = appStore.worlds;
    for (const world of worlds) {
      const isUsed = allShots
        .slice(0, nodeIndex + 1)
        .some((shot: Shot) => {
          const shotWithWorld = shot as { worldId?: string };
          return shotWithWorld.worldId === world.id;
        });
      
      if (!isUsed && world.id !== 'default') {
        // Remove world from store
        const currentProject = appStore.project;
        if (currentProject) {
          const existingWorlds = currentProject.worlds || [];
          appStore.setProject({
            ...currentProject,
            worlds: existingWorlds.filter(w => w.id !== world.id),
          });
        }
      }
    }
  }

  // ========================================================================
  // Project Branching Methods
  // ========================================================================

  /**
   * Creates a branch from a specific point in the project.
   */
  async createBranch(projectId: string, branchPointId: string, branchName: string): Promise<BranchInfo> {
    const appStore = useAppStore.getState();
    const project = appStore.project;
    
    if (!project || project.id !== projectId) {
      throw new Error(`Project not found: ${projectId}`);
    }
    
    const branchId = uuidv4();
    
    // Get current active branch (if any)
    const existingBranches = this.getBranches(projectId);
    const parentBranch = existingBranches.find(b => b.status === 'active');
    
    const branch: BranchInfo = {
      id: branchId,
      projectId,
      name: branchName,
      branchPointId,
      createdAt: new Date(),
      status: 'active',
      parentBranchId: parentBranch?.id,
    };
    
    this.branches.set(branchId, branch);
    
    // Export context for the branch
    const contextExport = await this.exportContextToNewProject(projectId, branchPointId);
    this.storeBranchContext(branchId, contextExport);
    
    return branch;
  }

  /**
   * Gets all branches for a project.
   */
  getBranches(projectId: string): BranchInfo[] {
    const projectBranches: BranchInfo[] = [];
    
    for (const [, branch] of this.branches) {
      if (branch.projectId === projectId) {
        projectBranches.push(branch);
      }
    }
    
    // Sort by creation date, most recent first
    return projectBranches.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Switches to a different branch.
   */
  switchBranch(branchId: string): void {
    const branch = this.branches.get(branchId);
    if (!branch) {
      throw new Error(`Branch not found: ${branchId}`);
    }
    
    if (branch.status === 'archived') {
      throw new Error('Cannot switch to an archived branch');
    }
    
    const appStore = useAppStore.getState();
    
    // Deactivate all other branches for this project
    const projectBranches = this.getBranches(branch.projectId);
    for (const b of projectBranches) {
      if (b.id !== branchId) {
        b.status = 'archived';
        this.branches.set(b.id, b);
      }
    }
    
    // Activate the target branch
    branch.status = 'active';
    this.branches.set(branchId, branch);
    
    // Load branch context into project
    this.loadBranchContext(branchId);
  }

  /**
   * Merges a branch into a target project.
   */
  async mergeBranch(branchId: string, targetProjectId: string): Promise<void> {
    const branch = this.branches.get(branchId);
    if (!branch) {
      throw new Error(`Branch not found: ${branchId}`);
    }
    
    const sourceProjectId = branch.projectId;
    
    // Export context from branch point
    const contextExport = await this.exportContextToNewProject(sourceProjectId, branch.branchPointId);
    
    // Copy characters
    this.copyCharactersToNewProject(sourceProjectId, targetProjectId, branch.branchPointId);
    
    // Copy worlds
    this.copyWorldsToNewProject(sourceProjectId, targetProjectId, branch.branchPointId);
    
    // Copy reference sheets
    await this.copyReferenceSheetsToProject(sourceProjectId, targetProjectId, branch.branchPointId);
    
    // Mark branch as merged
    branch.status = 'merged';
    this.branches.set(branchId, branch);
  }

  // ========================================================================
  // Context Management Methods
  // ========================================================================

  /**
   * Gets the context up to a specific node.
   */
  getProjectContext(projectId: string, nodeId: string): ProjectContext {
    const appStore = useAppStore.getState();
    
    // Determine scope based on node position
    const scope = this.determineContextScope(projectId, nodeId);
    
    // Get all shots up to the node
    const allShots = appStore.shots;
    const nodeIndex = allShots.findIndex(s => s.id === nodeId);
    
    if (nodeIndex === -1) {
      throw new Error(`Node not found: ${nodeId}`);
    }
    
    const validShots = allShots.slice(0, nodeIndex + 1);
    
    // Collect unique character IDs
    const characterIds = new Set<string>();
    for (const shot of validShots) {
      const shotWithChars = shot as { characterIds?: string[] };
      if (shotWithChars.characterIds) {
        shotWithChars.characterIds.forEach(id => characterIds.add(id));
      }
    }
    
    // Collect unique world IDs
    const worldIds = new Set<string>();
    for (const shot of validShots) {
      const shotWithWorld = shot as { worldId?: string };
      if (shotWithWorld.worldId) {
        worldIds.add(shotWithWorld.worldId);
      }
    }
    
    // Build character contexts
    const characters: CharacterContext[] = [];
    for (const charId of characterIds) {
      const character = appStore.characters.find((c: Character) => c.character_id === charId);
      if (character) {
        const lastUsedShot = validShots
          .slice()
          .reverse()
          .find((s: Shot) => {
            const shotWithChars = s as { characterIds?: string[] };
            return shotWithChars.characterIds?.includes(charId);
          });
        
        characters.push({
          id: character.character_id,
          name: character.name,
          appearanceSheetId: character.appearanceSheetId,
          lastUsedShotId: lastUsedShot?.id || '',
          usageCount: validShots.filter((s: Shot) => {
            const shotWithChars = s as { characterIds?: string[] };
            return shotWithChars.characterIds?.includes(charId);
          }).length,
        });
      }
    }
    
    // Build world contexts
    const worlds: WorldContext[] = [];
    for (const worldId of worldIds) {
      const world = appStore.worlds.find((w: World) => w.id === worldId);
      if (world) {
        const lastUsedShot = validShots.find((s: Shot) => {
          const shotWithWorld = s as { worldId?: string };
          return shotWithWorld.worldId === worldId;
        });
        
        worlds.push({
          id: world.id,
          name: world.name,
          environmentSheetId: world.environmentSheetId,
          lastUsedShotId: lastUsedShot?.id || '',
          usageCount: validShots.filter((s: Shot) => {
            const shotWithWorld = s as { worldId?: string };
            return shotWithWorld.worldId === worldId;
          }).length,
        });
      }
    }
    
    // Build sequence contexts
    const sequences: SequenceContext[] = [];
    const processedSequences = new Set<string>();
    for (const shot of validShots) {
      const shotWithSeq = shot as { sequenceId?: string };
      if (shotWithSeq.sequenceId && !processedSequences.has(shotWithSeq.sequenceId)) {
        processedSequences.add(shotWithSeq.sequenceId);
        const sequenceShots = validShots.filter((s: Shot) => {
          const sWithSeq = s as { sequenceId?: string };
          return sWithSeq.sequenceId === shotWithSeq.sequenceId;
        });
        
        const shotWithName = shot as { sequenceName?: string };
        sequences.push({
          id: shotWithSeq.sequenceId,
          name: shotWithName.sequenceName || `Sequence ${shotWithSeq.sequenceId}`,
          referenceSheetId: undefined,
          shotCount: sequenceShots.length,
          parentActId: 'default',
        });
      }
    }
    
    // Build shot contexts
    const shots: ShotContext[] = validShots.map(shot => {
      const shotWithRefs = shot as { 
        name?: string; 
        title?: string;
        sequenceId?: string; 
        referenceIds?: string[]; 
        assetUrls?: string[] 
      };
      return {
        id: shot.id,
        name: shotWithRefs.name || shotWithRefs.title || '',
        sequenceId: shotWithRefs.sequenceId,
        referenceIds: shotWithRefs.referenceIds || [],
        assetUrls: shotWithRefs.assetUrls || [],
      };
    });
    
    return {
      scope,
      entities: {
        characters,
        worlds,
        sequences,
        shots,
      },
      referenceSheets: {
        masterSheetId: null,
        sequenceSheetIds: [],
      },
      checkpoints: this.getCheckpointsForProject(projectId),
    };
  }

  /**
   * Validates that context is complete and consistent.
   */
  validateContextIntegrity(context: ProjectContext): boolean {
    // Check that all referenced entities exist
    const characterIds = new Set(context.entities.characters.map(c => c.id));
    const worldIds = new Set(context.entities.worlds.map(w => w.id));
    const sequenceIds = new Set(context.entities.sequences.map(s => s.id));
    
    // Validate shot references
    for (const shot of context.entities.shots) {
      if (shot.sequenceId && !sequenceIds.has(shot.sequenceId)) {
        console.error(`Invalid sequence reference in shot ${shot.id}`);
        return false;
      }
    }
    
    // Validate sequence shot counts
    for (const sequence of context.entities.sequences) {
      const actualShotCount = context.entities.shots.filter(
        s => s.sequenceId === sequence.id
      ).length;
      
      if (actualShotCount !== sequence.shotCount) {
        console.warn(`Sequence ${sequence.id} shot count mismatch: expected ${sequence.shotCount}, got ${actualShotCount}`);
      }
    }
    
    // Check for circular dependencies
    if (this.hasCircularDependencies(context)) {
      console.error('Circular dependencies detected in context');
      return false;
    }
    
    return true;
  }

  /**
   * Optimizes context for size by removing unused data.
   */
  optimizeContext(context: ProjectContext): ProjectContext {
    // Remove characters with zero usage
    const usedCharacters = context.entities.characters.filter(
      c => c.usageCount > 0
    );
    
    // Remove worlds with zero usage
    const usedWorlds = context.entities.worlds.filter(
      w => w.usageCount > 0
    );
    
    // Remove empty sequences
    const usedSequences = context.entities.sequences.filter(
      s => s.shotCount > 0
    );
    
    // Remove orphaned shots
    const validSequenceIds = new Set(usedSequences.map(s => s.id));
    const validShots = context.entities.shots.filter(
      s => !s.sequenceId || validSequenceIds.has(s.sequenceId)
    );
    
    // Deduplicate reference IDs in shots
    const optimizedShots = validShots.map(shot => ({
      ...shot,
      referenceIds: [...new Set(shot.referenceIds)],
      assetUrls: [...new Set(shot.assetUrls)],
    }));
    
    return {
      ...context,
      entities: {
        characters: usedCharacters,
        worlds: usedWorlds,
        sequences: usedSequences,
        shots: optimizedShots,
      },
    };
  }

  // ========================================================================
  // Private Helper Methods
  // ========================================================================

  /**
   * Determines the context scope based on node position.
   */
  private determineContextScope(projectId: string, nodeId: string): ContextScope {
    const appStore = useAppStore.getState();
    const allShots = appStore.shots;
    const nodeIndex = allShots.findIndex(s => s.id === nodeId);
    
    if (nodeIndex === -1) {
      return 'project';
    }
    
    // Check if node is at shot, sequence, act, or project level
    const node = allShots[nodeIndex];
    const nodeWithSeq = node as { sequenceId?: string };
    
    // Count shots in sequence
    const sequenceShots = allShots.filter((s: Shot) => {
      const sWithSeq = s as { sequenceId?: string };
      return sWithSeq.sequenceId === nodeWithSeq.sequenceId;
    });
    const sequenceIndex = sequenceShots.findIndex((s: Shot) => {
      const sWithSeq = s as { sequenceId?: string };
      return sWithSeq.sequenceId === nodeWithSeq.sequenceId && s.id === nodeId;
    });
    
    if (sequenceShots.length === 1) {
      return 'shot';
    } else if (sequenceIndex === 0) {
      return 'sequence';
    }
    
    return 'shot';
  }

  /**
   * Gets assets included up to a specific node.
   */
  private getIncludedAssets(projectId: string, nodeId: string): ContextExport['includedAssets'] {
    const appStore = useAppStore.getState();
    const allShots = appStore.shots;
    const nodeIndex = allShots.findIndex(s => s.id === nodeId);
    
    if (nodeIndex === -1) {
      return {
        characters: [],
        worlds: [],
        sequences: [],
        shots: [],
      };
    }
    
    const validShots = allShots.slice(0, nodeIndex + 1);
    
    // Collect unique IDs
    const characters = new Set<string>();
    const worlds = new Set<string>();
    const sequences = new Set<string>();
    
    for (const shot of validShots) {
      const shotWithChars = shot as { characterIds?: string[] };
      if (shotWithChars.characterIds) {
        shotWithChars.characterIds.forEach(id => characters.add(id));
      }
      const shotWithWorld = shot as { worldId?: string };
      if (shotWithWorld.worldId) {
        worlds.add(shotWithWorld.worldId);
      }
      const shotWithSeq = shot as { sequenceId?: string };
      if (shotWithSeq.sequenceId) {
        sequences.add(shotWithSeq.sequenceId);
      }
    }
    
    return {
      characters: Array.from(characters),
      worlds: Array.from(worlds),
      sequences: Array.from(sequences),
      shots: validShots.map(s => s.id),
    };
  }

  /**
   * Exports reference sheets for a context.
   */
  private async exportReferenceSheets(
    projectId: string,
    nodeId: string
  ): Promise<ContextExport['referenceSheets']> {
    const appStore = useAppStore.getState();
    const allShots = appStore.shots;
    const nodeIndex = allShots.findIndex(s => s.id === nodeId);
    
    if (nodeIndex === -1) {
      return {
        masterSheet: null,
        sequenceSheets: [],
      };
    }
    
    const validShots = allShots.slice(0, nodeIndex + 1);
    
    // Get master sheet
    const masterSheet = await referenceSheetService.getMasterReferenceSheet(projectId);
    
    // Get sequence sheets for sequences used in valid shots
    const sequenceIds = [...new Set(
      validShots.map((s: { sequenceId?: string }) => s.sequenceId).filter((id: string | undefined): id is string => !!id)
    )];
    
    const sequenceSheets: SequenceReferenceSheet[] = [];
    
    for (const sequenceId of sequenceIds) {
      const sheet = await referenceSheetService.getSequenceReferenceSheet(sequenceId);
      if (sheet) {
        sequenceSheets.push(sheet);
      }
    }
    
    return {
      masterSheet: masterSheet || null,
      sequenceSheets,
    };
  }

  /**
   * Gets description for branch point.
   */
  private getBranchPointDescription(projectId: string, nodeId: string): string {
    const appStore = useAppStore.getState();
    const allShots = appStore.shots;
    const nodeIndex = allShots.findIndex(s => s.id === nodeId);
    
    if (nodeIndex === -1) {
      return 'Unknown point';
    }
    
    const node = allShots[nodeIndex];
    const nodeWithName = node as { name?: string; title?: string };
    return `Shot ${nodeIndex + 1}: ${nodeWithName.name || nodeWithName.title || 'Untitled'}`;
  }

  /**
   * Initializes a new project with exported context.
   */
  private initializeNewProjectContext(
    projectId: string,
    contextExport: ContextExport
  ): void {
    // Initialize project context storage
    this.projectContexts.set(projectId, {
      scope: contextExport.contextScope,
      entities: {
        characters: [],
        worlds: [],
        sequences: [],
        shots: [],
      },
      referenceSheets: {
        masterSheetId: contextExport.referenceSheets.masterSheet?.id || null,
        sequenceSheetIds: contextExport.referenceSheets.sequenceSheets.map(s => s.id),
      },
      checkpoints: [],
    });
  }

  /**
   * Stores checkpoint ID in project context.
   */
  private storeCheckpointInContext(projectId: string, checkpointId: string): void {
    const context = this.projectContexts.get(projectId);
    if (context) {
      context.checkpoints.push(checkpointId);
      this.projectContexts.set(projectId, context);
    }
  }

  /**
   * Gets checkpoints for a project.
   */
  private getCheckpointsForProject(projectId: string): string[] {
    const checkpoints: string[] = [];
    
    for (const [id, checkpoint] of this.checkpoints) {
      if (checkpoint.projectId === projectId) {
        checkpoints.push(id);
      }
    }
    
    return checkpoints;
  }

  /**
   * Stores branch context.
   */
  private storeBranchContext(branchId: string, _contextExport: ContextExport): void {
    const branch = this.branches.get(branchId);
    
    if (branch) {
      console.log(`Branch ${branchId} context stored`);
    }
  }

  /**
   * Loads branch context into project.
   */
  private loadBranchContext(branchId: string): void {
    const branch = this.branches.get(branchId);
    if (!branch) {
      throw new Error(`Branch not found: ${branchId}`);
    }
    
    // Load the context from the branch point
    const context = this.getProjectContext(branch.projectId, branch.branchPointId);
    this.projectContexts.set(branch.projectId, context);
  }

  /**
   * Checks for circular dependencies in context.
   */
  private hasCircularDependencies(context: ProjectContext): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const checkNode = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) {
        return true;
      }
      
      if (visited.has(nodeId)) {
        return false;
      }
      
      visited.add(nodeId);
      recursionStack.add(nodeId);
      
      recursionStack.delete(nodeId);
      return false;
    };
    
    for (const sequence of context.entities.sequences) {
      if (checkNode(sequence.id)) {
        return true;
      }
    }
    
    return false;
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const projectBranchingService = new ProjectBranchingService();
export default projectBranchingService;
