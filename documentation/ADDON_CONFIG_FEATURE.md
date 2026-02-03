# Fonctionnalité de Sauvegarde des Add-ons

## Vue d'Ensemble

Cette documentation décrit la nouvelle fonctionnalité de sauvegarde et restauration de la configuration des add-ons dans StoryCore. Cette fonctionnalité permet aux utilisateurs d'exporter et d'importer la configuration complète des add-ons, y compris leur état d'activation et leurs paramètres.

## Fonctionnalités

### 1. Export de la Configuration

- **Description** : Permet de sauvegarder la configuration actuelle des add-ons dans un fichier JSON
- **Emplacement** : `config/addons.json` (par défaut)
- **Format** : JSON avec métadonnées (version, timestamp, configuration des add-ons)
- **Accès** : Bouton "Exporter" dans le panneau de gestion des add-ons

### 2. Import de la Configuration

- **Description** : Permet de restaurer la configuration des add-ons depuis un fichier JSON
- **Emplacement** : `config/addons.json` (par défaut)
- **Validation** : Vérification du format JSON et de la structure attendue
- **Accès** : Bouton "Importer" dans le panneau de gestion des add-ons

### 3. Synchronisation Automatique

- **Description** : Synchronisation automatique entre localStorage et le système de fichiers
- **Comportement** : Toute modification est automatiquement sauvegardée dans le fichier
- **Priorité** : Le fichier a la priorité en cas de conflit

## Structure du Fichier

```json
{
  "version": "1.0",
  "timestamp": "2026-01-25T09:55:45.787Z",
  "addons": {
    "casting": {
      "enabled": true,
      "settings": {
        "maxActorsPerScene": 5,
        "enableActorTemplates": true,
        "autoSaveCasting": true
      }
    },
    "audio-production": {
      "enabled": false,
      "settings": {
        "defaultSampleRate": 44100,
        "maxAudioTracks": 16,
        "enableAudioNormalization": true
      }
    }
  }
}
```

## Utilisation

### Exporter la Configuration

1. **Via l'interface utilisateur** :
   - Ouvrir le panneau de gestion des add-ons
   - Cliquer sur le bouton "Exporter"
   - Une notification de succès apparaît
   - Le fichier est sauvegardé dans `config/addons.json`

2. **Via l'API** :
   ```typescript
   import { addonManager } from '@/services/AddonManager';
   
   await addonManager.saveToFile(); // Utilise le chemin par défaut
   // ou
   await addonManager.saveToFile('custom/path/config.json');
   ```

### Importer la Configuration

1. **Via l'interface utilisateur** :
   - Ouvrir le panneau de gestion des add-ons
   - Cliquer sur le bouton "Importer"
   - Une notification de succès apparaît
   - Les add-ons sont activés/désactivés selon la configuration importée

2. **Via l'API** :
   ```typescript
   import { addonManager } from '@/services/AddonManager';
   
   await addonManager.loadFromFile(); // Utilise le chemin par défaut
   // ou
   await addonManager.loadFromFile('custom/path/config.json');
   ```

## Gestion des Erreurs

### Erreurs Courantes et Solutions

1. **Fichier introuvable** :
   - **Message** : "Aucune configuration existante trouvée"
   - **Solution** : Une nouvelle configuration vide sera créée

2. **Format JSON invalide** :
   - **Message** : "Le fichier de configuration est corrompu"
   - **Solution** : Vérifier le format JSON du fichier

3. **Permissions insuffisantes** :
   - **Message** : "Impossible d'accéder au système de fichiers"
   - **Solution** : Vérifier les permissions d'écriture

4. **Structure de configuration invalide** :
   - **Message** : "Format de configuration invalide"
   - **Solution** : Vérifier que le fichier contient la propriété "addons"

## Configuration Avancée

### Chemin Personnalisé

Vous pouvez spécifier un chemin personnalisé pour le fichier de configuration :

```typescript
// Sauvegarder dans un emplacement personnalisé
await addonManager.saveToFile('/custom/path/addons-config.json');

// Charger depuis un emplacement personnalisé
await addonManager.loadFromFile('/custom/path/addons-config.json');
```

### Synchronisation Manuelle

Pour forcer une synchronisation manuelle :

```typescript
// Synchroniser avec le fichier
await addonManager.autoSync();
```

## Bonnes Pratiques

1. **Sauvegarde régulière** : Exporter la configuration avant les mises à jour majeures
2. **Versionnement** : Inclure le fichier de configuration dans votre système de versionnement
3. **Partage d'équipe** : Partager le fichier de configuration pour une configuration cohérente
4. **Dépannage** : Utiliser l'export/import pour diagnostiquer les problèmes de configuration

## Sécurité

