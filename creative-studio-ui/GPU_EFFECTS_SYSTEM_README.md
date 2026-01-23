# GPU-Accelerated Effects System

## Vue d'ensemble

Le système d'effets GPU-accéléré de StoryCore est conçu pour fournir des aperçus d'effets en temps réel tout en préservant les ressources GPU pour ComfyUI. Le système utilise WebGL pour le rendu accéléré par GPU avec une gestion intelligente des ressources.

## Architecture

### Composants Principaux

#### 1. EffectPreviewRenderer
- **Rendu WebGL** : Utilise WebGL pour le rendu GPU-accéléré
- **Shaders GLSL** : Effets implémentés via des shaders fragment pour des performances optimales
- **Chaînage d'effets** : Application séquentielle des effets via des framebuffers
- **Optimisation adaptative** : Ajustement automatique de la complexité selon les capacités GPU

#### 2. GPUResourceManager
- **Gestion des ressources** : Allocation et libération intelligentes des ressources GPU
- **Profils de performance** : 5 profils (ultra-low à ultra-high) adaptés aux capacités GPU
- **Surveillance en temps réel** : Monitoring des FPS, mémoire GPU et temps de rendu
- **Optimisation ComfyUI** : Priorité basse pour éviter les conflits avec ComfyUI

#### 3. Profils de Performance

| Profil | FPS Cible | Max Effets | Taille Texture | Complexité Shader | Anti-aliasing |
|--------|-----------|------------|----------------|-------------------|---------------|
| ultra-low | 15 | 2 | 512px | low | non |
| low | 24 | 4 | 720px | low | non |
| medium | 30 | 6 | 1080px | medium | non |
| high | 45 | 8 | 1440px | medium | oui |
| ultra-high | 60 | 12 | 2160px | high | oui |

## Optimisations GPU

### 1. Gestion de la Mémoire
- **Limite stricte** : Maximum 256MB de mémoire GPU
- **Allocation contrôlée** : Textures, framebuffers et shaders gérés individuellement
- **Libération automatique** : Nettoyage des ressources à la fermeture

### 2. Performance Adaptative
- **Détection automatique** : Profil optimal détecté au démarrage
- **Ajustement dynamique** : Désactivation d'effets si dépassement des limites
- **Shaders adaptatifs** : Complexité réduite sur GPU limités

### 3. Coexistence ComfyUI
- **Power Preference** : `low-power` forcé pour éviter la compétition GPU
- **Anti-aliasing désactivé** : Réduction de la charge GPU
- **Monitoring mémoire** : Alertes si utilisation > 200MB

## Effets Supportés

### Effets de Couleur
- **Brightness** : Ajustement de la luminosité
- **Contrast** : Modification du contraste
- **Saturation** : Contrôle de la saturation des couleurs

### Effets Créatifs
- **Sepia** : Effet vintage sépia
- **Vintage** : Look rétro avec teintes modifiées
- **Saturation** : Désaturation/saturation des couleurs

### Effets de Flou
- **Gaussian Blur** : Flou gaussien configurable
- **Motion Blur** : Flou de mouvement simulé

### Transformations
- **Scale** : Redimensionnement avec maintien du ratio
- **Rotation** : Rotation arbitraire avec recadrage

## Utilisation

### Intégration dans l'Éditeur

```tsx
import { EffectPreviewRenderer } from '@/components/editor/effects';

// Dans le composant CanvasArea
<EffectPreviewRenderer
  videoSrc={selectedVideoUrl}
  effects={appliedEffects}
  width={640}
  height={360}
  onPerformanceMetrics={(metrics) => {
    console.log('GPU Performance:', metrics);
  }}
/>
```

### Monitoring des Performances

```tsx
// Le composant fournit automatiquement :
// - FPS en temps réel
// - Utilisation mémoire GPU
// - Nombre d'effets actifs
// - Temps de rendu par frame
```

## Métriques de Performance

### Indicateurs en Temps Réel
- **FPS** : Images par seconde (vert ≥45, orange ≥24, rouge <24)
- **Mémoire GPU** : Utilisation en MB avec alertes >200MB
- **Temps de rendu** : Latence par frame en millisecondes
- **Nombre d'effets** : Effets actifs dans la chaîne

### Optimisations Automatiques
- **Réduction d'effets** : Désactivation automatique si limite dépassée
- **Shaders simplifiés** : Complexité réduite sur GPU faibles
- **Textures optimisées** : Tailles adaptées aux capacités GPU

## Avantages pour ComfyUI

### 1. Utilisation GPU Optimisée
- **Ressources préservées** : Mode basse consommation forcé
- **Allocation contrôlée** : Limites strictes de mémoire
- **Rendu efficient** : Shaders optimisés pour la performance

### 2. Coexistence Paisible
- **Pas de conflit** : GPU partagé efficacement
- **Performance stable** : ComfyUI non impacté par les aperçus
- **Monitoring intégré** : Alertes si ressources critiques

### 3. Fallback Intelligent
- **Dégradation gracieuse** : Retour au Canvas 2D si WebGL échoue
- **Continuité de service** : Fonctionnement même avec GPU limité
- **Adaptation automatique** : Ajustement selon les capacités disponibles

## Développement Futur

### Améliorations Possibles
- **WebGL 2.0** : Support des fonctionnalités avancées
- **Compute Shaders** : Accélération GPU pour effets complexes
- **VRAM Pooling** : Partage intelligent des ressources
- **Multi-GPU** : Support des configurations multi-GPU

### Nouveaux Effets
- **Chroma Key** : Incrustation avancée
- **Particle Systems** : Effets de particules GPU
- **Post-Processing** : Chaîne d'effets avancés
- **Real-time Filters** : Filtres adaptatifs

## Dépannage

### Problèmes Courants
- **WebGL non supporté** : Fallback vers Canvas 2D
- **Mémoire GPU pleine** : Réduction automatique des effets
- **Basses performances** : Profil automatiquement ajusté

### Logs et Diagnostics
```javascript
// Activer les logs détaillés
console.log('GPU Profile:', gpuResourceManager.getPerformanceProfile());
console.log('Memory Usage:', gpuResourceManager.getMemoryUsage());
```

Ce système garantit des aperçus d'effets fluides tout en préservant les ressources GPU essentielles pour ComfyUI, permettant une expérience d'édition vidéo professionnelle sans compromettre les performances d'IA.