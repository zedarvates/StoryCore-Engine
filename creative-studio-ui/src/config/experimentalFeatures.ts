/**
 * Experimental Features Registry
 * 
 * This module manages the configuration and validation of experimental features
 * accessible through the Secret Services Menu. Features defined here are hidden
 * from regular navigation and only accessible via the Ctrl+Shift+Alt keyboard shortcut.
 */

/**
 * Represents an experimental feature in the application
 */
export interface ExperimentalFeature {
  /** Unique identifier for the feature */
  id: string;
  
  /** Display name shown in the secret menu */
  name: string;
  
  /** Brief description of the feature's purpose */
  description: string;
  
  /** Route path (should start with /experimental/) */
  path: string;
  
  /** Whether the feature is currently accessible */
  enabled: boolean;
  
  /** Optional emoji or icon for visual identification */
  icon?: string;
  
  /** Optional category for grouping features */
  category?: 'development' | 'testing' | 'experimental';
}

/**
 * Registry of all experimental features
 * Add new features here to make them accessible through the Secret Services Menu
 */
export const experimentalFeatures: ExperimentalFeature[] = [
  {
    id: 'advanced-grid-editor',
    name: 'Advanced Grid Editor',
    description: 'Next-generation grid editing with enhanced controls and real-time preview',
    path: '/experimental/advanced-grid-editor',
    enabled: true,
    icon: '🎨',
    category: 'development'
  },
  {
    id: 'ai-assistant-v3',
    name: 'AI Assistant V3',
    description: 'Experimental conversational AI interface with enhanced context awareness',
    path: '/experimental/ai-assistant-v3',
    enabled: true,
    icon: '🤖',
    category: 'experimental'
  },
  {
    id: 'performance-profiler',
    name: 'Performance Profiler',
    description: 'Real-time performance monitoring and optimization tools',
    path: '/experimental/performance-profiler',
    enabled: false, // Disabled - not ready for testing
    icon: '📊',
    category: 'testing'
  }
];

/**
 * Returns only the enabled experimental features
 * @returns Array of enabled experimental features
 */
export const getEnabledExperimentalFeatures = (): ExperimentalFeature[] => {
  return experimentalFeatures.filter(feature => feature.enabled);
};

/**
 * Validates the feature registry for common configuration errors
 * Should be called on application startup to catch issues early
 * 
 * Checks for:
 * - Duplicate feature IDs
 * - Duplicate feature paths
 * - Non-standard path prefixes (warns if not starting with /experimental/)
 */
export const validateFeatureRegistry = (): void => {
  const paths = new Set<string>();
  const ids = new Set<string>();
  
  experimentalFeatures.forEach(feature => {
    // Check for duplicate IDs
    if (ids.has(feature.id)) {
      console.error(`[Feature Registry] Duplicate feature ID detected: ${feature.id}`);
    }
    
    // Check for duplicate paths
    if (paths.has(feature.path)) {
      console.error(`[Feature Registry] Duplicate feature path detected: ${feature.path}`);
    }
    
    // Warn about non-standard paths
    if (!feature.path.startsWith('/experimental/')) {
      console.warn(
        `[Feature Registry] Feature "${feature.id}" path should start with /experimental/ for consistency. Current path: ${feature.path}`
      );
    }
    
    ids.add(feature.id);
    paths.add(feature.path);
  });
  
  // Log successful validation if no errors
  if (ids.size === experimentalFeatures.length && paths.size === experimentalFeatures.length) {
    console.log(`[Feature Registry] Validation successful. ${experimentalFeatures.length} features registered.`);
  }
};
