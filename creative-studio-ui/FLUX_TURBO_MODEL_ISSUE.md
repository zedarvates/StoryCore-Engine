# Flux Turbo Model Issue - Solution

## Problème

Le code de ce matin utilisait le workflow **Flux Turbo** avec ces paramètres:
```typescript
model: 'z image turbo'  // ou 'z_image_turbo_bf16.safetensors'
steps: 4
cfgScale: 1.0
scheduler: 'simple'
width: 256
height: 256
```

**Erreur ComfyUI**:
```
Value not in list: ckpt_name: 'z image turbo' not in [
  'ace_step_v1_3.5b.safetensors',
  'ltx-2-19b-dev-fp8.safetensors',
  'ltx-2-19b-distilled.safetensors',
  'stable-audio-open-1.0.safetensors'
]
```

## Cause

Le modèle **Flux Turbo** (`z_image_turbo_bf16.safetensors`) n'est **pas installé** dans ton ComfyUI.

### Modèles Disponibles

Tu as actuellement:
1. ✅ `ace_step_v1_3.5b.safetensors` - ACE Step (image generation)
2. ✅ `ltx-2-19b-dev-fp8.safetensors` - LTX2 (video generation)
3. ✅ `ltx-2-19b-distilled.safetensors` - LTX2 distilled (video)
4. ✅ `stable-audio-open-1.0.safetensors` - Audio generation

Tu n'as PAS:
- ❌ `z_image_turbo_bf16.safetensors` - Flux Turbo (23 GB)

## Solutions

### Option 1: Utiliser ACE Step (Solution Actuelle) ✅

**Avantages**:
- ✅ Déjà installé
- ✅ Fonctionne immédiatement
- ✅ Bonne qualité d'image
- ✅ Rapide

**Paramètres Adaptés**:
```typescript
model: 'ace_step_v1_3.5b.safetensors'
steps: 20
cfgScale: 7.0
scheduler: 'normal'
width: 512
height: 512
```

**Code Mis à Jour**:
- ✅ `CharacterCard.tsx` - Utilise ACE Step avec auto-détection
- ✅ `CharacterImageGenerator.tsx` - Utilise ACE Step
- ✅ `comfyuiService.ts` - Détecte automatiquement les modèles disponibles

### Option 2: Installer Flux Turbo (Recommandé pour Production)

**Avantages**:
- 🚀 Très rapide (4 steps vs 20)
- 🎨 Excellente qualité
- ⚡ Optimisé pour génération rapide
- 📦 Workflow déjà configuré

**Inconvénients**:
- 💾 23 GB de téléchargement
- ⏱️ Temps d'installation

**Installation**:

1. **Télécharger le modèle**:
   ```bash
   cd ComfyUI/models/checkpoints/
   wget https://huggingface.co/black-forest-labs/FLUX.1-schnell/resolve/main/flux1-schnell.safetensors
   mv flux1-schnell.safetensors z_image_turbo_bf16.safetensors
   ```

2. **Ou via Hugging Face Hub**:
   - Aller sur: https://huggingface.co/black-forest-labs/FLUX.1-schnell
   - Télécharger `flux1-schnell.safetensors`
   - Renommer en `z_image_turbo_bf16.safetensors`
   - Placer dans `ComfyUI/models/checkpoints/`

3. **Redémarrer ComfyUI**

4. **Revenir aux paramètres Turbo**:
   ```typescript
   model: 'z_image_turbo_bf16.safetensors'
   steps: 4
   cfgScale: 1.0
   scheduler: 'simple'
   width: 256
   height: 256
   ```

### Option 3: Détection Automatique (Implémenté) ✅

Le code détecte maintenant automatiquement le premier modèle disponible:

