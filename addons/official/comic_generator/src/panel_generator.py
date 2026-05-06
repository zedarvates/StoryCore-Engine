"""
Comic Generator - Panel Generator
Handles image generation for each panel via ComfyUI or fallback.
Creates placeholder images when no visual backend is available.
"""

import asyncio
import logging
from pathlib import Path
from typing import Optional, Dict, Any

from .types import PanelScript, ComicStyle

logger = logging.getLogger(__name__)


# ============================================================================
# Panel Generator
# ============================================================================


class PanelGenerator:
    """
    Generates visual assets (images) for individual comic panels.

    Supports:
    - ComfyUI backend for AI image generation
    - Placeholder generation when no backend is available
    - Seed-based consistency for visual coherence across panels
    """

    def __init__(
        self,
        comfyui_endpoint: str = "http://localhost:8188",
        output_dir: str = "data/assets/comics",
        seed_base: int = 42,
    ):
        self._comfyui_endpoint = comfyui_endpoint
        self._output_dir = Path(output_dir)
        self._seed_base = seed_base
        self._session = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def generate_panel_image(
        self,
        panel: PanelScript,
        style: ComicStyle,
        page_dir: Path,
    ) -> Optional[str]:
        """
        Generate (or attempt to generate) an image for a panel.
        Falls back to creating a placeholder if no backend is available.

        Returns: path to generated image (relative to output_dir)
        """
        panel_dir = page_dir / "panels"
        panel_dir.mkdir(parents=True, exist_ok=True)

        output_path = panel_dir / f"panel_{panel.panel_index:02d}_{panel.id}.png"

        # Try ComfyUI first
        if await self._is_comfyui_available():
            try:
                image_data = await self._generate_via_comfyui(panel, style)
                if image_data:
                    output_path.write_bytes(image_data)
                    logger.info(
                        f"[PanelGenerator] Generated panel image via ComfyUI: {output_path}"
                    )
                    return str(output_path)
            except Exception as e:
                logger.warning(
                    f"[PanelGenerator] ComfyUI generation failed, using placeholder: {e}"
                )

        # Create a description placeholder (SVG-based)
        placeholder = self._create_placeholder_svg(panel, style)
        svg_path = panel_dir / f"panel_{panel.panel_index:02d}_{panel.id}.svg"
        svg_path.write_text(placeholder, encoding="utf-8")
        logger.info(f"[PanelGenerator] Created placeholder SVG: {svg_path}")
        return str(svg_path)

    # ------------------------------------------------------------------
    # ComfyUI Integration
    # ------------------------------------------------------------------

    async def _is_comfyui_available(self) -> bool:
        """Check if ComfyUI is reachable."""
        try:
            import aiohttp

            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self._comfyui_endpoint}/system_stats",
                    timeout=aiohttp.ClientTimeout(total=3),
                ) as resp:
                    return resp.status == 200
        except Exception:
            return False

    async def _generate_via_comfyui(
        self,
        panel: PanelScript,
        style: ComicStyle,
    ) -> Optional[bytes]:
        """Send a generation request to ComfyUI and retrieve image bytes."""
        try:
            import aiohttp

            workflow = self._build_comfyui_workflow(panel, style)

            async with aiohttp.ClientSession() as session:
                # Queue prompt
                async with session.post(
                    f"{self._comfyui_endpoint}/prompt",
                    json={"prompt": workflow},
                    timeout=aiohttp.ClientTimeout(total=120),
                ) as resp:
                    if resp.status != 200:
                        return None
                    result = await resp.json()
                    prompt_id = result.get("prompt_id")

                if not prompt_id:
                    return None

                # Poll for result (max 60 seconds)
                for _ in range(60):
                    await asyncio.sleep(1)
                    async with session.get(
                        f"{self._comfyui_endpoint}/history/{prompt_id}",
                        timeout=aiohttp.ClientTimeout(total=10),
                    ) as resp:
                        history = await resp.json()
                        if prompt_id in history:
                            outputs = history[prompt_id].get("outputs", {})
                            for node_output in outputs.values():
                                images = node_output.get("images", [])
                                if images:
                                    img_info = images[0]
                                    async with session.get(
                                        f"{self._comfyui_endpoint}/view",
                                        params={
                                            "filename": img_info["filename"],
                                            "subfolder": img_info.get("subfolder", ""),
                                            "type": img_info.get("type", "output"),
                                        },
                                        timeout=aiohttp.ClientTimeout(total=30),
                                    ) as img_resp:
                                        return await img_resp.read()
        except Exception as e:
            logger.error(f"[PanelGenerator] ComfyUI request failed: {e}")
        return None

    def _build_comfyui_workflow(
        self, panel: PanelScript, style: ComicStyle
    ) -> Dict[str, Any]:
        """Build a minimal ComfyUI workflow for comic panel generation."""
        seed = self._seed_base + panel.panel_index * 100

        return {
            "6": {
                "inputs": {"text": panel.image_prompt, "clip": ["4", 1]},
                "class_type": "CLIPTextEncode",
            },
            "7": {
                "inputs": {"text": panel.negative_prompt, "clip": ["4", 1]},
                "class_type": "CLIPTextEncode",
            },
            "3": {
                "inputs": {
                    "seed": seed,
                    "steps": 20,
                    "cfg": 7.0,
                    "sampler_name": "euler",
                    "scheduler": "normal",
                    "denoise": 1.0,
                    "model": ["4", 0],
                    "positive": ["6", 0],
                    "negative": ["7", 0],
                    "latent_image": ["5", 0],
                },
                "class_type": "KSampler",
            },
            "4": {
                "inputs": {"ckpt_name": "v1-5-pruned-emaonly.ckpt"},
                "class_type": "CheckpointLoaderSimple",
            },
            "5": {
                "inputs": {"width": 512, "height": 512, "batch_size": 1},
                "class_type": "EmptyLatentImage",
            },
            "8": {
                "inputs": {"samples": ["3", 0], "vae": ["4", 2]},
                "class_type": "VAEDecode",
            },
            "9": {
                "inputs": {
                    "filename_prefix": f"comic_panel_{panel.id}",
                    "images": ["8", 0],
                },
                "class_type": "SaveImage",
            },
        }

    # ------------------------------------------------------------------
    # Placeholder Generation
    # ------------------------------------------------------------------

    def _create_placeholder_svg(self, panel: PanelScript, style: ComicStyle) -> str:
        """Create a rich SVG placeholder representing the panel."""
        # Determine color scheme based on style
        style_colors = {
            ComicStyle.FRANCO_BELGE: ("#2C3E50", "#ECF0F1", "#E74C3C"),
            ComicStyle.COMICS_US: ("#1A1A2E", "#E94560", "#0F3460"),
            ComicStyle.MANGA: ("#1C1C1C", "#F5F5F5", "#FF6B6B"),
            ComicStyle.WEBTOON: ("#0D0D0D", "#FFFFFF", "#7C4DFF"),
        }
        bg, text_color, accent = style_colors.get(
            style, ("#1A1A2E", "#FFFFFF", "#E94560")
        )

        char_names = ", ".join(panel.character_names) or "Scene"
        dialogue_text = panel.dialogue[0].text if panel.dialogue else "..."
        visual_cue_short = panel.visual_cue[:80] + (
            "..." if len(panel.visual_cue) > 80 else ""
        )

        # Wrap long text
        def wrap(text: str, width: int = 35) -> list:
            words = text.split()
            lines, line = [], ""
            for word in words:
                if len(line) + len(word) + 1 <= width:
                    line = (line + " " + word).strip()
                else:
                    if line:
                        lines.append(line)
                    line = word
            if line:
                lines.append(line)
            return lines

        visual_lines = wrap(visual_cue_short)
        dialogue_lines = wrap(f'"{dialogue_text}"', 28)

        visual_y_start = 140
        dialogue_y_start = 280

        visual_tspans = "\n".join(
            f'<tspan x="256" dy="{16 if i > 0 else 0}">{line}</tspan>'
            for i, line in enumerate(visual_lines[:4])
        )
        dialogue_tspans = "\n".join(
            f'<tspan x="256" dy="{18 if i > 0 else 0}">{line}</tspan>'
            for i, line in enumerate(dialogue_lines[:3])
        )

        return f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <!-- Background -->
  <rect width="512" height="512" fill="{bg}"/>
  
  <!-- Border -->
  <rect x="8" y="8" width="496" height="496" fill="none" stroke="{accent}" stroke-width="4" rx="4"/>
  
  <!-- Panel index badge -->
  <circle cx="45" cy="45" r="28" fill="{accent}"/>
  <text x="45" y="52" text-anchor="middle" font-family="Arial, sans-serif" 
        font-size="20" font-weight="bold" fill="white">P{panel.panel_index + 1}</text>
  
  <!-- Character names header -->
  <rect x="0" y="80" width="512" height="40" fill="{accent}" opacity="0.85"/>
  <text x="256" y="105" text-anchor="middle" font-family="Arial, sans-serif"
        font-size="14" font-weight="bold" fill="white">{char_names[:40]}</text>
  
  <!-- Location badge -->
  <text x="256" y="135" text-anchor="middle" font-family="Arial, sans-serif"
        font-size="11" fill="{accent}">📍 {panel.location}</text>
  
  <!-- Visual cue -->
  <text x="256" y="{visual_y_start}" text-anchor="middle" font-family="Arial, sans-serif"
        font-size="12" fill="{text_color}" opacity="0.8">
    {visual_tspans}
  </text>
  
  <!-- Dialogue bubble -->
  <rect x="64" y="260" width="384" height="80" rx="12" fill="white" opacity="0.12"/>
  <rect x="64" y="260" width="384" height="80" rx="12" fill="none" stroke="white" 
        stroke-width="1.5" opacity="0.3"/>
  <text x="256" y="{dialogue_y_start}" text-anchor="middle" font-family="Arial, sans-serif"
        font-size="13" fill="white" font-style="italic">
    {dialogue_tspans}
  </text>
  
  <!-- Narrative beat -->
  <text x="256" y="390" text-anchor="middle" font-family="Arial, sans-serif"
        font-size="11" fill="{accent}" opacity="0.9">⚡ {panel.narrative_beat.value.upper()}</text>
  
  <!-- Style label -->
  <text x="256" y="415" text-anchor="middle" font-family="Arial, sans-serif"
        font-size="10" fill="{text_color}" opacity="0.5">{style.value}</text>
  
  <!-- Panel ID (small) -->
  <text x="256" y="500" text-anchor="middle" font-family="monospace"
        font-size="9" fill="{text_color}" opacity="0.3">{panel.id}</text>
</svg>"""
