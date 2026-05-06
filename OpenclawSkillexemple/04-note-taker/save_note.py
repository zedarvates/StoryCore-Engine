#!/usr/bin/env python3
"""
Script pour créer et sauvegarder des notes.

Ce script permet de créer de nouvelles notes ou d'ajouter du contenu
à des notes existantes, avec support des catégories et tags.

Utilisation:
    python3 save_note.py --title "Ma note" --content "Contenu"
    python3 save_note.py --title "Réunion" --category work --content "..."
    python3 save_note.py --title "Idée" --tags "projet,innovation" --content "..."

Auteur: Exemple OpenClaw
Date: Février 2026
"""

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any


# Configuration
NOTES_DIR = Path.home() / ".openclaw" / "workspace" / "notes"
INDEX_FILE = NOTES_DIR / "index.json"
DEFAULT_CATEGORY = "personal"


def ensure_directories() -> None:
    """
    S'assure que les répertoires nécessaires existent.
    """
    # Créer le dossier principal des notes
    NOTES_DIR.mkdir(parents=True, exist_ok=True)

    # Créer les sous-dossiers de catégories
    categories = ["personal", "work", "ideas", "learning"]
    for category in categories:
        (NOTES_DIR / category).mkdir(exist_ok=True)


def load_index() -> Dict[str, Any]:
    """
    Charge l'index des notes depuis le fichier JSON.

    Returns:
        L'index des notes (dict vide si n'existe pas)
    """
    if INDEX_FILE.exists():
        try:
            with open(INDEX_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return {"notes": []}
    return {"notes": []}


def save_index(index: Dict[str, Any]) -> None:
    """
    Sauvegarde l'index des notes.

    Args:
        index: L'index à sauvegarder
    """
    with open(INDEX_FILE, "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2, ensure_ascii=False)


def generate_filename(title: str) -> str:
    """
    Génère un nom de fichier à partir du titre.

    Args:
        title: Le titre de la note

    Returns:
        Le nom de fichier généré
    """
    # Date du jour
    date_str = datetime.now().strftime("%Y-%m-%d")

    # Nettoyer le titre pour le nom de fichier
    safe_title = "".join(
        c if c.isalnum() or c in (" ", "-", "_") else "" for c in title
    )
    safe_title = safe_title.strip().lower().replace(" ", "-")

    # Limiter la longueur
    safe_title = safe_title[:50]

    return f"{date_str}-{safe_title}.md"


def create_note_content(
    title: str, content: str, category: str, tags: List[str]
) -> str:
    """
    Crée le contenu Markdown d'une note.

    Args:
        title: Le titre de la note
        content: Le contenu de la note
        category: La catégorie
        tags: Les tags

    Returns:
        Le contenu Markdown complet
    """
    date_str = datetime.now().strftime("%Y-%m-%d")
    tags_str = json.dumps(tags) if tags else "[]"

    frontmatter = f"""---
title: {title}
date: {date_str}
category: {category}
tags: {tags_str}
---

# {title}

"""
    return frontmatter + content


def save_note(
    title: str,
    content: str,
    category: str = DEFAULT_CATEGORY,
    tags: Optional[List[str]] = None,
    append: bool = False,
) -> tuple[bool, str]:
    """
    Sauvegarde une note.

    Args:
        title: Le titre de la note
        content: Le contenu de la note
        category: La catégorie
        tags: Les tags optionnels
        append: Ajouter à une note existante

    Returns:
        Tuple (succès, message)
    """
    # S'assurer que les répertoires existent
    ensure_directories()

    # Charger l'index
    index = load_index()

    # Tags par défaut
    if tags is None:
        tags = []

    # Chercher une note existante si append
    if append:
        for note in index["notes"]:
            if note["title"].lower() == title.lower():
                # Ajouter à la note existante
                file_path = NOTES_DIR / note["file"]
                if file_path.exists():
                    with open(file_path, "a", encoding="utf-8") as f:
                        f.write(f"\n\n{content}")
                    return True, f"Contenu ajouté à la note: {title}"
        return False, f"Note non trouvée pour ajout: {title}"

    # Générer le nom de fichier
    filename = generate_filename(title)
    file_path = NOTES_DIR / category / filename

    # Vérifier si le fichier existe déjà
    counter = 1
    while file_path.exists():
        base = filename.rsplit(".", 1)[0]
        filename = f"{base}-{counter}.md"
        file_path = NOTES_DIR / category / filename
        counter += 1

    # Créer le contenu
    note_content = create_note_content(title, content, category, tags)

    # Sauvegarder le fichier
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(note_content)
    except IOError as e:
        return False, f"Erreur lors de la sauvegarde: {e}"

    # Mettre à jour l'index
    index["notes"].append(
        {
            "title": title,
            "file": f"{category}/{filename}",
            "category": category,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "tags": tags,
        }
    )
    save_index(index)

    return True, f"Note créée: {title} ({category}/{filename})"


def main():
    """Point d'entrée principal du script."""
    parser = argparse.ArgumentParser(
        description="Créer ou mettre à jour une note",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemples:
  %(prog)s --title "Ma note" --content "Contenu de la note"
  %(prog)s -t "Réunion" -c "Compte-rendu..." -C work
  %(prog)s -t "Idée" --tags "projet,innovation" -c "Description..."
  %(prog)s -t "Courses" --append -c "\n- Nouvel article"
        """,
    )

    parser.add_argument("-t", "--title", required=True, help="Titre de la note")

    parser.add_argument(
        "-c",
        "--content",
        help="Contenu de la note (ou lire depuis stdin si non spécifié)",
    )

    parser.add_argument(
        "-C",
        "--category",
        default=DEFAULT_CATEGORY,
        choices=["personal", "work", "ideas", "learning"],
        help=f"Catégorie de la note (défaut: {DEFAULT_CATEGORY})",
    )

    parser.add_argument(
        "--tags", help="Tags séparés par des virgules (ex: projet,important)"
    )

    parser.add_argument(
        "-a", "--append", action="store_true", help="Ajouter à une note existante"
    )

    parser.add_argument("-v", "--verbose", action="store_true", help="Mode verbeux")

    args = parser.parse_args()

    # Récupérer le contenu
    content = args.content
    if content is None:
        if sys.stdin.isatty():
            print("Erreur: Le contenu est requis (--content ou stdin)", file=sys.stderr)
            sys.exit(1)
        else:
            content = sys.stdin.read()

    # Parser les tags
    tags = None
    if args.tags:
        tags = [tag.strip() for tag in args.tags.split(",") if tag.strip()]

    if args.verbose:
        print(f"[INFO] Titre: {args.title}")
        print(f"[INFO] Catégorie: {args.category}")
        print(f"[INFO] Tags: {tags}")
        print(f"[INFO] Mode append: {args.append}")

    # Sauvegarder la note
    success, message = save_note(
        title=args.title,
        content=content,
        category=args.category,
        tags=tags,
        append=args.append,
    )

    if success:
        print(message)
    else:
        print(f"Erreur: {message}", file=sys.stderr)

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
