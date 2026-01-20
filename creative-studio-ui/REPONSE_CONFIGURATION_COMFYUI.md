# Réponse : Configuration ComfyUI

## Question
> "Dans ComfyUI configuration je ne vois pas où je peux paramétrer mon serveur ComfyUI, est-ce normal ?"

## Réponse : Non, ce n'est pas normal !

La configuration ComfyUI **existe déjà** et est **complètement fonctionnelle**. Elle est accessible via le menu principal.

## 🎯 Où Trouver la Configuration

### Chemin d'Accès
```
Menu Principal → Settings → ComfyUI Configuration
```

### Localisation Exacte
1. **En haut de l'écran** : Barre de menu principale
2. **Cliquez sur "Settings"** : Menu déroulant s'ouvre
3. **Sélectionnez "ComfyUI Configuration"** : Modal s'ouvre

## ✅ Ce Qui Est Déjà Implémenté

### Composants Existants
- ✅ `ComfyUISettingsPanel.tsx` - Panel de configuration complet
- ✅ `ComfyUISettingsModal.tsx` - Modal wrapper
- ✅ `comfyuiService.ts` - Service de connexion ComfyUI
- ✅ Menu "Settings" dans `MenuBar.tsx`
- ✅ State management dans `useAppStore.ts`
- ✅ Intégration dans `App.tsx`

### Fonctionnalités Disponibles
- ✅ Configuration de l'URL du serveur
- ✅ Authentification (None, Basic, Bearer, API Key)
- ✅ Test de connexion
- ✅ Affichage des informations du serveur
- ✅ Configuration avancée (VRAM, timeout, queue size, etc.)
- ✅ Sauvegarde automatique dans LocalStorage

## 🔧 Paramètres Configurables

### Connection
- **Server URL** : `http://localhost:8188` (défaut)
- **Authentication Type** : None, Basic, Bearer, API Key
- **Credentials** : Username/Password ou Token

### Advanced Settings
- **Auto-start ComfyUI** : Démarrage automatique
- **Max Queue Size** : Limite de la file d'attente (défaut: 10)
- **Request Timeout** : Timeout en ms (défaut: 300000)
- **VRAM Limit** : Limite GPU en GB (optionnel)
- **Models Path** : Chemin vers les modèles

### Server Info (après connexion)
- Status (Connected/Disconnected)
- Version de ComfyUI
- System Info (CPU, RAM, GPU)
- VRAM disponible
- Nombre de modèles

## 🚀 Configuration Rapide

```bash
# 1. Démarrez ComfyUI
python main.py

# 2. Dans StoryCore Creative Studio
#    Menu → Settings → ComfyUI Configuration

# 3. Vérifiez l'URL (http://localhost:8188)

# 4. Cliquez "Test Connection"

# 5. Cliquez "Save Settings"
```

## 📁 Fichiers Concernés

### Interface
- `creative-studio-ui/src/components/settings/ComfyUISettingsPanel.tsx`
- `creative-studio-ui/src/components/settings/ComfyUISettingsModal.tsx`
- `creative-studio-ui/src/components/MenuBar.tsx` (ligne 387-391)

### Services
- `creative-studio-ui/src/services/comfyuiService.ts`
- `creative-studio-ui/src/services/settingsPropagation.ts`

### State Management
- `creative-studio-ui/src/stores/useAppStore.ts` (ligne 42, 127, 189)

### App Integration
- `creative-studio-ui/src/App.tsx` (ligne 16, 46-47, 498-502)

## 🔍 Vérification

Pour vérifier que le menu est bien présent :

1. **Ouvrez l'application** : `npm run dev` dans `creative-studio-ui/`
2. **Regardez la barre de menu** : En haut de l'écran
3. **Cherchez "Settings"** : Entre les autres menus
4. **Cliquez dessus** : Vous devriez voir :
   - LLM Configuration
   - **ComfyUI Configuration** ← ICI
   - General Settings

## 💡 Si Vous Ne Voyez Toujours Pas le Menu

### Vérifications
1. ✅ L'application est bien démarrée (`npm run dev`)
2. ✅ Vous êtes sur la bonne page (pas sur une page de démo)
3. ✅ La barre de menu est visible en haut
4. ✅ Vous avez cliqué sur "Settings" (pas un autre menu)

### Debug
Si le menu n'apparaît toujours pas :

```bash
# Vérifiez que les fichiers existent
ls creative-studio-ui/src/components/settings/ComfyUISettingsPanel.tsx
ls creative-studio-ui/src/components/settings/ComfyUISettingsModal.tsx

# Vérifiez qu'il n'y a pas d'erreurs dans la console
# Ouvrez DevTools (F12) → Console
```

## 📚 Documentation

Guides créés pour vous aider :
- ✅ `COMFYUI_CONFIGURATION_GUIDE.md` - Guide complet détaillé
- ✅ `ACCES_CONFIGURATION_COMFYUI.md` - Guide d'accès rapide
- ✅ Ce fichier - Réponse à votre question

## 🎯 Conclusion

**La configuration ComfyUI est complètement implémentée et fonctionnelle.**

Elle est accessible via : **Menu Settings → ComfyUI Configuration**

Si vous ne la voyez pas, c'est probablement un problème d'affichage ou de navigation. Suivez les étapes ci-dessus pour la localiser.

---

**Besoin d'aide supplémentaire ?** Consultez `ACCES_CONFIGURATION_COMFYUI.md` pour un guide visuel étape par étape.
