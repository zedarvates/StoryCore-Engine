# OpenClaw Skills Examples

Ce dossier contient des exemples de skills OpenClaw pour aider les nouveaux utilisateurs à comprendre et créer leurs propres skills.

## Qu'est-ce qu'OpenClaw?

OpenClaw est un assistant AI personnel open-source qui fonctionne sur vos propres appareils. Il peut répondre via plusieurs canaux de communication (WhatsApp, Telegram, Slack, Discord, Google Chat, Signal, iMessage, Microsoft Teams, WebChat, etc.) et offre des fonctionnalités avancées comme:

- **Gateway** - Plan de contrôle central pour les sessions, canaux, outils et événements
- **Multi-canal** - Intégration avec de nombreuses plateformes de messagerie
- **Multi-agent** - Routage vers des agents isolés avec workspaces séparés
- **Voice Wake + Talk Mode** - Reconnaissance vocale continue
- **Canvas** - Espace visuel piloté par l'agent avec A2UI
- **Skills Platform** - Système de compétences modulaires extensibles

## Niveaux de difficulté

| Skill | Niveau | Description |
|-------|--------|-------------|
| [00-hello-world](./00-hello-world/) | Débutant | Structure minimale d'un skill |
| [01-url-shortener](./01-url-shortener/) | Intermédiaire | Intégration API simple |
| [02-qr-generator](./02-qr-generator/) | Intermédiaire | Génération de fichiers |
| [03-json-formatter](./03-json-formatter/) | Intermédiaire | Scripts Python intégrés |
| [04-note-taker](./04-note-taker/) | Avancé | Workflow complet multi-étapes |

## Structure d'un Skill

Un **skill** est un package modulaire et auto-contenu qui étend les capacités de l'agent OpenClaw en fournissant:

- Des connaissances spécialisées
- Des workflows spécifiques à un domaine
- Des intégrations d'outils
- Des ressources groupées (scripts, références, assets)

### Structure de fichiers

```
skill-name/
├── SKILL.md (obligatoire)
│   ├── YAML frontmatter (obligatoire)
│   │   ├── name: nom-du-skill
│   │   └── description: description détaillée
│   └── Corps Markdown (obligatoire)
│       ├── When to Use / When NOT to Use
│       ├── Commandes et exemples
│       └── Références aux ressources
│
└── Ressources optionnelles/
    ├── scripts/          - Code exécutable (Python, Bash, etc.)
    ├── references/       - Documentation de référence
    └── assets/           - Fichiers utilisés en sortie (templates, etc.)
```

### Format du Frontmatter YAML

```yaml
---
name: skill-name
description: "Description claire et complète. Use when: (1) cas d'usage 1, (2) cas d'usage 2. NOT for: cas exclus."
metadata:
  openclaw:
    emoji: "📊"
    os: ["darwin", "linux"]  # Optionnel: restriction OS
    requires:
      bins: ["curl", "gh"]   # Binaires requis
    install:                  # Instructions d'installation
      - id: brew
        kind: brew
        formula: gh
        bins: [gh]
        label: Install GitHub CLI
---
```

## Comment utiliser ces exemples

1. Commencez par `00-hello-world` pour comprendre la structure de base
2. Explorez les exemples intermédiaires pour voir les patterns courants
3. Étudiez `04-note-taker` pour un exemple complet

## Installation d'un skill

Copiez le dossier du skill dans votre workspace:

```bash
cp -r 03-json-formatter ~/.openclaw/workspace/skills/
```

Ou utilisez le skill directement depuis ce dossier.

## Prérequis

### Pour les skills avec scripts Python

Assurez-vous d'avoir Python 3 installé:

```bash
python3 --version
```

Installez les dépendances nécessaires:

```bash
# Pour json-formatter
pip install pyyaml

# Pour qr-generator (si utilisation locale)
pip install qrcode pillow

# Pour url-shortener
pip install requests
```

### Pour les skills avec commandes curl

La plupart des systèmes Unix/Linux/macOS ont curl préinstallé. Sur Windows, vous pouvez utiliser:

```bash
# Via Git Bash ou WSL
curl --version
```

## Tester les skills

### Test rapide du skill hello-world

1. Ouvrez OpenClaw
2. Dites: "hello"
3. L'agent devrait répondre "Hello World!"

### Test du skill url-shortener

```bash
# Via l'agent
"Raccourcis l'URL https://github.com/openclaw/openclaw"

# Ou directement avec le script
cd 01-url-shortener
python3 shorten.py "https://github.com/openclaw/openclaw"
```

### Test du skill qr-generator

```bash
# Via l'agent
"Crée un QR code pour https://openclaw.ai"

# Ou directement avec le script
cd 02-qr-generator
python3 generate_qr.py "https://openclaw.ai" --output qr.png
```

### Test du skill json-formatter

```bash
# Via l'agent
"Formate ce JSON: {\"name\":\"test\",\"value\":123}"

# Ou directement avec le script
cd 03-json-formatter
echo '{"name":"test","value":123}' | python3 format_json.py --format pretty
```

### Test du skill note-taker

```bash
# Via l'agent
"Crée une note sur ma réunion d'aujourd'hui"

# Ou directement avec les scripts
cd 04-note-taker
python3 save_note.py --title "Ma note" --content "Contenu de test"
python3 list_notes.py
python3 read_notes.py --title "Ma note"
```

## Ressources officielles

- [OpenClaw GitHub](https://github.com/openclaw/openclaw)
- [Documentation officielle](https://docs.openclaw.ai)

## Philosophie des Skills

Les skills sont des "guides d'intégration" qui transforment l'agent généraliste en un agent spécialisé équipé de connaissances procédurales.

### Principe de Divulgation Progressive

Les skills utilisent un système de chargement à trois niveaux:

1. **Métadonnées** (name + description) - Toujours dans le contexte (~100 mots)
2. **Corps SKILL.md** - Quand le skill se déclenche (<5k mots)
3. **Ressources groupées** - Selon les besoins (scripts, références, assets)

## Bonnes Pratiques

1. **Concision** - Le contexte est une ressource précieuse
2. **Degrés de liberté** - Adapter le niveau de spécificité à la complexité
3. **Références** - Séparer les détails du corps principal
4. **Exemples concrets** - Préférer les exemples aux longues explications
5. **Validation** - Tester les skills avec des cas réels

---

*Exemples créés pour le projet StoryCore Engine - Février 2026*
