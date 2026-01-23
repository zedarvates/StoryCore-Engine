# Guide de Dépannage - StoryCore

Ce guide vous aidera à résoudre les problèmes courants rencontrés lors de l'utilisation de StoryCore. Suivez les étapes méthodiquement pour identifier et corriger les problèmes.

## Vue d'Ensemble

Ce guide couvre :

- 🔧 **Problèmes d'installation**
- 🌐 **Problèmes de connexion**
- ⚙️ **Problèmes de configuration**
- 🎬 **Problèmes de traitement vidéo**
- 🤖 **Problèmes ComfyUI**
- 📊 **Problèmes de performance**
- 🔒 **Problèmes de sécurité**

## Procédure Générale de Dépannage

### 1. Identification du Problème

Avant de commencer, rassemblez les informations suivantes :

- **Message d'erreur exact**
- **Version de StoryCore**
- **Système d'exploitation**
- **Configuration matérielle**
- **Étapes pour reproduire**

### 2. Vérification de Base

```bash
# Vérifier l'état du système
storycore health-check

# Vérifier les logs
storycore logs

# Vérifier les versions
storycore version
```

### 3. Diagnostic

```bash
# Exécuter le diagnostic complet
storycore diagnose

# Générer un rapport
storycore diagnose --output report.json
```

### 4. Solutions

Suivez les sections spécifiques ci-dessous pour trouver la solution appropriée.

---

## Problèmes d'Installation

### 1. Échec de l'Installation

**Symptôme** : L'installation échoue avec une erreur

**Solutions** :

#### Vérification des Prérequis

```bash
# Vérifier Python
python --version
# Doit être 3.8+

# Vérifier Node.js
node --version
# Doit être 16+

# Vérifier l'espace disque
df -h
# Doit avoir au moins 20Go disponibles
```

#### Permissions

```bash
# Windows
# Exécuter en tant qu'administrateur

# Linux/macOS
sudo chmod +x storycore-installer.sh
sudo ./storycore-installer.sh
```

#### Erreurs de Dépendances

```bash
# Réinstaller les dépendances Python
pip install -r requirements.txt --force-reinstall

# Réinstaller Node.js
npm install --force
```

### 2. Problèmes de Démarrage

**Symptôme** : StoryCore ne démarre pas

**Solutions** :

#### Vérifier les Ports

```bash
# Windows
netstat -an | findstr :3000

# Linux/macOS
lsof -i :3000
```

#### Fichiers de Configuration

```bash
# Vérifier la configuration
cat ~/.storycore/config.json

# Réinitialiser la configuration
storycore config reset
```

#### Logs d'Erreur

```bash
# Voir les logs détaillés
tail -f ~/.storycore/logs/app.log

# Windows
Get-Content ~\.storycore\logs\app.log -Wait
```

---

## Problèmes de Connexion

### 1. Problèmes d'Authentification

**Symptôme** : Impossible de se connecter

**Solutions** :

#### Vérifier les Identifiants

```bash
# Tester la connexion manuellement
curl -X POST https://api.storycore.io/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'
```

#### Problèmes JWT

```bash
# Vérifier la validité du token
storycore auth validate-token

# Rafraîchir le token
storycore auth refresh
```

#### Problèmes de Réseau

```bash
# Tester la connectivité
ping api.storycore.io

# Vérifier le DNS
nslookup api.storycore.io

# Tester la connectivité HTTPS
curl -I https://api.storycore.io
```

### 2. Problèmes de Connexion Internet

**Symptôme** : Erreurs réseau, timeout

**Solutions** :

#### Configuration Proxy

```bash
# Windows
set HTTP_PROXY=http://proxy.example.com:8080
set HTTPS_PROXY=http://proxy.example.com:8080

# Linux/macOS
export HTTP_PROXY=http://proxy.example.com:8080
export HTTPS_PROXY=http://proxy.example.com:8080
```

#### Firewall

```bash
# Windows
netsh advfirewall firewall add rule name="StoryCore" dir=in action=allow program="C:\Program Files\StoryCore\storycore.exe"

# Linux/macOS
sudo ufw allow 3000
sudo ufw allow 8000
```

---

## Problèmes de Configuration

### 1. Problèmes de Fichiers de Configuration

**Symptôme** : Configuration non appliquée

**Solutions** :

#### Vérifier la Syntaxe

```bash
# Valider la configuration JSON
cat ~/.storycore/config.json | python -m json.tool
```

#### Permissions des Fichiers

```bash
# Linux/macOS
chmod 644 ~/.storycore/config.json
```

