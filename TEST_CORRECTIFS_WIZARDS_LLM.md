# 🧪 Plan de Test - Correctifs Wizards LLM

## Date: 2026-01-20

## ✅ COMPILATION ET BUILD

### Test 1: Build de Production
```bash
cd creative-studio-ui
npm run build
```

**Résultat**: ✅ **SUCCÈS**
- Build complété en 5.33s
- Aucune erreur de compilation
- Warnings normaux sur la taille des chunks (acceptable)

### Test 2: Vérification TypeScript
```bash
npx tsc --noEmit
```

**Résultat**: ✅ **SUCCÈS**
- Aucune erreur TypeScript
- Tous les types sont corrects

## 🚀 TESTS FONCTIONNELS À EFFECTUER

### Test 3: Démarrage de l'Application

**Commande**:
```bash
cd creative-studio-ui
npm run dev
```

**Points à Vérifier**:
- [ ] L'application démarre sans erreur
- [ ] Console affiche: "[LLMProvider] Initializing LLM service..."
- [ ] Console affiche: "[LLMProvider] LLM service initialized successfully"
- [ ] Aucune erreur dans la console du navigateur

**Résultat Attendu**: L'application démarre et le LLMProvider s'initialise automatiquement

---

### Test 4: World Wizard Sans Configuration LLM

**Étapes**:
1. Ouvrir DevTools → Application → Local Storage
2. Supprimer la clé `storycore-llm-config`
3. Rafraîchir la page
4. Cliquer sur "Create New Project"
5. Cliquer sur "World Building" wizard

**Points à Vérifier**:
- [ ] Un banner jaune apparaît en haut du wizard
- [ ] Message: "LLM Service Not Configured"
- [ ] Texte: "AI-powered features require LLM configuration..."
- [ ] Bouton "Configure LLM Now" est visible
- [ ] Le bouton a une bordure jaune

**Résultat Attendu**: Banner d'avertissement clair avec action suggérée

---

### Test 5: Configuration du LLM depuis le Wizard

**Étapes**:
1. Dans le World Wizard, cliquer sur "Configure LLM Now"
2. La modal de configuration LLM s'ouvre
3. Configurer Ollama:
   - Provider: Ollama
   - Endpoint: http://localhost:11434
   - Model: llama3.2:1b (ou un modèle installé)
4. Cliquer "Save"
5. Retourner au World Wizard

**Points à Vérifier**:
- [ ] La modal de configuration s'ouvre correctement
- [ ] Les champs sont pré-remplis avec les valeurs par défaut
- [ ] La sauvegarde réussit
- [ ] Le banner jaune disparaît du wizard
- [ ] Console affiche: "[LLMProvider] Configuration updated"

**Résultat Attendu**: Configuration réussie et banner disparaît

---

### Test 6: Character Wizard avec LLM Configuré

**Étapes**:
1. S'assurer que le LLM est configuré (Test 5)
2. Ouvrir le Character Wizard
3. Observer le haut du wizard

**Points à Vérifier**:
- [ ] Aucun banner ne s'affiche (LLM configuré)
- [ ] Les boutons de génération AI sont activés
- [ ] Pas d'erreur dans la console

**Résultat Attendu**: Wizard fonctionne normalement sans banner

---

### Test 7: Generic Wizard (Dialogue Writer)

**Étapes**:
1. Créer un projet avec au moins 1 personnage
2. Ouvrir le Dialogue Writer wizard
3. Observer le haut du wizard

**Points à Vérifier**:
- [ ] Le LLMStatusBanner est présent
- [ ] Si LLM non configuré: banner jaune
- [ ] Si LLM configuré: pas de banner
- [ ] Bouton "Configure LLM" accessible

**Résultat Attendu**: Banner cohérent avec l'état du LLM

---

### Test 8: Synchronisation Multi-Wizards

**Étapes**:
1. Ouvrir le World Wizard (laisser ouvert)
2. Ouvrir les Settings → LLM Configuration (nouvelle fenêtre/onglet si possible)
3. Changer le modèle (ex: llama3.2:1b → llama3.2:3b)
4. Sauvegarder
5. Retourner au World Wizard (sans le fermer/rouvrir)

**Points à Vérifier**:
- [ ] Console affiche: "[LLMProvider] Configuration updated"
- [ ] Le wizard utilise le nouveau modèle
- [ ] Pas besoin de fermer/rouvrir le wizard

