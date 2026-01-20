# Guide de Configuration ComfyUI

## Comment Accéder à la Configuration ComfyUI

La configuration ComfyUI est **déjà implémentée** et accessible via le menu principal de l'application.

### Étapes pour Accéder à la Configuration

1. **Ouvrez l'application StoryCore Creative Studio**

2. **Cliquez sur le menu "Settings"** dans la barre de menu en haut
   - Le menu se trouve à côté de "File", "Edit", "View", etc.

3. **Sélectionnez "ComfyUI Configuration"**
   - Vous verrez trois options dans le menu Settings :
     - ✅ **LLM Configuration** (pour configurer OpenAI, Anthropic, Local LLM, etc.)
     - ✅ **ComfyUI Configuration** ← C'EST ICI !
     - ⚙️ **General Settings**

4. **Le modal de configuration s'ouvre**
   - Vous pouvez maintenant configurer votre serveur ComfyUI

## Paramètres Disponibles dans ComfyUI Configuration

### 1. Connection Configuration

#### Server URL
- **Champ:** URL du serveur ComfyUI
- **Défaut:** `http://localhost:8188`
- **Description:** L'URL où votre serveur ComfyUI est en cours d'exécution
- **Exemple:** `http://localhost:8188` ou `http://192.168.1.100:8188`

#### Authentication
- **Type d'authentification:**
  - `none` - Aucune authentification (par défaut)
  - `basic` - Authentification HTTP Basic
  - `bearer` - Token Bearer
  - `api-key` - Clé API personnalisée

- **Username/Password** (si Basic Auth)
- **Token** (si Bearer ou API Key)

### 2. Server Configuration

#### Auto-start ComfyUI
- **Option:** Démarrer automatiquement ComfyUI au lancement de l'application
- **Par défaut:** Désactivé

#### Max Queue Size
- **Champ:** Nombre maximum de tâches dans la file d'attente
- **Défaut:** 10
- **Description:** Limite le nombre de générations en attente

#### Request Timeout
- **Champ:** Délai d'expiration des requêtes (en millisecondes)
- **Défaut:** 300000 (5 minutes)
- **Description:** Temps maximum d'attente pour une réponse du serveur

#### VRAM Limit
- **Champ:** Limite de VRAM (en GB)
- **Défaut:** Vide (auto-détection)
- **Description:** Limite la mémoire GPU utilisée par ComfyUI

#### Models Path
- **Champ:** Chemin vers le dossier des modèles ComfyUI
- **Exemple:** `/path/to/ComfyUI/models`
- **Description:** Emplacement des modèles Stable Diffusion, LoRA, etc.

### 3. Server Information

Après avoir testé la connexion avec succès, vous verrez :
- ✅ **Status:** Connected / Disconnected
- 📊 **Version:** Version de ComfyUI
- 🖥️ **System Info:** CPU, RAM, GPU
- 💾 **VRAM:** Mémoire GPU disponible
- 📦 **Models:** Nombre de modèles disponibles

## Workflow Typique

### Configuration Initiale

1. **Démarrez ComfyUI** sur votre machine
   ```bash
   # Dans le dossier ComfyUI
   python main.py
   ```

2. **Ouvrez StoryCore Creative Studio**

3. **Accédez à Settings → ComfyUI Configuration**

4. **Vérifiez l'URL du serveur**
   - Par défaut : `http://localhost:8188`
   - Modifiez si ComfyUI utilise un autre port

5. **Cliquez sur "Test Connection"**
   - ✅ Si succès : Les informations du serveur s'affichent
   - ❌ Si échec : Vérifiez que ComfyUI est bien démarré

6. **Configurez les options avancées** (optionnel)
   - Chemin des modèles
   - Limite VRAM
   - Timeout

7. **Cliquez sur "Save Settings"**

### Vérification de la Configuration

Après avoir sauvegardé, vous pouvez vérifier que tout fonctionne :

1. **Retournez au menu Settings → ComfyUI Configuration**
2. **Les paramètres sauvegardés sont chargés automatiquement**
3. **Cliquez sur "Test Connection" pour re-vérifier**

## Résolution des Problèmes

### Erreur : "Connection failed"

**Causes possibles :**
1. ComfyUI n'est pas démarré
2. Mauvaise URL ou port
3. Pare-feu bloquant la connexion
4. Authentification incorrecte

**Solutions :**
1. Vérifiez que ComfyUI est en cours d'exécution
2. Vérifiez l'URL dans la console ComfyUI (généralement affichée au démarrage)
3. Désactivez temporairement le pare-feu pour tester
4. Vérifiez les credentials d'authentification

### Erreur : "Timeout"

**Causes possibles :**
1. ComfyUI est surchargé
2. Timeout trop court
3. Problème réseau

**Solutions :**
1. Attendez que ComfyUI termine les tâches en cours
2. Augmentez le "Request Timeout" dans les paramètres
3. Vérifiez votre connexion réseau

### Erreur : "Authentication failed"

**Causes possibles :**
1. Mauvais type d'authentification
2. Credentials incorrects

**Solutions :**
1. Vérifiez le type d'authentification requis par votre serveur ComfyUI
2. Vérifiez username/password ou token

## Intégration avec le Workflow StoryCore

Une fois ComfyUI configuré, il sera utilisé automatiquement pour :

1. **Génération d'images** dans les wizards
2. **Master Coherence Sheet** (grille 3x3)
3. **Promotion de panels**
4. **Génération de shots**
5. **Refinement d'images**

Les tâches de génération apparaîtront dans la **Task Queue** avec le statut en temps réel.

## Fichiers de Configuration

Les paramètres ComfyUI sont sauvegardés dans :
- **LocalStorage:** `comfyui-settings`
- **Format:** JSON

Vous pouvez exporter/importer la configuration via le bouton "Export/Import Settings" (à venir).

## Raccourcis Clavier

- **Ouvrir ComfyUI Settings:** Aucun raccourci par défaut (utilisez le menu)
- **Tester la connexion:** Cliquez sur "Test Connection" dans le modal

## Notes Importantes

1. **Port par défaut:** ComfyUI utilise le port `8188` par défaut
2. **Sécurité:** Si vous exposez ComfyUI sur Internet, utilisez l'authentification
3. **Performance:** Limitez la VRAM si vous utilisez le GPU pour d'autres tâches
4. **Modèles:** Assurez-vous que les modèles nécessaires sont installés dans ComfyUI

## Prochaines Étapes

Après avoir configuré ComfyUI :

1. ✅ Configurez aussi **LLM Settings** (Settings → LLM Configuration)
2. 🎨 Créez votre premier projet
3. 🌍 Utilisez le **World Wizard** pour générer un monde
4. 👤 Créez des personnages avec le **Character Wizard**
5. 🎬 Générez des shots avec le **Shot Wizard**

---

**Besoin d'aide ?** Consultez la documentation complète dans le menu **Documentation → User Guide**.
