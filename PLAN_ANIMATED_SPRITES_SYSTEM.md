# Plan d'Implémentation : Système de Sprites Animés Orientables
## Anime/Manga & Cartoon Effects Integration

---

## 📋 Vue d'ensemble du Projet

### Objectif
Créer un système complet de sprites animés orientables en 2D et 3D, spécialisé pour les dessins animés et animés (japonais, asiatiques, américains). Ce système va au-delà des effets vidéo classiques en offrant un contrôle complet sur l'orientation, l'animation et le style visuel.

### Style Cibles
- **Anime Japonais** : Style ligne claire, yeux expressifs, effets speed lines
- **Manhwa/Manhua Asiatique** : Style webtoon, effets de mouvement fluides
- **Animation Américaine** : Style cartoon, exagération, squash & stretch
- **Hybride** : Fusion des styles pour créations originales

---

## 🏗️ Architecture du Système

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ANIMATED SPRITE SYSTEM                                │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │
│  │  Sprite Editor  │  │ Animation Panel │  │   Effect Composer       │ │
│  │  - Orientation  │  │ - Keyframes     │  │   - Anime Effects       │ │
│  │  - Multi-view   │  │ - Bones/IK      │  │   - Speed Lines         │ │
│  │  - Layers       │  │ - Morphing      │  │   - Impact Frames       │ │
│  └────────┬────────┘  └────────┬────────┘  └────────────┬────────────┘ │
│           │                    │                        │               │
│           └────────────────────┼────────────────────────┘               │
│                                ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                    SPRITE RENDERER ENGINE                           ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  ││
│  │  │  2D Renderer │  │ 3D Billboard │  │   Hybrid 2.5D Renderer   │  ││
│  │  │  - Canvas    │  │ - Three.js   │  │   - Depth Layers         │  ││
│  │  │  - WebGL     │  │ - Sprites    │  │   - Parallax             │  ││
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘  ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                │                                        │
│                                ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                    INTEGRATION LAYER                                ││
│  │  - Video Editor Timeline  │  Effect Stack  │  Export Pipeline      ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Structure des Fichiers à Créer

### 1. Types et Interfaces
```
creative-studio-ui/src/types/
├── sprite.ts                    # Types de base pour sprites
├── spriteAnimation.ts           # Types d'animation
├── spriteOrientation.ts         # Types d'orientation (8-directions)
├── animeEffect.ts               # Effets spécialisés anime
└── spriteRenderer.ts            # Types de rendu
```

### 2. Services
```
creative-studio-ui/src/services/
├── sprite/
│   ├── SpriteService.ts         # Service principal sprites
│   ├── SpriteRenderer.ts        # Rendu 2D/3D
│   ├── SpriteAnimator.ts        # Gestion animations
│   ├── SpriteOrientationManager.ts  # Gestion orientations
│   └── SpriteTypes.ts           # Types internes service
├── animeEffects/
│   ├── AnimeEffectService.ts    # Service effets anime
│   ├── SpeedLinesEffect.ts      # Lignes de vitesse
│   ├── ImpactFrameEffect.ts     # Frames d'impact
│   ├── MotionBlurEffect.ts      # Flou de mouvement
│   └── MangaPanelEffect.ts      # Effet case manga
```

### 3. Composants UI
```
creative-studio-ui/src/components/sprites/
├── SpriteEditor/
│   ├── SpriteEditorPanel.tsx    # Panneau principal
│   ├── SpriteCanvas.tsx         # Canvas d'édition
│   ├── OrientationSelector.tsx  # Sélecteur 8 directions
│   ├── SpriteLayerPanel.tsx     # Gestion calques
│   └── SpritePreview.tsx        # Prévisualisation
├── SpriteAnimation/
│   ├── AnimationTimeline.tsx    # Timeline animation
│   ├── KeyframeEditor.tsx       # Éditeur keyframes
│   ├── BoneEditor.tsx           # Éditeur bones/IK
│   └── AnimationPreview.tsx     # Prévisualisation
├── AnimeEffects/
│   ├── AnimeEffectPanel.tsx     # Panneau effets anime
│   ├── SpeedLinesPanel.tsx      # Config speed lines
│   ├── ImpactFramePanel.tsx     # Config impact frames
│   └── EffectPresets.tsx        # Presets d'effets
└── SpriteLibrary/
    ├── SpriteLibraryPanel.tsx   # Bibliothèque sprites
    ├── SpriteCard.tsx           # Carte sprite
    └── SpriteImporter.tsx       # Import sprites
```