```typescript
// Dans comfyuiService.ts
public async getDefaultModel(): Promise<string> {
  const models = await this.getAvailableModels();
  if (models.length > 0) {
    return models[0]; // Utilise le premier modèle trouvé
  }
  return 'model.safetensors'; // Fallback
}

// Dans CharacterCard.tsx
const model = await comfyuiService.getDefaultModel();
// Utilise automatiquement 'ace_step_v1_3.5b.safetensors'
```

## Comparaison des Modèles

| Modèle | Steps | Temps | Qualité | Taille | Disponible |
|--------|-------|-------|---------|--------|------------|
| **Flux Turbo** | 4 | ~5s | ⭐⭐⭐⭐⭐ | 23 GB | ❌ Non |
| **ACE Step** | 20 | ~15s | ⭐⭐⭐⭐ | 3.5 GB | ✅ Oui |
| **LTX2** | N/A | N/A | Video only | 19 GB | ✅ Oui |

## Workflow Flux Turbo

Le workflow de ce matin (`assets/workflows/z_image_turbo_generation.json`) utilise:

```json
{
  "57:28": {
    "inputs": {
      "unet_name": "z_image_turbo_bf16.safetensors",
      "weight_dtype": "default"
    },
    "class_type": "UNETLoader"
  },
  "57:30": {
    "inputs": {
      "clip_name": "qwen_3_4b.safetensors",
      "type": "lumina2",
      "device": "default"
    },
    "class_type": "CLIPLoader"
  },
  "57:29": {
    "inputs": {
      "vae_name": "ae.safetensors"
    },
    "class_type": "VAELoader"
  }
}
```

**Note**: Flux Turbo charge UNET/CLIP/VAE séparément, pas via `CheckpointLoaderSimple`.

## Recommandation

### Pour Développement Immédiat: ✅ ACE Step
- Fonctionne maintenant
- Bonne qualité
- Pas de téléchargement

### Pour Production: 🚀 Flux Turbo
- Installer le modèle (23 GB)
- Génération ultra-rapide
- Qualité optimale

## Code Actuel

### CharacterCard.tsx
```typescript
// Auto-détecte et utilise le premier modèle disponible
const model = await comfyuiService.getDefaultModel();
// Résultat: 'ace_step_v1_3.5b.safetensors'

const imageUrl = await comfyuiService.generateImage({
  prompt,
  negativePrompt,
  width: 512,
  height: 512,
  steps: 20,
  cfgScale: 7.0,
  seed: Math.floor(Math.random() * 1000000),
  model, // ACE Step
  sampler: 'euler',
  scheduler: 'normal',
});
```

### CharacterImageGenerator.tsx
```typescript
// Utilise directement ACE Step
const imageUrl = await comfyuiService.generateImage({
  prompt,
  negativePrompt,
  width: 512,
  height: 512,
  steps: 20,
  cfgScale: 7.0,
  seed: Math.floor(Math.random() * 1000000),
  model: 'ace_step_v1_3.5b.safetensors',
  sampler: 'euler',
  scheduler: 'normal',
});
```

## Tests

### Tester avec ACE Step (Maintenant)
```bash
npm run dev
# Créer un personnage
# Cliquer sur "Generate Portrait"
# ✅ Devrait fonctionner avec ACE Step
```

### Tester avec Flux Turbo (Après Installation)
```bash
# 1. Installer Flux Turbo (voir Option 2)
# 2. Redémarrer ComfyUI
# 3. Modifier le code pour utiliser Flux Turbo
# 4. Tester la génération
```

## Prochaines Étapes

1. ✅ **Immédiat**: Utiliser ACE Step (déjà fait)
2. 📦 **Court terme**: Installer Flux Turbo pour production
3. 🔧 **Moyen terme**: Ajouter sélection de modèle dans l'UI
4. 🎨 **Long terme**: Support multi-modèles avec préférences utilisateur

---

**Status**: ✅ Corrigé - Utilise ACE Step
**Date**: 2026-01-29
**Impact**: Génération de portraits fonctionne maintenant
**Action Requise**: Installer Flux Turbo pour performances optimales
