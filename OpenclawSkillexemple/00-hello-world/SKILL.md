---
name: Hello World
description: "Un skill simple pour commencer avec OpenClaw. Use when: vous voulez apprendre comment créer un skill, vous avez besoin d'un exemple minimal, vous testez le système de skills. NOT for: fonctionnalités de production, tâches complexes."
metadata:
  openclaw:
    emoji: "👋"
---

# Hello World Skill

Ce skill est un exemple minimal pour comprendre la structure des skills OpenClaw.

## Quand l'utiliser

✅ **USE ce skill quand:**
- L'utilisateur dit "hello" ou "bonjour"
- Vous apprenez à créer des skills
- Vous voulez voir un exemple de structure minimale
- Vous testez le système de skills

❌ **N'utilisez PAS ce skill pour:**
- Des fonctionnalités de production
- Des tâches complexes
- Des réponses élaborées

## Comment répondre

Quand l'utilisateur dit "hello" ou "bonjour", répondez simplement:

```
Hello World!
```

C'est tout! Ce skill illustre le principe de base: un skill peut être aussi simple qu'une règle de réponse.

## Structure d'un skill

Un skill contient au minimum:

1. **Un fichier SKILL.md** avec frontmatter YAML
2. **Un champ `name`** dans le frontmatter
3. **Un champ `description`** dans le frontmatter
4. **Un corps Markdown** avec les instructions

## Exemple d'utilisation

**Utilisateur:** "hello"

**Agent:** "Hello World!"

## Prochaines étapes

Consultez les autres exemples pour apprendre:

- `01-url-shortener` - Intégration API simple
- `02-qr-generator` - Génération de fichiers
- `03-json-formatter` - Scripts Python intégrés
- `04-note-taker` - Workflow complet

## Points clés à retenir

- Le frontmatter YAML est obligatoire
- Les champs `name` et `description` sont critiques pour le déclenchement
- La description doit inclure "Use when" et "NOT for"
- Le corps Markdown guide le comportement de l'agent
