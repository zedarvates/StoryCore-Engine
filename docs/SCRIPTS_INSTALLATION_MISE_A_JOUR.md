# Scripts d'Installation ComfyUI Mis à Jour - StoryCore-Engine

## 🎯 Corrections et Améliorations Implémentées

### **1. Correction Blocage UNC & Permissions (Windows)**

**install_easy.bat - Nouvelles fonctionnalités :**
- ✅ **Détection automatique des chemins UNC** (`\\wsl.localhost...`)
- ✅ **Basculement automatique vers WSL** si chemin réseau détecté
- ✅ **Vérification et élévation automatique** des droits Administrateur
- ✅ **Ajout automatique d'exclusion Windows Defender** pour `comfyui_portable/`
- ✅ **Environnement virtuel Python** (conformité PEP 668)

```batch
REM Détection UNC et basculement WSL
echo %CD% | findstr /C:"\\wsl" >nul
if !errorlevel! equ 0 (
    wsl bash -c "cd '%CD%' && ./install_wsl.sh"
)

REM Élévation automatique si nécessaire
net session >nul 2>&1
if !errorlevel! neq 0 (
    powershell -Command "Start-Process cmd -ArgumentList '/c cd /d \"%CD%\" && \"%~f0\" %*' -Verb RunAs"
)
```

### **2. Automatisation WSL Ubuntu (Nouveau Script)**

**install_wsl.sh - Script spécialisé WSL :**
- ✅ **Environnement virtuel Python isolé** dans `comfyui_portable/ComfyUI/venv`
- ✅ **Installation automatique des dépendances** via pip dans le venv
- ✅ **Téléchargement automatique des modèles** depuis `models_links.txt`
- ✅ **Arguments de sécurité locale** : `--listen 127.0.0.1 --port 8188`

### **3. Gestion Automatique des Modèles**

**Tous les scripts maintenant :**
- ✅ **Lecture automatique** de `models_links.txt`
- ✅ **Téléchargement avec reprise** (wget -c / curl -C -)
- ✅ **Vérification de présence** avant téléchargement
- ✅ **Placement automatique** dans les bons sous-dossiers

```bash
# Exemple de logique de téléchargement
while IFS= read -r url; do
    if [[ "$url" =~ ^https:// ]]; then
        filename=$(basename "$url")
        
        # Détermination automatique du chemin
        if [[ "$filename" == *"vae"* ]]; then
            output_path="models/vae/$filename"
        elif [[ "$filename" == *"morisot"* ]]; then
            output_path="models/loras/$filename"
        # ... etc
        fi
        
        # Téléchargement avec reprise
        if [ ! -f "$output_path" ]; then
            wget -c "$url" -O "$output_path"
        fi
    fi
done < "$SCRIPT_DIR/models_links.txt"
```

### **4. Cohérence du Projet**

**Chemins relatifs corrigés :**
- ✅ **Tous les scripts** utilisent `../../comfyui_portable` depuis `tools/comfyui_installer/`
- ✅ **Variables d'environnement cohérentes** : `PROJECT_ROOT`, `INSTALL_DIR`, `COMFYUI_DIR`
- ✅ **Messages de succès standardisés** avec URL `http://127.0.0.1:8188`
- ✅ **Confirmation "Multimodal Pipe ready"** pour StoryCore-Engine

## 📁 Structure des Scripts Mise à Jour

```
tools/comfyui_installer/
├── install_easy.bat         # Windows avec UNC/Admin/venv
├── install_easy.sh          # Linux/macOS avec venv
├── install_wsl.sh           # WSL Ubuntu spécialisé
├── test_install.sh          # Test avec validation venv
├── windows_troubleshoot.bat # Diagnostics Windows
├── installer_manifest.json  # Spécifications modèles
└── models_links.txt        # URLs HuggingFace
```

## 🚀 Commandes de Lancement Mises à Jour

### **Windows (avec venv) :**
```cmd
cd .\comfyui_portable\ComfyUI
venv\Scripts\activate.bat
python main.py --listen 127.0.0.1 --port 8188 --enable-cors-header
```

### **Linux/macOS/WSL (avec venv) :**
```bash
cd ./comfyui_portable/ComfyUI
source venv/bin/activate
python main.py --listen 127.0.0.1 --port 8188 --enable-cors-header
```

## 🛡️ Améliorations de Sécurité

### **Windows :**
- **Exclusion Windows Defender automatique** pour éviter les blocages
- **Élévation de privilèges contrôlée** uniquement quand nécessaire
- **Détection et gestion des chemins UNC** (WSL network paths)

### **Tous les systèmes :**
- **Environnements virtuels Python** (conformité PEP 668)
- **Écoute locale uniquement** (`127.0.0.1` au lieu de `0.0.0.0`)
- **Isolation complète** dans le dossier projet

## 🧪 Validation et Tests

**test_install.sh mis à jour :**
- ✅ Vérification de l'environnement virtuel
- ✅ Test d'activation du venv
- ✅ Validation des dépendances dans le venv
- ✅ Vérification des modèles téléchargés
- ✅ Instructions de lancement correctes

## 📊 Rapport de Succès Type

```
🎉 Installation complete!
========================================

📍 Installation: /path/to/storycore-engine/comfyui_portable/ComfyUI
🌐 Multimodal Pipe ready for StoryCore-Engine

🚀 To launch ComfyUI:
cd /path/to/comfyui_portable/ComfyUI
source venv/bin/activate
python main.py --listen 127.0.0.1 --port 8188 --enable-cors-header

🌐 ComfyUI will be available at: http://127.0.0.1:8188
```

## 🔧 Fonctionnalités Techniques

### **Gestion des Erreurs :**
- **Codes de sortie appropriés** pour chaque type d'erreur
- **Messages d'erreur clairs** avec instructions de résolution
- **Vérifications de prérequis** avant chaque étape

### **Performance :**
- **Téléchargements avec reprise** (interruption/reprise)
- **Vérification d'existence** pour éviter les re-téléchargements
- **Parallélisation possible** des téléchargements de modèles

### **Compatibilité :**
- **Support multi-plateforme** (Windows, Linux, macOS, WSL)
- **Détection automatique des outils** (wget, curl, unzip)
- **Fallbacks appropriés** pour chaque environnement

---

**Résultat** : Pipeline d'installation complètement automatisé qui gère tous les cas d'usage (UNC, permissions, environnements virtuels) avec sécurité locale et confirmation de readiness pour StoryCore-Engine.
