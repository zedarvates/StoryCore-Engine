# Référence des Commandes CLI

StoryCore Engine fournit une interface en ligne de commande (CLI) complète pour toutes les opérations de création et production.

## 📋 Table des Commandes

### Wizards de Création

#### `character-wizard`
Création guidée d'un personnage avec tous ses attributs.

```bash
storycore character-wizard [options]
```

**Options :**
- `--name <nom>` : Nom du personnage
- `--type <type>` : Type (protagoniste, antagoniste, secondaire)
- `--interactive` : Mode interactif (défaut)
- `--output <fichier>` : Sauvegarder dans un fichier JSON

**Exemple :**
```bash
storycore character-wizard --interactive
```

#### `world-generate`
Génère un monde complet avec géographie, culture, histoire.

```bash
storycore world-generate --genre <genre> --output <dossier>
```

**Options :**
- `--genre <genre>` : Genre du monde (fantasy, sci-fi, etc.)
- `--complexity <niveau>` : Simple, normal, complexe
- `--output <dossier>` : Dossier de sortie
- `--template <template>` : Utiliser un template existant

#### `dialogue-wizard`
Assistant pour écrire des dialogues entre personnages.

```bash
storycore dialogue-wizard --characters <ids> --scene <scene>
```

**Options :**
- `--characters <ids>` : IDs des personnages (séparés par des virgules)
- `--scene <scene>` : Description de la scène
- `--tone <ton>` : Ton du dialogue (formel, familier, conflictuel)
- `--max-length <minutes>` : Durée estimée

#### `storyboard`
Crée un storyboard visuel à partir d'un script.

```bash
storycore storyboard --script <fichier> --format <format>
```

**Options :**
- `--script <fichier>` : Fichier script (txt, md, json)
- `--format <format>` : Format de sortie (pdf, html, json)
- `--style <style>` : Style visuel (cinematic, comic, sketch)
- `--characters` : Inclure les fiches personnages

#### `shot-planning`
Planification détaillée des plans de tournage.

```bash
storycore shot-planning --storyboard <fichier> --output <fichier>
```

**Options :**
- `--storyboard <fichier>` : Storyboard source
- `--output <fichier>` : Plan de tournage en sortie
- `--camera <type>` : Configuration caméra (cinema, tv, web)
- `--include-diagram` : Inclure les diagrammes de mouvement

#### `audio-production-wizard`
Production audio complète avec voix, bruitages, musique.

```bash
storycore audio-production-wizard --dialogue <fichier> --output <dossier>
```

**Options :**
- `--dialogue <fichier>` : Script dialogue
- `--output <dossier>` : Dossier de sortie
- `--voices <voix>` : Configuration voix IA
- `-- sfx` : Inclure les bruitages
- `--music` : Inclure la musique d'ambiance

---

### Génération

#### `generate-images`
Génère des images à partir de prompts.

```bash
storycore generate-images --prompt "<prompt>" --output <dossier>
```

**Options :**
- `--prompt <prompt>` : Description textuelle
- `--negative <prompt>` : Prompt négatif (à éviter)
- `--width <pixels>` : Largeur (défaut: 1024)
- `--height <pixels>` : Hauteur (défaut: 1024)
- `--steps <n>` : Nombre d'étapes de génération
- `--cfg <n>` : CFG scale (1-20)
- `--seed <n>` : Seed pour reproductibilité
- `--style <style>` : Style artistique
- `--reference <image>` : Image de référence

**Exemple :**
```bash
storycore generate-images \
  --prompt "A medieval knight in armor, cinematic lighting" \
  --width 1920 \
  --height 1080 \
  --style realistic \
  --output ./generated_images
```

#### `generate-video`
Génère une vidéo à partir d'images ou de prompts.

```bash
storycore generate-video --prompt "<prompt>" --duration <secondes>
```

**Options :**
- `--prompt <prompt>` : Description de la scène
- `--duration <sec>` : Durée en secondes
- `--fps <n>` : Images par seconde (24, 30, 60)
- `--resolution <res>` : Résolution (720p, 1080p, 4k)
- `--motion <n>` : Intensité du mouvement (1-10)
- `--input <image>` : Image de départ
- `--output <fichier>` : Fichier vidéo sortie

#### `generate-audio`
Génère de l'audio (voix, musique, bruitages).

```bash
storycore generate-audio --type <type> --text "<texte>"
```

