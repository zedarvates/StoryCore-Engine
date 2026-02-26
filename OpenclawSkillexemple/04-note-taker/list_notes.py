#!/usr/bin/env python3
"""
Script pour lister les notes.

Ce script permet de lister toutes les notes ou de filtrer par catégorie,
avec différents formats de sortie.

Utilisation:
    python3 list_notes.py
    python3 list_notes.py --category work
    python3 list_notes.py --limit 10
    python3 list_notes.py --format json

Auteur: Exemple OpenClaw
Date: Février 2026
"""

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional


# Configuration
NOTES_DIR = Path.home() / ".openclaw" / "workspace" / "notes"
INDEX_FILE = NOTES_DIR / "index.json"
DEFAULT_LIMIT = 20


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


def filter_by_category(notes: List[Dict[str, Any]], category: str) -> List[Dict[str, Any]]:
    """
    Filtre les notes par catégorie.
    
    Args:
        notes: Liste des notes
        category: Catégorie à filtrer
        
    Returns:
        Notes filtrées
    """
    return [note for note in notes if note.get("category") == category]


def filter_by_tag(notes: List[Dict[str, Any]], tag: str) -> List[Dict[str, Any]]:
    """
    Filtre les notes par tag.
    
    Args:
        notes: Liste des notes
        tag: Tag à filtrer
        
    Returns:
        Notes filtrées
    """
    tag_lower = tag.lower()
    return [
        note for note in notes
        if tag_lower in [t.lower() for t in note.get("tags", [])]
    ]


def sort_notes(notes: List[Dict[str, Any]], reverse: bool = True) -> List[Dict[str, Any]]:
    """
    Trie les notes par date.
    
    Args:
        notes: Liste des notes
        reverse: Ordre décroissant (plus récent d'abord)
        
    Returns:
        Notes triées
    """
    return sorted(notes, key=lambda n: n.get("date", ""), reverse=reverse)


def format_table(notes: List[Dict[str, Any]]) -> str:
    """
    Formate les notes en tableau.
    
    Args:
        notes: Liste des notes
        
    Returns:
        Tableau formaté
    """
    if not notes:
        return "Aucune note trouvée."
    
    # En-têtes
    headers = ["Titre", "Catégorie", "Date", "Tags"]
    
    # Largeurs de colonnes
    widths = [40, 12, 12, 20]
    
    # Ligne de séparation
    separator = "+" + "+".join("-" * (w + 2) for w in widths) + "+"
    
    # Ligne d'en-tête
    header_line = "|" + "|".join(f" {h:<{widths[i]}} " for i, h in enumerate(headers)) + "|"
    
    lines = [separator, header_line, separator]
    
    # Lignes de données
    for note in notes:
        title = note.get("title", "")[:widths[0]]
        category = note.get("category", "")[:widths[1]]
        date = note.get("date", "")[:widths[2]]
        tags = ", ".join(note.get("tags", []))[:widths[3]]
        
        line = "|" + "|".join(f" {v:<{widths[i]}} " for i, v in enumerate([title, category, date, tags])) + "|"
        lines.append(line)
    
    lines.append(separator)
    
    return "\n".join(lines)


def format_simple(notes: List[Dict[str, Any]]) -> str:
    """
    Formate les notes en liste simple.
    
    Args:
        notes: Liste des notes
        
    Returns:
        Liste simple formatée
    """
    if not notes:
        return "Aucune note trouvée."
    
    lines = []
    for note in notes:
        title = note.get("title", "Sans titre")
        category = note.get("category", "N/A")
        date = note.get("date", "N/A")
        tags = ", ".join(note.get("tags", []))
        
        line = f"📝 {title}"
        if tags:
            line += f" [{tags}]"
        line += f" ({category}, {date})"
        
        lines.append(line)
    
    return "\n".join(lines)


def format_json_output(notes: List[Dict[str, Any]]) -> str:
    """
    Formate les notes en JSON.
    
    Args:
        notes: Liste des notes
        
    Returns:
        JSON formaté
    """
    return json.dumps({"notes": notes}, indent=2, ensure_ascii=False)


def get_statistics(notes: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Calcule des statistiques sur les notes.
    
    Args:
        notes: Liste des notes
        
    Returns:
        Statistiques
    """
    stats = {
        "total": len(notes),
        "categories": {},
        "tags": {}
    }
    
    for note in notes:
        # Compter par catégorie
        category = note.get("category", "uncategorized")
        stats["categories"][category] = stats["categories"].get(category, 0) + 1
        
        # Compter par tag
        for tag in note.get("tags", []):
            stats["tags"][tag] = stats["tags"].get(tag, 0) + 1
    
    return stats


def main():
    """Point d'entrée principal du script."""
    parser = argparse.ArgumentParser(
        description="Lister les notes",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemples:
  %(prog)s
  %(prog)s --category work
  %(prog)s --tag important
  %(prog)s --limit 10
  %(prog)s --format json
  %(prog)s --stats
        """
    )
    
    parser.add_argument(
        "-c", "--category",
        choices=["personal", "work", "ideas", "learning"],
        help="Filtrer par catégorie"
    )
    
    parser.add_argument(
        "--tag",
        help="Filtrer par tag"
    )
    
    parser.add_argument(
        "-l", "--limit",
        type=int,
        default=DEFAULT_LIMIT,
        help=f"Nombre max de résultats (défaut: {DEFAULT_LIMIT})"
    )
    
    parser.add_argument(
        "-a", "--all",
        action="store_true",
        help="Afficher toutes les notes (sans limite)"
    )
    
    parser.add_argument(
        "-f", "--format",
        choices=["table", "json", "simple"],
        default="table",
        help="Format de sortie (défaut: table)"
    )
    
    parser.add_argument(
        "--stats",
        action="store_true",
        help="Afficher les statistiques"
    )
    
    parser.add_argument(
        "-r", "--reverse",
        action="store_true",
        help="Ordre croissant (plus ancien d'abord)"
    )
    
    args = parser.parse_args()
    
    # Charger l'index
    index = load_index()
    notes = index.get("notes", [])
    
    # Filtrer
    if args.category:
        notes = filter_by_category(notes, args.category)
    
    if args.tag:
        notes = filter_by_tag(notes, args.tag)
    
    # Trier
    notes = sort_notes(notes, reverse=not args.reverse)
    
    # Limiter
    if not args.all and args.limit > 0:
        notes = notes[:args.limit]
    
    # Afficher les statistiques
    if args.stats:
        all_notes = index.get("notes", [])
        stats = get_statistics(all_notes)
        
        print("=" * 50)
        print("📊 Statistiques des notes")
        print("=" * 50)
        print(f"Total: {stats['total']} notes")
        print()
        
        print("📁 Par catégorie:")
        for cat, count in sorted(stats["categories"].items()):
            print(f"   {cat}: {count}")
        print()
        
        if stats["tags"]:
            print("🏷️  Tags populaires:")
            for tag, count in sorted(stats["tags"].items(), key=lambda x: -x[1])[:10]:
                print(f"   {tag}: {count}")
        
        print("=" * 50)
        return
    
    # Formater et afficher
    if args.format == "json":
        print(format_json_output(notes))
    elif args.format == "simple":
        print(format_simple(notes))
    else:
        print(format_table(notes))
    
    # Info sur le nombre de résultats
    if not args.stats and args.format != "json":
        total = len(index.get("notes", []))
        shown = len(notes)
        if shown < total:
            print(f"\nAffichage: {shown}/{total} notes (utilisez --all pour tout voir)")


if __name__ == "__main__":
    main()
