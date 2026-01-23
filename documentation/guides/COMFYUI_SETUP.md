# Installation ComfyUI - StoryCore

Ce guide vous aidera à installer et configurer ComfyUI avec StoryCore pour une intégration optimale du traitement IA.

## Vue d'Ensemble

ComfyUI est un puissant outil de traitement IA qui s'intègre parfaitement avec StoryCore. Cette installation vous permettra d'utiliser les modèles IA les plus avancés pour vos projets de création de contenu.

## Prérequis

### Système Requis

- **Système d'exploitation** : Windows 10/11, macOS 10.14+, Ubuntu 18.04+
- **Mémoire RAM** : 16Go minimum (32Go recommandé)
- **Espace disque** : 50Go minimum pour les modèles et installations
- **GPU** : GPU NVIDIA avec 8Go VRAM minimum (16Go recommandé)
- **CPU** : 8 cœurs minimum

### Logiciels Prérequis

- **Python** : 3.8+ (inclus dans StoryCore)
- **CUDA Toolkit** : 11.8+ (pour GPU NVIDIA)
- **Docker** : Optionnel, recommandé pour l'isolation

## Installation Automatique (Recommandé)

StoryCore installe ComfyUI automatiquement lors de la première exécution. Si l'installation échoue ou si vous devez réinstaller, suivez ces étapes :

### Via l'Interface StoryCore

1. Lancez StoryCore
2. Allez dans `Outils > ComfyUI > Installation`
3. Cliquez sur "Installer ComfyUI"
4. Suivez les instructions à l'écran

### Via la Ligne de Commande

```bash
# Installation via le CLI StoryCore
storycore comfyui install

# Vérification de l'installation
storycore comfyui status

# Démarrage manuel
storycore comfyui start
```

## Installation Manuelle

Si vous préférez une installation manuelle, suivez ces étapes :

### 1. Téléchargement et Extraction

```bash
# Clonez le dépôt ComfyUI
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI

# Ou téléchargez la dernière version depuis GitHub
# https://github.com/comfyanonymous/ComfyUI/releases
```

### 2. Installation des Dépendances

```bash
# Créez un environnement virtuel
python -m venv comfyui_env
source comfyui_env/bin/activate  # Linux/macOS
# comfyui_env\Scripts\activate  # Windows

# Installez les dépendances Python
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
pip install -r requirements.txt
```

### 3. Configuration GPU

#### NVIDIA GPU

```bash
# Vérifiez l'installation de CUDA
nvidia-smi

# Testez PyTorch avec CUDA
python -c "import torch; print(f'CUDA disponible: {torch.cuda.is_available()}')"
python -c "import torch; print(f'GPU: {torch.cuda.get_device_name(0)}')"
```

#### CPU uniquement

```bash
# Installez la version CPU de PyTorch
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
```

### 4. Configuration de StoryCore

```json
// config.json
{
  "comfyui": {
    "enabled": true,
    "path": "C:\\Program Files\\StoryCore\\comfyui",
    "port": 8000,
    "host": "localhost",
    "models": {
      "path": "C:\\Program Files\\StoryCore\\models",
      "auto_download": true
    },
    "gpu": {
      "enabled": true,
      "memory_limit": 0.8,
      "precision": "fp16"
    }
  }
}
```

## Configuration Avancée

### Modèles IA

#### Téléchargement des Modèles

```bash
# Téléchargez les modèles via le CLI StoryCore
storycore model download gemma3:latest
storycore model download qwen3:latest
storycore model download llava:latest

# Ou manuellement
mkdir -p models
# Placez vos modèles dans le dossier models/
```

#### Configuration des Modèles

```json
// models.json
{
  "models": {
    "gemma3": {
      "path": "models/gemma3/gemma3-7b.Q4_0.gguf",
      "type": "llama",
      "parameters": {
        "n_ctx": 8192,
        "n_gpu_layers": 40
      }
    },
    "qwen3": {
      "path": "models/qwen3/qwen3-14b-instruct.Q4_0.gguf",
      "type": "llama",
      "parameters": {
        "n_ctx": 8192,
        "n_gpu_layers": 40
      }
    }
  }
}
```

### Paramètres de Performance

```json
// performance.json
{
  "comfyui": {
    "performance": {
      "batch_size": 1,
      "max_tokens": 8192,
      "temperature": 0.7,
      "top_p": 0.9,
      "top_k": 50,
      "repetition_penalty": 1.1
    },
    "memory": {
      "max_memory": "24GiB",
      "offload_folder": "comfyui/offload",
      "disk_offload": true
    }
  }
}
```