**Options :**
- `--type <type>` : voice, music, sfx
- `--text <texte>` : Texte pour la voix (pour voice)
- `--duration <sec>` : Durée pour musique/sfx
- `--voice <id>` : ID de la voix à utiliser
- `--emotion <emotion>` : Émotion (happy, sad, angry, neutral)
- `--output <fichier>` : Fichier audio sortie

#### `generate-skybox`
Génère une skybox 360° pour environnements 3D.

```bash
storycore generate-skybox --theme <theme> --output <dossier>
```

**Options :**
- `--theme <theme>` : Theme (sunset, night, stormy, indoor)
- `--style <style>` : Style (realistic, painterly, sci-fi)
- `--resolution <res>` : Résolution (2048, 4096, 8192)
- `--format <format>` : Format (equirectangular, cubemap)

#### `generate-pantin`
Génère un pantin (character rig) pour l'animation.

```bash
storycore generate-pantin --character <id> --style <style>
```

**Options :**
- `--character <id>` : ID du personnage
- `--style <style>` : Style d'animation (2d, 3d, puppet)
- `--parts <parts>` : Parties à générer (full, face, body)
- `--layers <n>` : Nombre de calques

#### `generate-box-scene`
Génère une scène dans un espace 3D fermé.

```bash
storycore generate-box-scene --description "<desc>" --style <style>
```

**Options :**
- `--description <desc>` : Description de la scène
- `--style <style>` : Style visuel
- `--lighting <light>` : Éclairage (natural, artificial, dramatic)
- `--objects <ids>` : Objets à inclure
- `--output <format>` : Format sortie (glb, gltf, obj)

---

### Gestion de Projet

#### `init`
Initialise un nouveau projet StoryCore.

```bash
storycore init [<nom_projet>] [options]
```

**Options :**
- `--template <template>` : Template de projet (empty, film, series, short)
- `--path <dossier>` : Dossier du projet
- `--description <desc>` : Description du projet
- `--create-structure` : Créer la structure de dossiers

#### `dashboard`
Ouvre le tableau de bord du projet.

```bash
storycore dashboard [--project <id>]
```

**Options :**
- `--project <id>` : ID du projet (si plusieurs)
- `--port <n>` : Port du serveur (défaut: 3000)
- `--open` : Ouvrir le navigateur automatiquement

#### `export`
Exporte le projet dans différents formats.

```bash
storycore export --format <format> --output <fichier>
```

**Formats supportés :**
- `json` : Projet complet en JSON
- `pdf` : Documentation PDF
- `video` : Vidéo de présentation
- `html` : Site web interactif
- `davinci` : Projet DaVinci Resolve
- `fcp` : Final Cut Pro

**Options :**
- `--format <format>` : Format d'export
- `--output <fichier>` : Fichier de sortie
- `--include-assets` : Inclure les assets
- `--compress` : Compresser les médias
- `--quality <n>` : Qualité (1-10)

#### `list-models`
Liste les modèles IA disponibles.

```bash
storycore list-models [--type <type>]
```

**Options :**
- `--type <type>` : Filtrer par type (image, video, audio, llm)
- `--installed` : Montrer seulement les modèles installés
- `--remote` : Vérifier les modèles disponibles en ligne

#### `validate`
Valide la configuration et le projet.

```bash
storycore validate [--project <id>]
```

**Options :**
- `--project <id>` : Projet à valider
- `--strict` : Validation stricte
- `--fix` : Tenter de corriger automatiquement

#### `test-connection`
Teste les connexions aux services externes.

```bash
storycore test-connection [--service <service>]
```

**Services :**
- `llm` : Services LLM (OpenAI, Anthropic, Ollama)
- `comfyui` : Serveur ComfyUI
- `database` : Base de données
- `all` : Tous les services (défaut)

---

### Utilitaires

#### `help`
Affiche l'aide générale ou spécifique à une commande.

```bash
storycore help [<commande>]
```

**Exemples :**
```bash
storycore help                 # Aide générale
storycore help generate-images # Aide sur generate-images
```

#### `comfyui`
Gère l'intégration ComfyUI.

```bash
storycore comfyui <action> [options]
```

**Actions :**
- `start` : Démarrer le serveur ComfyUI
- `stop` : Arrêter le serveur
- `status` : Afficher le statut
- `install-workflow <fichier>` : Installer un workflow
- `list-workflows` : Lister les workflows installés
- `download-model <model>` : Télécharger un modèle

#### `integration`
Gère les intégrations externes.

```bash
storycore integration <service> <action>
```

**Services :**
- `ollama` : Ollama LLM
- `openai` : OpenAI
- `anthropic` : Anthropic Claude
- `huggingface` : Hugging Face

