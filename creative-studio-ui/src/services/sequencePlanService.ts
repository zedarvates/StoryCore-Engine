/**
 * Sequence Plan Service
 * 
 * Provides services for managing sequence plans:
 * - CRUD operations (Create, Read, Update, Delete)
 * - Import/Export with validation
 * - Auto-save functionality
 * - Version history (future)
 * 
 * Task 7.7: Sequence Plan Services
 */

import type { SequencePlan } from '@/types/sequencePlan';
import type { Shot } from '@/types';

export interface SequencePlanData {
  id: string;
  name: string;
  description?: string;
  shots: Shot[];
  totalDuration: number;
  frameRate: number;
  resolution: { width: number; height: number };
  createdAt: number;
  modifiedAt: number;
  metadata?: Record<string, any>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ExportOptions {
  includeMetadata?: boolean;
  includeThumbnails?: boolean;
  format?: 'json' | 'csv';
}

/**
 * Callback type for sequence plan updates
 */
export type SequencePlanUpdateCallback = (planId: string, plan: SequencePlanData) => void;

/**
 * Callback type for sequence plan list updates
 */
export type SequencePlanListUpdateCallback = (plans: SequencePlan[]) => void;

/**
 * Callback type for auto-save status updates
 */
export type AutoSaveStatusCallback = (enabled: boolean, lastSaveTime: number | null) => void;

/**
 * Sequence Plan Service Class
 * 
 * Now with Observer pattern for real-time synchronization
 */
export class SequencePlanService {
  private static instance: SequencePlanService;
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private lastSaveTime: number | null = null;
  private isDirty: boolean = false;
  
  // Subscribers for different events
  private planUpdateSubscribers: Set<SequencePlanUpdateCallback> = new Set();
  private planListSubscribers: Set<SequencePlanListUpdateCallback> = new Set();
  private autoSaveStatusSubscribers: Set<AutoSaveStatusCallback> = new Set();

  private constructor() {
    console.log('[SequencePlanService] Service initialized with Observer pattern');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): SequencePlanService {
    if (!SequencePlanService.instance) {
      SequencePlanService.instance = new SequencePlanService();
    }
    return SequencePlanService.instance;
  }

  /**
   * Subscribe to plan updates
   * Returns unsubscribe function
   */
  public subscribeToPlanUpdates(callback: SequencePlanUpdateCallback): () => void {
    this.planUpdateSubscribers.add(callback);
    return () => {
      this.planUpdateSubscribers.delete(callback);
    };
  }

  /**
   * Subscribe to plan list updates
   * Returns unsubscribe function
   */
  public subscribeToPlanList(callback: SequencePlanListUpdateCallback): () => void {
    this.planListSubscribers.add(callback);
    return () => {
      this.planListSubscribers.delete(callback);
    };
  }

  /**
   * Subscribe to auto-save status updates
   * Returns unsubscribe function
   */
  public subscribeToAutoSaveStatus(callback: AutoSaveStatusCallback): () => void {
    this.autoSaveStatusSubscribers.add(callback);
    return () => {
      this.autoSaveStatusSubscribers.delete(callback);
    };
  }

  /**
   * Notify subscribers of plan update
   */
  private notifyPlanUpdate(planId: string, plan: SequencePlanData): void {
    this.planUpdateSubscribers.forEach(callback => {
      try {
        callback(planId, plan);
      } catch (error) {
        console.error('[SequencePlanService] Error in plan update subscriber:', error);
      }
    });
  }

  /**
   * Notify subscribers of plan list update
   */
  private async notifyPlanListUpdate(): Promise<void> {
    const plans = await this.listSequencePlans();
    this.planListSubscribers.forEach(callback => {
      try {
        callback(plans);
      } catch (error) {
        console.error('[SequencePlanService] Error in plan list subscriber:', error);
      }
    });
  }

  /**
   * Notify subscribers of auto-save status change
   */
  private notifyAutoSaveStatus(): void {
    const enabled = this.autoSaveInterval !== null;
    this.autoSaveStatusSubscribers.forEach(callback => {
      try {
        callback(enabled, this.lastSaveTime);
      } catch (error) {
        console.error('[SequencePlanService] Error in auto-save status subscriber:', error);
      }
    });
  }

  /**
   * Create a new sequence plan
   */
  public async createSequencePlan(
    name: string,
    description?: string
  ): Promise<SequencePlanData> {
    const now = Date.now();
    const plan: SequencePlanData = {
      id: this.generateId(),
      name,
      description,
      shots: [],
      totalDuration: 0,
      frameRate: 30,
      resolution: { width: 1920, height: 1080 },
      createdAt: now,
      modifiedAt: now,
      metadata: {},
    };

    // Save to storage
    await this.savePlan(plan);

    return plan;
  }

