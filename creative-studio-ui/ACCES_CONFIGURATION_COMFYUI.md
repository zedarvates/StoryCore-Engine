# 🎯 Accès Rapide à la Configuration ComfyUI

## ✅ La configuration ComfyUI existe déjà !

Vous la trouverez dans le menu principal de l'application.

## 📍 Où la trouver ?

```
Menu Principal (en haut de l'écran)
    ↓
Settings (cliquez ici)
    ↓
ComfyUI Configuration (cliquez ici)
    ↓
Modal de configuration s'ouvre ✨
```

## 🖱️ Étapes Visuelles

1. **Regardez en haut de l'écran** → Vous verrez la barre de menu
2. **Cherchez "Settings"** → C'est entre les autres menus (File, Edit, View, etc.)
3. **Cliquez sur "Settings"** → Un menu déroulant s'ouvre
4. **Vous verrez 3 options :**
   - 🔌 LLM Configuration
   - 🎨 **ComfyUI Configuration** ← CLIQUEZ ICI
   - ⚙️ General Settings

## ⚙️ Paramètres Principaux

Une fois le modal ouvert, vous pouvez configurer :

### 🌐 Server URL
- **Défaut :** `http://localhost:8188`
- **À modifier si :** ComfyUI utilise un autre port

### 🔐 Authentication
- **Par défaut :** None (aucune authentification)
- **Options :** Basic, Bearer, API Key

### 🧪 Test Connection
- **Bouton :** "Test Connection"
- **Fonction :** Vérifie que ComfyUI est accessible

### 💾 Save Settings
- **Bouton :** "Save Settings"
- **Fonction :** Sauvegarde votre configuration

## ⚡ Configuration Rapide (5 minutes)

```bash
# 1. Démarrez ComfyUI
cd /chemin/vers/ComfyUI
python main.py

# 2. Notez l'URL affichée (généralement http://localhost:8188)

# 3. Dans StoryCore :
#    - Menu Settings → ComfyUI Configuration
#    - Vérifiez l'URL
#    - Cliquez "Test Connection"
#    - Cliquez "Save Settings"

# ✅ C'est fait !
```

## 🔍 Vérification

Pour vérifier que tout fonctionne :

1. ✅ ComfyUI est démarré (console ouverte)
2. ✅ URL correcte dans StoryCore (`http://localhost:8188`)
3. ✅ Test Connection réussit (affiche les infos du serveur)
4. ✅ Settings sauvegardés

## ❌ Problèmes Courants

### "Je ne vois pas le menu Settings"
- **Solution :** Regardez en haut de l'écran, dans la barre de menu principale
- **Astuce :** C'est à côté de "File", "Edit", "View", etc.

### "Connection failed"
- **Cause :** ComfyUI n'est pas démarré
- **Solution :** Lancez ComfyUI avec `python main.py`

### "Wrong URL"
- **Cause :** Port incorrect
- **Solution :** Vérifiez le port dans la console ComfyUI (souvent 8188)

## 📚 Documentation Complète

Pour plus de détails, consultez :
- `COMFYUI_CONFIGURATION_GUIDE.md` (guide complet)
- Menu Documentation → User Guide (dans l'application)

## 🎉 Prochaines Étapes

Après avoir configuré ComfyUI :

1. 🔌 Configurez aussi LLM (Settings → LLM Configuration)
2. 🎨 Créez votre premier projet
3. 🌍 Utilisez les wizards pour générer du contenu

---

**Note :** La configuration est sauvegardée automatiquement dans le navigateur (LocalStorage).
