# 🔧 CORRECTION FINALE - Erreur 404 Wizards avec Ollama

## ✅ DIAGNOSTIC COMPLET

### Situation Actuelle
- ✅ **Ollama fonctionne** : Service actif sur `http://localhost:11434`
- ✅ **Modèles installés** : `qwen3-vl:4b`, `gemma3:1b`, `llama3.1:8b`, etc.
- ❌ **Erreur 404** : L'application ne peut pas générer avec les wizards
- ❌ **Cause** : Configuration localStorage corrompue ou pointant vers un mauvais modèle

### Erreur Console
```
:11434/api/generate:1 Failed to load resource: the server responded with a status of 404 (Not Found)
```

---

## 🎯 SOLUTION IMMÉDIATE (2 MINUTES)

### Méthode 1: Réinitialisation Rapide via Console

#### Étape 1: Ouvrir la Console du Navigateur
1. Dans votre navigateur avec l'application ouverte
2. Appuyer sur **F12**
3. Cliquer sur l'onglet **Console**

#### Étape 2: Copier-Coller ce Code

```javascript
// ============================================================================
// SCRIPT DE RÉINITIALISATION LLM - STORYCORE
// ============================================================================

console.log('🔧 Début de la réinitialisation de la configuration LLM...');

// 1. Supprimer l'ancienne configuration
localStorage.removeItem('storycore-llm-config');
console.log('✅ Ancienne configuration supprimée');

// 2. Créer une nouvelle configuration propre avec qwen3-vl:4b
const newConfig = {
  provider: 'local',
  model: 'qwen3-vl:4b',
  apiKey: '',
  apiEndpoint: 'http://localhost:11434',
  streamingEnabled: true,
  parameters: {
    temperature: 0.7,
    maxTokens: 2000,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0
  },
  systemPrompts: {
    worldGeneration: 'You are a creative world-building assistant...',
    characterGeneration: 'You are a character development expert...',
    dialogueGeneration: 'You are a dialogue writing specialist...'
  },
  timeout: 30000,
  retryAttempts: 3
};

// 3. Sauvegarder la nouvelle configuration
localStorage.setItem('storycore-llm-config', JSON.stringify(newConfig));
console.log('✅ Nouvelle configuration sauvegardée:', newConfig);

// 4. Vérifier que la configuration est bien enregistrée
const savedConfig = JSON.parse(localStorage.getItem('storycore-llm-config'));
console.log('✅ Configuration vérifiée:', savedConfig);

console.log('🎉 Réinitialisation terminée! Rechargement de la page...');

// 5. Recharger la page
setTimeout(() => location.reload(), 1000);
```

#### Étape 3: Appuyer sur Entrée

La page va se recharger automatiquement après 1 seconde.

#### Étape 4: Tester

1. Ouvrir un wizard (World Building, Character, etc.)
2. Le banner jaune devrait avoir disparu
3. Cliquer sur un bouton de génération AI (ex: "Generate World Concept")
4. ✅ Ça devrait fonctionner!

---

## 🔍 VÉRIFICATION POST-CORRECTION

### Test 1: Vérifier la Configuration dans la Console

```javascript
// Afficher la configuration actuelle
const config = JSON.parse(localStorage.getItem('storycore-llm-config'));
console.table({
  'Provider': config.provider,
  'Model': config.model,
  'Endpoint': config.apiEndpoint,
  'Streaming': config.streamingEnabled
});
```

**Résultat attendu:**
```
Provider:  local
Model:     qwen3-vl:4b
Endpoint:  http://localhost:11434
Streaming: true
```

### Test 2: Tester Ollama Directement

Dans PowerShell:
```powershell
# Test 1: Vérifier que le modèle existe
ollama list

# Test 2: Tester la génération
ollama run qwen3-vl:4b "Bonjour, comment vas-tu?"

# Test 3: Tester l'API
curl -X POST http://localhost:11434/api/generate -H "Content-Type: application/json" -d "{\"model\":\"qwen3-vl:4b\",\"prompt\":\"Hello\",\"stream\":false}"
```

### Test 3: Vérifier les Logs de l'Application

Dans la console du navigateur (F12), vous devriez voir:
```
[LLMProvider] Initializing LLM service...
[LLMProvider] Checking Ollama availability at http://localhost:11434
[LLMProvider] Ollama is available
[LLMProvider] LLM service initialized successfully
```

---

## 🛠️ MÉTHODE ALTERNATIVE: Configuration Manuelle

Si la méthode console ne fonctionne pas, vous pouvez configurer manuellement:

### Option A: Via l'Interface de l'Application

1. **Ouvrir les Paramètres**
   - Cliquer sur l'icône ⚙️ (Settings) dans l'application
   - Aller dans **LLM Configuration**

2. **Configurer Ollama**
   - **Provider**: Sélectionner "Local LLM"
   - **API Endpoint**: `http://localhost:11434`
   - **Model**: Sélectionner `qwen3-vl:4b` dans la liste
   - **Temperature**: 0.7
   - **Max Tokens**: 2000
   - **Streaming**: Activé (coché)

