# Support API Web pour les Séquences

## Vue d'ensemble

Le système de gestion des séquences supporte maintenant à la fois l'environnement Electron (desktop) et l'environnement Web (navigateur) grâce à un système de fallback automatique.

## Architecture

### Backend API (Python FastAPI)

**Nouveau fichier**: `src/api/sequence_routes.py`

Routes API disponibles:
- `GET /api/sequences/{project_path}/list` - Liste toutes les séquences d'un projet
- `GET /api/sequences/{project_path}/{sequence_id}` - Récupère une séquence spécifique
- `POST /api/sequences/{project_path}` - Crée une nouvelle séquence
- `PUT /api/sequences/{project_path}/{sequence_id}` - Met à jour une séquence
- `DELETE /api/sequences/{project_path}/{sequence_id}` - Supprime une séquence

### Frontend Service

**Nouveau fichier**: `creative-studio-ui/src/services/sequenceService.ts`

Le service `SequenceService` détecte automatiquement l'environnement et utilise:
- **Electron API** si disponible (mode desktop)
- **Web API** sinon (mode navigateur)

## Fonctionnalités

### 1. Détection Automatique de l'Environnement

```typescript
private isElectronAvailable(): boolean {
  return !!(window as any).electronAPI?.fs?.readdir;
}
```

Le service vérifie la disponibilité de l'API Electron et bascule automatiquement vers l'API Web si nécessaire.

### 2. Chargement des Séquences

**Mode Electron**:
- Lecture directe des fichiers JSON via `window.electronAPI.fs`
- Accès rapide au système de fichiers local

**Mode Web**:
- Appel API REST vers le backend Python
- Communication via HTTP/HTTPS

### 3. Opérations CRUD Complètes

Toutes les opérations sont supportées dans les deux modes:
- **Create**: Création de nouvelles séquences
- **Read**: Lecture et listage des séquences
- **Update**: Mise à jour des séquences existantes
- **Delete**: Suppression de séquences

## Utilisation

### Dans le Composant ProjectDashboardNew

```typescript
import { sequenceService } from '@/services/sequenceService';

// Chargement automatique avec fallback
const loadedSequences = await sequenceService.loadSequences(projectPath);

// Le service gère automatiquement Electron vs Web
```

### Configuration de l'API Backend

Le service utilise la variable d'environnement `VITE_API_URL` ou par défaut `http://localhost:8000`:

```env
VITE_API_URL=http://localhost:8000
```

## Avantages

### 1. Compatibilité Universelle
- Fonctionne en mode desktop (Electron)
- Fonctionne en mode web (navigateur)
- Pas de code dupliqué

### 2. Expérience Utilisateur Transparente
- Aucune différence visible pour l'utilisateur
- Même interface, même fonctionnalités
- Basculement automatique et transparent

### 3. Maintenance Simplifiée
- Un seul service à maintenir
- Logique métier centralisée
- Tests plus faciles

### 4. Performance Optimale
- Mode Electron: accès direct aux fichiers (plus rapide)
- Mode Web: API REST standard (compatible avec tous les navigateurs)

## Sécurité

### Backend
- Authentification requise via JWT tokens
- Validation des chemins de projet
- Protection contre les injections de chemin

### Frontend
- Encodage des chemins de projet dans les URLs
- Gestion des erreurs robuste
- Logs détaillés pour le debugging

## Tests

### Test en Mode Electron
1. Lancer l'application Electron
2. Ouvrir un projet
3. Cliquer sur "Actualiser" dans le Project Dashboard
4. Vérifier que les séquences se chargent correctement

### Test en Mode Web
1. Lancer le serveur backend: `python -m uvicorn src.api_server_fastapi:app --reload`
2. Lancer le frontend: `npm run dev`
3. Ouvrir dans un navigateur
4. Cliquer sur "Actualiser" dans le Project Dashboard
5. Vérifier que les séquences se chargent via l'API

## Migration depuis l'Ancien Code

### Avant
```typescript
// Code spécifique Electron uniquement
if (!window.electronAPI?.fs?.readdir) {
  alert('Cette fonctionnalité nécessite Electron');
  return;
}
const files = await window.electronAPI.fs.readdir(sequencesDir);
// ... traitement manuel des fichiers
```

### Après
```typescript
// Code universel avec fallback automatique
const sequences = await sequenceService.loadSequences(projectPath);
// Fonctionne partout!
```

## Dépannage

### Problème: "Failed to load sequences"

**Solution**:
1. Vérifier que le serveur backend est démarré
2. Vérifier la variable `VITE_API_URL`
3. Vérifier les logs de la console pour plus de détails

### Problème: "Sequence not found"

**Solution**:
1. Vérifier que le chemin du projet est correct
2. Vérifier que les fichiers JSON existent dans `{project_path}/sequences/`
3. Vérifier les permissions de lecture

### Problème: CORS errors en mode Web

**Solution**:
1. Vérifier que le backend a CORS activé
2. Vérifier que l'URL du backend est correcte
3. Utiliser un proxy de développement si nécessaire

## Fichiers Modifiés

### Backend
- ✅ `src/api/sequence_routes.py` (nouveau)
- ✅ `src/api_server_fastapi.py` (modifié - ajout du router)

### Frontend
- ✅ `creative-studio-ui/src/services/sequenceService.ts` (nouveau)
- ✅ `creative-studio-ui/src/components/workspace/ProjectDashboardNew.tsx` (modifié)

## Prochaines Étapes

### Améliorations Possibles
1. **Cache côté client**: Réduire les appels API répétés
2. **WebSocket**: Synchronisation en temps réel des modifications
3. **Offline mode**: Support hors ligne avec synchronisation différée
4. **Optimistic updates**: Mise à jour UI immédiate avant confirmation serveur

### Autres Fonctionnalités à Migrer
- Gestion des shots
- Gestion des personnages
- Gestion des mondes
- Gestion des assets

## Conclusion

Cette implémentation permet à StoryCore de fonctionner de manière transparente en mode desktop et web, offrant une flexibilité maximale aux utilisateurs tout en maintenant une base de code propre et maintenable.
