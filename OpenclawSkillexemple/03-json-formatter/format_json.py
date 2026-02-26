#!/usr/bin/env python3
"""
Script pour formater, valider et transformer des données JSON.

Ce script fournit des utilitaires pour manipuler des données JSON:
- Formater (beautify) avec indentation
- Minifier (compresser)
- Valider la syntaxe
- Convertir en YAML

Utilisation:
    python3 format_json.py input.json --format pretty
    python3 format_json.py input.json --validate
    python3 format_json.py input.json --to-yaml
    echo '{"name":"test"}' | python3 format_json.py - --format pretty

Auteur: Exemple OpenClaw
Date: Février 2026
"""

import argparse
import json
import sys
from typing import Tuple, Any, Optional


def format_json(data: Any, indent: int = 2, sort_keys: bool = False) -> str:
    """
    Formate un objet JSON avec indentation.
    
    Args:
        data: L'objet JSON à formater
        indent: Le nombre d'espaces pour l'indentation
        sort_keys: Trier les clés alphabétiquement
        
    Returns:
        Le JSON formaté en chaîne
    """
    return json.dumps(
        data,
        indent=indent,
        ensure_ascii=False,
        sort_keys=sort_keys
    )


def minify_json(data: Any) -> str:
    """
    Minifie un objet JSON (compacte sur une seule ligne).
    
    Args:
        data: L'objet JSON à minifier
        
    Returns:
        Le JSON minifié en chaîne
    """
    return json.dumps(
        data,
        separators=(',', ':'),
        ensure_ascii=False
    )


def validate_json(content: str) -> Tuple[bool, str]:
    """
    Valide la syntaxe d'un contenu JSON.
    
    Args:
        content: Le contenu JSON à valider
        
    Returns:
        Tuple (est_valide, message)
    """
    try:
        json.loads(content)
        return True, "✓ JSON valide"
    except json.JSONDecodeError as e:
        # Construire un message d'erreur détaillé
        error_msg = f"✗ JSON invalide: {e.msg}"
        if e.lineno and e.colno:
            error_msg += f" (ligne {e.lineno}, colonne {e.colno})"
        if e.doc:
            # Afficher le contexte de l'erreur
            lines = e.doc.split('\n')
            if e.lineno and e.lineno <= len(lines):
                error_line = lines[e.lineno - 1]
                error_msg += f"\n  {error_line}"
                if e.colno:
                    error_msg += f"\n  {' ' * (e.colno - 1)}^"
        return False, error_msg


def to_yaml(data: Any, indent: int = 2) -> str:
    """
    Convertit un objet JSON en format YAML.
    
    Cette fonction utilise une implémentation simple sans dépendance externe.
    Pour une conversion YAML complète, installez pyyaml.
    
    Args:
        data: L'objet JSON à convertir
        indent: Le nombre d'espaces pour l'indentation
        
    Returns:
        Le YAML en chaîne
    """
    try:
        # Essayer d'utiliser PyYAML si disponible
        import yaml
        return yaml.dump(
            data,
            default_flow_style=False,
            allow_unicode=True,
            indent=indent
        )
    except ImportError:
        # Fallback: implémentation simple
        return _simple_json_to_yaml(data, indent)


