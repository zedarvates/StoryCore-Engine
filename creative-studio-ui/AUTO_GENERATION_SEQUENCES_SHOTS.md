# Génération Automatique des Séquences et Shots

## 🎯 Objectif

Créer automatiquement les plans de séquence et les shots de base lors de la création d'un nouveau projet, en fonction du format sélectionné par l'utilisateur.

## 📋 Fonctionnalités

### Génération Automatique

Lors de la création d'un projet, le système génère automatiquement :

1. **Séquences** : Nombre défini par le format
   - Nom : "Sequence 1", "Sequence 2", etc.
   - Description : "Default sequence X"
   - Durée : Selon le format

2. **Shots** : Un shot par séquence
   - Nom : "Shot 1"
   - Description : "Default shot 1 for Sequence X"
   - Durée : Selon le format
   - Type : "medium"
   - Mouvement caméra : "static"
   - Statut : "draft"

## 🔧 Implémentation Technique

### 1. Générateur de Template (`projectTemplateGenerator.ts`)

#### Types
```typescript
export interface GeneratedSequence {
  id: string;
  name: string;
  description: string;
  duration: number;
  shots: Shot[];
  order: number;
}

export interface ProjectTemplate {
  sequences: GeneratedSequence[];
  totalShots: number;
  totalDuration: number;
}
```

#### Fonctions Principales

**`generateProjectTemplate(format)`**
- Génère toutes les séquences et shots
- Retourne un template complet

**`sequencesToShots(sequences)`**
- Convertit les séquences en tableau plat de shots
- Utilisé pour initialiser le store

**`getProjectSummary(template)`**
- Génère un résumé textuel du projet
- Utile pour les logs et la documentation

### 2. Intégration dans `useLandingPage.ts`

```typescript
// Générer le template
const template = generateProjectTemplate(format);
const initialShots = sequencesToShots(template.sequences);

// Créer le projet avec les shots initiaux
const demoProject: StoreProject = {
  // ...
  shots: initialShots,
  metadata: {
    // ...
    sequences: template.sequences.length,
    totalShots: template.totalShots,
    totalDuration: template.totalDuration,
  },
};

// Charger dans le store
setProject(demoProject);
setShots(initialShots);
```

## 📊 Exemples de Génération

### Court-métrage (15 min)
```
Génération :
- 15 séquences
- 15 shots (1 par séquence)
- Durée par shot : 60 secondes

Structure :
Sequence 1
  └─ Shot 1 (60s)
Sequence 2
  └─ Shot 1 (60s)
...
Sequence 15
  └─ Shot 1 (60s)

Total : 15 minutes
```

### Long-métrage standard (90 min)
```
Génération :
- 30 séquences
- 30 shots (1 par séquence)
- Durée par shot : 180 secondes

Structure :
Sequence 1
  └─ Shot 1 (180s)
Sequence 2
  └─ Shot 1 (180s)
...
Sequence 30
  └─ Shot 1 (180s)

Total : 90 minutes
```

### Épisode de série (22 min)
```
Génération :
- 11 séquences
- 11 shots (1 par séquence)
- Durée par shot : 120 secondes

Structure :
Sequence 1
  └─ Shot 1 (120s)
Sequence 2
  └─ Shot 1 (120s)
...
Sequence 11
  └─ Shot 1 (120s)

Total : 22 minutes
```

## 🎨 Structure des Données Générées

### Séquence
```typescript
{
  id: "1737388800000-abc123def",
  name: "Sequence 1",
  description: "Default sequence 1",
  duration: 60,
  shots: [Shot],
  order: 1
}
```

### Shot
```typescript
{
  id: "1737388800000-xyz789ghi",
  title: "Shot 1",
  description: "Default shot 1 for Sequence 1",
  duration: 60,
  shot_type: "medium",
  camera_movement: "static",
  frame_path: "",
  sequence_id: "1737388800000-abc123def",
  order: 1,
  metadata: {
    created_at: "2026-01-20T10:00:00.000Z",
    updated_at: "2026-01-20T10:00:00.000Z",
    status: "draft"
  }
}
```

## 🔄 Workflow de Création

### 1. Utilisateur Crée un Projet
```
1. Ouvre "Create New Project"
2. Entre le nom : "Mon Film"
3. Sélectionne le format : "Court-métrage"
4. Clique sur "Create Project"
```

### 2. Système Génère la Structure
```
1. Lit le format sélectionné
   - sequences: 15
   - shotDuration: 60

2. Génère 15 séquences
   - Sequence 1, Sequence 2, ..., Sequence 15

3. Génère 15 shots (1 par séquence)
   - Shot 1 (60s) pour chaque séquence

4. Crée le projet avec la structure
```

### 3. Projet Prêt à l'Emploi
```
✅ 15 séquences créées
✅ 15 shots créés
✅ Structure complète
✅ Prêt pour l'édition
```

## 📁 Fichiers Créés/Modifiés

### Nouveaux Fichiers
1. **`src/utils/projectTemplateGenerator.ts`**
   - Générateur de template
   - Fonctions utilitaires
   - Types TypeScript

### Fichiers Modifiés
1. **`src/hooks/useLandingPage.ts`**
   - Import du générateur
   - Génération du template
   - Création des shots initiaux
   - Stockage dans les métadonnées

