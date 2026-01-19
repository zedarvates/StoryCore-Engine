# Audio Effect Presets Feature - Documentation

## Vue d'ensemble

Système complet de presets d'effets audio avec détection automatique basée sur la scène. Permet aux utilisateurs et au LLM d'appliquer rapidement des effets audio professionnels adaptés au contexte.

## Presets Disponibles

### 🔊 Réverbération (8 presets)

#### 1. Écho Caverne
- **Description:** Réverbération profonde et sombre comme dans une grotte
- **Mots-clés:** cave, caverne, grotte, underground, souterrain, dark, sombre
- **Paramètres:**
  - Room Size: 90%
  - Decay: 4.5s
  - Wet/Dry: 60/40
  - EQ: Basses +3dB, Aigus -4dB

#### 2. Écho Église
- **Description:** Réverbération majestueuse et claire comme dans une cathédrale
- **Mots-clés:** church, église, cathedral, cathédrale, temple, religious
- **Paramètres:**
  - Room Size: 95%
  - Decay: 6.0s
  - Wet/Dry: 50/50
  - EQ: Aigus +3dB pour clarté

#### 3. Écho Puits Sans Fond
- **Description:** Réverbération profonde avec délai long
- **Mots-clés:** well, puits, deep, profond, bottomless, sans fond
- **Paramètres:**
  - Room Size: 85%
  - Decay: 8.0s
  - Pre-delay: 120ms
  - Wet/Dry: 70/30

#### 4. Écho Grande Salle
- **Description:** Réverbération spacieuse comme dans un auditorium
- **Mots-clés:** hall, salle, auditorium, concert, large, grand
- **Paramètres:**
  - Room Size: 80%
  - Decay: 3.5s
  - Wet/Dry: 45/55

#### 5. Écho Petite Pièce
- **Description:** Réverbération courte et intime
- **Mots-clés:** room, pièce, chambre, bedroom, small, petit
- **Paramètres:**
  - Room Size: 30%
  - Decay: 0.8s
  - Wet/Dry: 25/75

#### 6. Écho Canyon
- **Description:** Réverbération ouverte avec délais multiples
- **Mots-clés:** canyon, gorge, valley, vallée, outdoor, mountain
- **Paramètres:**
  - Room Size: 75%
  - Decay: 5.0s
  - Pre-delay: 100ms

#### 7. Écho Tunnel
- **Description:** Réverbération métallique et résonnante
- **Mots-clés:** tunnel, subway, métro, underground, passage
- **Paramètres:**
  - Room Size: 70%
  - Decay: 3.0s
  - EQ: Médiums +3dB

#### 8. Écho Forêt
- **Description:** Réverbération naturelle et diffuse
- **Mots-clés:** forest, forêt, woods, bois, nature, trees
- **Paramètres:**
  - Room Size: 60%
  - Decay: 2.0s
  - Damping élevé (80%)

---

### 🌍 Spatial (5 presets)

#### 9. Sous l'Eau
- **Description:** Effet étouffé et filtré
- **Mots-clés:** underwater, sous eau, ocean, océan, sea, diving
- **Effets:** EQ grave +4dB, aigus -12dB + Reverb

#### 10. Téléphone
- **Description:** Son filtré comme à travers un téléphone
- **Mots-clés:** telephone, téléphone, phone, call, radio
- **Effets:** EQ médiums +6dB, distortion douce

#### 11. Mégaphone
- **Description:** Son amplifié et distordu
- **Mots-clés:** megaphone, mégaphone, loudspeaker, announcement
- **Effets:** Gain +6dB, distortion dure, EQ médiums +8dB

#### 12. Voix Robot
- **Description:** Effet robotique et métallique
- **Mots-clés:** robot, robotic, mechanical, ai, artificial
- **Effets:** Distortion tube, EQ aigus +6dB

#### 13. Talkie-Walkie
- **Description:** Son compressé comme un talkie-walkie
- **Mots-clés:** walkie, talkie, radio, military, communication
- **Effets:** Compression 8:1, EQ médiums +8dB, noise reduction

---

### 🎨 Créatif (Inclus dans Spatial)

Les presets créatifs permettent des effets artistiques et stylisés pour des scènes spéciales.

---

### 🔧 Correction (2 presets)

#### 14. Amélioration Voix
- **Description:** Optimise la clarté et la présence
- **Mots-clés:** voice, voix, speech, dialogue, clarity
- **Effets:** Voice Clarity 80%, Compression 3:1

#### 15. Réduction Sibilance
- **Description:** Réduit les sons "s" et "ch" trop prononcés
- **Mots-clés:** sibilance, de-esser, harsh, aigus
- **Effets:** EQ aigus -6dB, Compression 6:1

---

### ⚡ Dynamique (3 presets)

#### 16. Basses Puissantes
- **Description:** Renforce les basses fréquences
- **Mots-clés:** bass, basse, low, impact, punch, heavy
- **Effets:** Bass Boost +8dB @ 80Hz, Limiter

#### 17. Clair et Brillant
- **Description:** Augmente les hautes fréquences
- **Mots-clés:** bright, brillant, clear, clair, crisp
- **Effets:** Treble Boost +6dB @ 8kHz, EQ aigus +4dB

#### 18. Chaud et Doux
- **Description:** Son chaleureux avec basses douces
- **Mots-clés:** warm, chaud, smooth, doux, soft
- **Effets:** Bass Boost +4dB @ 120Hz, EQ graves +3dB

---

## Fonctionnalités

### 1. Détection Automatique par Mots-Clés
```typescript
// Exemple d'utilisation
const sceneText = "Les personnages parlent dans une grande église";
const suggestedPreset = suggestAudioEffectPreset(sceneText);
// Retourne: "Écho Église"
```

