/**
 * React Hook for Project Template Service
 * 
 * Provides real-time synchronization with ProjectTemplateService
 * using the Observer pattern.
 */

import { useState, useEffect, useCallback } from 'react';
import { ProjectTemplateService } from '@/services/asset-integration/ProjectTemplateService';
import type { ProjectTemplate } from '@/types/asset-integration';

// Get singleton instance
const templateService = ProjectTemplateService.getInstance();

// ============================================================================
// Hook: useProjectTemplate
// ============================================================================

export interface UseProjectTemplateReturn {
  template: ProjectTemplate | null;
  isLoading: boolean;
  error: Error | null;
  loadTemplate: (path: string) => Promise<void>;
  saveTemplate: (template: ProjectTemplate, path: string) => Promise<void>;
  createNewTemplate: (baseTemplate?: ProjectTemplate) => Promise<void>;
  clearCache: () => void;
}

/**
 * Hook for managing project templates with real-time synchronization
 * 
 * @param initialPath - Optional path to load template on mount
 * 
 * @example
 * ```typescript
 * function TemplateEditor() {
 *   const { 
 *     template, 
 *     isLoading, 
 *     loadTemplate, 
 *     saveTemplate 
 *   } = useProjectTemplate('/path/to/template.json');
 *   
 *   if (isLoading) return <div>Loading...</div>;
 *   if (!template) return <div>No template loaded</div>;
 *   
 *   return (
 *     <div>
 *       <h2>{template.project.name}</h2>
 *       <p>Version: {template.project.version}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useProjectTemplate(initialPath?: string): UseProjectTemplateReturn {
  const [template, setTemplate] = useState<ProjectTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentPath, setCurrentPath] = useState<string | null>(initialPath || null);

  // Load initial template
  useEffect(() => {
    if (initialPath) {
      loadTemplate(initialPath);
    }
  }, [initialPath]);

  // Subscribe to template updates
  useEffect(() => {
    const unsubscribe = templateService.subscribeToTemplateUpdates((path, updatedTemplate) => {
      
      // Update if it's the current template
      if (currentPath && path === currentPath) {
        setTemplate(updatedTemplate);
      }
    });

    return unsubscribe;
  }, [currentPath]);

  // Load template
  const loadTemplate = useCallback(async (path: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setCurrentPath(path);
      const loadedTemplate = await templateService.loadProjectTemplate(path);
      setTemplate(loadedTemplate);
    } catch (err) {
      console.error('[useProjectTemplate] Failed to load template:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save template
  const saveTemplate = useCallback(async (templateToSave: ProjectTemplate, path: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await templateService.saveProjectTemplate(templateToSave, path);
      setTemplate(templateToSave);
      setCurrentPath(path);
    } catch (err) {
      console.error('[useProjectTemplate] Failed to save template:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create new template
  const createNewTemplate = useCallback(async (baseTemplate?: ProjectTemplate) => {
    try {
      setIsLoading(true);
      setError(null);
      const newTemplate = await templateService.createNewTemplate(baseTemplate);
      setTemplate(newTemplate);
      setCurrentPath(null); // New template doesn't have a path yet
    } catch (err) {
      console.error('[useProjectTemplate] Failed to create template:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Clear cache
  const clearCache = useCallback(() => {
    templateService.clearCache();
  }, []);

  return {
    template,
    isLoading,
    error,
    loadTemplate,
    saveTemplate,
    createNewTemplate,
    clearCache,
  };
}

// ============================================================================
// Hook: useTemplateCache
// ============================================================================

export interface UseTemplateCacheReturn {
  clearCache: () => void;
  cacheCleared: boolean;
}

/**
 * Hook for managing template cache
 * 
 * @example
 * ```typescript
 * function CacheManager() {
 *   const { clearCache, cacheCleared } = useTemplateCache();
 *   
 *   return (
 *     <div>
 *       <button onClick={clearCache}>Clear Cache</button>
 *       {cacheCleared && <p>Cache cleared!</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useTemplateCache(): UseTemplateCacheReturn {
  const [cacheCleared, setCacheCleared] = useState(false);

  // Subscribe to cache updates
  useEffect(() => {
    const unsubscribe = templateService.subscribeToCacheUpdates((cleared) => {
      setCacheCleared(cleared);
      
      // Reset flag after 3 seconds
      if (cleared) {
        setTimeout(() => setCacheCleared(false), 3000);
      }
    });

    return unsubscribe;
  }, []);

  const clearCache = useCallback(() => {
    templateService.clearCache();
  }, []);

  return {
    clearCache,
    cacheCleared,
  };
}

// ============================================================================
// Hook: useTemplateList
// ============================================================================

export interface UseTemplateListReturn {
  templates: string[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for listing available templates
 * 
 * @example
 * ```typescript
 * function TemplateList() {
 *   const { templates, isLoading, refresh } = useTemplateList();
 *   
 *   if (isLoading) return <div>Loading...</div>;
 *   
 *   return (
 *     <div>
 *       <button onClick={refresh}>Refresh</button>
 *       <ul>
 *         {templates.map(path => <li key={path}>{path}</li>)}
 *       </ul>
 *     </div>
 *   );
 * }
 * ```
 */
export function useTemplateList(): UseTemplateListReturn {
  const [templates, setTemplates] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadTemplates = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const availableTemplates = await templateService.listAvailableTemplates();
      setTemplates(availableTemplates);
    } catch (err) {
      console.error('[useTemplateList] Failed to load templates:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return {
    templates,
    isLoading,
    error,
    refresh: loadTemplates,
  };
}

// ============================================================================
// Hook: useTemplateMetadata
// ============================================================================

export interface UseTemplateMetadataReturn {
  metadata: ProjectTemplate['project'] | null;
  updateMetadata: (updates: Partial<ProjectTemplate['project']>) => void;
}

/**
 * Hook for managing template metadata
 * 
 * @param template - Current template
 * @param onUpdate - Callback when metadata is updated
 * 
 * @example
 * ```typescript
 * function MetadataEditor({ template }: { template: ProjectTemplate }) {
 *   const { metadata, updateMetadata } = useTemplateMetadata(
 *     template,
 *   );
 *   
 *   return (
 *     <div>
 *       <input 
 *         value={metadata?.name || ''} 
 *         onChange={(e) => updateMetadata({ name: e.target.value })}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */
export function useTemplateMetadata(
  template: ProjectTemplate | null,
  onUpdate?: (metadata: ProjectTemplate['project']) => void
): UseTemplateMetadataReturn {
  const [metadata, setMetadata] = useState<ProjectTemplate['project'] | null>(
    template?.project || null
  );

  // Update metadata when template changes
  useEffect(() => {
    if (template) {
      setMetadata(template.project);
    }
  }, [template]);

  const updateMetadata = useCallback((updates: Partial<ProjectTemplate['project']>) => {
    if (!metadata) return;
    
    const updatedMetadata = {
      ...metadata,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    
    setMetadata(updatedMetadata);
    onUpdate?.(updatedMetadata);
  }, [metadata, onUpdate]);

  return {
    metadata,
    updateMetadata,
  };
}
