#!/usr/bin/env python3
"""
Script pour générer des QR codes à partir de texte ou URLs.

Ce script permet de créer des QR codes de manière simple, soit via l'API
QRServer (sans dépendances), soit via la bibliothèque qrcode (locale).

Utilisation:
    python3 generate_qr.py "https://example.com" --output qr.png
    python3 generate_qr.py "Mon texte" --size 400 --output qr.png
    python3 generate_qr.py "https://openclaw.ai" --color FF5733 --bgcolor FFFFFF

Auteur: Exemple OpenClaw
Date: Février 2026
"""

import argparse
import sys
import urllib.parse
import urllib.request
import urllib.error
import os
from typing import Optional, Tuple


# Configuration de l'API QRServer
QRSERVER_API_URL = "https://api.qrserver.com/v1/create-qr-code/"

# Valeurs par défaut
DEFAULT_SIZE = 300
DEFAULT_FORMAT = "png"
DEFAULT_COLOR = "000000"
DEFAULT_BGCOLOR = "FFFFFF"
DEFAULT_OUTPUT = "qr_code.png"


def generate_qr_api(
    data: str,
    size: int = DEFAULT_SIZE,
    format: str = DEFAULT_FORMAT,
    color: str = DEFAULT_COLOR,
    bgcolor: str = DEFAULT_BGCOLOR,
    output: str = DEFAULT_OUTPUT,
    verbose: bool = False
) -> Tuple[bool, str]:
    """
    Génère un QR code via l'API QRServer.
    
    Cette méthode ne nécessite aucune dépendance externe.
    
    Args:
        data: Le contenu à encoder dans le QR code
        size: La taille en pixels (carré)
        format: Le format de sortie (png, svg, eps)
        color: La couleur du QR code en hex (sans #)
        bgcolor: La couleur de fond en hex (sans #)
        output: Le nom du fichier de sortie
        verbose: Afficher des informations détaillées
        
    Returns:
        Tuple (succès, message)
    """
    if verbose:
        print(f"[INFO] Génération via API QRServer...")
        print(f"[INFO] Contenu: {data[:50]}{'...' if len(data) > 50 else ''}")
        print(f"[INFO] Taille: {size}x{size}")
        print(f"[INFO] Format: {format}")
    
    # Construire les paramètres de la requête
    params = {
        "size": f"{size}x{size}",
        "data": data,
        "format": format,
        "color": color,
        "bgcolor": bgcolor
    }
    
    # Construire l'URL
    query_string = urllib.parse.urlencode(params)
    url = f"{QRSERVER_API_URL}?{query_string}"
    
    try:
        # Effectuer la requête
        request = urllib.request.Request(
            url,
            headers={'User-Agent': 'OpenClaw-QRGenerator/1.0'}
        )
        
        with urllib.request.urlopen(request, timeout=30) as response:
            content = response.read()
            
            # Vérifier si la réponse est une erreur (content-type text/plain)
            content_type = response.headers.get('Content-Type', '')
            if 'text/plain' in content_type:
                error_msg = content.decode('utf-8')
                return False, f"Erreur de l'API: {error_msg}"
            
            # Sauvegarder le fichier
            with open(output, 'wb') as f:
                f.write(content)
            
            if verbose:
                print(f"[INFO] QR code sauvegardé: {output}")
                print(f"[INFO] Taille du fichier: {len(content)} bytes")
            
            return True, f"QR code généré: {output}"
            
    except urllib.error.HTTPError as e:
        return False, f"Erreur HTTP {e.code}: {e.reason}"
        
    except urllib.error.URLError as e:
        return False, f"Erreur de connexion: {e.reason}"
        
    except Exception as e:
        return False, f"Erreur inattendue: {str(e)}"