2. **`src/pages/LandingPageDemo.tsx`**
   - Import du générateur
   - Génération du template
   - Affichage du résumé

## 🎯 Avantages

### Pour l'Utilisateur
✅ **Gain de temps** : Structure créée automatiquement
✅ **Cohérence** : Nommage standardisé
✅ **Prêt à l'emploi** : Peut commencer immédiatement
✅ **Flexible** : Peut modifier/supprimer les éléments

### Pour le Développement
✅ **Modulaire** : Générateur réutilisable
✅ **Type-safe** : TypeScript strict
✅ **Testable** : Fonctions pures
✅ **Extensible** : Facile à améliorer

## 🧪 Tests Recommandés

### Test 1 : Génération Court-métrage
```typescript
const format = {
  id: 'court-metrage',
  sequences: 15,
  shotDuration: 60,
  // ...
};

const template = generateProjectTemplate(format);

expect(template.sequences.length).toBe(15);
expect(template.totalShots).toBe(15);
expect(template.totalDuration).toBe(900); // 15 * 60
```

### Test 2 : Génération Long-métrage
```typescript
const format = {
  id: 'long-metrage-standard',
  sequences: 30,
  shotDuration: 180,
  // ...
};

const template = generateProjectTemplate(format);

expect(template.sequences.length).toBe(30);
expect(template.totalShots).toBe(30);
expect(template.totalDuration).toBe(5400); // 30 * 180
```

### Test 3 : Conversion en Shots
```typescript
const template = generateProjectTemplate(format);
const shots = sequencesToShots(template.sequences);

expect(shots.length).toBe(template.totalShots);
expect(shots[0].sequence_id).toBe(template.sequences[0].id);
```

### Test 4 : Création de Projet
```typescript
// Créer un projet avec format
await handleCreateProjectSubmit('Test', '/path', format);

// Vérifier que les shots sont créés
const project = useAppStore.getState().project;
expect(project.shots.length).toBe(format.sequences);
```

## 🚀 Améliorations Futures

### Phase 1 : Personnalisation
- [ ] Permettre de choisir le nombre de shots par séquence
- [ ] Permettre de personnaliser les noms
- [ ] Permettre de définir des durées variables

### Phase 2 : Templates Avancés
- [ ] Templates par genre (action, drame, comédie)
- [ ] Templates avec structure narrative (acte 1, 2, 3)
- [ ] Templates avec personnages pré-définis

### Phase 3 : Import/Export
- [ ] Exporter la structure en JSON
- [ ] Importer une structure existante
- [ ] Partager des templates entre projets

### Phase 4 : IA
- [ ] Génération intelligente basée sur le script
- [ ] Suggestions de découpage
- [ ] Optimisation automatique de la durée

## 📝 Notes Techniques

### IDs Uniques
Les IDs sont générés avec :
```typescript
`${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
```

Cela garantit :
- Unicité temporelle (timestamp)
- Unicité aléatoire (random string)
- Lisibilité (format simple)

### Ordre des Éléments
- Les séquences sont ordonnées de 1 à N
- Les shots sont ordonnés de 1 à M par séquence
- L'ordre est stocké dans la propriété `order`

### Métadonnées
Chaque shot contient :
- `created_at` : Date de création
- `updated_at` : Date de modification
- `status` : "draft" par défaut

### Compatibilité
- ✅ Mode Electron : Shots passés à l'API
- ✅ Mode Demo : Shots stockés directement
- ✅ Store : Shots chargés dans useAppStore

## 🎓 Exemple Complet

### Code
```typescript
// 1. Sélectionner le format
const format = {
  id: 'court-metrage',
  name: 'Court-métrage',
  sequences: 15,
  shotDuration: 60,
  // ...
};

// 2. Générer le template
const template = generateProjectTemplate(format);

// 3. Convertir en shots
const shots = sequencesToShots(template.sequences);

// 4. Créer le projet
const project = {
  project_name: 'Mon Film',
  shots: shots,
  metadata: {
    sequences: template.sequences.length,
    totalShots: template.totalShots,
    totalDuration: template.totalDuration,
  },
};

// 5. Charger dans le store
setProject(project);
setShots(shots);
```

### Résultat
```
Projet créé : "Mon Film"
- 15 séquences
- 15 shots
- 15 minutes total

Séquences :
  1. Sequence 1 (1 shot, 60s)
  2. Sequence 2 (1 shot, 60s)
  ...
  15. Sequence 15 (1 shot, 60s)

Prêt pour l'édition !
```

## ✅ Statut

**IMPLÉMENTATION COMPLÈTE**

- ✅ Générateur de template créé
- ✅ Intégration dans useLandingPage
- ✅ Intégration dans LandingPageDemo
- ✅ Types TypeScript définis
- ✅ Compilation sans erreurs
- ✅ Prêt pour les tests

## 🎉 Conclusion

Le système génère maintenant automatiquement les séquences et shots de base lors de la création d'un projet. L'utilisateur peut immédiatement commencer à travailler sur son projet avec une structure cohérente et complète.

---

*Implémentation complétée le 20 janvier 2026*
*Génération automatique fonctionnelle*
*Structure de projet prête à l'emploi*