#### Réinitialisation

```bash
# Réinitialiser la configuration
storycore config reset

# Restaurer la configuration par défaut
storycore config restore-default
```

### 2. Problèmes de Modèles IA

**Symptôme** : Modèles non chargés, erreurs de traitement

**Solutions** :

#### Vérifier les Chemins des Modèles

```bash
# Lister les modèles installés
storycore model list

# Vérifier les chemins
ls -la ~/.storycore/models/
```

#### Téléchargement des Modèles

```bash
# Forcer le téléchargement
storycore model download --force gemma3:latest

# Vérifier l'espace disque
df -h ~/.storycore/models/
```

#### Problèmes de Mémoire

```bash
# Vérifier l'utilisation mémoire
htop

# Optimiser la configuration
storycore config set models.memory_limit 16GiB
```

---

## Problèmes de Traitement Vidéo

### 1. Problèmes d'Import Vidéo

**Symptôme** : Impossible d'importer des vidéos

**Solutions** :

#### Formats Supportés

```bash
# Vérifier les formats supportés
storycore info supported-formats

# Convertir le format
ffmpeg -i input.mp4 -c:v libx264 -preset slow output.mp4
```

#### Problèmes de Codec

```bash
# Vérifier les codecs vidéo
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name input.mp4
```

#### Problèmes de Résolution

```bash
# Convertir la résolution
ffmpeg -i input.mp4 -vf "scale=1920:1080" output.mp4
```

### 2. Problèmes de Rendu

**Symptôme** : Erreurs lors du rendu vidéo

**Solutions** :

#### Problèmes GPU

```bash
# Vérifier le GPU
nvidia-smi

# Configurer le rendu GPU
storycore config set rendering.gpu true
```

#### Problèmes de Mémoire

```bash
# Vérifier la mémoire système
free -h

# Réduire la résolution du rendu
storycore config set rendering.resolution 1280x720
```

#### Problèmes de Disque

```bash
# Vérifier l'espace disque
df -h

# Nettoyer le cache
storycore cache clean
```

---

## Problèmes ComfyUI

### 1. ComfyUI Ne Démarre Pas

**Symptôme** : Erreur lors du démarrage de ComfyUI

**Solutions** :

#### Vérifier les Ports

```bash
# Vérifier si le port 8000 est utilisé
netstat -tlnp | grep :8000

# Changer le port
storycore config set comfyui.port 8001
```

#### Problèmes Python

```bash
# Vérifier l'environnement Python
python -c "import torch; print(torch.__version__)"

# Réinstaller PyTorch
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

#### Problèmes Modèles

```bash
# Vérifier les modèles
ls -la ~/.storycore/comfyui/models/

# Télécharger les modèles manuellement
storycore comfyui download-models
```

### 2. Problèmes de Traitement IA

**Symptôme** : Erreurs lors du traitement IA

**Solutions** :

#### Problèmes GPU

```bash
# Vérifier le GPU
nvidia-smi

# Configurer l'utilisation GPU
storycore config set comfyui.gpu.enabled true
storycore config set comfyui.gpu.memory_limit 0.8
```

#### Problèmes de Performance

```bash
# Vérifier la charge système
htop

# Optimiser la configuration
storycore config set comfyui.performance.batch_size 1
```

#### Problèmes de Modèles

```bash
# Vérifier les modèles disponibles
storycore comfyui list-models

# Tester un modèle simple
storycore comfyui test-model gemma3 "Hello, world!"
```

---

## Problèmes de Performance

### 1. Performance Lente

**Symptôme** : Application lente, traitement lent

**Solutions** :

#### Surveillance Système

```bash
# Vérifier la CPU
top

# Vérifier la mémoire
free -h

# Vérifier le disque
df -h

# Vérifier le réseau
iftop
```

#### Optimisation

```bash
# Optimiser la configuration
storycore config set performance.optimization true

# Nettoyer le cache
storycore cache clean

# Redémarrer le service
storycore restart
```

#### Problèmes GPU

```bash
# Vérifier l'utilisation GPU
nvidia-smi

# Configurer le GPU
storycore config set rendering.gpu true
storycore config set rendering.gpu_memory 0.8
```

### 2. Problèmes de Mémoire

**Symptôme** : Erreurs de mémoire, crash

**Solutions** :

#### Augmenter la Mémoire

```bash
# Vérifier la mémoire actuelle
storycore config get memory.limit

# Augmenter la limite
storycore config set memory.limit 32GiB
```

#### Optimisation

```bash
# Activer le garbage collection
storycore config set memory.gc.enabled true

