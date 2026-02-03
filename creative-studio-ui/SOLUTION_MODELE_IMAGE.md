# Solution: Pas de Modèle d'Image Compatible

## Problème Actuel

**Erreur**: `The size of tensor a (64) must match the size of tensor b (16)`

**Cause**: ACE Step (`ace_step_v1_3.5b.safetensors`) est un **modèle audio**, pas un modèle d'image. Il ne peut pas générer d'images.

### Modèles Disponibles

| Modèle | Type | Usage | Compatible Image? |
|--------|------|-------|-------------------|
| `ace_step_v1_3.5b.safetensors` | Audio | Text-to-Audio | ❌ Non |
| `ltx-2-19b-dev-fp8.safetensors` | Video | Image-to-Video | ❌ Non (besoin image input) |
| `ltx-2-19b-distilled.safetensors` | Video | Image-to-Video | ❌ Non (besoin image input) |
| `stable-audio-open-1.0.safetensors` | Audio | Audio generation | ❌ Non |

**Résultat**: Tu n'as **AUCUN modèle d'image** installé dans ComfyUI.

## Solutions

### Option 1: Installer Flux Turbo (Recommandé) 🚀

**Le workflow de ce matin est fait pour Flux Turbo.**

**Téléchargement**:
```bash
# Via wget (Linux/Mac)
cd ComfyUI/models/checkpoints/
wget https://huggingface.co/black-forest-labs/FLUX.1-schnell/resolve/main/flux1-schnell.safetensors
mv flux1-schnell.safetensors z_image_turbo_bf16.safetensors

# Via navigateur
# 1. Aller sur: https://huggingface.co/black-forest-labs/FLUX.1-schnell
# 2. Télécharger flux1-schnell.safetensors (23 GB)
# 3. Renommer en z_image_turbo_bf16.safetensors
# 4. Placer dans ComfyUI/models/checkpoints/
```

**Avantages**:
- ✅ Workflow déjà configuré
- ✅ Très rapide (4 steps)
- ✅ Excellente qualité
- ✅ Code de ce matin fonctionne directement

**Inconvénients**:
- ⏱️ 23 GB à télécharger

### Option 2: Installer Stable Diffusion 1.5 (Rapide) ⚡

**Plus petit et rapide à télécharger.**

**Téléchargement**:
```bash
cd ComfyUI/models/checkpoints/
wget https://huggingface.co/runwayml/stable-diffusion-v1-5/resolve/main/v1-5-pruned-emaonly.safetensors

# Ou via navigateur:
# https://huggingface.co/runwayml/stable-diffusion-v1-5
# Télécharger v1-5-pruned-emaonly.safetensors (4 GB)
```

**Avantages**:
- ✅ Petit (4 GB)
- ✅ Rapide à télécharger
- ✅ Compatible workflow simple
- ✅ Bien testé

**Inconvénients**:
- ⚠️ Qualité inférieure à Flux
- ⚠️ Plus lent (20-30 steps)

**Code à utiliser**:
```typescript
model: 'v1-5-pruned-emaonly.safetensors'
steps: 25
cfgScale: 7.5
scheduler: 'normal'
width: 512
height: 512
```

### Option 3: Installer SDXL (Meilleure Qualité) 🎨

**Meilleur compromis qualité/taille.**

**Téléchargement**:
```bash
cd ComfyUI/models/checkpoints/
wget https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors

# Ou via navigateur:
# https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0
# Télécharger sd_xl_base_1.0.safetensors (6.9 GB)
```

**Avantages**:
- ✅ Excellente qualité
- ✅ Taille raisonnable (7 GB)
- ✅ Compatible workflow simple

**Inconvénients**:
- ⚠️ Plus lent que SD 1.5
- ⚠️ Besoin plus de VRAM

**Code à utiliser**:
```typescript
model: 'sd_xl_base_1.0.safetensors'
steps: 25
cfgScale: 7.0
scheduler: 'normal'
width: 1024
height: 1024
```

### Option 4: Mode Mock (Développement Seulement) 🎭

**Pour tester sans modèle.**

**Implémentation**:

