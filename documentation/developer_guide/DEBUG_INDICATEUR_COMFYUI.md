# Debug : Indicateur ComfyUI Rouge

## 🎯 Problème

Configuration ComfyUI montre "Connected" ✅  
Project Dashboard montre "Disconnected" ❌

## 🔍 Diagnostic Ajouté

J'ai ajouté des logs de débogage pour identifier le problème.

### Comment Déboguer

1. **Ouvrir la console du navigateur** (F12)
2. **Aller dans le Project Dashboard**
3. **Chercher ces logs** :

```
[WizardLauncher] Checking service connections...
[WizardService] Using active ComfyUI server: http://localhost:XXXX
[WizardLauncher] Connection status: { ... }
```

## 📋 Causes Possibles

### 1. Serveur Non Marqué comme Actif

**Logs attendus :**
```
[WizardService] No active ComfyUI server, using default: http://localhost:8188
```

**Solution :**
- Aller dans `Settings` → `ComfyUI Configuration`
- S'assurer que le serveur est marqué comme "Active"
- Sauvegarder

### 2. ComfyUI Arrêté

**Logs attendus :**
```
[WizardLauncher] ComfyUI check failed: Error: Failed to fetch
```

**Solution :**
```bash
cd ComfyUI
python main.py
```

### 3. Mauvais Port

**Logs attendus :**
```
[WizardService] Using active ComfyUI server: http://localhost:8000
# Mais ComfyUI tourne sur :8188
```

**Solution :**
- Vérifier sur quel port ComfyUI tourne
- Mettre à jour la configuration avec le bon port

## ✅ Test Rapide

```bash
# Vérifier que ComfyUI fonctionne
curl http://localhost:8188/system_stats

# Ou ouvrir dans le navigateur
http://localhost:8188
```

## 🎯 Prochaine Étape

1. Ouvrir la console (F12)
2. Aller dans le Project Dashboard
3. Copier les logs `[WizardService]` et `[WizardLauncher]`
4. Cela permettra d'identifier exactement le problème

## 📚 Documentation Complète

Voir `creative-studio-ui/COMFYUI_STATUS_INDICATOR_DEBUG.md` pour plus de détails.