### 4. Stores (State Management)
```
creative-studio-ui/src/stores/
├── spriteStore.ts               # Store principal sprites
├── spriteAnimationStore.ts      # Store animations
└── animeEffectStore.ts          # Store effets anime
```

### 5. Hooks
```
creative-studio-ui/src/hooks/
├── useSprite.ts                 # Hook gestion sprite
├── useSpriteAnimation.ts        # Hook animation
├── useSpriteRenderer.ts         # Hook rendu
└── useAnimeEffect.ts            # Hook effets anime
```

---

## 🔧 Phase 1 : Types et Interfaces de Base

### 1.1 Types Sprites (`sprite.ts`)

```typescript
// Orientation en 8 directions (style RPG/top-down)
export type SpriteOrientation = 
  | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

// Style de sprite
export type SpriteStyle = 
  | 'anime_japanese' 
  | 'manhwa_korean' 
  | 'manhua_chinese' 
  | 'cartoon_american'
  | 'chibi'
  | 'realistic'
  | 'custom';

// Source du sprite
export interface SpriteSource {
  type: 'file' | 'generated' | 'url';
  path?: string;
  url?: string;
  generatedPrompt?: string;
}

// Frame individuelle
export interface SpriteFrame {
  id: string;
  sourceRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  duration: number; // ms
  anchorPoint: { x: number; y: number };
}

// Animation orientable
export interface OrientedAnimation {
  orientation: SpriteOrientation;
  frames: SpriteFrame[];
  loop: boolean;
  loopCount: number; // -1 = infinite
}

// Sprite complet multi-directionnel
export interface AnimatedSprite {
  id: string;
  name: string;
  style: SpriteStyle;
  source: SpriteSource;
  
  // Dimensions
  width: number;
  height: number;
  
  // Animations par orientation
  animations: Map<string, OrientedAnimation>; // key: `${animationName}_${orientation}`
  
  // Animations disponibles
  animationList: string[]; // ['idle', 'walk', 'run', 'attack', ...]
  
  // Métadonnées
  metadata: {
    author?: string;
    created: number;
    modified: number;
    tags: string[];
  };
  
  // Preview
  thumbnail?: string;
}
```

### 1.2 Types d'Effets Anime (`animeEffect.ts`)

```typescript
// Effet Speed Lines
export interface SpeedLinesEffect {
  type: 'speed_lines';
  enabled: boolean;
  
  // Configuration
  lineCount: number;        // 10-100
  lineLength: number;       // 50-500 px
  lineThickness: number;    // 1-10 px
  lineColor: string;
  lineOpacity: number;      // 0-1
  
  // Direction
  direction: 'radial' | 'linear' | 'spiral';
  angle?: number;           // Pour linear
  focalPoint?: { x: number; y: number }; // Pour radial
  
  // Animation
  animated: boolean;
  speed: number;            // 0.1-5
}

// Effet Impact Frame
export interface ImpactFrameEffect {
  type: 'impact_frame';
  enabled: boolean;
  
  // Style
  impactType: 'explosion' | 'punch' | 'slash' | 'magic' | 'emotion';
  intensity: number;        // 0-1
  
  // Effets visuels
  flashColor?: string;
  flashDuration: number;    // ms
  screenShake: {
    enabled: boolean;
    intensity: number;
    duration: number;
  };
  
  // Particules
  particles: {
    enabled: boolean;
    type: 'sparks' | 'debris' | 'magic' | 'custom';
    count: number;
    color: string;
  };
  
  // Durée
  duration: number;         // ms
}

// Effet Manga Panel
export interface MangaPanelEffect {
  type: 'manga_panel';
  enabled: boolean;
  
  // Style de case
  panelStyle: 'rectangle' | 'jagged' | 'burst' | 'focus';
  borderWidth: number;
  borderColor: string;
  
  // Focus
  focusPoint: { x: number; y: number };
  focusSize: { width: number; height: number };
  
  // Background
  backgroundFill: 'solid' | 'gradient' | 'pattern' | 'transparent';
  backgroundColor?: string;
  backgroundPattern?: 'screentone' | 'dots' | 'lines';
  
  // Texte (onomatopée)
  sfxText?: string;
  sfxStyle?: {
    font: string;
    size: number;
    color: string;
    outlineColor?: string;
  };
}

// Effet Motion Trail
export interface MotionTrailEffect {
  type: 'motion_trail';
  enabled: boolean;
  
  trailLength: number;      // nombre de frames
  trailOpacity: number;     // 0-1
  trailColor: string;
  trailBlur: number;        // 0-20 px
  
  // Persistance
  persistence: number;      // 0-1
  fadeMode: 'linear' | 'ease' | 'exponential';
}

// Collection d'effets pour un sprite
export interface SpriteEffectStack {
  spriteId: string;
  effects: AnimeEffect[];
  globalIntensity: number;  // 0-1
}

export type AnimeEffect = 
  | SpeedLinesEffect 
  | ImpactFrameEffect 
  | MangaPanelEffect 
  | MotionTrailEffect;
```

