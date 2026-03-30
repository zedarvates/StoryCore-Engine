import { AppDispatch } from '../store';
import { addShotReference, updateShot } from '../store/slices/timelineSlice';
import type { Shot, ServiceAsset } from '../types';

/**
 * Service for integrating external assets into the cinematic timeline
 */
export const AssetIntegrationService = {
  /**
   * Applies one or more assets to a specific shot
   */
  applyToShot(
    assets: ServiceAsset | ServiceAsset[],
    shot: Shot,
    dispatch: AppDispatch
  ): void {
    const assetList = Array.isArray(assets) ? assets : [assets];
    
    assetList.forEach(asset => {
      this._applySingleAsset(asset, shot, dispatch);
    });
  },

  /**
   * Determines the functional category of an asset for integration
   */
  getAssetCategory(asset: ServiceAsset): string {
    if (asset.category) return asset.category;
    if (asset.metadata?.category) return asset.metadata.category;
    
    const tags = asset.tags || asset.metadata?.tags || [];
    if (Array.isArray(tags)) {
      if (tags.includes('character')) return 'character';
      if (tags.includes('environment')) return 'environment';
      if (tags.includes('prop')) return 'prop';
      if (tags.includes('style') || tags.includes('visual-style')) return 'visual-style';
      if (tags.includes('camera')) return 'camera-preset';
      if (tags.includes('lighting')) return 'lighting-rig';
    }
    
    return asset.type;
  },

  /**
   * Internal logic to apply a single asset to a shot
   */
  _applySingleAsset(
    asset: ServiceAsset,
    shot: Shot,
    dispatch: AppDispatch
  ): void {
    const category = this.getAssetCategory(asset);
    const assetUrl = asset.thumbnailUrl || asset.thumbnail || asset.url || '';

    switch (category) {
      case 'character':
      case 'environment':
      case 'prop':
        // Add as reference image
        dispatch(addShotReference({
          shotId: shot.id,
          image: {
            id: `ref-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            url: assetUrl,
            weight: 0.7,
            source: 'library',
          },
        }));
        break;

      case 'visual-style':
      case 'style':
        // Apply visual style name to prompt
        dispatch(updateShot({
          id: shot.id,
          updates: {
            prompt: (shot.prompt || '') + (shot.prompt ? ' ' : '') + `in ${asset.name} style`,
          },
        }));
        
        // Add as reference image with lower weight
        if (assetUrl) {
          dispatch(addShotReference({
            shotId: shot.id,
            image: {
              id: `ref-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              url: assetUrl,
              weight: 0.5,
              source: 'library',
            },
          }));
        }
        break;

      case 'camera-preset':
        dispatch(updateShot({
          id: shot.id,
          updates: {
            prompt: (shot.prompt || '') + (shot.prompt ? ' ' : '') + `with ${asset.name} camera movement`,
          },
        }));
        break;

      case 'lighting-rig':
        dispatch(updateShot({
          id: shot.id,
          updates: {
            prompt: (shot.prompt || '') + (shot.prompt ? ' ' : '') + `with ${asset.name} lighting`,
          },
        }));
        break;

      default:
        // Generic image handling
        if (asset.type === 'image' && assetUrl) {
          dispatch(addShotReference({
            shotId: shot.id,
            image: {
              id: `ref-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              url: assetUrl,
              weight: 0.7,
              source: 'library',
            },
          }));
        }
    }
  }
};