  /**
   * Load a sequence plan by ID
   */
  public async loadSequencePlan(planId: string): Promise<SequencePlanData | null> {
    try {
      // In a real implementation, this would load from file system or database
      // For now, we'll use localStorage as a mock
      const stored = localStorage.getItem(`sequence-plan-${planId}`);
      if (!stored) return null;

      const plan = JSON.parse(stored) as SequencePlanData;
      return plan;
    } catch (error) {
      console.error('Failed to load sequence plan:', error);
      return null;
    }
  }

  /**
   * Update a sequence plan
   */
  public async updateSequencePlan(
    planId: string,
    updates: Partial<SequencePlanData>
  ): Promise<SequencePlanData> {
    const plan = await this.loadSequencePlan(planId);
    if (!plan) {
      throw new Error(`Sequence plan not found: ${planId}`);
    }

    const updatedPlan: SequencePlanData = {
      ...plan,
      ...updates,
      modifiedAt: Date.now(),
    };

    await this.savePlan(updatedPlan);
    this.markDirty();

    // Notify subscribers
    this.notifyPlanUpdate(planId, updatedPlan);
    await this.notifyPlanListUpdate();

    return updatedPlan;
  }

  /**
   * Delete a sequence plan
   */
  public async deleteSequencePlan(planId: string): Promise<void> {
    try {
      localStorage.removeItem(`sequence-plan-${planId}`);
      
      // Remove from plan list
      const planList = await this.listSequencePlans();
      const updatedList = planList.filter((p) => p.id !== planId);
      localStorage.setItem('sequence-plan-list', JSON.stringify(updatedList));

      // Notify subscribers
      await this.notifyPlanListUpdate();
    } catch (error) {
      console.error('Failed to delete sequence plan:', error);
      throw new Error('Failed to delete sequence plan');
    }
  }

  /**
   * Duplicate a sequence plan
   */
  public async duplicateSequencePlan(planId: string): Promise<SequencePlanData> {
    const plan = await this.loadSequencePlan(planId);
    if (!plan) {
      throw new Error(`Sequence plan not found: ${planId}`);
    }

    // Generate unique name
    const copyName = this.generateUniqueName(plan.name);

    const now = Date.now();
    const duplicatedPlan: SequencePlanData = {
      ...plan,
      id: this.generateId(),
      name: copyName,
      createdAt: now,
      modifiedAt: now,
      // Deep copy shots
      shots: plan.shots.map((shot) => ({
        ...shot,
        id: this.generateId(),
      })),
    };

    await this.savePlan(duplicatedPlan);

    // Notify subscribers
    this.notifyPlanUpdate(duplicatedPlan.id, duplicatedPlan);
    await this.notifyPlanListUpdate();

    return duplicatedPlan;
  }

  /**
   * List all sequence plans
   */
  public async listSequencePlans(): Promise<SequencePlan[]> {
    try {
      const stored = localStorage.getItem('sequence-plan-list');
      if (!stored) return [];

      const planList = JSON.parse(stored) as SequencePlan[];
      return planList;
    } catch (error) {
      console.error('Failed to list sequence plans:', error);
      return [];
    }
  }

  /**
   * Export a sequence plan to JSON
   */
  public async exportSequencePlan(
    planId: string,
    options: ExportOptions = {}
  ): Promise<string> {
    const plan = await this.loadSequencePlan(planId);
    if (!plan) {
      throw new Error(`Sequence plan not found: ${planId}`);
    }

    const {
      includeMetadata = true,
      includeThumbnails = true,
      format = 'json',
    } = options;

    // Prepare export data
    const exportData: any = {
      ...plan,
    };

    // Remove metadata if not included
    if (!includeMetadata) {
      delete exportData.metadata;
    }

    // Remove thumbnails if not included
    if (!includeThumbnails) {
      exportData.shots = exportData.shots.map((shot: Shot) => {
        const { image, ...shotWithoutImage } = shot;
        return shotWithoutImage;
      });
    }

    if (format === 'json') {
      return JSON.stringify(exportData, null, 2);
    } else {
      // CSV format (simplified)
      throw new Error('CSV export not yet implemented');
    }
  }

  /**
   * Import a sequence plan from JSON
   */
  public async importSequencePlan(jsonData: string): Promise<SequencePlanData> {
    // Validate JSON
    const validation = this.validateSequencePlan(jsonData);
    if (!validation.valid) {
      throw new Error(`Invalid sequence plan: ${validation.errors.join(', ')}`);
    }

    const plan = JSON.parse(jsonData) as SequencePlanData;

    // Generate new ID to avoid conflicts
    plan.id = this.generateId();
    plan.createdAt = Date.now();
    plan.modifiedAt = Date.now();

    // Generate new IDs for shots
    plan.shots = plan.shots.map((shot) => ({
      ...shot,
      id: this.generateId(),
    }));

    await this.savePlan(plan);

    // Notify subscribers
    this.notifyPlanUpdate(plan.id, plan);
    await this.notifyPlanListUpdate();

    return plan;
  }

