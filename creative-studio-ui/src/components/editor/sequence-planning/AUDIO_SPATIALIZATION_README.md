# Audio Spatialisation dans Sequence Planning Studio

## Vue d'ensemble

Le Sequence Planning Studio intègre désormais une spatialisation audio automatique en 5.1 et 7.1 basée sur le placement 3D des puppets (marionnettes) dans la scène.

## Fonctionnalités

### Spatialisation Automatique
- **Placement intelligent** : Les propriétés audio (haut-parleur assigné, volume, réverbération) sont automatiquement calculées en fonction de la position 3D de chaque puppet
- **Modes surround** : Support complet des configurations 5.1 et 7.1
- **Mise à jour en temps réel** : Les paramètres audio s'ajustent automatiquement lorsque vous déplacez les éléments

### Contrôles Audio par Élément
- **Activation/désactivation** : Contrôle individuel de l'audio pour chaque puppet
- **Réglages manuels** : Volume, réverbération, délai, et filtres de fréquence
- **Assignation de haut-parleur** : Choix manuel du haut-parleur ou calcul automatique

### Visualisation
- **Indicateurs visuels** : Chaque puppet affiche son assignation de haut-parleur et niveau de volume
- **Aperçu surround** : Vue d'ensemble de la configuration audio avec répartition par haut-parleur
- **Feedback en temps réel** : Mise à jour instantanée des indicateurs lors des déplacements

## Algorithme de Spatialisation

### Calcul de l'assignation de haut-parleur
```typescript
// Basé sur les coordonnées normalisées (x, z)
const angle = atan2(x, z) * (180/π);
const distance = sqrt(x² + z²);

// Zones de haut-parleurs :
// - Avant : -30° à +30°
// - Côtés : ±30° à ±90°
// - Arrière (7.1) : ±90° à ±180°
```

### Ajustements automatiques
- **Volume** : Atténuation basée sur la distance (loi du carré inverse)
- **Réverbération** : Augmentation avec la distance
- **Délai** : Simulation du temps de propagation du son
- **Filtrage** : Atténuation des hautes et basses fréquences selon la distance

## Utilisation

### Activation de la spatialisation
1. Dans la barre d'outils, activez "3D Audio"
2. Choisissez le mode surround (5.1 ou 7.1)
3. Placez vos puppets dans l'espace 3D

### Réglages manuels
1. Sélectionnez un puppet
2. Ouvrez le panel "Propriétés"
3. Ajustez les paramètres audio dans la section "Audio Spatialisé"
4. Utilisez "Auto" pour recalculer automatiquement

### Aperçu surround
1. Cliquez sur "Surround" dans la barre d'outils
2. Visualisez la répartition des éléments par haut-parleur
3. Les points colorés indiquent quels puppets sont assignés à chaque haut-parleur

## Configuration Technique

### Haut-parleurs supportés
- **5.1** : Front L/C/R, Surround L/R, LFE
- **7.1** : Front L/C/R, Surround L/R, Back L/R, LFE

### Propriétés audio
- `enabled`: Activation de l'audio
- `volume`: Niveau sonore (0-1)
- `spatialization`: Utilisation de la spatialisation automatique
- `speakerAssignment`: Haut-parleur assigné
- `reverb`: Niveau de réverbération (0-1)
- `delay`: Délai en millisecondes
- `lowPassFilter`: Filtre passe-bas (Hz)
- `highPassFilter`: Filtre passe-haut (Hz)

## Intégration avec ComfyUI

Les paramètres audio calculés sont automatiquement intégrés dans le workflow de génération ComfyUI, permettant une production vidéo avec spatialisation audio réaliste.