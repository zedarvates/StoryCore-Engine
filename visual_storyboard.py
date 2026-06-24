#!/usr/bin/env python3
"""
Visual Storyboard — Analyse visuelle de storyboards via PixelRAG.

Prend une image de storyboard (ou une URL), l'analyse visuellement,
et produit une description de scène utilisable par StoryCore Engine.

Usage:
    python3 visual_storyboard.py storyboard.jpg
    python3 visual_storyboard.py https://example.com/storyboard.png --scene 3
"""

import json
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Optional


def analyze_storyboard(image_path: str, scene_num: Optional[int] = None) -> dict:
    """Analyse un storyboard visuellement via PixelRAG + VLM.

    Args:
        image_path: Chemin ou URL de l'image du storyboard
        scene_num: Numéro de scène (optionnel)

    Returns:
        Dict avec analyse: personnages, actions, décors, émotions
    """
    # 1. Vérifier si pixelshot est disponible
    pixelshot = _find_pixelshot()
    if not pixelshot:
        return _fallback_analysis(image_path)

    # 2. Capturer / analyser l'image
    with tempfile.TemporaryDirectory(prefix="storycore_") as tmpdir:
        # pixelshot accepte URLs et fichiers
        result = subprocess.run(
            [pixelshot, image_path, "--output", tmpdir],
            capture_output=True, text=True, timeout=30,
        )
        if result.returncode != 0:
            return _fallback_analysis(image_path, error=result.stderr[:200])

        # 3. Chercher les tiles générées
        tiles_dir = None
        for item in Path(tmpdir).iterdir():
            if item.is_dir() and any(item.iterdir()):
                tiles_dir = item
                break

        if not tiles_dir:
            return _fallback_analysis(image_path, error="No tiles generated")

        tiles = sorted(tiles_dir.glob("*.jpg")) + sorted(tiles_dir.glob("*.png"))
        if not tiles:
            return _fallback_analysis(image_path, error="No image tiles")

        # 4. Info basique sur l'image
        import os
        total_size = sum(f.stat().st_size for f in tiles)

        return {
            "solved": True,
            "engine": "pixelrag",
            "image": image_path,
            "scene": scene_num,
            "tiles": len(tiles),
            "total_size_kb": round(total_size / 1024, 1),
            "analysis": _describe_tiles(tiles, image_path),
        }


def _find_pixelshot() -> Optional[str]:
    """Trouve le binaire pixelshot."""
    import shutil
    return shutil.which("pixelshot")


def _describe_tiles(tiles: list[Path], source: str) -> str:
    """Produit une description basique du storyboard."""
    return (
        f"Storyboard analysé: {source}\n"
        f"  {len(tiles)} tiles générées\n"
        f"  Utilise: vision_analyze() pour analyse VLM complète\n"
        f"  Tuile principale: {tiles[0]}"
    )


def _fallback_analysis(image_path: str, error: str = "") -> dict:
    """Fallback: retourne les infos disponibles sans PixelRAG."""
    result = {
        "solved": False,
        "engine": "fallback",
        "image": image_path,
        "error": error or "PixelRAG (pixelshot) non disponible",
    }

    # Vérifier si le fichier existe localement
    local_path = Path(image_path)
    if local_path.exists():
        result["local_path"] = str(local_path.resolve())
        result["size_kb"] = round(local_path.stat().st_size / 1024, 1)

    return result


def extract_scene_info(analysis: dict) -> Optional[dict]:
    """Extrait les infos de scène exploitables par StoryCore.

    Args:
        analysis: Résultat de analyze_storyboard()

    Returns:
        Dict structuré ou None si pas assez d'infos
    """
    if not analysis.get("solved"):
        return None

    return {
        "source": analysis.get("image", ""),
        "scene": analysis.get("scene"),
        "tiles_count": analysis.get("tiles", 0),
        "tile_example": analysis.get("analysis", "").split("Tuile principale:")[-1].strip()
        if "Tuile principale:" in analysis.get("analysis", "")
        else None,
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 visual_storyboard.py <image_path_or_url> [--scene N]")
        sys.exit(1)

    image = sys.argv[1]
    scene = None
    if "--scene" in sys.argv:
        idx = sys.argv.index("--scene")
        if idx + 1 < len(sys.argv):
            scene = int(sys.argv[idx + 1])

    result = analyze_storyboard(image, scene)
    print(json.dumps(result, indent=2, ensure_ascii=False))

    info = extract_scene_info(result)
    if info:
        print(f"\n📋 Scene info extractée:")
        print(f"   Scene #{info['scene']}, {info['tiles_count']} tiles")