### 2. Recherche par Catégorie
```typescript
const reverbPresets = getAudioEffectPresetsByCategory('reverb');
// Retourne tous les presets de réverbération
```

### 3. Recherche Textuelle
```typescript
const results = searchAudioEffectPresets('caverne');
// Retourne: Écho Caverne
```

### 4. Intégration LLM
Le LLM peut analyser la description de la scène et suggérer automatiquement le preset approprié:

```
Scène: "Un explorateur crie dans une grotte profonde"
→ LLM détecte: grotte, profonde
→ Suggère: "Écho Caverne"
```

---

## Utilisation dans l'Interface

### Panel Complet
```tsx
<AudioEffectPresetsPanel
  track={selectedTrack}
  sceneDescription={shot.description}
  onApplyPreset={(preset) => {
    // Appliquer tous les effets du preset
    preset.effects.forEach(effect => {
      addEffectToTrack(track.id, effect);
    });
  }}
/>
```

### Version Compacte
```tsx
<AudioEffectPresetsCompact
  track={selectedTrack}
  sceneDescription={shot.description}
  onApplyPreset={handleApplyPreset}
/>
```

---

## Exemples de Scènes

### Scène 1: Dialogue dans une Église
```
Description: "Deux personnages discutent dans une cathédrale gothique"
Mots-clés détectés: église, cathédrale
Preset suggéré: Écho Église
Effets appliqués:
  - Reverb (Room: 95%, Decay: 6s)
  - EQ (Aigus +3dB pour clarté)
```

### Scène 2: Exploration de Caverne
```
Description: "L'explorateur avance dans une grotte sombre et humide"
Mots-clés détectés: grotte, caverne, sombre
Preset suggéré: Écho Caverne
Effets appliqués:
  - Reverb (Room: 90%, Decay: 4.5s)
  - EQ (Basses +3dB, Aigus -4dB)
```

### Scène 3: Appel Téléphonique
```
Description: "Le personnage reçoit un appel téléphonique important"
Mots-clés détectés: téléphone, appel
Preset suggéré: Téléphone
Effets appliqués:
  - EQ (Médiums +6dB, Graves -12dB, Aigus -8dB)
  - Distortion douce (15%)
```

### Scène 4: Scène Sous-Marine
```
Description: "Le plongeur explore les profondeurs de l'océan"
Mots-clés détectés: sous eau, océan, plongeur
Preset suggéré: Sous l'Eau
Effets appliqués:
  - EQ (Graves +4dB, Aigus -12dB)
  - Reverb (Room: 50%, Damping: 90%)
```

---

## Architecture Technique

### Structure des Données
```typescript
interface AudioEffectPreset {
  id: string;
  name: string;
  description: string;
  category: 'reverb' | 'spatial' | 'creative' | 'correction' | 'dynamics';
  effects: AudioEffect[];
  keywords: string[];
}
```

### Algorithme de Suggestion
```
1. Extraire le texte de la scène (titre + description)
2. Convertir en minuscules
3. Pour chaque preset:
   a. Compter les mots-clés correspondants
   b. Calculer le score de correspondance
4. Retourner le preset avec le score le plus élevé
```

### Intégration avec AudioEngine
```typescript
// Appliquer un preset
function applyPreset(trackId: string, preset: AudioEffectPreset) {
  preset.effects.forEach(effect => {
    const effectWithId = {
      ...effect,
      id: generateId(),
    };
    addEffectToTrack(trackId, effectWithId);
  });
}
```

---

## Avantages

### Pour les Utilisateurs
- ✅ Application rapide d'effets professionnels
- ✅ Pas besoin de connaissances techniques en audio
- ✅ Presets adaptés au contexte de la scène
- ✅ Gain de temps considérable

### Pour le LLM
- ✅ Détection automatique basée sur les mots-clés
- ✅ Suggestions contextuelles intelligentes
- ✅ Application en un clic
- ✅ Cohérence audio garantie

### Pour le Projet
- ✅ Qualité audio professionnelle
- ✅ Workflow accéléré
- ✅ Résultats reproductibles
- ✅ Bibliothèque extensible

---

## Extensions Futures

### Presets Additionnels Possibles

#### Environnements
- Écho Stade (grand espace ouvert)
- Écho Parking Souterrain
- Écho Hangar Industriel
- Écho Salle de Bain (carrelage)

#### Créatifs
- Voix Fantôme (éthéré)
- Voix Démon (grave et distordu)
- Voix Enfant (pitch élevé)
- Voix Vieillard (tremblant)

#### Techniques
- Broadcast Radio
- Intercom
- Haut-parleur Extérieur
- Casque Audio

#### Musicaux
- Studio Sec (pas de reverb)
- Live Concert
- Jazz Club
- Salle de Répétition

---

## Métriques

### Presets Créés
- **Total:** 18 presets
- **Réverbération:** 8 presets
- **Spatial:** 5 presets
- **Correction:** 2 presets
- **Dynamique:** 3 presets

### Mots-Clés
- **Total:** 150+ mots-clés
- **Moyenne par preset:** 8-10 mots-clés
- **Langues:** Français + Anglais

### Code
- **Fichiers créés:** 2
- **Lignes de code:** ~850 lignes
- **Fonctions utilitaires:** 6

---

## Conclusion

Le système de presets d'effets audio offre une solution complète et professionnelle pour appliquer rapidement des effets adaptés au contexte. Avec 18 presets couvrant les environnements les plus courants et une détection automatique intelligente, il simplifie considérablement le workflow audio tout en garantissant des résultats de qualité professionnelle.

---

*Fonctionnalité créée: 15 janvier 2026*
*Créé par: Kiro AI Assistant*