---

## 🔧 Phase 2 : Service de Gestion des Sprites

### 2.1 SpriteService (`services/sprite/SpriteService.ts`)

```typescript
export class SpriteService {
  private sprites: Map<string, AnimatedSprite>;
  private renderer: SpriteRenderer;
  private animator: SpriteAnimator;
  
  // Création de sprite
  async createSprite(config: SpriteCreateConfig): Promise<AnimatedSprite>;
  
  // Import de sprite sheet
  async importSpriteSheet(file: File, config: SpriteSheetConfig): Promise<AnimatedSprite>;
  
  // Génération IA de sprite
  async generateSprite(prompt: string, style: SpriteStyle): Promise<AnimatedSprite>;
  
  // Gestion orientation
  setOrientation(spriteId: string, orientation: SpriteOrientation): void;
  autoOrientToDirection(movement: { x: number; y: number }): SpriteOrientation;
  
  // Animation
  playAnimation(spriteId: string, animationName: string): void;
  pauseAnimation(spriteId: string): void;
  stopAnimation(spriteId: string): void;
  
  // Rendu
  render(ctx: CanvasRenderingContext2D, spriteId: string, position: Point): void;
  renderToThreeJS(scene: THREE.Scene, spriteId: string): THREE.Sprite;
}
```

### 2.2 SpriteOrientationManager

```typescript
export class SpriteOrientationManager {
  // Conversion angle -> orientation
  angleToOrientation(angleDegrees: number): SpriteOrientation;
  
  // Conversion mouvement -> orientation
  movementToOrientation(dx: number, dy: number): SpriteOrientation;
  
  // Interpolation fluide entre orientations
  interpolateOrientations(
    from: SpriteOrientation, 
    to: SpriteOrientation, 
    t: number
  ): SpriteOrientation;
  
  // Obtenir les frames pour une animation orientée
  getOrientedFrames(
    sprite: AnimatedSprite,
    animationName: string,
    orientation: SpriteOrientation
  ): SpriteFrame[];
}
```

---

## 🔧 Phase 3 : Système d'Effets Anime

### 3.1 AnimeEffectService

```typescript
export class AnimeEffectService {
  // Appliquer un effet à un frame
  applyEffect(
    ctx: CanvasRenderingContext2D,
    effect: AnimeEffect,
    bounds: { x: number; y: number; width: number; height: number }
  ): void;
  
  // Speed Lines
  drawSpeedLines(ctx: CanvasRenderingContext2D, config: SpeedLinesEffect): void;
  
  // Impact Frame
  createImpactFrame(config: ImpactFrameEffect): Promise<ImageData>;
  
  // Motion Trail
  applyMotionTrail(
    frames: ImageData[],
    config: MotionTrailEffect
  ): ImageData;
}
```

### 3.2 Effets Visuels Avancés

```typescript
// Speed Lines avec variations anime
export class SpeedLinesRenderer {
  // Lignes droites (action rapide)
  renderLinear(ctx: CanvasRenderingContext2D, config: LinearLinesConfig): void;
  
  // Lignes radiales (puissance, focus)
  renderRadial(ctx: CanvasRenderingContext2D, config: RadialLinesConfig): void;
  
  // Lignes spirales (vortex, confusion)
  renderSpiral(ctx: CanvasRenderingContext2D, config: SpiralLinesConfig): void;
  
  // Lignes de mouvement personnalisées
  renderCustom(ctx: CanvasRenderingContext2D, paths: Path2D[]): void;
}

// Impact Frames stylisés
export class ImpactFrameRenderer {
  // Impact de coup
  renderPunchImpact(ctx: CanvasRenderingContext2D, intensity: number): void;
  
  // Impact d'explosion
  renderExplosionImpact(ctx: CanvasRenderingContext2D, config: ExplosionConfig): void;
  
  // Impact magique
  renderMagicImpact(ctx: CanvasRenderingContext2D, element: 'fire' | 'ice' | 'lightning' | 'dark'): void;
  
  // Impact émotionnel (choc, surprise)
  renderEmotionImpact(ctx: CanvasRenderingContext2D, emotion: string): void;
}
```

---

## 🔧 Phase 4 : Composants UI

### 4.1 Sprite Editor Panel

