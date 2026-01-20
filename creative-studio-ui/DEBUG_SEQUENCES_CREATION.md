# Debug : Création des Fichiers de Séquences

## 🐛 Problème Rapporté

Les fichiers de séquences ne sont pas créés lors de la création d'un projet.

## 🔍 Points de Vérification

### 1. Vérifier les Logs de la Console

Lors de la création d'un projet, vous devriez voir ces logs dans la console :

```
Generated project template: {
  sequences: 15,
  shots: 15,
  duration: 900,
  initialShots: 15
}

First shot sample: {
  id: "...",
  title: "Shot 1",
  sequence_id: "...",
  ...
}

Format data: {
  id: "court-metrage",
  name: "Court-métrage",
  sequences: 15,
  ...
}

Calling Electron API with: {
  name: "Mon Projet",
  location: "C:/...",
  format: {...},
  initialShotsCount: 15
}
```

**Si ces logs n'apparaissent pas** : Le problème est dans le frontend (génération du template)

**Si ces logs apparaissent** : Le problème est dans le backend (Electron/ProjectService)

### 2. Vérifier les Logs Electron

Dans les logs Electron (console du processus principal), vous devriez voir :

```
Creating sequence files for 15 shots...
Created sequences directory
Grouped into 15 sequences
Created sequence file: sequence_001.json
Created sequence file: sequence_002.json
...
Created sequence file: sequence_015.json
Successfully created 15 sequence files
```

**Si ces logs n'apparaissent pas** : Les données ne sont pas passées correctement à Electron

**Si "No initial shots provided" apparaît** : Les shots ne sont pas transmis

### 3. Vérifier la Structure du Projet

Après création, le dossier du projet devrait contenir :

```
mon-projet/
├── project.json ✅
├── PROJECT_SUMMARY.md ✅
├── README.md ✅
├── sequences/ ✅
│   ├── sequence_001.json ✅
│   ├── sequence_002.json ✅
│   └── ...
├── scenes/
├── characters/
├── worlds/
└── assets/
```

**Si le dossier sequences/ n'existe pas** : Problème de création du dossier

**Si le dossier existe mais est vide** : Problème de création des fichiers JSON

## 🔧 Corrections Appliquées

### 1. Ajout de "sequences" dans les Dossiers par Défaut

**Avant :**
```typescript
directories: ['scenes', 'characters', 'worlds', 'assets']
```

**Après :**
```typescript
directories: ['sequences', 'scenes', 'characters', 'worlds', 'assets']
```

### 2. Réorganisation de la Logique

**Ordre d'exécution :**
1. Créer tous les dossiers (incluant sequences/)
2. Créer project.json
3. Créer les fichiers de séquences
4. Créer les fichiers template
5. Créer PROJECT_SUMMARY.md

### 3. Ajout de Logs de Débogage

**Frontend (useLandingPage.ts) :**
- Log du template généré
- Log du premier shot
- Log des données passées à Electron

**Backend (ProjectService.ts) :**
- Log de chaque dossier créé
- Log du nombre de shots reçus
- Log de chaque fichier de séquence créé

## 🧪 Tests à Effectuer

### Test 1 : Vérifier la Génération du Template

```typescript
// Dans la console du navigateur
const format = {
  id: 'court-metrage',
  sequences: 15,
  shotDuration: 60,
  // ...
};

const template = generateProjectTemplate(format);
console.log('Template:', template);
console.log('Shots:', sequencesToShots(template.sequences));
```

**Résultat attendu :**
- template.sequences.length === 15
- shots.length === 15
- Chaque shot a un sequence_id

### Test 2 : Vérifier la Transmission à Electron

```typescript
// Créer un projet et vérifier les logs
// Les logs doivent montrer :
// - initialShotsCount: 15
// - format: {...}
```

### Test 3 : Vérifier la Création des Fichiers

```bash
# Après création du projet
cd "chemin/vers/mon-projet"
dir sequences  # Windows
ls sequences/  # macOS/Linux

# Devrait afficher :
# sequence_001.json
# sequence_002.json
# ...
# sequence_015.json
```

### Test 4 : Vérifier le Contenu d'un Fichier

```bash
# Ouvrir un fichier de séquence
cat sequences/sequence_001.json  # macOS/Linux
type sequences\sequence_001.json  # Windows
```

