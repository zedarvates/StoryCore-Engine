# Guide de Test: Actualisation des Séquences

## 🎯 Objectif
Tester que le bouton "Actualiser" du Project Dashboard fonctionne correctement en mode Electron et en mode Web.

## 📋 Prérequis

### Pour tous les tests
- Projet StoryCore avec des séquences existantes
- Node.js et npm installés
- Python 3.9+ installé

### Pour le mode Web uniquement
- Backend Python démarré
- Variables d'environnement configurées

## 🧪 Test 1: Mode Electron (Desktop)

### Étapes

1. **Démarrer l'application Electron**
   ```bash
   npm run electron:dev
   ```

2. **Ouvrir un projet**
   - Cliquer sur "Open Project"
   - Sélectionner un projet avec des séquences

3. **Naviguer vers le Dashboard**
   - Le Project Dashboard devrait s'afficher automatiquement
   - Vérifier que les séquences sont visibles

4. **Tester le bouton Actualiser**
   - Localiser le bouton "Actualiser" (icône RefreshCw)
   - Cliquer sur le bouton
   - **Résultat attendu**: 
     - ✅ Message de succès: "X séquence(s) mise(s) à jour depuis les fichiers JSON"
     - ✅ Les séquences sont rechargées
     - ✅ Aucune erreur dans la console

5. **Vérifier les logs**
   - Ouvrir DevTools (F12)
   - Console devrait afficher:
     ```
     [SequenceService] Using Electron API
     ```

### ✅ Critères de Succès
- [ ] Pas de message d'erreur
- [ ] Séquences rechargées correctement
- [ ] Message de confirmation affiché
- [ ] Logs indiquent "Using Electron API"

---

## 🌐 Test 2: Mode Web (Navigateur)

### Étapes

1. **Démarrer le Backend**
   ```bash
   # Terminal 1
   python -m uvicorn src.api_server_fastapi:app --reload --host 0.0.0.0 --port 8000
   ```
   
   Vérifier que le serveur démarre:
   ```
   INFO:     Uvicorn running on http://0.0.0.0:8000
   INFO:     Application startup complete.
   ```

2. **Configurer les variables d'environnement** (optionnel)
   
   Créer `.env` dans `creative-studio-ui/`:
   ```env
   VITE_API_URL=http://localhost:8000
   ```

3. **Démarrer le Frontend**
   ```bash
   # Terminal 2
   cd creative-studio-ui
   npm run dev
   ```
   
   Vérifier:
   ```
   VITE v5.x.x  ready in xxx ms
   ➜  Local:   http://localhost:5173/
   ```

4. **Ouvrir dans le navigateur**
   - Naviguer vers `http://localhost:5173`
   - Ouvrir un projet (ou créer un projet de test)

5. **Tester le bouton Actualiser**
   - Localiser le bouton "Actualiser"
   - Cliquer sur le bouton
   - **Résultat attendu**:
     - ✅ Message de succès: "X séquence(s) mise(s) à jour depuis les fichiers JSON"
     - ✅ Les séquences sont rechargées
     - ✅ Aucune erreur dans la console

6. **Vérifier les logs**
   
   **Console navigateur** (F12):
   ```
   [SequenceService] Using Web API
   ```
   
   **Console backend**:
   ```
   INFO:     127.0.0.1:xxxxx - "GET /api/sequences/.../list HTTP/1.1" 200 OK
   ```

### ✅ Critères de Succès
- [ ] Backend répond correctement
- [ ] Pas de message d'erreur
- [ ] Séquences rechargées correctement
- [ ] Message de confirmation affiché
- [ ] Logs indiquent "Using Web API"
- [ ] Requête API visible dans Network tab

---

## 🔍 Test 3: Vérification des Données

### Test de Cohérence

1. **Modifier une séquence manuellement**
   - Éditer un fichier `sequences/sequence_001.json`
   - Changer le champ `resume`
   - Sauvegarder

2. **Actualiser dans l'application**
   - Cliquer sur "Actualiser"
   - Vérifier que les changements sont visibles

3. **Vérifier la synchronisation**
   - Les données affichées doivent correspondre au fichier JSON

### ✅ Critères de Succès
- [ ] Modifications manuelles détectées
- [ ] Données synchronisées correctement
- [ ] Pas de perte de données

---

## 🐛 Test 4: Gestion des Erreurs

### Test 4.1: Backend Indisponible (Mode Web)

1. **Arrêter le backend**
   - Ctrl+C dans le terminal du backend

