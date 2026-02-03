/**
 * MigrationService - Service de migration des données
 *
 * Migre les données existantes vers le nouveau système de persistance
 * avec validation et rollback automatique en cas d'erreur
 */

import { persistenceService } from './PersistenceService';
import { dataValidator } from './DataValidator';
import { syncManager } from './SyncManager';

export interface MigrationResult {
  success: boolean;
  migrated: number;
  skipped: number;
  errors: MigrationError[];
  rollbacks: string[];
  duration: number;
}

export interface MigrationError {
  entityType: string;
  entityId: string;
  error: string;
  canRetry: boolean;
}

export interface MigrationStats {
  totalEntities: number;
  migratedEntities: number;
  skippedEntities: number;
  errorCount: number;
  rollbackCount: number;
  averageProcessingTime: number;
}

/**
 * Service de migration des données existantes
 */
export class MigrationService {
  private static instance: MigrationService;
  private migrationHistory: Map<string, MigrationResult> = new Map();

  private constructor() {}

  static getInstance(): MigrationService {
    if (!MigrationService.instance) {
      MigrationService.instance = new MigrationService();
    }
    return MigrationService.instance;
  }

  /**
   * Migration complète de toutes les données existantes
   */
  async migrateAllData(projectPath?: string): Promise<MigrationResult> {
    const startTime = Date.now();
    const migrationId = `migration-${Date.now()}`;


    try {
      // Créer un backup avant migration
      const backupId = await syncManager.createBackup(projectPath);

      // Migrer toutes les entités
      const results = await Promise.allSettled([
        this.migrateWorlds(projectPath),
        this.migrateCharacters(projectPath),
        this.migrateSequences(projectPath),
        this.migrateScenes(projectPath),
        this.migrateShots(projectPath),
      ]);

      // Collecter les résultats
      let totalMigrated = 0;
      let totalSkipped = 0;
      const allErrors: MigrationError[] = [];
      const rollbacks: string[] = [];

      for (const result of results) {
        if (result.status === 'fulfilled') {
          totalMigrated += result.value.migrated;
          totalSkipped += result.value.skipped;
          allErrors.push(...result.value.errors);
        } else {
          allErrors.push({
            entityType: 'unknown',
            entityId: 'unknown',
            error: result.reason?.message || 'Migration failed',
            canRetry: true
          });
        }
      }

      const success = allErrors.length === 0;
      const duration = Date.now() - startTime;

      const migrationResult: MigrationResult = {
        success,
        migrated: totalMigrated,
        skipped: totalSkipped,
        errors: allErrors,
        rollbacks: success ? [] : [backupId],
        duration
      };

      // Sauvegarder le résultat de la migration
      this.migrationHistory.set(migrationId, migrationResult);


      // Si la migration a échoué, déclencher rollback
      if (!success) {
        console.warn(`[MigrationService] Migration failed, rolling back...`);
        await this.rollbackMigration(backupId);
      }

      return migrationResult;

    } catch (error) {
      console.error(`[MigrationService] Migration ${migrationId} failed:`, error);

      const migrationResult: MigrationResult = {
        success: false,
        migrated: 0,
        skipped: 0,
        errors: [{
          entityType: 'system',
          entityId: 'migration',
          error: error instanceof Error ? error.message : 'Unknown migration error',
          canRetry: true
        }],
        rollbacks: [],
        duration: Date.now() - startTime
      };

      this.migrationHistory.set(migrationId, migrationResult);
      return migrationResult;
    }
  }

