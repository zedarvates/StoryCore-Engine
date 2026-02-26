---
name: note-taker
description: "Système de prise de notes avec organisation, recherche et export. Use when: l'utilisateur demande de créer une note, rechercher dans ses notes, organiser des notes par catégorie, exporter des notes, lister ses notes. NOT for: édition collaborative en temps réel, synchronisation cloud, gestion de documents complexes."
metadata:
  openclaw:
    emoji: "📝"
    requires:
      bins: ["python3"]
---

# Note Taker Skill

Système complet de gestion de notes personnelles.

## Quand l'utiliser

✅ **USE ce skill quand:**
- "Crée une note sur..."
- "Recherche dans mes notes..."
- "Liste mes notes"
- "Exporte mes notes en..."
- "Organise mes notes par catégorie"
- "Sauvegarde cette information"

❌ **N'utilisez PAS ce skill pour:**
- Édition collaborative en temps réel
- Synchronisation cloud
- Gestion de documents complexes (Word, PDF)
- Base de connaissances d'entreprise

## Structure des notes

Les notes sont stockées dans `~/.openclaw/workspace/notes/`:

```
notes/
├── personal/
│   ├── 2024-02-24-shopping.md
│   └── 2024-02-25-ideas.md
├── work/
│   └── 2024-02-24-meeting-notes.md
├── ideas/
│   └── 2024-02-26-project-idea.md
└── index.json
```

## Commandes principales

### Créer une note

```bash
python3 {baseDir}/save_note.py --title "Ma note" --content "Contenu de la note"
python3 {baseDir}/save_note.py --title "Réunion" --category work --content "Points discutés..."
python3 {baseDir}/save_note.py --title "Idée" --category ideas --tags "projet,innovation"
```

### Lister les notes

```bash
# Toutes les notes
python3 {baseDir}/list_notes.py

# Par catégorie
python3 {baseDir}/list_notes.py --category work

# Avec limite
python3 {baseDir}/list_notes.py --limit 10
```

### Lire une note

```bash
# Par titre
python3 {baseDir}/read_notes.py --title "Ma note"

# Par fichier
python3 {baseDir}/read_notes.py --file 2024-02-24-ma-note.md

# Dernière note d'une catégorie
python3 {baseDir}/read_notes.py --category work --latest
```

## Exemples d'utilisation

### Exemple 1: Créer une note rapide

**Demande:** "Crée une note: acheter du lait"

**Commande:**
```bash
python3 {baseDir}/save_note.py --title "Courses" --content "Acheter du lait"
```

### Exemple 2: Créer une note de travail

**Demande:** "Note pour ma réunion: discuter du budget Q2"

**Commande:**
```bash
python3 {baseDir}/save_note.py \
    --title "Réunion Budget Q2" \
    --category work \
    --content "Discuter du budget Q2"
```

### Exemple 3: Rechercher des notes

**Demande:** "Quelles sont mes notes de travail?"

**Commande:**
```bash
python3 {baseDir}/list_notes.py --category work
```

### Exemple 4: Lire une note

**Demande:** "Montre-moi ma note sur les courses"

**Commande:**
```bash
python3 {baseDir}/read_notes.py --title "Courses"
```

## Catégories disponibles

| Catégorie | Description | Exemple |
|-----------|-------------|---------|
| `personal` | Notes personnelles | Shopping, idées, todo |
| `work` | Notes professionnelles | Réunions, projets |
| `ideas` | Idées et brainstorming | Nouveaux projets |
| `learning` | Notes d'apprentissage | Cours, tutoriels |

## Format des fichiers de notes

Chaque note est un fichier Markdown avec un en-tête:

```markdown
---
title: Ma Note
date: 2024-02-24
category: personal
tags: [tag1, tag2]
---

# Ma Note

Contenu de la note en Markdown...
```

## Workflow typique

1. **Création:** Utiliser `save_note.py` avec titre et contenu
2. **Organisation:** Les notes sont automatiquement datées et classées
3. **Recherche:** Utiliser `list_notes.py` pour trouver des notes
4. **Lecture:** Utiliser `read_notes.py` pour consulter une note

## Options des scripts

### save_note.py

```bash
--title, -t      Titre de la note (obligatoire)
--content, -c    Contenu de la note
--category, -C   Catégorie (défaut: personal)
--tags           Tags séparés par des virgules
--append, -a     Ajouter à une note existante
```

### list_notes.py

```bash
--category, -c   Filtrer par catégorie
--limit, -l      Nombre max de résultats (défaut: 20)
--all, -a        Afficher toutes les notes
--format, -f     Format: table, json, simple (défaut: table)
```

### read_notes.py

```bash
--title, -t      Rechercher par titre
--file, -f       Nom du fichier spécifique
--category, -c   Filtrer par catégorie
--latest, -l     Lire la dernière note
--raw, -r        Afficher sans en-tête
```

## Gestion de l'index

Un fichier `index.json` maintient un index des notes pour la recherche rapide:

```json
{
  "notes": [
    {
      "title": "Ma Note",
      "file": "personal/2024-02-24-ma-note.md",
      "category": "personal",
      "date": "2024-02-24",
      "tags": ["tag1"]
    }
  ]
}
```

## Intégration avec le workspace

Les notes font partie du workspace OpenClaw et sont:
- Versionnées avec git (si configuré)
- Sauvegardées avec le workspace
- Disponibles pour l'agent comme contexte

## Notes importantes

- Les notes sont **privées** et stockées localement
- Le format **Markdown** permet un versionning efficace
- L'**index JSON** permet une recherche rapide
- Les notes sont **datées automatiquement**

## Cas d'usage avancés

### Ajouter à une note existante

```bash
python3 {baseDir}/save_note.py --title "Courses" --append --content "\n- Acheter du pain"
```

### Exporter toutes les notes

```bash
python3 {baseDir}/list_notes.py --format json > notes_export.json
```

### Rechercher par tag

```bash
python3 {baseDir}/list_notes.py --tag "important"
```