- **Validation** : Tous les fichiers importés sont validés avant application
- **Permissions** : Seuls les fichiers avec la structure attendue sont acceptés
- **Sauvegarde** : La configuration existante est sauvegardée avant toute importation

## Dépannage

### Problème : La configuration ne se charge pas

**Causes possibles** :
- Fichier corrompu ou format invalide
- Permissions insuffisantes pour lire le fichier
- Chemin du fichier incorrect

**Solutions** :
- Vérifier le format JSON du fichier
- Vérifier les permissions du fichier
- Essayer avec le chemin par défaut

### Problème : Les modifications ne sont pas sauvegardées

**Causes possibles** :
- Espace disque insuffisant
- Permissions insuffisantes pour écrire
- Erreur de synchronisation

**Solutions** :
- Vérifier l'espace disque disponible
- Vérifier les permissions d'écriture
- Forcer une synchronisation manuelle

### Problème : Conflits entre localStorage et fichier

**Causes possibles** :
- Modifications manuelles du fichier
- Importation depuis une autre instance

**Solutions** :
- Le fichier a la priorité, synchroniser manuellement
- Exporter la configuration actuelle et comparer les fichiers

## API de Développement

### FileSystemService

```typescript
import { fileSystemService } from '@/services/FileSystemService';

// Lire un fichier de configuration
const config = await fileSystemService.readConfigFile('path/to/config.json');

// Écrire un fichier de configuration
await fileSystemService.writeConfigFile('path/to/config.json', config);

// Vérifier l'existence d'un fichier
const exists = await fileSystemService.fileExists('path/to/config.json');

// Supprimer un fichier
await fileSystemService.deleteConfigFile('path/to/config.json');

// Synchroniser avec localStorage
await fileSystemService.syncWithLocalStorage(config);
```

### AddonManager Extensions

```typescript
import { addonManager } from '@/services/AddonManager';

// Sauvegarder la configuration
await addonManager.saveToFile('path/to/config.json');

// Charger la configuration
await addonManager.loadFromFile('path/to/config.json');

// Synchronisation automatique
await addonManager.autoSync();

// Exporter la configuration actuelle
const config = addonManager.exportConfig();

// Importer une configuration
addonManager.importConfig(config);
```

## Exemples

### Exemple 1 : Sauvegarde et Restauration Complète

```typescript
import { addonManager } from '@/services/AddonManager';

async function backupAndRestore() {
  try {
    // Sauvegarder la configuration actuelle
    await addonManager.saveToFile();
    console.log('Configuration sauvegardée avec succès');
    
    // Plus tard... restaurer la configuration
    await addonManager.loadFromFile();
    console.log('Configuration restaurée avec succès');
    
  } catch (error) {
    console.error('Erreur:', error.message);
  }
}
```

### Exemple 2 : Migration de Configuration

```typescript
import { addonManager, fileSystemService } from '@/services';

async function migrateConfig(oldPath: string, newPath: string) {
  try {
    // Lire l'ancienne configuration
    const oldConfig = await fileSystemService.readConfigFile(oldPath);
    
    // Sauvegarder dans le nouvel emplacement
    await addonManager.saveToFile(newPath);
    
    console.log('Migration de configuration réussie');
    
  } catch (error) {
    console.error('Erreur de migration:', error.message);
  }
}
```

### Exemple 3 : Configuration par Environnement

```typescript
import { addonManager } from '@/services/AddonManager';

async function setupEnvironmentConfig(env: 'dev' | 'prod') {
  try {
    const configPath = `config/addons-${env}.json`;
    
    if (env === 'dev') {
      // Configuration de développement
      await addonManager.activateAddon('casting');
      await addonManager.activateAddon('audio-production');
      await addonManager.saveToFile(configPath);
      
    } else {
      // Configuration de production
      await addonManager.loadFromFile(configPath);
    }
    
  } catch (error) {
    console.error('Erreur de configuration:', error.message);
  }
}
```

## Notes de Version

### Version 1.0

- **Date** : 25 janvier 2026
- **Fonctionnalités** :
  - Export/import de la configuration des add-ons
  - Synchronisation automatique avec localStorage
  - Gestion des erreurs complète
  - Interface utilisateur intégrée

### Version 1.1 (Prévue)

- **Fonctionnalités prévues** :
  - Support des configurations multiples
  - Historique des versions
  - Comparaison de configurations
  - Export/import sélectif

## Support

Pour toute question ou problème concernant cette fonctionnalité, veuillez consulter :

- **Documentation** : [Documentation StoryCore](https://storycore.docs/configuration)
- **Support** : support@storycore.com
- **Communauté** : [Forum StoryCore](https://community.storycore.com)

## Licence

Cette fonctionnalité est distribuée sous la licence MIT. Voir le fichier LICENSE pour plus de détails.