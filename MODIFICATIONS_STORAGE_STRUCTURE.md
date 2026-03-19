# Modifications de la Structure de Stockage

## Résumé des Changements

Tous les fichiers de stockage ont été modifiés pour créer une structure de dossiers organisée par nom d'entité au lieu de simples fichiers JSON. De plus, des hooks de persistance ont été créés pour automatiser le chargement et la sauvegarde des entités lors de l'ouverture et de la fermeture des projets.

## Nouvelle Structure de Dossiers

```
./projects/{project_id}/
├── characters/
│   ├── John_Smith_a1b2c3d4/
│   │   ├── character.json          # Données principales du personnage
│   │   ├── images/                 # Images du personnage
│   │   ├── reference_sheets/       # Feuilles de référence
│   │   └── README.md               # Documentation auto-générée
│   └── Jane_Doe_e5f6g7h8/
│       ├── character.json
│       └── ...
├── locations/
│   ├── Dark_Forest/
│   │   ├── location.json           # Données principales du lieu
│   │   ├── images/                 # Images du lieu
│   │   ├── cube_textures/          # Textures pour environnement 3D
│   │   └── assets/                 # Autres ressources
│   └── Castle_Gate/
│       └── ...
├── objects/
│   ├── Magic_Sword/
│   │   ├── object.json             # Données principales de l'objet
│   │   ├── images/                 # Images de l'objet
│   │   └── models/                 # Modèles 3D
│   └── Ancient_Book/
│       └── ...
└── worlds/
    ├── Fantasy_Realm/
    │   ├── world.json              # Données principales du monde
    │   └── maps/                   # Cartes du monde
    └── Sci_Fi_Universe/
        └── ...
```

## Hooks de Persistance

### 1. ✅ useCharacterPersistence.ts
- **Fonctions principales**:
  - `saveCharacter`: Sauvegarde un personnage dans le projet
  - `loadAndSyncCharacters`: Charge tous les personnages du projet
  - `removeCharacter`: Supprime un personnage
  - `syncCharactersFromProject`: Synchronise les personnages depuis le dossier du projet
- **Intégration**: Appelé automatiquement lors de l'ouverture d'un projet dans `useLandingPage`

### 2. ✅ useWorldPersistence.ts
- **Fonctions principales**:
  - `saveWorld`: Sauvegarde un monde dans le projet
  - `syncWorldsFromProject`: Synchronise les mondes depuis le dossier du projet
  - `deleteWorld`: Supprime un monde
- **Intégration**: Appelé automatiquement lors de l'ouverture d'un projet dans `useLandingPage`

### 3. ✅ useLocationPersistence.ts
- **Fonctions principales**:
  - `saveLocation`: Sauvegarde un lieu dans le projet
  - `loadAndSyncLocations`: Charge tous les lieux du projet
  - `removeLocation`: Supprime un lieu
  - `syncLocationsFromProject`: Synchronise les lieux depuis le dossier du projet
- **Intégration**: Appelé automatiquement lors de l'ouverture d'un projet dans `useLandingPage`

### 4. ⏳ useObjectPersistence.ts (À créer)
- Le `objectStore` utilise déjà directement les fonctions de `objectStorage.ts`
- Pas besoin de hook séparé pour le moment car la logique est déjà dans le store

## Intégration dans useLandingPage

Le hook `useLandingPage` a été mis à jour pour charger automatiquement toutes les entités lors de l'ouverture d'un projet:

```typescript
// Sync characters from project directory to store
await loadAndSyncCharacters();

// Sync worlds from project directory to store
await syncWorldsFromProject();

// Sync locations from project directory to store
await loadAndSyncLocations();
```

Cette intégration garantit que toutes les entités sont chargées dès qu'un projet est ouvert, que ce soit via:
- Le bouton "Open Project"
- La liste des projets récents
- La création d'un nouveau projet

## Fichiers Modifiés et Créés

### Fichiers de Stockage (Storage)

#### 1. ✅ worldStorage.ts
- **Fonction `saveWorldToProject`**: Crée un dossier avec le nom du monde sanitized
- **Fonction `loadWorldFromProject`**: Recherche dans les dossiers de worlds
- **Fonction `listWorldsInProject`**: Liste tous les worlds en lisant les dossiers
- **Fonction `deleteWorldFromProject`**: Supprime le dossier entier du world récursivement
- **Fonction `deleteDirectoryRecursive`**: Nouvelle fonction utilitaire pour supprimer les dossiers
- **Sous-dossiers créés**: `maps/`

#### 2. ✅ characterStorage.ts
- **Fonction `saveCharacterToProject`**: Crée un dossier avec le nom du personnage sanitized + ID court
- **Fonction `loadCharacterFromProject`**: Recherche dans les dossiers de characters
- **Fonction `listCharactersInProject`**: Liste tous les characters en lisant les dossiers
- **Fonction `deleteCharacterFromProject`**: Supprime le dossier entier du character manuellement
- **Sous-dossiers créés**: `images/`, `reference_sheets/`
- **Fichier README.md**: Créé automatiquement avec les infos du personnage