**Résultat Attendu**: Synchronisation automatique entre composants

---

### Test 9: Erreur de Configuration

**Étapes**:
1. Ouvrir Settings → LLM Configuration
2. Configurer OpenAI avec une API key invalide: "sk-invalid"
3. Sauvegarder
4. Ouvrir un wizard
5. Tenter de générer du contenu

**Points à Vérifier**:
- [ ] Un banner rouge apparaît
- [ ] Message d'erreur clair
- [ ] Bouton "Configure LLM" visible
- [ ] L'utilisateur peut corriger immédiatement

**Résultat Attendu**: Gestion d'erreur claire avec action de récupération

---

### Test 10: État de Chargement

**Étapes**:
1. Ouvrir DevTools → Network
2. Throttle la connexion à "Slow 3G"
3. Rafraîchir la page
4. Ouvrir rapidement un wizard pendant l'initialisation

**Points à Vérifier**:
- [ ] Un banner bleu apparaît
- [ ] Message: "Initializing LLM service..."
- [ ] Icône de chargement (spinner) visible
- [ ] Puis le banner disparaît une fois initialisé

**Résultat Attendu**: État de chargement visible pendant l'initialisation

---

### Test 11: Tous les Wizards

**Étapes**:
Tester chaque wizard individuellement:
1. World Building Wizard
2. Character Creation Wizard
3. Dialogue Writer
4. Scene Generator
5. Storyboard Creator
6. Style Transfer

**Points à Vérifier pour Chaque Wizard**:
- [ ] Le LLMStatusBanner est présent
- [ ] Le banner affiche le bon état (configuré/non configuré)
- [ ] Le bouton "Configure LLM" fonctionne
- [ ] Pas d'erreur dans la console
- [ ] Le wizard s'ouvre et se ferme correctement

**Résultat Attendu**: Tous les wizards ont le même comportement cohérent

---

## 📊 RÉSULTATS DES TESTS

### Tests de Compilation ✅
- [x] Build de production: **SUCCÈS**
- [x] Vérification TypeScript: **SUCCÈS**

### Tests Fonctionnels ⏳
- [ ] Test 3: Démarrage de l'application
- [ ] Test 4: World Wizard sans configuration
- [ ] Test 5: Configuration depuis le wizard
- [ ] Test 6: Character Wizard configuré
- [ ] Test 7: Generic Wizard
- [ ] Test 8: Synchronisation multi-wizards
- [ ] Test 9: Erreur de configuration
- [ ] Test 10: État de chargement
- [ ] Test 11: Tous les wizards

## 🐛 BUGS TROUVÉS

_Aucun bug trouvé pour le moment_

## 📝 NOTES

### Avertissements Acceptables
- **Chunk size warnings**: Normaux pour une application de cette taille
- **Dynamic import warnings**: Optimisation possible mais non critique

### Améliorations Futures
1. Ajouter des tests automatisés pour le LLMProvider
2. Ajouter des tests E2E pour les wizards
3. Optimiser la taille des chunks si nécessaire

## ✅ VALIDATION FINALE

### Critères de Succès
- [x] ✅ Compilation sans erreur
- [x] ✅ Aucune erreur TypeScript
- [ ] ⏳ Tous les tests fonctionnels passent
- [ ] ⏳ Aucun bug critique trouvé
- [ ] ⏳ Expérience utilisateur améliorée

### Prochaines Actions
1. **Démarrer l'application**: `npm run dev`
2. **Exécuter les tests fonctionnels** (Tests 3-11)
3. **Documenter les résultats**
4. **Corriger les bugs éventuels**

---

## 🚀 COMMANDES RAPIDES

### Démarrer l'Application
```bash
cd creative-studio-ui
npm run dev
```

### Ouvrir dans le Navigateur
```
http://localhost:5179
```

### Vérifier les Logs
```
Ouvrir DevTools → Console
Rechercher: "[LLMProvider]"
```

### Réinitialiser la Configuration LLM
```javascript
// Dans la console du navigateur
localStorage.removeItem('storycore-llm-config');
location.reload();
```

---

**Statut Global**: ✅ **COMPILATION RÉUSSIE** - Prêt pour les tests fonctionnels