3. **Sauvegarder**
   - Cliquer sur **Save** ou **Apply**
   - Fermer les paramètres

### Option B: Éditer localStorage Manuellement

Dans la console du navigateur:

```javascript
// Configuration minimale
localStorage.setItem('storycore-llm-config', JSON.stringify({
  provider: 'local',
  model: 'qwen3-vl:4b',
  apiEndpoint: 'http://localhost:11434'
}));

location.reload();
```

---

## 🐛 DÉPANNAGE AVANCÉ

### Problème 1: Le Modèle n'Apparaît Pas dans la Liste

**Solution:**
```powershell
# Vérifier les modèles installés
ollama list

# Si qwen3-vl:4b n'est pas là, le télécharger
ollama pull qwen3-vl:4b
```

### Problème 2: Ollama ne Répond Pas

**Vérifier le service:**
```powershell
# Vérifier si Ollama écoute sur le port 11434
netstat -an | findstr "11434"
```

**Résultat attendu:**
```
TCP    0.0.0.0:11434          0.0.0.0:0              LISTENING
```

**Si le port n'est pas ouvert:**
```powershell
# Redémarrer Ollama
ollama serve
```

### Problème 3: Erreur CORS

Si vous voyez une erreur CORS dans la console:

**Solution:**
```powershell
# Arrêter Ollama
taskkill /F /IM ollama.exe

# Redémarrer avec CORS activé
$env:OLLAMA_ORIGINS="*"
ollama serve
```

### Problème 4: Configuration ne se Sauvegarde Pas

**Vérifier les permissions localStorage:**
```javascript
// Test d'écriture
try {
  localStorage.setItem('test', 'test');
  localStorage.removeItem('test');
  console.log('✅ localStorage fonctionne');
} catch (e) {
  console.error('❌ localStorage bloqué:', e);
}
```

**Si bloqué:**
- Vérifier les paramètres de confidentialité du navigateur
- Désactiver le mode navigation privée
- Autoriser les cookies et le stockage local

---

## 📊 CHECKLIST DE VÉRIFICATION

Après avoir appliqué la correction, vérifier:

- [ ] ✅ Ollama fonctionne (`ollama list` dans PowerShell)
- [ ] ✅ Le modèle `qwen3-vl:4b` est installé
- [ ] ✅ La configuration localStorage est correcte (voir Test 1)
- [ ] ✅ L'application se connecte à Ollama (voir logs console)
- [ ] ✅ Le banner jaune a disparu des wizards
- [ ] ✅ Les boutons de génération AI sont actifs
- [ ] ✅ La génération fonctionne (test avec World Building)

---

## 🎯 RÉSULTAT ATTENDU

### Avant la Correction
```
❌ Erreur 404 sur /api/generate
❌ Banner jaune "LLM not configured"
❌ Boutons de génération désactivés
```

### Après la Correction
```
✅ Connexion à Ollama réussie
✅ Pas de banner d'erreur
✅ Boutons de génération actifs
✅ Génération AI fonctionnelle
```

---

## 📝 COMMANDES RAPIDES DE RÉFÉRENCE

### Réinitialisation Express (Console Navigateur)
```javascript
localStorage.removeItem('storycore-llm-config');
localStorage.setItem('storycore-llm-config', JSON.stringify({provider:'local',model:'qwen3-vl:4b',apiEndpoint:'http://localhost:11434',streamingEnabled:true,parameters:{temperature:0.7,maxTokens:2000,topP:0.9,frequencyPenalty:0,presencePenalty:0}}));
location.reload();
```

### Vérification Express (Console Navigateur)
```javascript
console.log(JSON.parse(localStorage.getItem('storycore-llm-config')));
```

### Test Ollama Express (PowerShell)
```powershell
ollama list
curl http://localhost:11434/api/tags
```

---

## 🆘 BESOIN D'AIDE?

Si le problème persiste après avoir suivi toutes ces étapes:

1. **Copier les logs de la console** (F12 → Console → Clic droit → Save as...)
2. **Copier la sortie de** `ollama list`
3. **Copier la configuration** (voir Vérification Test 1)
4. **Partager ces informations** pour un diagnostic plus approfondi

---

## ✅ PROCHAINES ÉTAPES

Une fois la correction appliquée et fonctionnelle:

1. **Tester tous les wizards**
   - World Building Wizard
   - Character Wizard
   - Generic Wizard

2. **Vérifier les fonctionnalités AI**
   - Génération de concepts
   - Génération de descriptions
   - Suggestions automatiques

3. **Optimiser si nécessaire**
   - Ajuster la température (0.5-1.0)
   - Ajuster max_tokens selon vos besoins
   - Tester d'autres modèles (gemma3:1b pour plus de vitesse)

---

**🎉 Bonne chance! La correction devrait prendre moins de 2 minutes avec la méthode console.**