```tsx
// SpriteEditorPanel.tsx
export function SpriteEditorPanel() {
  // État du sprite en cours d'édition
  const [currentSprite, setCurrentSprite] = useState<AnimatedSprite | null>(null);
  const [selectedOrientation, setSelectedOrientation] = useState<SpriteOrientation>('s');
  const [currentAnimation, setCurrentAnimation] = useState<string>('idle');
  
  return (
    <div className="sprite-editor-panel">
      <SpriteCanvas sprite={currentSprite} />
      <OrientationSelector 
        value={selectedOrientation}
        onChange={setSelectedOrientation}
      />
      <SpriteLayerPanel sprite={currentSprite} />
      <AnimationTimeline 
        frames={currentSprite?.animations.get(`${currentAnimation}_${selectedOrientation}`)?.frames}
      />
    </div>
  );
}
```

### 4.2 Orientation Selector (8-directions)

```tsx
// OrientationSelector.tsx
export function OrientationSelector({ value, onChange }: Props) {
  const orientations: SpriteOrientation[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
  
  return (
    <div className="orientation-selector">
      <div className="orientation-wheel">
        {orientations.map(orient => (
          <button
            key={orient}
            className={cn('orientation-btn', { active: value === orient })}
            onClick={() => onChange(orient)}
          >
            <OrientationIcon orientation={orient} />
          </button>
        ))}
      </div>
      <div className="orientation-preview">
        <SpritePreview orientation={value} />
      </div>
    </div>
  );
}
```

### 4.3 Anime Effect Panel

```tsx
// AnimeEffectPanel.tsx
export function AnimeEffectPanel() {
  const [effects, setEffects] = useState<AnimeEffect[]>([]);
  
  const addEffect = (type: AnimeEffect['type']) => {
    const newEffect = createDefaultEffect(type);
    setEffects([...effects, newEffect]);
  };
  
  return (
    <div className="anime-effect-panel">
      <div className="effect-categories">
        <EffectCategory 
          title="Mouvement" 
          effects={['speed_lines', 'motion_trail']}
          onSelect={addEffect}
        />
        <EffectCategory 
          title="Impact" 
          effects={['impact_frame', 'manga_panel']}
          onSelect={addEffect}
        />
      </div>
      
      <div className="effect-stack">
        {effects.map(effect => (
          <EffectControl 
            key={effect.type}
            effect={effect}
            onChange={(updated) => updateEffect(updated)}
          />
        ))}
      </div>
    </div>
  );
}
```

---

## 🔧 Phase 5 : Intégration avec le Système Existant

### 5.1 Extension du système d'effets existant

```typescript
// Extension de creative-studio-ui/src/types/effect.ts

// Ajouter les types anime au système existant
export interface AppliedEffect extends Effect {
  // ... existing fields ...
  
  // Nouveau: support des effets anime
  animeConfig?: {
    syncWithAnimation: boolean;
    triggerMode: 'auto' | 'manual' | 'keyframe';
    layerMode: 'overlay' | 'underlay' | 'replace';
  };
}

// Nouveau type d'effet pour les sprites animés
export interface SpriteEffect extends Effect {
  type: 'animated-sprite';
  spriteId: string;
  animation: string;
  orientation: SpriteOrientation;
  orientationMode: 'fixed' | 'auto' | 'keyframe';
  
  // Transformation
  transform: {
    position: { x: number; y: number };
    scale: number;
    rotation: number;
    flipH: boolean;
    flipV: boolean;
  };
  
  // Effets appliqués
  effects: AnimeEffect[];
}
```

### 5.2 Intégration avec VideoEditorContext

```typescript
// Extension de VideoEditorContext
interface VideoEditorContextType {
  // ... existing fields ...
  
  // Nouveau: Sprites
  sprites: Map<string, AnimatedSprite>;
  activeSpriteId: string | null;
  
  // Actions sprites
  addSprite: (sprite: AnimatedSprite) => void;
  removeSprite: (spriteId: string) => void;
  updateSprite: (spriteId: string, updates: Partial<AnimatedSprite>) => void;
  setSpriteOrientation: (spriteId: string, orientation: SpriteOrientation) => void;
  playSpriteAnimation: (spriteId: string, animation: string) => void;
  
  // Effets anime
  applyAnimeEffect: (spriteId: string, effect: AnimeEffect) => void;
  removeAnimeEffect: (spriteId: string, effectIndex: number) => void;
}
```

### 5.3 Intégration avec Three.js existant

