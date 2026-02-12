# Plan d'Intégration : Fenêtre de Planification de Séquence Avancée

## Vue d'Ensemble
Créer une fenêtre unifiée permettant de planifier visuellement les séquences avec placement de puppets, décors, génération de prompts via LLM, et génération automatique via ComfyUI.

## Architecture Proposée

### 1. Composant Principal : `SequencePlanningStudio`
**Emplacement** : `src/components/editor/SequencePlanningStudio.tsx`

**Responsabilités** :
- Interface principale de planification
- Gestion de l'état global de la séquence
- Coordination entre les différents panels
- Export vers ComfyUI

**Structure** :
```tsx
interface SequencePlanningStudioProps {
  sequencePlan: SequencePlan;
  onSequenceUpdate: (plan: SequencePlan) => void;
  onGenerateSequence: (plan: SequencePlan) => void;
  className?: string;
}

const SequencePlanningStudio: React.FC<SequencePlanningStudioProps> = ({
  sequencePlan,
  onSequenceUpdate,
  onGenerateSequence,
  className
}) => {
  // État local pour la planification
  const [selectedScene, setSelectedScene] = useState<string | null>(null);
  const [selectedShot, setSelectedShot] = useState<string | null>(null);
  const [planningMode, setPlanningMode] = useState<'scene' | 'shot'>('scene');

  return (
    <div className={`sequence-planning-studio ${className}`}>
      <StudioHeader />
      <StudioToolbar />

      <div className="studio-content">
        <SceneSelector />
        <PlanningCanvas />
        <PropertiesPanel />
      </div>

      <StudioFooter />
    </div>
  );
};
```

### 2. Panel de Placement Visuel : `ScenePlanningCanvas`
**Emplacement** : `src/components/editor/sequence-planning/ScenePlanningCanvas.tsx`

**Fonctionnalités** :
- Canvas 2D/3D pour placement des éléments
- Drag & drop des puppets depuis la bibliothèque
- Placement des décors et accessoires
- Gestion des calques (foreground/background)
- Aperçu temps réel de la composition

**Intégrations** :
- Module 3D pour rendu des puppets
- Bibliothèque d'assets pour décors
- Système de coordonnées normalisées

### 3. Générateur de Prompts : `AIPromptGenerator`
**Emplacement** : `src/components/editor/sequence-planning/AIPromptGenerator.tsx`

**Fonctionnalités** :
- Analyse automatique des éléments placés
- Génération de prompts détaillés via LLM
- Optimisation pour ComfyUI
- Templates de prompts personnalisables
- Historique et versioning des prompts

**Flux de Données** :
```
Éléments placés → Analyse contextuelle → LLM → Prompt optimisé → Validation → Stockage
```

### 4. Contrôleur ComfyUI : `SequenceGenerator`
**Emplacement** : `src/components/editor/sequence-planning/SequenceGenerator.tsx`

**Responsabilités** :
- Préparation des workflows ComfyUI
- Gestion de la file d'attente de génération
- Suivi du progrès par shot
- Gestion des erreurs et retry
- Agrégation des résultats

**États** :
```typescript
type GenerationStatus =
  | 'idle'
  | 'preparing'
  | 'generating_shots'
  | 'generating_video'
  | 'completed'
  | 'error';
```

## Composants Secondaires

### 5. Bibliothèque de Puppets : `PuppetLibrary`
**Emplacement** : `src/components/editor/sequence-planning/PuppetLibrary.tsx`

**Fonctionnalités** :
- Affichage des personnages disponibles
- Filtrage par monde/scène
- Drag & drop vers le canvas
- Aperçu des poses/expressions

### 6. Bibliothèque de Décors : `SceneLibrary`
**Emplacement** : `src/components/editor/sequence-planning/SceneLibrary.tsx`

**Fonctionnalités** :
- Environnements 3D préconstruits
- Objets et accessoires
- Éclairage et atmosphère
- Intégration avec le module 3D

### 7. Panel de Propriétés : `ElementPropertiesPanel`
**Emplacement** : `src/components/editor/sequence-planning/ElementPropertiesPanel.tsx`

**Fonctionnalités** :
- Édition des propriétés des éléments sélectionnés
- Position, rotation, échelle
- Paramètres spécifiques (pose, expression, etc.)
- Animation basique

