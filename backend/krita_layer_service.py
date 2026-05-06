import zipfile
import xml.etree.ElementTree as ET
import io
import os
import base64
from PIL import Image, ImageOps
from typing import List, Dict, Any, Optional


class KritaLayerService:
    """
    Service for extracting and manipulating layers from Krita (.kra) files.
    Krita files are essentially ZIP archives containing XML metadata and PNG layers.
    """

    @staticmethod
    def get_kra_layers(kra_path: str) -> List[Dict[str, Any]]:
        """
        Extracts the layer list and their metadata from a .kra file.
        """
        if not os.path.exists(kra_path):
            return []

        layers = []
        try:
            with zipfile.ZipFile(kra_path, "r") as kra:
                # Krita stores its structure in maindoc.xml
                with kra.open("maindoc.xml") as f:
                    tree = ET.parse(f)
                    root = tree.getroot()

                    # Find all layer elements (usually <layer> or <paintlayer>)
                    # Namespace handling might be needed depending on Krita version
                    for layer_node in root.findall(".//layer"):
                        name = layer_node.get("name")
                        visible = layer_node.get("visible", "1") == "1"
                        opacity = int(layer_node.get("opacity", "255"))
                        filename = layer_node.get("filename")  # Internal PNG path

                        if filename:
                            layers.append(
                                {
                                    "name": name,
                                    "visible": visible,
                                    "opacity": opacity,
                                    "internal_path": filename,
                                }
                            )
        except Exception as e:
            print(f"[KritaService] Error reading {kra_path}: {e}")

        return layers

    @staticmethod
    def extract_layer_image(
        kra_path: str, internal_path: str, tint_hex: Optional[str] = None
    ) -> Optional[str]:
        """
        Extracts a specific layer as complex image data (base64).
        Optionally applies a color tint (Narrative Adaptation).
        """
        if not os.path.exists(kra_path):
            return None

        try:
            with zipfile.ZipFile(kra_path, "r") as kra:
                # The actual image data is inside the 'data/' folder
                img_data_path = f"data/{internal_path}"
                if img_data_path not in kra.namelist():
                    # Check without prefix just in case
                    if internal_path in kra.namelist():
                        img_data_path = internal_path
                    else:
                        return None

                with kra.open(img_data_path) as img_file:
                    img = Image.open(img_file).convert("RGBA")

                    # Apply tint for Narrative Adaptation!
                    if tint_hex:
                        img = KritaLayerService._apply_tint(img, tint_hex)

                    # Export to base64
                    buffered = io.BytesIO()
                    img.save(buffered, format="PNG")
                    img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
                    return f"data:image/png;base64,{img_str}"
        except Exception as e:
            print(f"[KritaService] Error extracting layer: {e}")
            return None

    @staticmethod
    def _apply_tint(image: Image.Image, hex_color: str) -> Image.Image:
        """
        Applies a narrative-driven color tint to a grayscale mask (or any layer).
        Useful for changing 'Grass' layer to 'Sand' (Yellow) etc.
        """
        # Convert hex to RGB
        hex_color = hex_color.lstrip("#")
        tint_rgb = tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4))

        # Split channels
        r, g, b, a = image.split()

        # Simple color multiplication (Linear Dodge/Multiply style)
        # We use the luminance of the original layer to preserve shadows/details
        gray = ImageOps.grayscale(image.convert("RGB"))

        # Create a solid color image to multiply
        Image.new("RGB", image.size, tint_rgb)
        tinted_rgb = ImageOps.colorize(gray, (0, 0, 0), tint_rgb)

        # Combine with original Alpha
        return Image.merge("RGBA", (*tinted_rgb.split(), a))

    @staticmethod
    def _get_tint_for_layer(name: str, overrides: Dict[str, str]) -> Optional[str]:
        """
        Determines the correct tint for a layer based on its semantic name and narrative overrides.
        """
        name_low = name.lower()

        # Core Environment
        if any(w in name_low for w in ["sol", "ground", "terre", "herbe", "floor"]):
            return overrides.get("Sol", "#445533")  # Default Grass Green
        if any(w in name_low for w in ["ciel", "sky", "atmospher"]):
            return overrides.get("Ciel", "#87CEEB")  # Default Sky Blue

        # Vegetation
        if any(
            w in name_low
            for w in [
                "vegetation",
                "arbre",
                "tree",
                "foret",
                "forest",
                "plante",
                "jungle",
            ]
        ):
            return overrides.get("Vegetation", "#228B22")  # Forest Green

        # Architecture & Urban
        if any(
            w in name_low
            for w in [
                "architecture",
                "batiment",
                "building",
                "mur",
                "wall",
                "ville",
                "city",
                "ruine",
            ]
        ):
            return overrides.get("Architecture", "#808080")  # Concrete Gray

        # Vehicles
        if any(
            w in name_low
            for w in [
                "vehicule",
                "vehicle",
                "voiture",
                "car",
                "vaisseau",
                "ship",
                "avion",
            ]
        ):
            return overrides.get("Vehicule", "#A52A2A")  # Metallic / Generic

        # Animals & Creatures
        if any(
            w in name_low
            for w in [
                "animal",
                "creature",
                "faune",
                "wildlife",
                "chien",
                "chat",
                "dog",
                "cat",
            ]
        ):
            return overrides.get("Animal", "#DEB887")  # Fur / Skin

        # Liquids & Transparency
        if any(
            w in name_low
            for w in ["eau", "water", "ocean", "lac", "lake", "riviere", "river"]
        ):
            return overrides.get("Eau", "#1E90FF")  # DodgerBlue
        if any(
            w in name_low
            for w in ["verre", "glass", "reflexion", "reflection", "miroir"]
        ):
            return overrides.get("Verre", "#F0F8FF")  # AliceBlue (Translucent look)

        # Debris & Geology
        if any(
            w in name_low
            for w in ["detritus", "debris", "dechet", "garbage", "trash", "casse"]
        ):
            return overrides.get("Detritus", "#8B4513")  # SaddleBrown (Rust)
        if any(
            w in name_low
            for w in ["rocher", "roche", "rock", "pierre", "stone", "montagne"]
        ):
            return overrides.get("Roches", "#696969")  # DimGray

        # Direct Match by name
        return overrides.get(name)

    @staticmethod
    def get_full_composition(
        kra_path: str, narrative_overrides: Dict[str, str] = None
    ) -> List[Dict[str, Any]]:
        """
        Extracts ALL layers and applies narrative overrides where layer names match or follow standards.
        """
        layers = KritaLayerService.get_kra_layers(kra_path)
        comp = []
        overrides = narrative_overrides or {}

        for layer in layers:
            tint = KritaLayerService._get_tint_for_layer(layer["name"], overrides)
            img_b64 = KritaLayerService.extract_layer_image(
                kra_path, layer["internal_path"], tint
            )

            if img_b64:
                comp.append(
                    {
                        "name": layer["name"],
                        "image": img_b64,
                        "opacity": layer["opacity"],
                        "visible": layer["visible"],
                    }
                )

        return comp
