"""
trellis_workflows.py -- Helpers pour manipuler les workflows ComfyUI Trellis2.

Permet de :
  - Charger un workflow JSON depuis le dossier workflows/
  - Patcher l'image d'entree (nom du fichier uploaded)
  - Patcher le nom de sortie (prefix GLB)
  - Selectionner le preset (lowvram / highquality / lowpoly / trunk_only)
"""
from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any, Dict, Optional

# Dossier des workflows (relatif a ce fichier)
_WORKFLOWS_DIR = Path(__file__).parent.parent / "workflows"


# ── Noms des workflows disponibles ──────────────────────────────────────────

WORKFLOW_STANDARD = "trellis2_standard.json"
WORKFLOW_LOWVRAM  = "trellis2_lowvram.json"
WORKFLOW_LOWPOLY  = "trellis2_lowpoly.json"
WORKFLOW_TRUNK    = "trellis2_trunk_only.json"

# Mapping preset -> fichier
PRESETS = {
    "standard":   WORKFLOW_STANDARD,
    "lowvram":    WORKFLOW_LOWVRAM,
    "lowpoly":    WORKFLOW_LOWPOLY,
    "trunk_only": WORKFLOW_TRUNK,
}


def load_workflow(preset: str = "lowvram") -> Dict[str, Any]:
    """
    Charge un workflow ComfyUI depuis le dossier workflows/.

    Args:
        preset: 'standard' | 'lowvram' | 'lowpoly' | 'trunk_only'

    Returns: dict workflow (deepcopy pour eviter mutations)
    """
    filename = PRESETS.get(preset, WORKFLOW_LOWVRAM)
    path = _WORKFLOWS_DIR / filename
    if not path.exists():
        raise FileNotFoundError(f"Workflow introuvable: {path}")
    with open(path, encoding="utf-8") as f:
        return copy.deepcopy(json.load(f))


def patch_input_image(workflow: Dict[str, Any], image_filename: str) -> Dict[str, Any]:
    """
    Remplace le nom d'image dans le node Trellis2LoadImageWithTransparency.

    Le node d'entree image a type 'Trellis2LoadImageWithTransparency'.
    widgets_values[0] = nom du fichier image.
    """
    for node in workflow.get("nodes", []):
        if node.get("type") == "Trellis2LoadImageWithTransparency":
            if "widgets_values" in node and len(node["widgets_values"]) > 0:
                node["widgets_values"][0] = image_filename
    return workflow


def patch_output_name(workflow: Dict[str, Any], name: str) -> Dict[str, Any]:
    """
    Remplace le prefixe de nom dans le node PrimitiveString (nom de l'asset).

    Le node PrimitiveString connecte au StringConcatenate contient le nom de base.
    widgets_values[0] = nom
    """
    for node in workflow.get("nodes", []):
        if node.get("type") == "PrimitiveString":
            if "widgets_values" in node and len(node["widgets_values"]) > 0:
                node["widgets_values"][0] = name
    return workflow


def patch_seed(workflow: Dict[str, Any], seed: int) -> Dict[str, Any]:
    """
    Remplace le seed dans tous les nodes generateurs.
    """
    seed_nodes = {
        "Trellis2MeshWithVoxelAdvancedGenerator",
        "Trellis2MeshRefiner",
        "Trellis2MeshTexturing",
    }
    for node in workflow.get("nodes", []):
        if node.get("type") in seed_nodes:
            vals = node.get("widgets_values", [])
            if len(vals) > 0:
                vals[0] = seed
                # widget_values[1] = "fixed" (ne pas changer)
    return workflow


def patch_remove_background(workflow: Dict[str, Any], enabled: bool = True) -> Dict[str, Any]:
    """
    Active/desactive la suppression de fond dans Trellis2PreProcessImage.

    widgets_values[0] = padding (int, ex: 25)
    widgets_values[1] = remove_background (bool)
    """
    for node in workflow.get("nodes", []):
        if node.get("type") == "Trellis2PreProcessImage":
            vals = node.get("widgets_values", [])
            if len(vals) > 1:
                vals[1] = enabled
    return workflow


def patch_resolution(workflow: Dict[str, Any], resolution: int = 512) -> Dict[str, Any]:
    """
    Ajuste la resolution de generation (512 pour lowvram, 1024 pour highquality).

    Dans Trellis2MeshWithVoxelAdvancedGenerator:
    widgets_values[2] = sparse_structure_resolution ("512" ou "1024")
    """
    res_str = str(resolution)
    for node in workflow.get("nodes", []):
        if node.get("type") == "Trellis2MeshWithVoxelAdvancedGenerator":
            vals = node.get("widgets_values", [])
            if len(vals) > 2:
                vals[2] = res_str
    return workflow


def build_workflow(
    image_filename: str,
    asset_name: str,
    preset: str = "lowvram",
    seed: int = 12345,
    remove_background: bool = True,
    resolution: int = 512,
) -> Dict[str, Any]:
    """
    Construit un workflow pret a envoyer a ComfyUI.

    Applique tous les patches dans l'ordre correct.

    Args:
        image_filename   : nom du fichier upload dans ComfyUI (ex: "hero.png")
        asset_name       : prefixe du GLB de sortie (ex: "Hero")
        preset           : 'lowvram' | 'standard' | 'lowpoly' | 'trunk_only'
        seed             : graine de generation
        remove_background: True si l'image n'a pas de fond transparent
        resolution       : 512 (lowvram) ou 1024 (qualite)

    Returns: workflow dict pret pour ComfyUIClient.queue_workflow()
    """
    wf = load_workflow(preset)
    wf = patch_input_image(wf, image_filename)
    wf = patch_output_name(wf, asset_name)
    wf = patch_seed(wf, seed)
    wf = patch_remove_background(wf, remove_background)
    wf = patch_resolution(wf, resolution)
    return wf


def get_expected_output_names(asset_name: str, preset: str = "lowvram") -> list[str]:
    """
    Retourne les noms de fichiers attendus en sortie.

    Pour le workflow lowvram :
      - {name}_WhiteMesh_00001_.glb  (mesh sans texture)
      - {name}_Refined_00001_.glb    (mesh affine)
      - {name}_Textured_00001_.glb   (mesh texture final)
    """
    bases = {
        "lowvram":    ["WhiteMesh", "Refined", "Textured"],
        "standard":   ["Textured"],
        "lowpoly":    ["LowPoly"],
        "trunk_only": ["Trunk_WhiteMesh", "Trunk_Textured"],
    }
    suffixes = bases.get(preset, ["Textured"])
    return [f"{asset_name}_{s}_00001_.glb" for s in suffixes]