```typescript
// Extension du ThreeJsService pour les sprites 3D

// Dans ThreeJsService.ts
export class ThreeJsService {
  // ... existing methods ...
  
  // Nouveau: Créer un sprite billboard orientable
  createAnimatedSprite(
    sprite: AnimatedSprite,
    config: Sprite3DConfig
  ): THREE.Group {
    // Créer un groupe avec 8 plans pour chaque orientation
    const group = new THREE.Group();
    
    // Configuration du billboard
    const billboard = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.createSpriteTexture(sprite),
        transparent: true,
        alphaTest: 0.1
      })
    );
    
    group.add(billboard);
    return group;
  }
  
  // Mettre à jour l'orientation du sprite basé sur la caméra
  updateSpriteOrientation(
    spriteGroup: THREE.Group,
    cameraPosition: THREE.Vector3
  ): void {
    // Calculer l'angle et sélectionner la bonne orientation
  }
}
```

---

## 📊 Timeline d'Implémentation

### Sprint 1 (Semaine 1-2) : Fondations
- [ ] Créer les types de base (`sprite.ts`, `animeEffect.ts`)
- [ ] Implémenter `SpriteService` de base
- [ ] Créer le store Zustand pour les sprites
- [ ] Tests unitaires pour les services de base

### Sprint 2 (Semaine 3-4) : Rendu 2D
- [ ] Implémenter `SpriteRenderer` 2D
- [ ] Créer `SpriteOrientationManager`
- [ ] Composant `SpriteCanvas` de base
- [ ] Prévisualisation des animations

### Sprint 3 (Semaine 5-6) : Effets Anime
- [ ] Service `AnimeEffectService`
- [ ] Implémenter Speed Lines
- [ ] Implémenter Impact Frames
- [ ] Panel de configuration des effets

### Sprint 4 (Semaine 7-8) : UI Complète
- [ ] `SpriteEditorPanel` complet
- [ ] `OrientationSelector` interactif
- [ ] `AnimationTimeline` avec keyframes
- [ ] Bibliothèque de sprites

### Sprint 5 (Semaine 9-10) : Intégration 3D
- [ ] Intégration Three.js pour sprites billboard
- [ ] Rendu hybride 2.5D
- [ ] Profondeur et parallax

### Sprint 6 (Semaine 11-12) : Polish et Tests
- [ ] Optimisation performance
- [ ] Tests E2E
- [ ] Documentation
- [ ] Exemples et presets

---

## 🎨 Styles et Presets Inclus

### Presets Anime Japonais
```typescript
const animePresets = {
  // Style shonen (action)
  shonen_action: {
    speedLines: { lineCount: 30, intensity: 'high' },
    impactFrames: { impactType: 'punch', screenShake: true }
  },
  
  // Style shojo (romance)
  shojo_romance: {
    speedLines: { lineCount: 50, style: 'sparkle' },
    mangaPanels: { panelStyle: 'soft', backgroundPattern: 'flowers' }
  },
  
  // Style seinen (mature)
  seinen_drama: {
    speedLines: { lineCount: 15, style: 'subtle' },
    motionTrail: { trailLength: 5, trailOpacity: 0.3 }
  }
};
```

### Presets Cartoon Américain
```typescript
const cartoonPresets = {
  // Style cartoon classique
  classic_cartoon: {
    squashStretch: true,
    impactFrames: { impactType: 'exaggerated', flashColor: '#FFFFFF' }
  },
  
  // Style modern cartoon
  modern_cartoon: {
    motionTrail: { trailLength: 3, style: 'outline' },
    impactFrames: { particles: { type: 'stars' } }
  }
};
```

---

## 🚀 Points d'Extension Futurs

1. **Génération IA de Sprites**
   - Intégration avec ComfyUI pour générer des sprites
   - Style transfer pour uniformiser les sprites

2. **Système de Bones/IK**
   - Skeleton-based animation
   - Inverse Kinematics pour les membres

3. **Lip Sync**
   - Synchronisation labiale automatique
   - Phonèmes visuels pour personnages animés

4. **Particle System Intégré**
   - Effets de particules couplés aux animations
   - Émissions synchronisées avec les keyframes

5. **Export Multi-Format**
   - Export vers formats de jeu (Unity, Godot)
   - Export vidéo avec effets

---

## 📝 Notes Techniques

### Performance
- Utiliser WebGL pour le rendu de nombreux sprites
- Mémorisation des textures orientées
- Lazy loading des animations non-utilisées

### Compatibilité
- Support Canvas 2D et WebGL
- Fallback pour navigateurs sans WebGL2
- Responsive design pour l'éditeur

### Extensibilité
- Système de plugins pour nouveaux effets
- API publique pour intégrations tierces
- Format de fichier ouvert pour sprites

---

*Document créé pour StoryCore Engine - Système de Sprites Animés Orientables*
*Version 1.0 - 2026*