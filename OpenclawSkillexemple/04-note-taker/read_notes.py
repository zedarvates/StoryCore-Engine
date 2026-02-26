#!/usr/bin/env python3
"""
Script pour lire et afficher des notes.

Ce script permet de rechercher et afficher le contenu des notes
par titre, fichier ou catégorie.

Utilisation:
    python3 read_notes.py --title "Ma note"
    python3 read_notes.py --file personal/2024-02-24-ma-note.md
    python3 read_notes.py --category work --latest

Auteur: Exemple OpenClaw
Date: Février 2026
"""

import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional


# Configuration
NOTES_DIR = Path.home() / ".openclaw" / "workspace" / "notes"
INDEX_FILE = NOTES_DIR / "index.json"


def load_index() -> Dict[str, Any]:
    """
    Charge l'index des notes.
    
    Returns:
        L'index des notes
    """
    if INDEX_FILE.exists():
        try:
            with open(INDEX_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            pass
    return {"notes": []}


def find_note_by_title(index: Dict[str, Any], title: str) -> Optional[Dict[str, Any]]:
    """
    Trouve une note par son titre (recherche insensible à la casse).
    
    Args:
        index: L'index des notes
        title: Le titre à rechercher
        
    Returns:
        La note trouvée ou None
    """
    title_lower = title.lower()
    for note in index["notes"]:
        if title_lower in note["title"].lower():
            return note
    return None


def find_notes_by_category(index: Dict[str, Any], category: str) -> List[Dict[str, Any]]:
    """
    Trouve toutes les notes d'une catégorie.
    
    Args:
        index: L'index des notes
        category: La catégorie à filtrer
        
    Returns:
        Liste des notes de la catégorie
    """
    return [note for note in index["notes"] if note["category"] == category]


def get_latest_note(notes: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    Obtient la note la plus récente d'une liste.
    
    Args:
        notes: Liste de notes
        
    Returns:
        La note la plus récente ou None
    """
    if not notes:
        return None
    
    return max(notes, key=lambda n: n.get("date", ""))


def read_note_file(file_path: Path, raw: bool = False) -> tuple[bool, str]:
    """
    Lit le contenu d'un fichier de note.
    
    Args:
        file_path: Chemin du fichier
        raw: Afficher sans traitement
        
    Returns:
        Tuple (succès, contenu)
    """
    if not file_path.exists():
        return False, f"Fichier non trouvé: {file_path}"
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if raw:
            return True, content
        
        # Extraire le contenu après le frontmatter
        # Le frontmatter est entre --- et ---
        parts = content.split('---', 2)
        if len(parts) >= 3:
            # Contenu après le frontmatter
            note_content = parts[2].strip()
            return True, note_content
        
        return True, content
        
    except IOError as e:
        return False, f"Erreur de lecture: {e}"


def display_note(note: Dict[str, Any], content: str, show_metadata: bool = True) -> None:
    """
    Affiche une note avec formatage.
    
    Args:
        note: Les métadonnées de la note
        content: Le contenu de la note
        show_metadata: Afficher les métadonnées
    """
    if show_metadata:
        print("=" * 60)
        print(f"📝 {note['title']}")
        print("=" * 60)
        print(f"📅 Date: {note.get('date', 'N/A')}")
        print(f"📁 Catégorie: {note.get('category', 'N/A')}")
        tags = note.get('tags', [])
        if tags:
            print(f"🏷️  Tags: {', '.join(tags)}")
        print("-" * 60)
    
    print(content)
    
    if show_metadata:
        print("-" * 60)


def main():
    """Point d'entrée principal du script."""
    parser = argparse.ArgumentParser(
        description="Lire et afficher des notes",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemples:
  %(prog)s --title "Ma note"
  %(prog)s -t "Réunion"
  %(prog)s --file personal/2024-02-24-ma-note.md
  %(prog)s --category work --latest
  %(prog)s -c ideas -l
        """
    )
    
    parser.add_argument(
        "-t", "--title",
        help="Rechercher par titre"
    )
    
    parser.add_argument(
        "-f", "--file",
        help="Nom du fichier spécifique"
    )
    
    parser.add_argument(
        "-c", "--category",
        choices=["personal", "work", "ideas", "learning"],
        help="Filtrer par catégorie"
    )
    
    parser.add_argument(
        "-l", "--latest",
        action="store_true",
        help="Lire la dernière note (avec --category)"
    )
    
    parser.add_argument(
        "-r", "--raw",
        action="store_true",
        help="Afficher le contenu brut (avec frontmatter)"
    )
    
    parser.add_argument(
        "--no-metadata",
        action="store_true",
        help="Ne pas afficher les métadonnées"
    )
    
    args = parser.parse_args()
    
    # Charger l'index
    index = load_index()
    
    if not index["notes"]:
        print("Aucune note trouvée.", file=sys.stderr)
        sys.exit(1)
    
    # Cas 1: Fichier spécifique
    if args.file:
        file_path = NOTES_DIR / args.file
        success, content = read_note_file(file_path, args.raw)
        if success:
            print(content)
        else:
            print(f"Erreur: {content}", file=sys.stderr)
            sys.exit(1)
        return
    
    # Cas 2: Dernière note d'une catégorie
    if args.category and args.latest:
        notes = find_notes_by_category(index, args.category)
        if not notes:
            print(f"Aucune note dans la catégorie: {args.category}", file=sys.stderr)
            sys.exit(1)
        
        note = get_latest_note(notes)
        if note:
            file_path = NOTES_DIR / note["file"]
            success, content = read_note_file(file_path, args.raw)
            if success:
                display_note(note, content, not args.no_metadata)
            else:
                print(f"Erreur: {content}", file=sys.stderr)
                sys.exit(1)
        return
    
    # Cas 3: Recherche par titre
    if args.title:
        note = find_note_by_title(index, args.title)
        if not note:
            print(f"Note non trouvée: {args.title}", file=sys.stderr)
            sys.exit(1)
        
        file_path = NOTES_DIR / note["file"]
        success, content = read_note_file(file_path, args.raw)
        if success:
            display_note(note, content, not args.no_metadata)
        else:
            print(f"Erreur: {content}", file=sys.stderr)
            sys.exit(1)
        return
    
    # Cas 4: Catégorie seule - afficher la liste
    if args.category:
        notes = find_notes_by_category(index, args.category)
        if not notes:
            print(f"Aucune note dans la catégorie: {args.category}")
            return
        
        print(f"Notes dans '{args.category}':")
        print("-" * 40)
        for note in sorted(notes, key=lambda n: n.get("date", ""), reverse=True):
            print(f"  📝 {note['title']} ({note.get('date', 'N/A')})")
        return
    
    # Aucun critère spécifié
    print("Erreur: Spécifiez --title, --file, ou --category", file=sys.stderr)
    parser.print_help()
    sys.exit(1)


if __name__ == "__main__":
    main()
