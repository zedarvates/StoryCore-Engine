# Debug : Indicateur de Statut ComfyUI

## 🎯 Problème Signalé

Dans la configuration ComfyUI, le statut indique "Connected", mais dans le Project Dashboard, l'indicateur ComfyUI (Optional) reste rouge (disconnected).

## 🔍 Diagnostic

### Où Sont les Indicateurs ?

**1. Configuration ComfyUI (Settings)**
- Localisation : `Settings` → `ComfyUI Configuration`
- Composant : `ComfyUISettingsPanel`
- Vérifie : L'endpoint configuré spécifiquement

**2. Project Dashboard (Wizards)**
- Localisation : Project Dashboard → Section "Creative Wizards"
- Composant : `WizardLauncher`
- Vérifie : Le serveur actif depuis `comfyuiServersService`

### Pourquoi la Différence ?

Les deux composants vérifient la connexion différemment :

**ComfyUISettingsPanel :**
```typescript
// Teste l'endpoint que vous configurez
const response = await fetch(`${endpoint}/system_stats`);
```

**WizardLauncher :**
```typescript
// Utilise WizardService qui récupère le serveur actif
const wizardService = new WizardService();
const status = await wizardService.checkComfyUIConnection();
```

## 🔧 Corrections Appliquées

### 1. Ajout de Logs de Débogage

**Dans WizardLauncher :**
```typescript
console.log('[WizardLauncher] Checking service connections...');
console.log('[WizardLauncher] Connection status:', {
  ollama: ollamaStatus.connected,
  comfyui: comfyuiStatus.connected,
  ollamaEndpoint: ollamaStatus.endpoint,
  comfyuiEndpoint: comfyuiStatus.endpoint,
});
```

**Dans WizardService :**
```typescript
console.log('[WizardService] Using active ComfyUI server:', activeServer.serverUrl);
console.log('[WizardService] No active ComfyUI server, using default:', this.comfyuiEndpoint);
```

### 2. Logs Attendus

Ouvrez la console (F12) et vous devriez voir :

**Si ComfyUI est configuré et actif :**
```
[WizardLauncher] Checking service connections...
[WizardService] Using active ComfyUI server: http://localhost:8188
[connection] ComfyUI connection successful
[WizardLauncher] Connection status: {
  ollama: true,
  comfyui: true,
  ollamaEndpoint: "http://localhost:11434/api/tags",
  comfyuiEndpoint: "http://localhost:8188"
}
```

**Si ComfyUI n'est pas configuré :**
```
[WizardLauncher] Checking service connections...
[WizardService] No active ComfyUI server, using default: http://localhost:8188
[WizardLauncher] ComfyUI check failed: Error: ...
[WizardLauncher] Connection status: {
  ollama: true,
  comfyui: false,
  ...
}
```

## 📋 Étapes de Diagnostic

### 1. Vérifier la Configuration ComfyUI

1. Aller dans `Settings` → `ComfyUI Configuration`
2. Vérifier qu'un serveur est configuré
3. Cliquer sur "Test Connection"
4. Si "Connected" s'affiche, noter l'URL du serveur

### 2. Vérifier le Serveur Actif

1. Ouvrir la console (F12)
2. Aller dans le Project Dashboard
3. Chercher les logs `[WizardService]`
4. Vérifier quel endpoint est utilisé

### 3. Comparer les Endpoints

Les deux doivent utiliser le même endpoint :
- Configuration : L'endpoint que vous avez testé
- Dashboard : L'endpoint du serveur actif

### 4. Vérifier que ComfyUI est Démarré

```bash
# Tester la connexion
curl http://localhost:8188/system_stats

# Ou ouvrir dans le navigateur
http://localhost:8188
```

## 🐛 Causes Possibles

### Cause 1 : Serveur Non Actif

**Symptôme :** Configuration montre "Connected", Dashboard montre "Disconnected"

**Diagnostic :**
```
[WizardService] No active ComfyUI server, using default: http://localhost:8188
```

**Solution :**
1. Aller dans `Settings` → `ComfyUI Configuration`
2. Cliquer sur le serveur configuré
3. S'assurer qu'il est marqué comme "Active"
4. Sauvegarder

### Cause 2 : ComfyUI Arrêté Après Configuration

**Symptôme :** Configuration a testé avec succès, mais ComfyUI s'est arrêté depuis

**Diagnostic :**
```
[WizardLauncher] ComfyUI check failed: Error: Failed to fetch
```

**Solution :**
```bash
# Redémarrer ComfyUI
cd ComfyUI
python main.py
```

### Cause 3 : Endpoint Différent

**Symptôme :** Configuration utilise un port, Dashboard en utilise un autre

**Diagnostic :**
```
[WizardService] Using active ComfyUI server: http://localhost:8000
# Mais ComfyUI tourne sur :8188
```

**Solution :**
1. Vérifier sur quel port ComfyUI tourne réellement
2. Mettre à jour la configuration avec le bon port
3. Marquer le serveur comme actif

### Cause 4 : Cache de Configuration

**Symptôme :** Changements de configuration non pris en compte

**Solution :**
1. Rafraîchir la page (F5)
2. Ou redémarrer l'application

## 🔄 Flux de Vérification

```
WizardLauncher (Dashboard)
    ↓
WizardService.checkComfyUIConnection()
    ↓
getActiveComfyUIEndpoint()
    ↓
comfyuiServersService.getActiveServer()
    ↓
Retourne le serveur marqué comme "active"
    ↓
Teste la connexion à cet endpoint
    ↓
Met à jour l'indicateur (vert ou rouge)
```

## ✅ Solution Rapide

Si l'indicateur reste rouge malgré une configuration correcte :

1. **Ouvrir la console (F12)**
2. **Chercher les logs** `[WizardService]` et `[WizardLauncher]`
3. **Vérifier l'endpoint utilisé**
4. **S'assurer que ComfyUI tourne sur cet endpoint**
5. **Rafraîchir la page** (F5)

## 📝 Commandes de Test

```bash
# Vérifier que ComfyUI fonctionne
curl http://localhost:8188/system_stats

# Devrait retourner quelque chose comme :
# {"system": {...}, "devices": [...]}

# Si erreur "Connection refused" :
cd ComfyUI
python main.py
```

## 🎯 Résumé

Les logs ajoutés vous permettront de voir exactement :
- ✅ Quel endpoint est utilisé par le Dashboard
- ✅ Si la connexion réussit ou échoue
- ✅ Quel est le message d'erreur exact

**Prochaine étape :** Ouvrez la console (F12), allez dans le Project Dashboard, et partagez les logs `[WizardService]` et `[WizardLauncher]` pour diagnostic précis.