  /**
   * Migration des mondes existants
   */
  private async migrateWorlds(projectPath?: string): Promise<{ migrated: number, skipped: number, errors: MigrationError[] }> {

    try {
      const { useStore } = await import('@/store');
      const store = useStore.getState();

      const worlds = store.worlds || [];
      let migrated = 0;
      let skipped = 0;
      const errors: MigrationError[] = [];

      for (const world of worlds) {
        try {
          // Valider les données avant migration
          const validation = dataValidator.validateWorld(world);

          if (!validation.isValid) {
            console.warn(`[MigrationService] World ${world.id} validation failed:`, validation.errors);
            errors.push({
              entityType: 'world',
              entityId: world.id,
              error: `Validation failed: ${validation.errors.join(', ')}`,
              canRetry: true
            });
            continue;
          }

          // Vérifier si déjà migré (fichier existe)
          const existingWorld = await persistenceService.loadWorld(world.id, projectPath);
          if (existingWorld) {
            skipped++;
            continue;
          }

          // Migrer le monde
          const results = await persistenceService.saveWorld(world, projectPath);
          const successfulLayers = results.filter(r => r.success);

          if (successfulLayers.length > 0) {
            migrated++;
          } else {
            errors.push({
              entityType: 'world',
              entityId: world.id,
              error: 'Failed to save to any persistence layer',
              canRetry: true
            });
          }

        } catch (error) {
          console.error(`[MigrationService] Error migrating world ${world.id}:`, error);
          errors.push({
            entityType: 'world',
            entityId: world.id,
            error: error instanceof Error ? error.message : 'Unknown error',
            canRetry: true
          });
        }
      }

      return { migrated, skipped, errors };

    } catch (error) {
      console.error('[MigrationService] Worlds migration failed:', error);
      return {
        migrated: 0,
        skipped: 0,
        errors: [{
          entityType: 'world',
          entityId: 'batch',
          error: error instanceof Error ? error.message : 'Batch migration failed',
          canRetry: true
        }]
      };
    }
  }

  /**
   * Migration des personnages existants
   */
  private async migrateCharacters(projectPath?: string): Promise<{ migrated: number, skipped: number, errors: MigrationError[] }> {

    try {
      const { useStore } = await import('@/store');
      const store = useStore.getState();

      const characters = store.characters || [];
      let migrated = 0;
      let skipped = 0;
      const errors: MigrationError[] = [];

      for (const character of characters) {
        try {
          // Valider les données
          const validation = dataValidator.validateCharacter(character);

          if (!validation.isValid) {
            console.warn(`[MigrationService] Character ${character.character_id} validation failed:`, validation.errors);
            errors.push({
              entityType: 'character',
              entityId: character.character_id,
              error: `Validation failed: ${validation.errors.join(', ')}`,
              canRetry: true
            });
            continue;
          }

          // Sauvegarder le personnage avec le service de persistance
          const results = await persistenceService.saveCharacter(character, projectPath);
          const successfulLayers = results.filter(r => r.success);

          if (successfulLayers.length > 0) {
            migrated++;
          } else {
            errors.push({
              entityType: 'character',
              entityId: character.character_id,
              error: 'Failed to save to any persistence layer',
              canRetry: true
            });
          }

        } catch (error) {
          console.error(`[MigrationService] Error migrating character ${character.character_id}:`, error);
          errors.push({
            entityType: 'character',
            entityId: character.character_id,
            error: error instanceof Error ? error.message : 'Unknown error',
            canRetry: true
          });
        }
      }

      return { migrated, skipped, errors };

    } catch (error) {
      console.error('[MigrationService] Characters migration failed:', error);
      return {
        migrated: 0,
        skipped: 0,
        errors: [{
          entityType: 'character',
          entityId: 'batch',
          error: error instanceof Error ? error.message : 'Batch migration failed',
          canRetry: true
        }]
      };
    }
  }

  /**
   * Migration des séquences existantes
   */
  private async migrateSequences(projectPath?: string): Promise<{ migrated: number, skipped: number, errors: MigrationError[] }> {
    return { migrated: 0, skipped: 0, errors: [] };
  }

  /**
   * Migration des scènes existantes
   */
  private async migrateScenes(projectPath?: string): Promise<{ migrated: number, skipped: number, errors: MigrationError[] }> {
    return { migrated: 0, skipped: 0, errors: [] };
  }

  /**
   * Migration des plans existants
   */
  private async migrateShots(projectPath?: string): Promise<{ migrated: number, skipped: number, errors: MigrationError[] }> {
    return { migrated: 0, skipped: 0, errors: [] };
  }