def generate_qr_local(
    data: str,
    size: int = DEFAULT_SIZE,
    format: str = DEFAULT_FORMAT,
    color: str = DEFAULT_COLOR,
    bgcolor: str = DEFAULT_BGCOLOR,
    output: str = DEFAULT_OUTPUT,
    verbose: bool = False
) -> Tuple[bool, str]:
    """
    Génère un QR code localement via la bibliothèque qrcode.
    
    Cette méthode nécessite: pip install qrcode pillow
    
    Args:
        data: Le contenu à encoder dans le QR code
        size: La taille en pixels (carré)
        format: Le format de sortie (png, svg)
        color: La couleur du QR code en hex (sans #)
        bgcolor: La couleur de fond en hex (sans #)
        output: Le nom du fichier de sortie
        verbose: Afficher des informations détaillées
        
    Returns:
        Tuple (succès, message)
    """
    try:
        import qrcode
        from PIL import Image
    except ImportError:
        return False, "Bibliothèques requises: pip install qrcode pillow"
    
    if verbose:
        print(f"[INFO] Génération locale...")
        print(f"[INFO] Contenu: {data[:50]}{'...' if len(data) > 50 else ''}")
    
    try:
        # Convertir les couleurs hex en RGB
        fill_color = tuple(int(color[i:i+2], 16) for i in (0, 2, 4))
        back_color = tuple(int(bgcolor[i:i+2], 16) for i in (0, 2, 4))
        
        # Créer le QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)
        
        # Générer l'image
        img = qr.make_image(fill_color=fill_color, back_color=back_color)
        
        # Redimensionner si nécessaire
        if size != img.size[0]:
            img = img.resize((size, size), Image.Resampling.LANCZOS)
        
        # Sauvegarder
        if format.lower() == 'svg':
            # Pour SVG, utiliser le factory de qrcode
            import qrcode.image.svg
            factory = qrcode.image.svg.SvgImage
            qr_img = qrcode.QRCode(
                error_correction=qrcode.constants.ERROR_CORRECT_M,
                box_size=10,
                border=4,
            )
            qr_img.add_data(data)
            qr_img.make(fit=True)
            img = qr_img.make_image(fill_color=f"#{color}", back_color=f"#{bgcolor}", image_factory=factory)
            output = output.rsplit('.', 1)[0] + '.svg'
        
        img.save(output)
        
        if verbose:
            print(f"[INFO] QR code sauvegardé: {output}")
        
        return True, f"QR code généré: {output}"
        
    except Exception as e:
        return False, f"Erreur lors de la génération: {str(e)}"


def validate_hex_color(color: str) -> bool:
    """
    Valide une couleur au format hexadécimal.
    
    Args:
        color: La couleur à valider (format: RRGGBB)
        
    Returns:
        True si la couleur est valide
    """
    if len(color) != 6:
        return False
    try:
        int(color, 16)
        return True
    except ValueError:
        return False


def main():
    """Point d'entrée principal du script."""
    parser = argparse.ArgumentParser(
        description="Générer un QR code à partir de texte ou URL",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemples:
  %(prog)s "https://example.com" --output qr.png
  %(prog)s "Mon texte" --size 400 --color FF0000
  %(prog)s "https://openclaw.ai" --format svg --output qr.svg
        """
    )
    
    parser.add_argument(
        "data",
        help="Le contenu à encoder dans le QR code"
    )
    
    parser.add_argument(
        "-o", "--output",
        default=DEFAULT_OUTPUT,
        help=f"Nom du fichier de sortie (défaut: {DEFAULT_OUTPUT})"
    )
    
    parser.add_argument(
        "-s", "--size",
        type=int,
        default=DEFAULT_SIZE,
        help=f"Taille en pixels (défaut: {DEFAULT_SIZE})"
    )
    
    parser.add_argument(
        "-f", "--format",
        choices=["png", "svg", "eps"],
        default=DEFAULT_FORMAT,
        help=f"Format de sortie (défaut: {DEFAULT_FORMAT})"
    )
    
    parser.add_argument(
        "-c", "--color",
        default=DEFAULT_COLOR,
        help=f"Couleur du QR en hex RRGGBB (défaut: {DEFAULT_COLOR})"
    )
    
    parser.add_argument(
        "-b", "--bgcolor",
        default=DEFAULT_BGCOLOR,
        help=f"Couleur de fond en hex RRGGBB (défaut: {DEFAULT_BGCOLOR})"
    )
    
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Afficher des informations détaillées"
    )
    
    parser.add_argument(
        "-l", "--local",
        action="store_true",
        help="Utiliser la génération locale (nécessite qrcode et pillow)"
    )
    
    args = parser.parse_args()
    
    # Valider les couleurs
    if not validate_hex_color(args.color):
        print(f"Erreur: Couleur invalide '{args.color}'. Utiliser le format RRGGBB (ex: FF0000)", file=sys.stderr)
        sys.exit(1)
    
    if not validate_hex_color(args.bgcolor):
        print(f"Erreur: Couleur de fond invalide '{args.bgcolor}'. Utiliser le format RRGGBB (ex: FFFFFF)", file=sys.stderr)
        sys.exit(1)
    
    # Générer le QR code
    if args.local:
        success, message = generate_qr_local(
            args.data,
            args.size,
            args.format,
            args.color,
            args.bgcolor,
            args.output,
            args.verbose
        )
    else:
        success, message = generate_qr_api(
            args.data,
            args.size,
            args.format,
            args.color,
            args.bgcolor,
            args.output,
            args.verbose
        )
    
    if success:
        print(message)
    else:
        print(f"Erreur: {message}", file=sys.stderr)
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