### Configuration Réseau

```json
// network.json
{
  "comfyui": {
    "network": {
      "port": 8000,
      "host": "localhost",
      "ssl": false,
      "cors": true,
      "rate_limit": {
        "enabled": true,
        "requests_per_minute": 100
      }
    }
  }
}
```

## Démarrage et Validation

### Démarrage de ComfyUI

```bash
# Démarrage via StoryCore
storycore comfyui start

# Démarrage direct
python main.py

# Démarrage avec des paramètres spécifiques
python main.py --port 8000 --host localhost --auto-launch
```

### Validation de l'Installation

```bash
# Test de base
curl http://localhost:8000

# Test des modèles
curl -X POST http://localhost:8000/api/test \
  -H "Content-Type: application/json" \
  -d '{"model": "gemma3", "prompt": "Hello"}'

# Vérification des ressources
storycore comfyui diagnose
```

### Interface Web

1. Ouvrez votre navigateur
2. Accédez à `http://localhost:8000`
3. Vous devriez voir l'interface ComfyUI
4. Testez avec un prompt simple

## Dépannage

### Problèmes Courants

#### 1. ComfyUI ne démarre pas

**Symptôme** : Erreur lors du démarrage

**Solutions** :
```bash
# Vérifiez les ports
netstat -an | findstr :8000  # Windows
lsof -i :8000                # Linux/macOS

# Vérifiez les permissions
chmod +x main.py

# Vérifiez les dépendances
pip list
```

#### 2. Problèmes GPU

**Symptôme** : Erreur CUDA, GPU non détecté

**Solutions** :
```bash
# Vérifiez CUDA
nvcc --version

# Vérifiez PyTorch
python -c "import torch; print(torch.cuda.is_available())"

# Réinstallez PyTorch
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

#### 3. Problèmes Mémoire

**Symptôme** : Erreur de mémoire insuffisante

**Solutions** :
```bash
# Vérifiez la mémoire système
wmic OS get TotalVisibleMemorySize,FreePhysicalMemory  # Windows
free -h  # Linux

# Réduisez la taille du batch
# Modifiez performance.json
"batch_size": 1
```

#### 4. Problèmes de Modèles

**Symptôme** : Modèles non chargés

**Solutions** :
```bash
# Vérifiez les chemins des modèles
ls -la models/

# Vérifiez les permissions des fichiers
chmod 644 models/*.gguf

# Réinitialisez les modèles
storycore model reset
```

### Logs et Diagnostic

```bash
# Voir les logs en temps réel
storycore comfyui logs

# Générer un rapport de diagnostic
storycore comfyui diagnose --output report.json

# Exporter les logs
storycore comfyui logs --export logs.txt
```

### Configuration des Variables d'Environnement

```bash
# Windows
set COMFYUI_PORT=8000
set COMFYUI_HOST=localhost
set COMFYUI_MODELS_PATH=C:\models

# Linux/macOS
export COMFYUI_PORT=8000
export COMFYUI_HOST=localhost
export COMFYUI_MODELS_PATH=/models
```

## Optimisation

### Performance GPU

```bash
# Optimisation pour GPU NVIDIA
export CUDA_VISIBLE_DEVICES=0
export TORCH_CUDA_ARCH_LIST="8.0"

# Précision mixte
export TORCH_DTYPE=torch.float16
```

### Mémoire

```bash
# Configuration de la mémoire
python -c "
import torch
torch.backends.cuda.max_split_size_mb = 512
torch.backends.cudnn.benchmark = True
"
```

### Caching

```json
// cache.json
{
  "comfyui": {
    "cache": {
      "enabled": true,
      "path": "comfyui/cache",
      "max_size": "10GiB",
      "cleanup": true
    }
  }
}
```

## Sécurité

### Configuration SSL

```bash
# Génération d'un certificat SSL
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Configuration
"ssl": {
  "enabled": true,
  "certfile": "cert.pem",
  "keyfile": "key.pem"
}
```

### Firewall

```bash
# Autoriser les ports nécessaires
sudo ufw allow 8000/tcp
sudo ufw reload
```

## Mises à Jour

### Mises à Jour Automatiques

```bash
# Activer les mises à jour automatiques
storycore comfyui update --auto

# Vérifier les mises à jour
storycore comfyui update --check
```

### Mises à Jour Manuelles

```bash
# Mettre à jour ComfyUI
cd ComfyUI
git pull
pip install -r requirements.txt

# Redémarrer
storycore comfyui restart
```

---

*Pour plus d'informations, consultez la [Documentation Technique](../TECHNICAL_GUIDE.md).*