**Actions :**
- `connect` : Connecter le service
- `disconnect` : Déconnecter
- `status` : Afficher le statut
- `config` : Configuration

#### `deploy-workflows`
Déploie les workflows sur les serveurs.

```bash
storycore deploy-workflows --target <serveur> --workflows <ids>
```

**Options :**
- `--target <serveur>` : Serveur cible (local, remote, cloud)
- `--workflows <ids>` : IDs des workflows à déployer
- `--all` : Déployer tous les workflows
- `--dry-run` : Simulation sans déploiement

#### `memory-export`
Exporte la mémoire de production.

```bash
storycore memory-export --output <fichier> [--format <format>]
```

**Options :**
- `--output <fichier>` : Fichier de sortie
- `--format <format>` : json, yaml, pickle
- `--compress` : Compresser l'export
- `--include-logs` : Inclure les logs

#### `memory-recover`
Récupère les données depuis un backup mémoire.

```bash
storycore memory-recover --backup <fichier> [--project <id>]
```

**Options :**
- `--backup <fichier>` : Fichier backup
- `--project <id>` : Projet cible (créer si n'existe pas)
- `--merge` : Fusionner avec l'existant
- `--dry-run` : Simulation sans modification

---

### Options Globales

Ces options sont disponibles pour toutes les commandes :

| Option | Description |
|--------|-------------|
| `--verbose` | Mode verbose (détail des logs) |
| `--quiet` | Mode silencieux (seulement erreurs) |
| `--log-level <niveau>` | Niveau de log (DEBUG, INFO, WARNING, ERROR) |
| `--config <fichier>` | Fichier de configuration alternatif |
| `--help` | Afficher l'aide |
| `--version` | Afficher la version |

---

## Exemples Complets

### Workflow Complet de Création

```bash
# 1. Initialiser un projet
storycore init "Mon Film" --template film --description "Un film d'aventure"

# 2. Créer un personnage principal
storycore character-wizard --interactive --output characters/hero.json

# 3. Générer le monde
storycore world-generate --genre fantasy --output world/

# 4. Écrire un dialogue
storycore dialogue-wizard \
  --characters hero,villain \
  --scene "Confrontation dans le château" \
  --tone conflictuel \
  --output dialogues/scene01.txt

# 5. Créer le storyboard
storycore storyboard \
  --script script.md \
  --format pdf \
  --output storyboard.pdf

# 6. Générer les images
storycore generate-images \
  --prompt "Castle in the mountains, sunset" \
  --width 1920 --height 1080 \
  --output assets/images/

# 7. Générer la musique
storycore generate-audio \
  --type music \
  --duration 180 \
  --emotion epic \
  --output assets/audio/music.mp3

# 8. Exporter le projet
storycore export --format pdf --output projet_final.pdf
```

### Workflow avec Automatisation

```bash
# Script bash pour générer plusieurs scènes
#!/bin/bash
for i in {1..10}; do
  echo "Generating scene $i..."
  
  # Générer l'image de la scène
  storycore generate-images \
    --prompt "Scene $i: $(cat scene_$i.txt)" \
    --output "scenes/scene_$i/"
  
  # Générer le dialogue
  storycore generate-audio \
    --type voice \
    --text "$(cat dialogues/scene_$i.txt)" \
    --output "assets/audio/scene_${i}_dialogue.mp3"
done

# Compiler le projet final
storycore export --format video --output final_movie.mp4
```

---

## environnements

### Développement

```bash
# Activer le mode debug
export STORYCORE_DEBUG=1

# Utiliser un serveur local
storycore --config dev-config.json generate-images --prompt "test"
```

### Production

```bash
# Mode production
export STORYCORE_ENV=production

# Utiliser la config de production
storycore --config prod-config.json export --format json
```

---

## Dépannage

### Erreurs communes

#### `Command not found`
Le CLI n'est pas installé ou pas dans le PATH.
```bash
pip install storycore-engine
# ou
python -m storycore <commande>
```

#### `Connection error`
Vérifier les services externes :
```bash
storycore test-connection --service llm
```

#### `Permission denied`
Vérifier les permissions du dossier de projet :
```bash
chmod -R u+rw <dossier_projet>
```

### Logs détaillés

Pour obtenir des logs détaillés :

```bash
storycore --log-level DEBUG generate-images --prompt "test"
```

Les logs sont également sauvegardés dans :
- `logs/storycore.log` : Logs principaux
- `logs/error.log` : Erreurs seulement

---

*Référence CLI v2.3 - Dernière mise à jour: 2026-03-22*