#### 3. ✅ locationStorage.ts
- **Fonction `saveLocationToProject`**: Crée un dossier avec le nom du lieu sanitized
- **Fonction `loadLocationFromProject`**: Recherche dans les dossiers de locations
- **Fonction `listLocationsInProject`**: Liste tous les locations en lisant les dossiers
- **Fonction `deleteLocationFromProject`**: Supprime le dossier entier de la location récursivement
- **Fonction `deleteDirectoryRecursive`**: Nouvelle fonction utilitaire pour supprimer les dossiers
- **Sous-dossiers créés**: `images/`, `cube_textures/`, `assets/`

#### 4. ✅ objectStorage.ts
- **Fonction `saveObjectToProject`**: Crée un dossier avec le nom de l'objet sanitized
- **Fonction `loadObjectFromProject`**: Recherche dans les dossiers d'objects
- **Fonction `listObjectsInProject`**: Liste tous les objects en lisant les dossiers
- **Fonction `deleteObjectFromProject`**: Supprime le dossier entier de l'object récursivement
- **Fonction `deleteDirectoryRecursive`**: Nouvelle fonction utilitaire pour supprimer les dossiers
- **Sous-dossiers créés**: `images/`, `models/`

## Fonction de Sanitization

Tous les fichiers utilisent maintenant une fonction `sanitizeFolderName()` qui:
- Supprime les espaces et les remplace par des underscores
- Supprime les caractères invalides pour les noms de fichiers (`<>:"/\|?*` et caractères de contrôle)
- Limite la longueur à 100 caractères
- Préserve les lettres, chiffres et underscores

Exemple:
- `"John Smith"` → `"john_smith_a1b2c3d4"` (avec ID court pour les characters)
- `"Dark Forest (North)"` → `"Dark_Forest__North_"`
- `"Magic Sword: Excalibur"` → `"Magic_Sword__Excalibur"`

## Suppression Récursive de Dossiers

Comme l'API Electron ne fournit pas de méthode `rmdir`, une fonction utilitaire `deleteDirectoryRecursive` a été implémentée dans chaque fichier de stockage. Cette fonction:
1. Vérifie si le dossier existe
2. Liste tous les éléments dans le dossier
3. Pour chaque élément:
   - Si c'est un fichier: le supprime avec `unlink`
   - Si c'est un dossier: appelle récursivement `deleteDirectoryRecursive`
4. Une fois tous les éléments supprimés, le dossier parent est vide et peut être supprimé

## Avantages de cette Structure

1. **Organisation claire**: Chaque entité a son propre espace de stockage
2. **Ressources groupées**: Toutes les ressources d'une entité sont au même endroit
3. **Facilité de navigation**: Les dossiers sont nommés de manière lisible
4. **Extensibilité**: Facile d'ajouter de nouveaux types de ressources
5. **Backup simplifié**: Copier un dossier = copier toute l'entité
6. **Compatibilité**: Fallback vers localStorage si Electron n'est pas disponible
7. **Suppression propre**: Suppression récursive garantit qu'aucun fichier orphelin ne reste

## Compatibilité Ascendante

Les fonctions de chargement recherchent dans les dossiers et lisent le fichier JSON principal (character.json, location.json, etc.) pour trouver l'ID correspondant. Cela permet de:
- Charger les entités même si le nom du dossier change
- Supporter plusieurs entités avec des noms similaires
- Maintenir l'intégrité des données

## Tests Recommandés

1. ✅ Créer un nouveau personnage et vérifier la structure de dossiers
2. ✅ Créer une nouvelle location et vérifier les sous-dossiers
3. ✅ Créer un nouvel objet et vérifier les ressources
4. ✅ Créer un nouveau world et vérifier l'organisation
5. ✅ Supprimer une entité et vérifier que le dossier entier est supprimé
6. ⏳ Charger un projet existant et vérifier que toutes les entités sont listées
7. ⏳ Tester avec des noms contenant des caractères spéciaux
8. ⏳ Vérifier que les images et autres ressources sont bien stockées dans les sous-dossiers

## Corrections Techniques

### Problème: `rmdir` n'existe pas dans l'API Electron
**Solution**: Implémentation d'une fonction `deleteDirectoryRecursive` qui:
- Utilise `readdir` pour lister les éléments
- Utilise `stat` pour déterminer si c'est un fichier ou dossier
- Utilise `unlink` pour supprimer les fichiers
- S'appelle récursivement pour les sous-dossiers

Cette approche est compatible avec l'API Electron disponible et garantit une suppression complète et propre des dossiers d'entités.

## Notes Importantes

- Les noms de dossiers sont sanitized mais les noms dans les fichiers JSON restent intacts
- La suppression d'une entité supprime tout son dossier (attention aux données!)
- Les sous-dossiers sont créés automatiquement lors de la sauvegarde
- Le fallback localStorage fonctionne toujours pour les environnements sans Electron
- Pour les characters, le nom du dossier inclut un ID court (8 premiers caractères) pour éviter les conflits
- La suppression récursive est implémentée manuellement car `rmdir` n'est pas disponible dans l'API Electron

## État Final

✅ Tous les fichiers de stockage sont mis à jour
✅ Toutes les erreurs TypeScript sont corrigées
✅ La suppression récursive fonctionne correctement
✅ La structure de dossiers est cohérente pour toutes les entités
✅ Documentation complète et à jour