**Contenu attendu :**
```json
{
  "id": "...",
  "name": "Sequence 1",
  "description": "Default sequence 1",
  "duration": 60,
  "shots": [
    {
      "id": "...",
      "title": "Shot 1",
      "sequence_id": "...",
      ...
    }
  ],
  "order": 1,
  "metadata": {
    "created_at": "...",
    "updated_at": "...",
    "status": "draft"
  }
}
```

## 🔍 Diagnostic par Symptôme

### Symptôme 1 : Aucun Log dans la Console

**Cause possible :** Le code n'est pas exécuté

**Solution :**
1. Vérifier que l'application est bien recompilée
2. Vérifier que le bon fichier est chargé
3. Redémarrer l'application

### Symptôme 2 : Logs Frontend OK, Pas de Logs Backend

**Cause possible :** Les données ne sont pas transmises à Electron

**Solution :**
1. Vérifier que `window.electronAPI` existe
2. Vérifier que les données sont sérialisables
3. Vérifier les logs IPC dans Electron

### Symptôme 3 : "No initial shots provided"

**Cause possible :** Les shots ne sont pas dans `data.initialShots`

**Solution :**
1. Vérifier que `initialShots` est bien passé
2. Vérifier que le tableau n'est pas vide
3. Ajouter un log avant la condition

### Symptôme 4 : Dossier sequences/ Vide

**Cause possible :** Erreur lors de la création des fichiers

**Solution :**
1. Vérifier les permissions du dossier
2. Vérifier les logs d'erreur
3. Vérifier que `fs.writeFileSync` fonctionne

### Symptôme 5 : Fichiers Créés mais Vides

**Cause possible :** Données mal formatées

**Solution :**
1. Vérifier le contenu de `sequenceData`
2. Vérifier que `JSON.stringify` fonctionne
3. Vérifier l'encodage UTF-8

## 📝 Checklist de Débogage

- [ ] Recompiler l'application (npm run build)
- [ ] Redémarrer l'application Electron
- [ ] Ouvrir la console développeur (F12)
- [ ] Créer un nouveau projet
- [ ] Vérifier les logs frontend
- [ ] Vérifier les logs Electron (console principale)
- [ ] Vérifier le dossier du projet créé
- [ ] Vérifier la présence du dossier sequences/
- [ ] Vérifier la présence des fichiers .json
- [ ] Ouvrir un fichier .json et vérifier le contenu
- [ ] Vérifier project.json pour les métadonnées

## 🚀 Commandes Utiles

### Recompiler l'Application

```bash
# Frontend
cd creative-studio-ui
npm run build

# Electron
cd ..
npm run build

# Ou tout en une fois
npm run build:all
```

### Voir les Logs Electron

```bash
# Lancer en mode développement
npm run dev

# Les logs apparaîtront dans le terminal
```

### Vérifier les Fichiers Créés

```bash
# Windows
dir /s "chemin\vers\projet"

# macOS/Linux
find "chemin/vers/projet" -type f

# Compter les fichiers de séquences
dir sequences\*.json | find /c ".json"  # Windows
ls sequences/*.json | wc -l             # macOS/Linux
```

## ✅ Solution Attendue

Après les corrections, lors de la création d'un projet :

1. **Console Frontend** :
   ```
   Generated project template: { sequences: 15, shots: 15, ... }
   Calling Electron API with: { initialShotsCount: 15, ... }
   ```

2. **Console Electron** :
   ```
   Created directory: sequences
   Creating sequence files for 15 shots...
   Grouped into 15 sequences
   Created sequence file: sequence_001.json
   ...
   Successfully created 15 sequence files
   ```

3. **Système de Fichiers** :
   ```
   mon-projet/
   ├── sequences/
   │   ├── sequence_001.json ✅
   │   ├── sequence_002.json ✅
   │   └── ... (15 fichiers)
   ```

## 🎯 Si le Problème Persiste

1. **Vérifier la version d'Electron** : Certaines versions ont des bugs IPC
2. **Vérifier les permissions** : Le dossier de destination doit être accessible en écriture
3. **Vérifier l'espace disque** : Suffisamment d'espace pour créer les fichiers
4. **Tester en mode démo** : Vérifier si le problème est spécifique à Electron
5. **Consulter les logs système** : Vérifier les logs Windows/macOS pour les erreurs

---

*Document de débogage créé le 20 janvier 2026*
*Corrections appliquées et logs ajoutés*