## Flux de Travail Utilisateur

### Phase 1 : Planification de Scène
1. **Sélection de scène** depuis le plan de séquence
2. **Placement visuel** des puppets et décors
3. **Ajustement des positions** et propriétés
4. **Génération automatique du prompt** via LLM

### Phase 2 : Validation et Génération
1. **Aperçu du prompt** généré
2. **Ajustements manuels** si nécessaire
3. **Lancement de la génération** ComfyUI
4. **Suivi du progrès** en temps réel

### Phase 3 : Post-Génération
1. **Révision des images** générées
2. **Ajustements** si nécessaire
3. **Génération vidéo** une fois tous les shots prêts
4. **Export final** de la séquence

## Intégrations Techniques

### Module Audio
- Synchronisation des dialogues avec les shots
- Génération de musique d'ambiance
- Effets sonores contextuels

### Module 3D
- Rendu des puppets et décors
- Animation procédurale
- Éclairage dynamique

### Module HTTP
- Communication avec ComfyUI
- Téléchargement des assets
- Synchronisation cloud

## Structure de Données

### Extension des Types Existants

```typescript
interface SequencePlan {
  // ... existant
  planningData?: PlanningData;
}

interface PlanningData {
  scenes: PlannedScene[];
  globalAssets: AssetReference[];
  generationSettings: GenerationSettings;
}

interface PlannedScene {
  sceneId: string;
  canvasData: CanvasData;
  generatedPrompt: string;
  promptHistory: PromptVersion[];
  generationStatus: GenerationStatus;
}

interface CanvasData {
  elements: CanvasElement[];
  camera: CameraSettings;
  lighting: LightingSettings;
}

interface CanvasElement {
  id: string;
  type: 'puppet' | 'prop' | 'decoration';
  assetId: string;
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  properties: Record<string, any>;
}
```

## Plan de Développement

### Phase 1 : Fondation (Semaine 1-2)
- [ ] Créer `SequencePlanningStudio` de base
- [ ] Implémenter `ScenePlanningCanvas` avec drag & drop
- [ ] Intégrer les bibliothèques existantes (puppets, décors)

### Phase 2 : Génération de Prompts (Semaine 3)
- [ ] Développer `AIPromptGenerator`
- [ ] Intégrer les LLM pour analyse contextuelle
- [ ] Créer templates de prompts

### Phase 3 : Intégration ComfyUI (Semaine 4)
- [ ] Implémenter `SequenceGenerator`
- [ ] Gestion de la file d'attente
- [ ] Suivi du progrès et gestion d'erreurs

### Phase 4 : Fonctionnalités Avancées (Semaine 5)
- [ ] Animation basique des éléments
- [ ] Optimisations de performance
- [ ] Tests d'intégration complets

### Phase 5 : Polissage et Tests (Semaine 6)
- [ ] Interface utilisateur finale
- [ ] Documentation complète
- [ ] Tests utilisateurs
- [ ] Optimisations de performance

## Critères de Succès

- [ ] Placement intuitif des puppets et décors
- [ ] Génération automatique de prompts de qualité
- [ ] Intégration transparente avec ComfyUI
- [ ] Performance acceptable pour scènes complexes
- [ ] Interface utilisateur cohérente avec le reste de l'application

## Risques et Mitigation

### Performance 3D
**Risque** : Rendu 3D trop lourd pour l'interface
**Mitigation** : Utiliser des previews basse résolution, lazy loading, WebGL optimisé

### Complexité des Prompts
**Risque** : Prompts LLM de mauvaise qualité
**Mitigation** : Templates éprouvés, validation humaine, feedback loop

### Intégration ComfyUI
**Risque** : Problèmes de communication ou timeouts
**Mitigation** : Retry logic, queue management, monitoring détaillé

## Métriques de Succès

- Temps moyen pour planifier une scène : < 5 minutes
- Taux de succès génération ComfyUI : > 90%
- Satisfaction utilisateur : > 4/5
- Performance interface : 60 FPS minimum</content>
<parameter name="filePath">c:\storycore-engine\SEQUENCE_PLANNING_STUDIO_PLAN.md