```typescript
// Dans comfyuiService.ts
const MOCK_MODE = import.meta.env.VITE_COMFYUI_MOCK === 'true';

public async generateImage(params: any): Promise<string> {
  if (MOCK_MODE) {
    console.log('🎭 [ComfyUIService] MOCK MODE - Generating placeholder');
    await new Promise(resolve => setTimeout(resolve, 2000));
    // Utiliser DiceBear pour générer un avatar
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${params.seed}`;
  }
  
  // Code normal...
}
```

**Fichier `.env`**:
```
VITE_COMFYUI_MOCK=true
```

**Avantages**:
- ✅ Pas de téléchargement
- ✅ Fonctionne immédiatement
- ✅ Bon pour développement UI

**Inconvénients**:
- ❌ Pas de vraie génération
- ❌ Avatars génériques

## Recommandation par Cas d'Usage

### Pour Développement Immédiat
**Option 4: Mode Mock** → Teste l'UI sans attendre

### Pour Tests Rapides
**Option 2: SD 1.5** → 4 GB, fonctionne bien

### Pour Production
**Option 1: Flux Turbo** → Meilleure qualité + vitesse

### Pour Meilleur Compromis
**Option 3: SDXL** → Bonne qualité, taille OK

## Comparaison des Modèles

| Modèle | Taille | Vitesse | Qualité | Téléchargement |
|--------|--------|---------|---------|----------------|
| **Flux Turbo** | 23 GB | ⭐⭐⭐⭐⭐ (4 steps) | ⭐⭐⭐⭐⭐ | ~2h (10 Mbps) |
| **SDXL** | 7 GB | ⭐⭐⭐ (25 steps) | ⭐⭐⭐⭐ | ~40 min |
| **SD 1.5** | 4 GB | ⭐⭐⭐⭐ (25 steps) | ⭐⭐⭐ | ~20 min |
| **Mock** | 0 GB | ⭐⭐⭐⭐⭐ (instant) | ⭐ | 0 min |

## Instructions Détaillées

### Installer Flux Turbo (Recommandé)

1. **Télécharger**:
   - Aller sur https://huggingface.co/black-forest-labs/FLUX.1-schnell
   - Cliquer sur "Files and versions"
   - Télécharger `flux1-schnell.safetensors` (23 GB)

2. **Installer**:
   ```bash
   # Renommer
   mv flux1-schnell.safetensors z_image_turbo_bf16.safetensors
   
   # Déplacer
   mv z_image_turbo_bf16.safetensors "C:\Users\redga\AppData\Local\Programs\@comfyorgcomfyui-electron\resources\ComfyUI\models\checkpoints\"
   ```

3. **Redémarrer ComfyUI Desktop**

4. **Revenir au code original**:
   ```typescript
   // CharacterCard.tsx et CharacterImageGenerator.tsx
   model: 'z_image_turbo_bf16.safetensors'
   steps: 4
   cfgScale: 1.0
   scheduler: 'simple'
   width: 256
   height: 256
   ```

### Installer SD 1.5 (Rapide)

1. **Télécharger**:
   - https://huggingface.co/runwayml/stable-diffusion-v1-5
   - Télécharger `v1-5-pruned-emaonly.safetensors` (4 GB)

2. **Installer**:
   ```bash
   mv v1-5-pruned-emaonly.safetensors "C:\Users\redga\AppData\Local\Programs\@comfyorgcomfyui-electron\resources\ComfyUI\models\checkpoints\"
   ```

3. **Redémarrer ComfyUI**

4. **Mettre à jour le code**:
   ```typescript
   model: 'v1-5-pruned-emaonly.safetensors'
   steps: 25
   cfgScale: 7.5
   scheduler: 'normal'
   width: 512
   height: 512
   ```

### Activer Mode Mock (Temporaire)

1. **Créer `.env`** dans `creative-studio-ui/`:
   ```
   VITE_COMFYUI_MOCK=true
   ```

2. **Redémarrer le serveur dev**:
   ```bash
   npm run dev
   ```

3. **Tester** → Génère des avatars DiceBear

## Prochaines Étapes

1. **Immédiat**: Choisir une option ci-dessus
2. **Court terme**: Installer Flux Turbo pour production
3. **Moyen terme**: Ajouter sélection de modèle dans l'UI
4. **Long terme**: Support multi-modèles avec cache

---

**Status**: ⚠️ Bloqué - Aucun modèle d'image disponible
**Action Requise**: Installer un modèle d'image (Options 1-3)
**Workaround**: Mode Mock (Option 4)