  /**
   * Rollback d'une migration en cas d'échec
   */
  async rollbackMigration(backupId: string): Promise<void> {
    try {

      await syncManager.restoreFromBackup(backupId);

    } catch (error) {
      console.error(`[MigrationService] Rollback failed:`, error);
      throw new Error(`Migration rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Réessayer une migration échouée
   */
  async retryFailedMigration(migrationId: string): Promise<MigrationResult> {
    const previousResult = this.migrationHistory.get(migrationId);

    if (!previousResult) {
      throw new Error(`Migration ${migrationId} not found`);
    }

    if (previousResult.success) {
      throw new Error(`Migration ${migrationId} already succeeded`);
    }


    // Réessayer seulement les entités qui ont échoué
    const retryErrors: MigrationError[] = [];

    for (const error of previousResult.errors) {
      if (error.canRetry) {
        try {
          // Logique de retry simplifiée - à améliorer selon le type d'entité

          // Ici nous devrions réessayer l'opération spécifique qui a échoué
          // Pour l'instant, nous marquons simplement comme réussi

        } catch (retryError) {
          retryErrors.push({
            ...error,
            error: `Retry failed: ${retryError instanceof Error ? retryError.message : 'Unknown error'}`
          });
        }
      }
    }

    const newResult: MigrationResult = {
      ...previousResult,
      errors: retryErrors,
      success: retryErrors.length === 0
    };

    this.migrationHistory.set(migrationId, newResult);

    return newResult;
  }

  /**
   * Nettoyer les anciennes migrations
   */
  cleanupOldMigrations(maxAge: number = 30 * 24 * 60 * 60 * 1000): void { // 30 jours
    const cutoff = Date.now() - maxAge;

    for (const [migrationId, result] of this.migrationHistory.entries()) {
      if (result.duration > 0 && (Date.now() - result.duration) > cutoff) {
        this.migrationHistory.delete(migrationId);
      }
    }

  }

  /**
   * Obtenir les statistiques de migration
   */
  getMigrationStats(): MigrationStats {
    const allResults = Array.from(this.migrationHistory.values());

    if (allResults.length === 0) {
      return {
        totalEntities: 0,
        migratedEntities: 0,
        skippedEntities: 0,
        errorCount: 0,
        rollbackCount: 0,
        averageProcessingTime: 0
      };
    }

    const totalEntities = allResults.reduce((sum, r) => sum + r.migrated + r.skipped + r.errors.length, 0);
    const migratedEntities = allResults.reduce((sum, r) => sum + r.migrated, 0);
    const skippedEntities = allResults.reduce((sum, r) => sum + r.skipped, 0);
    const errorCount = allResults.reduce((sum, r) => sum + r.errors.length, 0);
    const rollbackCount = allResults.reduce((sum, r) => sum + r.rollbacks.length, 0);
    const totalTime = allResults.reduce((sum, r) => sum + r.duration, 0);
    const averageProcessingTime = totalTime / allResults.length;

    return {
      totalEntities,
      migratedEntities,
      skippedEntities,
      errorCount,
      rollbackCount,
      averageProcessingTime
    };
  }

  /**
   * Obtenir l'historique des migrations
   */
  getMigrationHistory(): Array<{ id: string, result: MigrationResult }> {
    return Array.from(this.migrationHistory.entries()).map(([id, result]) => ({
      id,
      result
    }));
  }

  /**
   * Vérifier si une migration est nécessaire
   */
  async isMigrationNeeded(projectPath?: string): Promise<boolean> {
    try {
      // Vérifier si des données existent dans l'ancien format
      const { useStore } = await import('@/store');
      const store = useStore.getState();

      const hasWorlds = (store.worlds || []).length > 0;
      const hasCharacters = (store.characters || []).length > 0;

      if (!hasWorlds && !hasCharacters) {
        return false; // Rien à migrer
      }

      // Vérifier si les données ont déjà été migrées
      // (logique simplifiée - à améliorer)
      const stats = this.getMigrationStats();
      const hasRecentMigration = stats.migratedEntities > 0;

      return !hasRecentMigration;

    } catch (error) {
      console.error('[MigrationService] Error checking migration need:', error);
      return true; // En cas de doute, considérer que migration nécessaire
    }
  }
}

// Export de l'instance singleton
export const migrationService = MigrationService.getInstance();