  /**
   * Validate a sequence plan JSON
   */
  public validateSequencePlan(jsonData: string): ValidationResult {
    const errors: string[] = [];

    try {
      const plan = JSON.parse(jsonData);

      // Required fields
      if (!plan.id) errors.push('Missing required field: id');
      if (!plan.name) errors.push('Missing required field: name');
      if (!Array.isArray(plan.shots)) errors.push('Missing or invalid field: shots');
      if (typeof plan.totalDuration !== 'number') {
        errors.push('Missing or invalid field: totalDuration');
      }
      if (typeof plan.frameRate !== 'number') {
        errors.push('Missing or invalid field: frameRate');
      }
      if (!plan.resolution || typeof plan.resolution.width !== 'number' || typeof plan.resolution.height !== 'number') {
        errors.push('Missing or invalid field: resolution');
      }

      // Validate shots
      if (Array.isArray(plan.shots)) {
        plan.shots.forEach((shot: any, index: number) => {
          if (!shot.id) errors.push(`Shot ${index}: Missing required field: id`);
          if (!shot.title) errors.push(`Shot ${index}: Missing required field: title`);
          if (typeof shot.duration !== 'number') {
            errors.push(`Shot ${index}: Missing or invalid field: duration`);
          }
        });
      }
    } catch (error) {
      errors.push('Invalid JSON format');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Enable auto-save
   */
  public enableAutoSave(intervalMs: number = 30000): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    this.autoSaveInterval = setInterval(() => {
      if (this.isDirty) {
        this.saveCurrentPlan();
      }
    }, intervalMs);

    // Notify subscribers
    this.notifyAutoSaveStatus();
  }

  /**
   * Disable auto-save
   */
  public disableAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }

    // Notify subscribers
    this.notifyAutoSaveStatus();
  }

  /**
   * Get last save time
   */
  public getLastSaveTime(): number | null {
    return this.lastSaveTime;
  }

  /**
   * Mark plan as dirty (needs saving)
   */
  public markDirty(): void {
    this.isDirty = true;
  }

  /**
   * Save current plan (called by auto-save)
   */
  private async saveCurrentPlan(): Promise<void> {
    // This would be implemented to save the current active plan
    // For now, we'll just mark as clean
    this.isDirty = false;
    this.lastSaveTime = Date.now();
  }

  /**
   * Save a plan to storage
   */
  private async savePlan(plan: SequencePlanData): Promise<void> {
    try {
      // Save plan data
      localStorage.setItem(`sequence-plan-${plan.id}`, JSON.stringify(plan));

      // Update plan list
      const planList = await this.listSequencePlans();
      const existingIndex = planList.findIndex((p) => p.id === plan.id);

      const planSummary: SequencePlan = {
        id: plan.id,
        name: plan.name,
        description: plan.description || '',
        worldId: plan.metadata?.worldId || '',
        templateId: plan.metadata?.templateId,
        targetDuration: plan.totalDuration,
        frameRate: plan.frameRate,
        resolution: plan.resolution,
        acts: [],
        scenes: [],
        shots: [], // Empty array since we're just creating a summary
        createdAt: plan.createdAt,
        modifiedAt: plan.modifiedAt,
        status: 'draft',
        tags: [],
      };

      if (existingIndex >= 0) {
        planList[existingIndex] = planSummary;
      } else {
        planList.push(planSummary);
      }

      localStorage.setItem('sequence-plan-list', JSON.stringify(planList));

      this.lastSaveTime = Date.now();
      this.isDirty = false;

      // Notify subscribers
      this.notifyPlanUpdate(plan.id, plan);
      await this.notifyPlanListUpdate();
    } catch (error) {
      console.error('Failed to save sequence plan:', error);
      throw new Error('Failed to save sequence plan');
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `plan-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Generate unique name for duplicated plan
   */
  private generateUniqueName(baseName: string): string {
    const copyMatch = baseName.match(/^(.+?)\s*\(Copy(?:\s+(\d+))?\)$/);
    
    if (copyMatch) {
      const [, name, num] = copyMatch;
      const nextNum = num ? parseInt(num, 10) + 1 : 2;
      return `${name} (Copy ${nextNum})`;
    }
    
    return `${baseName} (Copy)`;
  }
}

// Export singleton instance
export const sequencePlanService = SequencePlanService.getInstance();
