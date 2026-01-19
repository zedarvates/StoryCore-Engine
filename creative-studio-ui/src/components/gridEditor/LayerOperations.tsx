/**
 * LayerOperations - Helper functions and hooks for layer management
 * 
 * Provides operations for:
 * - Creating new layers (image, annotation, effect types)
 * - Deleting layers with confirmation
 * - Toggling layer visibility
 * - Toggling layer lock
 * - Adjusting layer opacity
 * - Selecting active layer for editing
 * - Duplicating layers
 * 
 * Requirements: 5.1, 5.3, 5.4, 5.5, 5.7, 5.8
 */

import { Layer, ImageContent, AnnotationContent, EffectContent } from '../../types/gridEditor';

/**
 * Generate unique layer ID
 */
export const generateLayerId = (): string => {
  return `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Create a new image layer
 */
export const createImageLayer = (
  url: string,
  naturalWidth: number,
  naturalHeight: number,
  name?: string
): Layer => {
  const content: ImageContent = {
    type: 'image',
    url,
    naturalWidth,
    naturalHeight,
  };

  return {
    id: generateLayerId(),
    name: name || `Image Layer ${Date.now()}`,
    type: 'image',
    visible: true,
    locked: false,
    opacity: 1.0,
    blendMode: 'normal',
    content,
  };
};

/**
 * Create a new annotation layer
 */
export const createAnnotationLayer = (name?: string): Layer => {
  const content: AnnotationContent = {
    type: 'annotation',
    drawings: [],
    textAnnotations: [],
  };

  return {
    id: generateLayerId(),
    name: name || `Annotation Layer ${Date.now()}`,
    type: 'annotation',
    visible: true,
    locked: false,
    opacity: 1.0,
    blendMode: 'normal',
    content,
  };
};

/**
 * Create a new effect layer
 */
export const createEffectLayer = (
  effectType: string,
  parameters: Record<string, any> = {},
  name?: string
): Layer => {
  const content: EffectContent = {
    type: 'effect',
    effectType,
    parameters,
  };

  return {
    id: generateLayerId(),
    name: name || `${effectType} Effect`,
    type: 'effect',
    visible: true,
    locked: false,
    opacity: 1.0,
    blendMode: 'normal',
    content,
  };
};

/**
 * Duplicate a layer with a new ID
 */
export const duplicateLayer = (layer: Layer): Layer => {
  return {
    ...layer,
    id: generateLayerId(),
    name: `${layer.name} (Copy)`,
    locked: false, // Unlock duplicated layers
  };
};

/**
 * Validate layer opacity (0-1 range)
 */
export const validateOpacity = (opacity: number): number => {
  return Math.max(0, Math.min(1, opacity));
};

/**
 * Check if layer can be modified (not locked)
 */
export const canModifyLayer = (layer: Layer): boolean => {
  return !layer.locked;
};

/**
 * Check if layer can be deleted
 */
export const canDeleteLayer = (layer: Layer, _totalLayers: number): boolean => {
  // Can't delete if locked
  if (layer.locked) return false;
  
  // Can always delete if there are multiple layers
  // (We allow deleting the last layer to have empty panels)
  return true;
};

/**
 * Get layer display name with type indicator
 */
export const getLayerDisplayName = (layer: Layer): string => {
  const typeIndicator = {
    image: '🖼️',
    annotation: '✏️',
    effect: '✨',
  }[layer.type] || '';

  return `${typeIndicator} ${layer.name}`;
};

/**
 * Sort layers by z-order (bottom to top)
 */
export const sortLayersByZOrder = (layers: Layer[]): Layer[] => {
  return [...layers]; // Already in correct order (index 0 = bottom)
};

/**
 * Get layer at index
 */
export const getLayerAtIndex = (layers: Layer[], index: number): Layer | undefined => {
  return layers[index];
};

/**
 * Get layer index by ID
 */
export const getLayerIndex = (layers: Layer[], layerId: string): number => {
  return layers.findIndex(layer => layer.id === layerId);
};

/**
 * Move layer to new index
 */
export const moveLayer = (layers: Layer[], layerId: string, newIndex: number): Layer[] => {
  const currentIndex = getLayerIndex(layers, layerId);
  if (currentIndex === -1) return layers;

  const newLayers = [...layers];
  const [layer] = newLayers.splice(currentIndex, 1);
  newLayers.splice(newIndex, 0, layer);

  return newLayers;
};

/**
 * Toggle layer visibility
 */
export const toggleLayerVisibility = (layer: Layer): Layer => {
  return {
    ...layer,
    visible: !layer.visible,
  };
};

/**
 * Toggle layer lock
 */
export const toggleLayerLock = (layer: Layer): Layer => {
  return {
    ...layer,
    locked: !layer.locked,
  };
};

/**
 * Update layer opacity
 */
export const updateLayerOpacity = (layer: Layer, opacity: number): Layer => {
  return {
    ...layer,
    opacity: validateOpacity(opacity),
  };
};

/**
 * Update layer name
 */
export const updateLayerName = (layer: Layer, name: string): Layer => {
  return {
    ...layer,
    name: name.trim() || layer.name, // Don't allow empty names
  };
};

/**
 * Update layer blend mode
 */
export const updateLayerBlendMode = (layer: Layer, blendMode: Layer['blendMode']): Layer => {
  return {
    ...layer,
    blendMode,
  };
};

/**
 * Check if layer has content
 */
export const hasLayerContent = (layer: Layer): boolean => {
  switch (layer.type) {
    case 'image':
      return !!(layer.content as ImageContent).url;
    case 'annotation':
      const annotationContent = layer.content as AnnotationContent;
      return annotationContent.drawings.length > 0 || annotationContent.textAnnotations.length > 0;
    case 'effect':
      return true; // Effects always have content
    default:
      return false;
  }
};

/**
 * Get layer thumbnail URL (for image layers)
 */
export const getLayerThumbnail = (layer: Layer): string | null => {
  if (layer.type === 'image') {
    return (layer.content as ImageContent).url;
  }
  return null;
};

/**
 * Validate layer before adding to panel
 */
export const validateLayer = (layer: Layer): { success: boolean; error?: string } => {
  // Check required fields
  if (!layer.id) {
    return { success: false, error: 'Layer must have an ID' };
  }

  if (!layer.name) {
    return { success: false, error: 'Layer must have a name' };
  }

  if (!['image', 'annotation', 'effect'].includes(layer.type)) {
    return { success: false, error: 'Invalid layer type' };
  }

  // Validate opacity range
  if (layer.opacity < 0 || layer.opacity > 1) {
    return { success: false, error: 'Opacity must be between 0 and 1' };
  }

  // Validate content based on type
  if (!layer.content) {
    return { success: false, error: 'Layer must have content' };
  }

  if (layer.type === 'image' && layer.content.type !== 'image') {
    return { success: false, error: 'Image layer must have image content' };
  }

  if (layer.type === 'annotation' && layer.content.type !== 'annotation') {
    return { success: false, error: 'Annotation layer must have annotation content' };
  }

  if (layer.type === 'effect' && layer.content.type !== 'effect') {
    return { success: false, error: 'Effect layer must have effect content' };
  }

  return { success: true };
};

/**
 * Create default layer based on type
 */
export const createDefaultLayer = (type: 'image' | 'annotation' | 'effect'): Layer => {
  switch (type) {
    case 'image':
      return createImageLayer('', 0, 0, 'New Image Layer');
    case 'annotation':
      return createAnnotationLayer('New Annotation Layer');
    case 'effect':
      return createEffectLayer('blur', { radius: 5 }, 'New Effect Layer');
    default:
      throw new Error(`Unknown layer type: ${type}`);
  }
};
