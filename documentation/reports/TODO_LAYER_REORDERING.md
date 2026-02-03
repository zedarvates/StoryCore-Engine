# Tâche: Implémenter Layer Reordering dans VideoEditorPage

**Date:** Janvier 2026
**Priorité:** HAUTE
**Statut:** ✅ TERMINÉ

## Objectif
Implémenter la logique de réorganisation des calques (Layer Reordering) dans VideoEditorPage.tsx pour permettre aux utilisateurs de réorganiser les calques par glisser-déposer.

## Problème
Le callback `onLayerReorder` dans VideoEditorPage.tsx contenait:
```typescript
onLayerReorder={(layerId, newIndex) => {
  // TODO: Implement reordering logic
  console.log('Reorder layer:', layerId, 'to index:', newIndex);
}}
```

## Modifications Appliquées

### Fichier: `creative-studio-ui/src/components/editor/VideoEditorPage.tsx`

**1. Ajout des imports de types:**
```typescript
import type { VolumeKeyframe } from '@/types/timeline';
import type { Layer } from './layers/LayerPanel';
import type { Effect } from '@/types/effect';
import type { TextLayer } from '@/types/text-layer';
```

**2. Ajout des types TypeScript pour les states:**
```typescript
const [volumeKeyframes, setVolumeKeyframes] = useState<VolumeKeyframe[]>([]);
const [appliedEffects, setAppliedEffects] = useState<Effect[]>([]);
const [textClips, setTextClips] = useState<TextLayer[]>([]);
const [selectedTextClip, setSelectedTextClip] = useState<string | null>(null);
const [layers, setLayers] = useState<Layer[]>([]);
const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([]);
```

**3. Implémentation de la logique de réordering:**
```typescript
onLayerReorder={(layerId, newIndex) => {
  // Implémenter la logique de réordering des layers
  setLayers(prev => {
    const oldIndex = prev.findIndex(l => l.id === layerId);
    if (oldIndex === -1) return prev;
    
    const newLayers = [...prev];
    const [removed] = newLayers.splice(oldIndex, 1);
    newLayers.splice(newIndex, 0, removed);
    
    // Mettre à jour les positions z
    return newLayers.map((layer, index) => ({
      ...layer,
      position: { ...layer.position, z: index }
    }));
  });
  console.log('Layer reordered:', layerId, 'to index:', newIndex);
}}
```

## Progression
- [x] Analyser le code existant
- [x] Ajouter les imports de types
- [x] Ajouter les types TypeScript pour les states
- [x] Implémenter la logique de réordering
- [x] Build et validation ✅ TERMINÉ (8.75s, 2285 modules)

## Status: ✅ COMPLÉTION FINALE

**Validation Build:** ✅ SUCCESS (8.75s, 2285 modules)