def _simple_json_to_yaml(data: Any, indent: int = 2, level: int = 0) -> str:
    """
    Conversion simple JSON vers YAML sans dépendance externe.
    
    Args:
        data: Les données à convertir
        indent: L'indentation de base
        level: Le niveau d'imbrication actuel
        
    Returns:
        Le YAML en chaîne
    """
    prefix = ' ' * (level * indent)
    
    if data is None:
        return 'null'
    elif isinstance(data, bool):
        return 'true' if data else 'false'
    elif isinstance(data, (int, float)):
        return str(data)
    elif isinstance(data, str):
        # Échapper les caractères spéciaux si nécessaire
        if '\n' in data or ':' in data or data.startswith(' '):
            return f'"{data}"'
        return data
    elif isinstance(data, list):
        if not data:
            return '[]'
        lines = []
        for item in data:
            yaml_item = _simple_json_to_yaml(item, indent, level + 1)
            if '\n' in yaml_item:
                lines.append(f"{prefix}- ")
                lines.append(yaml_item)
            else:
                lines.append(f"{prefix}- {yaml_item}")
        return '\n'.join(lines)
    elif isinstance(data, dict):
        if not data:
            return '{}'
        lines = []
        for key, value in data.items():
            yaml_value = _simple_json_to_yaml(value, indent, level + 1)
            if isinstance(value, (dict, list)) and value:
                lines.append(f"{prefix}{key}:")
                lines.append(yaml_value)
            else:
                lines.append(f"{prefix}{key}: {yaml_value}")
        return '\n'.join(lines)
    else:
        return str(data)


def read_input(source: str) -> str:
    """
    Lit le contenu depuis un fichier ou stdin.
    
    Args:
        source: Le chemin du fichier ou '-' pour stdin
        
    Returns:
        Le contenu lu
    """
    if source == '-':
        return sys.stdin.read()
    else:
        with open(source, 'r', encoding='utf-8') as f:
            return f.read()


def parse_json_safe(content: str) -> Tuple[bool, Any, str]:
    """
    Parse du JSON de manière sécurisée.
    
    Args:
        content: Le contenu JSON à parser
        
    Returns:
        Tuple (succès, données, message_erreur)
    """
    try:
        data = json.loads(content)
        return True, data, ""
    except json.JSONDecodeError as e:
        return False, None, f"Erreur de parsing JSON: {e}"


def main():
    """Point d'entrée principal du script."""
    parser = argparse.ArgumentParser(
        description="Formater, valider et transformer des données JSON",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemples:
  %(prog)s data.json --format pretty
  %(prog)s data.json --format minify
  %(prog)s data.json --validate
  %(prog)s data.json --to-yaml
  echo '{"name":"test"}' | %(prog)s - --format pretty
        """
    )
    
    parser.add_argument(
        "file",
        help="Fichier JSON à traiter (ou '-' pour stdin)"
    )
    
    parser.add_argument(
        "--format", "-f",
        choices=["pretty", "minify"],
        default="pretty",
        help="Format de sortie (défaut: pretty)"
    )
    
    parser.add_argument(
        "--validate", "-v",
        action="store_true",
        help="Valider le JSON uniquement"
    )
    
    parser.add_argument(
        "--to-yaml", "-y",
        action="store_true",
        help="Convertir en format YAML"
    )
    
    parser.add_argument(
        "--indent", "-i",
        type=int,
        default=2,
        help="Indentation pour pretty/YAML (défaut: 2)"
    )
    
    parser.add_argument(
        "--sort-keys", "-s",
        action="store_true",
        help="Trier les clés alphabétiquement"
    )
    
    parser.add_argument(
        "--output", "-o",
        help="Fichier de sortie (défaut: stdout)"
    )
    
    args = parser.parse_args()
    
    # Lire le contenu
    try:
        content = read_input(args.file)
    except FileNotFoundError:
        print(f"Erreur: Fichier non trouvé: {args.file}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Erreur de lecture: {e}", file=sys.stderr)
        sys.exit(1)
    
    # Mode validation
    if args.validate:
        is_valid, message = validate_json(content)
        print(message)
        sys.exit(0 if is_valid else 1)
    
    # Parser le JSON
    success, data, error = parse_json_safe(content)
    if not success:
        print(f"Erreur: {error}", file=sys.stderr)
        sys.exit(1)
    
    # Générer la sortie
    if args.to_yaml:
        output = to_yaml(data, args.indent)
    elif args.format == "minify":
        output = minify_json(data)
    else:
        output = format_json(data, args.indent, args.sort_keys)
    
    # Écrire la sortie
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(output)
            if not output.endswith('\n'):
                f.write('\n')
        print(f"Sortie écrite dans: {args.output}")
    else:
        print(output)


if __name__ == "__main__":
    main()
