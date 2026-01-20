# 🎯 Guide Rapide : Multi-Serveurs ComfyUI

## ✅ C'est Fait !

La fonctionnalité de gestion multi-serveurs ComfyUI est maintenant **implémentée et fonctionnelle** !

## 🚀 Démarrage Rapide (2 minutes)

### 1. Ouvrez la Configuration
```
Menu → Settings → ComfyUI Configuration
```

### 2. Ajoutez Votre Premier Serveur
1. Cliquez sur **"+ Add Server"**
2. Remplissez :
   - **Server Name** : `Local Dev`
   - **Server URL** : `http://localhost:8188`
3. Cliquez sur **"Add Server"**

### 3. Testez la Connexion
- Cliquez sur l'icône 🔌 sur la carte du serveur
- Statut passe à ✅ **Connected** si ComfyUI est démarré

### 4. C'est Tout !
Votre serveur est maintenant configuré et actif.

## 🎨 Interface

### Boutons Principaux
- **+ Add Server** : Ajouter un nouveau serveur
- **Test All** : Tester tous les serveurs
- **Export** : Exporter la configuration
- **Import** : Importer une configuration

### Carte de Serveur
```
┌─────────────────────────────────────────────┐
│ ● Local Dev              ✅ Connected       │
│   http://localhost:8188                     │
│   v1.0.0 | VRAM: 24GB | 150 models         │
│   [🔌 Test] [✏️ Edit] [🗑️ Delete]          │
└─────────────────────────────────────────────┘
```

- **●/○** : Radio button (serveur actif/inactif)
- **🔌** : Tester la connexion
- **✏️** : Éditer le serveur
- **🗑️** : Supprimer le serveur

## 📝 Exemples d'Utilisation

### Exemple 1 : Dev + Production

**Ajoutez deux serveurs :**

**Serveur 1 - Local Dev**
- Name: `Local Dev`
- URL: `http://localhost:8188`
- Auth: None
- ✅ Actif

**Serveur 2 - Production**
- Name: `Production Server`
- URL: `http://192.168.1.100:8188`
- Auth: Basic (username/password)
- ○ Inactif

**Basculer :**
- Cliquez sur ○ à côté de "Production Server"
- Il devient actif (●)

### Exemple 2 : Plusieurs GPU

**Serveur 1 - GPU Principal**
- Name: `GPU Server 1 (RTX 4090)`
- URL: `http://192.168.1.10:8188`
- VRAM Limit: 24

**Serveur 2 - GPU Secondaire**
- Name: `GPU Server 2 (RTX 3090)`
- URL: `http://192.168.1.11:8188`
- VRAM Limit: 24

**Serveur 3 - CPU Fallback**
- Name: `CPU Fallback`
- URL: `http://192.168.1.12:8188`
- VRAM Limit: 0

**Auto-Switch :**
- Activez **"Auto-switch on Failure"**
- Si GPU 1 échoue, bascule automatiquement sur GPU 2

## ⚙️ Paramètres Avancés

Cliquez sur **"▶ Advanced Settings"** dans le modal :

### Auto-start ComfyUI
Démarrer automatiquement le serveur au lancement

### Max Queue Size
Nombre maximum de tâches en attente (défaut: 10)

### Request Timeout
Délai d'expiration en millisecondes (défaut: 300000 = 5 min)

### VRAM Limit
Limite de mémoire GPU en GB (vide = auto-détection)

### Models Path
Chemin vers le dossier des modèles ComfyUI

## 🔄 Export/Import

### Exporter la Configuration
1. Cliquez sur **"Export"**
2. Un fichier `comfyui-servers-[timestamp].json` est téléchargé
3. Sauvegardez-le en lieu sûr

### Importer une Configuration
1. Cliquez sur **"Import"**
2. Sélectionnez un fichier JSON
3. La configuration est restaurée

**Cas d'usage :**
- Sauvegarder votre configuration
- Partager avec l'équipe
- Restaurer après réinstallation

## 🎯 Raccourcis

### Actions Rapides
- **Ajouter** : Cliquez sur "+ Add Server"
- **Activer** : Cliquez sur ○ à gauche du serveur
- **Tester** : Cliquez sur 🔌
- **Éditer** : Cliquez sur ✏️
- **Supprimer** : Cliquez sur 🗑️

### Statuts
- ✅ **Connected** : Serveur accessible
- ⚠️ **Disconnected** : Serveur non accessible
- 🔴 **Error** : Erreur de connexion
- ⏳ **Testing** : Test en cours

## ❓ FAQ

### Combien de serveurs puis-je ajouter ?
Autant que vous voulez ! Pas de limite.

### Puis-je supprimer le serveur actif ?
Non, sélectionnez d'abord un autre serveur comme actif.

### Que se passe-t-il si le serveur actif échoue ?
- Si **Auto-switch** est activé : Bascule automatiquement sur un autre serveur
- Sinon : Les générations échouent

### Mes anciens paramètres sont-ils perdus ?
Non ! Ils sont automatiquement migrés vers un serveur "Default Server".

### Puis-je utiliser des serveurs distants ?
Oui ! Utilisez l'URL complète (ex: `http://192.168.1.100:8188`).

### L'authentification est-elle sécurisée ?
Les credentials sont stockés dans LocalStorage. Pour plus de sécurité, utilisez HTTPS.

## 🐛 Problèmes Courants

### "Connection Failed"
- ✅ Vérifiez que ComfyUI est démarré
- ✅ Vérifiez l'URL et le port
- ✅ Testez avec `curl http://localhost:8188/system_stats`

### "Cannot delete server"
- ✅ Le serveur est actif, sélectionnez-en un autre d'abord

### "Import failed"
- ✅ Vérifiez que le fichier JSON est valide
- ✅ Assurez-vous qu'il provient d'un export StoryCore

## 📚 Documentation Complète

Pour plus de détails :
- `MULTI_COMFYUI_IMPLEMENTATION_COMPLETE.md` - Documentation technique complète
- `MULTI_COMFYUI_SERVERS_FEATURE.md` - Spécification originale

## 🎉 Profitez !

Vous pouvez maintenant gérer plusieurs serveurs ComfyUI facilement !

**Prochaines étapes :**
1. Ajoutez vos serveurs
2. Testez les connexions
3. Commencez à générer du contenu
4. Basculez entre serveurs selon vos besoins

---

**Besoin d'aide ?** Consultez la documentation complète ou ouvrez une issue sur GitHub.