# Configurer le cache
storycore config set memory.cache.size 10GiB
```

#### Surveillance

```bash
# Surveiller la mémoire
watch -n 1 "free -h"

# Générer un rapport mémoire
storycore memory report
```

---

## Problèmes de Sécurité

### 1. Problèmes d'Authentification

**Symptôme** : Compte verrouillé, erreurs de connexion

**Solutions** :

#### Réinitialisation du Mot de Passe

```bash
# Réinitialiser le mot de passe
storycore auth reset-password

# Vérifier la sécurité du compte
storycore security check-account
```

#### Problèmes de Session

```bash
# Vérifier les sessions actives
storycore auth list-sessions

# Invalider toutes les sessions
storycore auth invalidate-sessions
```

### 2. Problèmes de Données

**Symptôme** : Perte de données, corruption

**Solutions** :

#### Sauvegardes

```bash
# Créer une sauvegarde
storycore backup create

# Restaurer une sauvegarde
storycore backup restore backup-20260123.tar.gz
```

#### Intégrité des Données

```bash
# Vérifier l'intégrité
storycore data integrity-check

# Réparer les données
storycore data repair
```

---

## Scripts de Diagnostic

### Script de Diagnostic Complet

```bash
#!/bin/bash
# diagnostic-storycore.sh

echo "=== Diagnostic StoryCore ==="
echo "Date: $(date)"
echo ""

# Vérifier l'état du système
echo "1. Vérification du système:"
storycore health-check
echo ""

# Vérifier les versions
echo "2. Vérification des versions:"
storycore version
echo ""

# Vérifier la configuration
echo "3. Vérification de la configuration:"
storycore config validate
echo ""

# Vérifier les modèles
echo "4. Vérification des modèles:"
storycore model list
echo ""

# Vérifier ComfyUI
echo "5. Vérification de ComfyUI:"
storycore comfyui status
echo ""

# Vérifier les ressources système
echo "6. Vérification des ressources système:"
echo "   - CPU: $(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1"%"}')"
echo "   - Mémoire: $(free -h | grep Mem | awk '{print $3"/"$2 " (" $3/$2*100 "%)"}')"
echo "   - Disque: $(df -h ~ | tail -1 | awk '{print $3"/"$2 " (" $5" used)"}')"
echo ""

# Générer un rapport
echo "7. Génération du rapport de diagnostic:"
storycore diagnose --output diagnostic-report-$(date +%Y%m%d-%H%M%S).json
echo ""

echo "=== Fin du Diagnostic ==="
```

### Script de Réparation Automatisée

```bash
#!/bin/bash
# repair-storycore.sh

echo "=== Réparation StoryCore ==="
echo "Date: $(date)"
echo ""

# Arrêter les services
echo "1. Arrêt des services:"
storycore stop
echo ""

# Nettoyer le cache
echo "2. Nettoyage du cache:"
storycore cache clean
echo ""

# Réinitialiser la configuration
echo "3. Réinitialisation de la configuration:"
storycore config reset
echo ""

# Restaurer la configuration par défaut
echo "4. Restauration de la configuration par défaut:"
storycore config restore-default
echo ""

# Vérifier et réparer les modèles
echo "5. Vérification et réparation des modèles:"
storycore model check
storycore model repair
echo ""

# Redémarrer les services
echo "6. Redémarrage des services:"
storycore start
echo ""

# Vérifier l'état
echo "7. Vérification de l'état:"
storycore health-check
echo ""

echo "=== Réparation Terminée ==="
```

---

## Support

Si vous ne trouvez pas de solution à votre problème :

1. **Consultez les [Notes de Version](../CHANGELOG.md)**
2. **Vérifiez les [Problèmes Connus](https://github.com/storycore/storycore/issues)**
3. **Contactez le Support** :
   - Email : support@storycore.io
   - Discord : [Serveur Discord StoryCore](https://discord.gg/storycore)
   - GitHub : [Issues GitHub](https://github.com/storycore/storycore/issues)

### Informations à Fournir

Lorsque vous contactez le support, veuillez inclure :

- **Version de StoryCore** : `storycore version`
- **Système d'exploitation** : OS, version, architecture
- **Configuration matérielle** : CPU, RAM, GPU, espace disque
- **Message d'erreur exact** : Copier-coller l'erreur complète
- **Logs pertinents** : Fournir les logs détaillés
- **Étapes pour reproduire** : Description exacte des étapes

---

*Pour plus d'informations, consultez la [Documentation Technique](../TECHNICAL_GUIDE.md).*