2. **Tenter d'actualiser**
   - Cliquer sur "Actualiser"
   - **Résultat attendu**:
     - ❌ Message d'erreur clair
     - ❌ Pas de crash de l'application

### Test 4.2: Dossier Sequences Manquant

1. **Renommer le dossier sequences**
   ```bash
   mv project_path/sequences project_path/sequences_backup
   ```

2. **Actualiser**
   - Cliquer sur "Actualiser"
   - **Résultat attendu**:
     - ⚠️ Message: "Aucune séquence trouvée"
     - ✅ Pas de crash

3. **Restaurer**
   ```bash
   mv project_path/sequences_backup project_path/sequences
   ```

### Test 4.3: Fichier JSON Corrompu

1. **Corrompre un fichier**
   - Éditer `sequences/sequence_001.json`
   - Supprimer une accolade `}`
   - Sauvegarder

2. **Actualiser**
   - Cliquer sur "Actualiser"
   - **Résultat attendu**:
     - ⚠️ Log d'erreur dans la console
     - ✅ Autres séquences chargées correctement
     - ✅ Pas de crash

3. **Réparer**
   - Corriger le JSON
   - Actualiser à nouveau

### ✅ Critères de Succès
- [ ] Erreurs gérées gracieusement
- [ ] Messages d'erreur clairs
- [ ] Pas de crash de l'application
- [ ] Logs détaillés pour debugging

---

## 📊 Test 5: Performance

### Mesurer le Temps de Chargement

1. **Préparer un projet avec beaucoup de séquences**
   - Créer 50+ séquences de test

2. **Mesurer en mode Electron**
   - Ouvrir DevTools > Performance
   - Cliquer sur "Actualiser"
   - Noter le temps

3. **Mesurer en mode Web**
   - Ouvrir DevTools > Network
   - Cliquer sur "Actualiser"
   - Noter le temps de la requête API

### ✅ Critères de Succès
- [ ] Mode Electron: < 1 seconde
- [ ] Mode Web: < 2 secondes
- [ ] Pas de freeze de l'UI

---

## 🔄 Test 6: Tests Automatisés

### Exécuter les Tests Unitaires

```bash
cd creative-studio-ui
npm run test sequenceService.test.ts
```

### Résultat Attendu
```
✓ src/services/__tests__/sequenceService.test.ts (15)
  ✓ SequenceService (15)
    ✓ Environment Detection (2)
    ✓ Load Sequences - Web Mode (2)
    ✓ Load Sequences - Electron Mode (4)
    ✓ Get Sequence (2)
    ✓ Create Sequence (1)
    ✓ Update Sequence (1)
    ✓ Delete Sequence (2)

Test Files  1 passed (1)
Tests  15 passed (15)
```

### ✅ Critères de Succès
- [ ] Tous les tests passent
- [ ] Couverture > 80%
- [ ] Pas de warnings

---

## 📝 Checklist Complète

### Fonctionnalités
- [ ] Actualisation fonctionne en mode Electron
- [ ] Actualisation fonctionne en mode Web
- [ ] Détection automatique de l'environnement
- [ ] Fallback transparent

### Qualité
- [ ] Pas d'erreurs TypeScript
- [ ] Pas d'erreurs Python
- [ ] Tests unitaires passent
- [ ] Logs appropriés

### UX
- [ ] Messages d'erreur clairs
- [ ] Feedback utilisateur approprié
- [ ] Performance acceptable
- [ ] Pas de crash

### Documentation
- [ ] Code commenté
- [ ] Documentation technique à jour
- [ ] Guide de test complet

---

## 🆘 Dépannage

### Problème: "Failed to load sequences"

**Solutions**:
1. Vérifier que le backend est démarré
2. Vérifier `VITE_API_URL` dans `.env`
3. Vérifier les logs backend
4. Vérifier CORS dans le backend

### Problème: "Sequence not found"

**Solutions**:
1. Vérifier que le dossier `sequences/` existe
2. Vérifier les permissions de lecture
3. Vérifier le format des fichiers JSON

### Problème: Tests échouent

**Solutions**:
1. Nettoyer et réinstaller:
   ```bash
   rm -rf node_modules
   npm install
   ```
2. Vérifier les mocks dans les tests
3. Vérifier les versions des dépendances

---

## 📞 Support

En cas de problème:
1. Consulter les logs (console + backend)
2. Vérifier la documentation technique
3. Créer une issue avec:
   - Environnement (Electron/Web)
   - Logs d'erreur
   - Étapes pour reproduire

---

**Bonne chance avec les tests! 🚀**
