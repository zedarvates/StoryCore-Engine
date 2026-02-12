/**
 * Location Components
 * 
 * This module exports all location-related UI components for the
 * Locations feature with cube mapping support.
 * 
 * File: creative-studio-ui/src/components/location/index.ts
 */

// ============================================================================
// Core Components (Phase 2)
// ============================================================================

export { LocationCard } from './LocationCard';
export type { LocationCardProps } from './LocationCard';

export { LocationList } from './LocationList';
export type { LocationListProps } from './LocationList';

export { LocationSection } from './LocationSection';
export type { LocationSectionProps } from './LocationSection';

// ============================================================================
// Editor Components (Phase 3)
// ============================================================================

export { LocationEditor } from './LocationEditor';
export type { LocationEditorProps } from './LocationEditor';

export { CubeViewEditor } from './editor/CubeViewEditor';
export type { CubeViewEditorProps } from './editor/CubeViewEditor';

export { CubeFaceGenerator } from './editor/CubeFaceGenerator';
export type { CubeFaceGeneratorProps } from './editor/CubeFaceGenerator';

export { LocationImageGenerator } from './editor/LocationImageGenerator';
export { LocationImagesSection } from './editor/LocationImagesSection';

// ============================================================================
// Panel Components (Phase 4)
// ============================================================================

export { SkyboxPanel } from './SkyboxPanel';
export type { SkyboxPanelProps } from './SkyboxPanel';

export { LocationAssetsPanel } from './LocationAssetsPanel';
export type { LocationAssetsPanelProps } from './LocationAssetsPanel';
