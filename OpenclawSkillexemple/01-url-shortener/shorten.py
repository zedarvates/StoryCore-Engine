#!/usr/bin/env python3
"""
Script pour raccourcir des URLs via les services is.gd et v.gd.

Ce script permet de raccourcir des URLs de manière simple et robuste,
avec gestion des erreurs et fallback entre les services.

Utilisation:
    python3 shorten.py "https://example.com/very/long/url"
    python3 shorten.py --service vgd "https://example.com"
    python3 shorten.py --verbose "https://example.com"

Auteur: Exemple OpenClaw
Date: Février 2026
"""

import argparse
import sys
import urllib.parse
import urllib.request
import urllib.error
import json
from typing import Tuple


# Configuration des services de raccourcissement
SERVICES = {
    "isgd": {
        "name": "is.gd",
        "api_url": "https://is.gd/create.php",
        "description": "Service gratuit et fiable (recommandé)",
    },
    "vgd": {
        "name": "v.gd",
        "api_url": "https://v.gd/create.php",
        "description": "Alternative avec domaine différent",
    },
}

# Service par défaut
DEFAULT_SERVICE = "isgd"


def encode_url(url: str) -> str:
    """
    Encode une URL pour l'envoi via requête HTTP.

    Args:
        url: L'URL à encoder

    Returns:
        L'URL encodée
    """
    return urllib.parse.quote(url, safe="")


def shorten_url(
    url: str, service: str = DEFAULT_SERVICE, verbose: bool = False
) -> Tuple[bool, str]:
    """
    Raccourcit une URL via le service spécifié.

    Args:
        url: L'URL à raccourcir
        service: Le service à utiliser ("isgd" ou "vgd")
        verbose: Afficher des informations détaillées

    Returns:
        Tuple (succès, url_raccourcie ou message_erreur)
    """
    # Vérifier que le service existe
    if service not in SERVICES:
        return (
            False,
            f"Service inconnu: {service}. Services disponibles: {', '.join(SERVICES.keys())}",
        )

    service_config = SERVICES[service]

    if verbose:
        print(f"[INFO] Service: {service_config['name']}")
        print(f"[INFO] URL originale: {url}")

    # Encoder l'URL
    encoded_url = encode_url(url)

    # Construire l'URL de l'API
    api_url = f"{service_config['api_url']}?format=simple&url={encoded_url}"

    if verbose:
        print("[INFO] Appel de l'API...")

    try:
        # Effectuer la requête
        request = urllib.request.Request(
            api_url, headers={"User-Agent": "OpenClaw-URLShortener/1.0"}
        )

        with urllib.request.urlopen(request, timeout=10) as response:
            short_url = response.read().decode("utf-8").strip()

            # Vérifier si la réponse est une erreur
            if short_url.startswith("Error:"):
                return False, f"Erreur du service: {short_url}"

            if verbose:
                print(f"[INFO] URL raccourcie: {short_url}")

            return True, short_url

    except urllib.error.HTTPError as e:
        error_msg = f"Erreur HTTP {e.code}: {e.reason}"
        if verbose:
            print(f"[ERREUR] {error_msg}")
        return False, error_msg

    except urllib.error.URLError as e:
        error_msg = f"Erreur de connexion: {e.reason}"
        if verbose:
            print(f"[ERREUR] {error_msg}")
        return False, error_msg

    except Exception as e:
        error_msg = f"Erreur inattendue: {str(e)}"
        if verbose:
            print(f"[ERREUR] {error_msg}")
        return False, error_msg


def shorten_with_fallback(url: str, verbose: bool = False) -> Tuple[bool, str]:
    """
    Raccourcit une URL avec fallback entre les services.

    Essaie d'abord is.gd, puis v.gd en cas d'échec.

    Args:
        url: L'URL à raccourcir
        verbose: Afficher des informations détaillées

    Returns:
        Tuple (succès, url_raccourcie ou message_erreur)
    """
    # Essayer is.gd en premier
    success, result = shorten_url(url, "isgd", verbose)

    if success:
        return True, result

    if verbose:
        print("[INFO] Échec avec is.gd, tentative avec v.gd...")

    # Fallback vers v.gd
    success, result = shorten_url(url, "vgd", verbose)

    return success, result


def validate_url(url: str) -> bool:
    """
    Valide le format d'une URL.

    Args:
        url: L'URL à valider

    Returns:
        True si l'URL semble valide, False sinon
    """
    parsed = urllib.parse.urlparse(url)
    return bool(parsed.scheme and parsed.netloc)


def main():
    """Point d'entrée principal du script."""
    parser = argparse.ArgumentParser(
        description="Raccourcir une URL via is.gd ou v.gd",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemples:
  %(prog)s "https://example.com/very/long/url"
  %(prog)s --service vgd "https://example.com"
  %(prog)s --verbose "https://example.com"
        """,
    )

    parser.add_argument("url", help="L'URL à raccourcir")

    parser.add_argument(
        "-s",
        "--service",
        choices=["isgd", "vgd"],
        default=DEFAULT_SERVICE,
        help=f"Service de raccourcissement (défaut: {DEFAULT_SERVICE})",
    )

    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="Afficher des informations détaillées",
    )

    parser.add_argument(
        "-f",
        "--fallback",
        action="store_true",
        help="Utiliser le fallback automatique entre services",
    )

    parser.add_argument(
        "-j", "--json", action="store_true", help="Sortie au format JSON"
    )

    args = parser.parse_args()

    # Valider l'URL
    if not validate_url(args.url):
        if args.json:
            print(
                json.dumps(
                    {
                        "success": False,
                        "error": "URL invalide. L'URL doit commencer par http:// ou https://",
                        "original_url": args.url,
                    }
                )
            )
        else:
            print(
                "Erreur: URL invalide. L'URL doit commencer par http:// ou https://",
                file=sys.stderr,
            )
        sys.exit(1)

    # Raccourcir l'URL
    if args.fallback:
        success, result = shorten_with_fallback(args.url, args.verbose)
    else:
        success, result = shorten_url(args.url, args.service, args.verbose)

    # Afficher le résultat
    if args.json:
        output = {
            "success": success,
            "original_url": args.url,
            "service": args.service if not args.fallback else "fallback",
        }
        if success:
            output["short_url"] = result
        else:
            output["error"] = result
        print(json.dumps(output, indent=2))
    else:
        if success:
            print(result)
        else:
            print(f"Erreur: {result}", file=sys.stderr)

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
