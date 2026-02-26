"""
Comic Generator - Pipeline Orchestrator
Coordinates the full page generation workflow:
fetch narrative state → generate script → generate images → export.
"""

import asyncio
import json
import logging
import os
from copy import deepcopy
from dataclasses import asdict
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any
from uuid import uuid4

from .types import (
    ComicStyle, ComicPage, ComicChapter, ComicState, NarrativeCheckpoint,
    PageGenerationRequest, PageGenerationResult, ComicExportResult,
    BubbleShape, PanelScript, DialogueLine, NarrativeBeat, MotionEffect,
)
from .narrative_adapter import NarrativeAdapter
from .panel_generator import PanelGenerator

logger = logging.getLogger(__name__)


# ============================================================================
# Comic Pipeline
# ============================================================================

class ComicPipeline:
    """
    Master orchestrator for the comic generation pipeline.
    
    Workflow:
    1. Load project narrative state
    2. Call NarrativeAdapter to generate page script
    3. Call PanelGenerator to produce images
    4. Save page and update checkpoint
    5. Optionally export to PDF/JSON
    
    Features:
    - Error handling and rollback support
    - Pre-generation preview (script without images)
    - Multi-chapter management
    - Three-level narrative memory
    """

    def __init__(
        self,
        output_dir: str = "data/assets/comics",
        comfyui_endpoint: str = "http://localhost:8188",
        seed_base: int = 42,
    ):
        self._output_dir = Path(output_dir)
        self._output_dir.mkdir(parents=True, exist_ok=True)

        self._adapter = NarrativeAdapter()
        self._generator = PanelGenerator(
            comfyui_endpoint=comfyui_endpoint,
            output_dir=output_dir,
            seed_base=seed_base,
        )

    # ------------------------------------------------------------------
    # State Management
    # ------------------------------------------------------------------

    def _state_path(self, project_id: str) -> Path:
        return self._output_dir / project_id / "comic_state.json"

    def load_state(self, project_id: str) -> Optional[ComicState]:
        """Load the persisted comic state for a project."""
        path = self._state_path(project_id)
        if not path.exists():
            return None
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            # Reconstruct checkpoint if present
            checkpoint_data = data.get("narrative_checkpoint")
            checkpoint = None
            if checkpoint_data:
                from .types import CharacterState, NarrativeCheckpoint
                char_states = [
                    CharacterState(**cs) for cs in checkpoint_data.get("active_characters", [])
                ]
                checkpoint = NarrativeCheckpoint(
                    checkpoint_id=checkpoint_data["checkpoint_id"],
                    page_id=checkpoint_data["page_id"],
                    page_number=checkpoint_data["page_number"],
                    story_arc_position=checkpoint_data["story_arc_position"],
                    active_characters=char_states,
                    revealed_secrets=checkpoint_data.get("revealed_secrets", []),
                    active_conflicts=checkpoint_data.get("active_conflicts", []),
                    last_dramatic_event=checkpoint_data.get("last_dramatic_event", ""),
                    story_summary=checkpoint_data.get("story_summary", ""),
                    created_at=checkpoint_data.get("created_at", ""),
                )
            
            return ComicState(
                project_id=data["project_id"],
                last_page_generated=data.get("last_page_generated"),
                last_chapter_id=data.get("last_chapter_id"),
                narrative_checkpoint=checkpoint,
                style_preset=ComicStyle(data.get("style_preset", "manga")),
                progression=data.get("progression", 0.0),
                chapters=data.get("chapters", []),
                total_pages=data.get("total_pages", 0),
                created_at=data.get("created_at", datetime.now().isoformat()),
                updated_at=data.get("updated_at", datetime.now().isoformat()),
                local_memory=data.get("local_memory", []),
                arc_memory=data.get("arc_memory", []),
                global_memory=data.get("global_memory", []),
            )
        except Exception as e:
            logger.error(f"[ComicPipeline] Failed to load state: {e}")
            return None

    def save_state(self, state: ComicState) -> bool:
        """Persist the comic state to disk."""
        path = self._state_path(state.project_id)
        path.parent.mkdir(parents=True, exist_ok=True)
        try:
            # Convert to dict, handling nested dataclasses
            def to_dict(obj):
                if hasattr(obj, "__dataclass_fields__"):
                    return {k: to_dict(v) for k, v in asdict(obj).items()}
                elif isinstance(obj, list):
                    return [to_dict(i) for i in obj]
                elif isinstance(obj, dict):
                    return {k: to_dict(v) for k, v in obj.items()}
                elif hasattr(obj, "value"):  # Enum
                    return obj.value
                return obj

            data = to_dict(state)
            path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
            return True
        except Exception as e:
            logger.error(f"[ComicPipeline] Failed to save state: {e}")
            return False

    def init_state(self, project_id: str, style: ComicStyle) -> ComicState:
        """Initialize a fresh comic state for a project."""
        state = ComicState(
            project_id=project_id,
            last_page_generated=None,
            last_chapter_id=None,
            narrative_checkpoint=None,
            style_preset=style,
            progression=0.0,
            chapters=[],
            total_pages=0,
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat(),
            local_memory=[],
            arc_memory=[],
            global_memory=[],
        )
        self.save_state(state)
        return state

    # ------------------------------------------------------------------
    # Page Generation
    # ------------------------------------------------------------------

    async def generate_next_page(
        self,
        project_id: str,
        story_context: str,
        characters: List[Dict[str, Any]],
        locations: List[Dict[str, Any]],
        objects: List[Dict[str, Any]],
        style: Optional[ComicStyle] = None,
        generate_images: bool = False,
        panels_count: int = 4,
        narrative_direction: Optional[str] = None,
    ) -> PageGenerationResult:
        """
        Generate the next comic page for a project.
        
        Args:
            project_id: StoryCore project ID
            story_context: Current story text / summary
            characters: Character data from StoryCore
            locations: Location data from StoryCore
            objects: Object data from StoryCore
            style: Comic visual style to use
            generate_images: Whether to call image generation backend
            panels_count: Number of panels (4-6 recommended)
            narrative_direction: Optional hint ("tension", "revelation", etc.)
        """
        # Load or initialize state
        state = self.load_state(project_id) or self.init_state(
            project_id, style or ComicStyle.MANGA
        )

        # Use state style if not overridden
        effective_style = style or state.style_preset

        # Ensure chapter exists
        chapter_id = state.last_chapter_id or f"chapter_{str(uuid4())[:8]}"
        if not state.last_chapter_id:
            state.last_chapter_id = chapter_id
            state.chapters.append(chapter_id)

        # Build request
        request = PageGenerationRequest(
            project_id=project_id,
            chapter_id=chapter_id,
            story_context=story_context,
            previous_page_summary=(
                state.narrative_checkpoint.last_dramatic_event
                if state.narrative_checkpoint else None
            ),
            narrative_checkpoint=state.narrative_checkpoint,
            characters=characters,
            locations=locations,
            objects=objects,
            style=effective_style,
            panels_count=panels_count,
            narrative_direction=narrative_direction,
        )

        # Save rollback point
        rollback_state = deepcopy(state)

        try:
            # Generate page script
            result = await self._adapter.generate_page_script(request)

            if not result.success or not result.page:
                logger.error(f"[ComicPipeline] Script generation failed: {result.error}")
                return result

            page = result.page
            page.page_number = state.total_pages + 1

            # Fix panel page IDs
            for panel in page.panels:
                panel.page_id = page.id

            # Generate images if requested
            if generate_images:
                page_dir = self._output_dir / project_id / chapter_id / f"page_{page.page_number:03d}"
                page_dir.mkdir(parents=True, exist_ok=True)

                for panel in page.panels:
                    img_path = await self._generator.generate_panel_image(
                        panel=panel,
                        style=effective_style,
                        page_dir=page_dir,
                    )
                    if img_path:
                        panel.generated_image_path = img_path
            else:
                # Always generate placeholder SVGs
                page_dir = self._output_dir / project_id / chapter_id / f"page_{page.page_number:03d}"
                page_dir.mkdir(parents=True, exist_ok=True)
                for panel in page.panels:
                    svg = self._generator._create_placeholder_svg(panel, effective_style)
                    svg_path = page_dir / "panels" / f"panel_{panel.panel_index:02d}_{panel.id}.svg"
                    svg_path.parent.mkdir(parents=True, exist_ok=True)
                    svg_path.write_text(svg, encoding="utf-8")
                    panel.generated_image_path = str(svg_path)

            # Save page JSON
            self._save_page(state.project_id, chapter_id, page)

            # Update state
            state.last_page_generated = page.id
            state.total_pages += 1
            state.progression = min(1.0, state.progression + 0.05)
            state.updated_at = datetime.now().isoformat()

            if result.new_checkpoint:
                state.narrative_checkpoint = result.new_checkpoint
                # Update three-level memory
                state.local_memory = [page.narrative_summary]
                state.arc_memory = (state.arc_memory + [page.narrative_summary])[-20:]
                state.global_memory = (state.global_memory + [page.narrative_summary])[-100:]

            self.save_state(state)

            logger.info(
                f"[ComicPipeline] Generated page {page.page_number} "
                f"with {len(page.panels)} panels for project {project_id}"
            )
            return result

        except Exception as e:
            # Rollback state
            logger.error(f"[ComicPipeline] Pipeline error, rolling back: {e}", exc_info=True)
            self.save_state(rollback_state)
            return PageGenerationResult(
                success=False,
                page=None,
                new_checkpoint=rollback_state.narrative_checkpoint,
                image_prompts=[],
                error=str(e),
            )

    # ------------------------------------------------------------------
    # Regenerate Single Panel
    # ------------------------------------------------------------------

    async def regenerate_panel(
        self,
        project_id: str,
        page: ComicPage,
        panel_index: int,
        generate_image: bool = True,
    ) -> Optional[str]:
        """
        Regenerate a single panel's image with a new random seed.
        Returns the new image path.
        """
        if panel_index >= len(page.panels):
            logger.error(f"[ComicPipeline] Panel index {panel_index} out of bounds")
            return None

        panel = page.panels[panel_index]
        panel.seed += 1000  # Change seed for variety

        state = self.load_state(project_id)
        effective_style = state.style_preset if state else ComicStyle.MANGA

        page_dir = self._output_dir / project_id / page.chapter_id / f"page_{page.page_number:03d}"

        if generate_image:
            img_path = await self._generator.generate_panel_image(
                panel=panel,
                style=effective_style,
                page_dir=page_dir,
            )
        else:
            svg = self._generator._create_placeholder_svg(panel, effective_style)
            svg_path = page_dir / "panels" / f"panel_{panel.panel_index:02d}_{panel.id}_regen.svg"
            svg_path.parent.mkdir(parents=True, exist_ok=True)
            svg_path.write_text(svg, encoding="utf-8")
            img_path = str(svg_path)

        if img_path:
            panel.generated_image_path = img_path
            self._save_page(project_id, page.chapter_id, page)

        return img_path

    # ------------------------------------------------------------------
    # Page Persistence
    # ------------------------------------------------------------------

    def _save_page(self, project_id: str, chapter_id: str, page: ComicPage) -> None:
        """Save a page's script and metadata to JSON."""
        page_dir = self._output_dir / project_id / chapter_id / f"page_{page.page_number:03d}"
        page_dir.mkdir(parents=True, exist_ok=True)

        def to_dict(obj):
            if hasattr(obj, "__dataclass_fields__"):
                return {k: to_dict(v) for k, v in asdict(obj).items()}
            elif isinstance(obj, list):
                return [to_dict(i) for i in obj]
            elif isinstance(obj, dict):
                return {k: to_dict(v) for k, v in obj.items()}
            elif hasattr(obj, "value"):
                return obj.value
            return obj

        page_path = page_dir / "page.json"
        page_path.write_text(
            json.dumps(to_dict(page), indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

    def load_page(self, project_id: str, chapter_id: str, page_number: int) -> Optional[ComicPage]:
        """Load a saved page from disk."""
        page_path = (
            self._output_dir / project_id / chapter_id
            / f"page_{page_number:03d}" / "page.json"
        )
        if not page_path.exists():
            return None
        try:
            data = json.loads(page_path.read_text(encoding="utf-8"))
            return self._deserialize_page(data)
        except Exception as e:
            logger.error(f"[ComicPipeline] Failed to load page: {e}")
            return None

    def _deserialize_page(self, data: Dict[str, Any]) -> ComicPage:
        """Reconstruct a ComicPage from a JSON dict."""
        panels = []
        for p_data in data.get("panels", []):
            dialogue = [
                DialogueLine(
                    character_id=d["character_id"],
                    character_name=d["character_name"],
                    text=d["text"],
                    bubble_shape=BubbleShape(d.get("bubble_shape", "round")),
                    bubble_color=d.get("bubble_color", "#FFFFFF"),
                    text_effect=d.get("text_effect"),
                )
                for d in p_data.get("dialogue", [])
            ]
            panels.append(PanelScript(
                id=p_data["id"],
                page_id=p_data["page_id"],
                panel_index=p_data["panel_index"],
                characters=p_data.get("characters", []),
                character_names=p_data.get("character_names", []),
                location=p_data["location"],
                location_id=p_data.get("location_id"),
                dialogue=dialogue,
                visual_cue=p_data["visual_cue"],
                image_prompt=p_data["image_prompt"],
                negative_prompt=p_data.get("negative_prompt", ""),
                seed=p_data.get("seed", 42),
                narrative_beat=NarrativeBeat(p_data.get("narrative_beat", "setup")),
                generated_image_path=p_data.get("generated_image_path"),
                panel_size=p_data.get("panel_size", "normal"),
            ))

        return ComicPage(
            id=data["id"],
            chapter_id=data["chapter_id"],
            page_number=data["page_number"],
            panels=panels,
            narrative_summary=data["narrative_summary"],
            emotional_tone=data["emotional_tone"],
            arc_position=data["arc_position"],
            style=ComicStyle(data.get("style", "manga")),
            layout_template=data.get("layout_template", "grid_2x2"),
            exported_image_path=data.get("exported_image_path"),
            created_at=data.get("created_at"),
        )

    # ------------------------------------------------------------------
    # History / Chapter Management
    # ------------------------------------------------------------------

    def get_chapter_pages(
        self, project_id: str, chapter_id: str
    ) -> List[Dict[str, Any]]:
        """Get summary list of all pages in a chapter."""
        chapter_dir = self._output_dir / project_id / chapter_id
        if not chapter_dir.exists():
            return []

        pages = []
        for page_dir in sorted(chapter_dir.iterdir()):
            page_file = page_dir / "page.json"
            if page_file.exists():
                try:
                    data = json.loads(page_file.read_text(encoding="utf-8"))
                    pages.append({
                        "id": data.get("id"),
                        "page_number": data.get("page_number"),
                        "narrative_summary": data.get("narrative_summary"),
                        "panels_count": len(data.get("panels", [])),
                        "style": data.get("style"),
                        "arc_position": data.get("arc_position"),
                    })
                except Exception:
                    pass
        return pages

    # ------------------------------------------------------------------
    # Export
    # ------------------------------------------------------------------

    async def export_to_json(
        self, project_id: str, output_path: Optional[str] = None
    ) -> ComicExportResult:
        """Export all comic data to a structured JSON file."""
        state = self.load_state(project_id)
        if not state:
            return ComicExportResult(
                success=False, format="json", output_path=None,
                pages_exported=0, error="No comic state found"
            )

        export_data = {
            "project_id": project_id,
            "style": state.style_preset.value,
            "progression": state.progression,
            "exported_at": datetime.now().isoformat(),
            "chapters": [],
        }

        total_pages = 0
        def to_dict(obj):
            if hasattr(obj, "__dataclass_fields__"):
                return {k: to_dict(v) for k, v in asdict(obj).items()}
            elif isinstance(obj, list):
                return [to_dict(i) for i in obj]
            elif isinstance(obj, dict):
                return {k: to_dict(v) for k, v in obj.items()}
            elif hasattr(obj, "value"):
                return obj.value
            return obj

        for chapter_id in state.chapters:
            pages = self.get_chapter_pages(project_id, chapter_id)
            total_pages += len(pages)
            export_data["chapters"].append({
                "id": chapter_id,
                "pages": pages,
            })

        out_path = output_path or str(
            self._output_dir / project_id / "export" / f"comic_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        )
        Path(out_path).parent.mkdir(parents=True, exist_ok=True)
        Path(out_path).write_text(
            json.dumps(export_data, indent=2, ensure_ascii=False), encoding="utf-8"
        )

        return ComicExportResult(
            success=True, format="json", output_path=out_path,
            pages_exported=total_pages
        )

    async def export_to_pdf(
        self, project_id: str, output_path: Optional[str] = None
    ) -> ComicExportResult:
        """Export pages to PDF (requires fpdf2)."""
        try:
            from fpdf import FPDF
        except ImportError:
            return ComicExportResult(
                success=False, format="pdf", output_path=None,
                pages_exported=0, error="fpdf2 not installed. Run: pip install fpdf2"
            )

        state = self.load_state(project_id)
        if not state:
            return ComicExportResult(
                success=False, format="pdf", output_path=None,
                pages_exported=0, error="No comic state found"
            )

        pdf = FPDF(orientation="P", unit="mm", format="A4")
        pdf.set_auto_page_break(False)
        total_pages = 0

        for chapter_id in state.chapters:
            pages_meta = self.get_chapter_pages(project_id, chapter_id)
            for page_meta in pages_meta:
                loaded = self.load_page(project_id, chapter_id, page_meta["page_number"])
                if not loaded:
                    continue

                pdf.add_page()
                total_pages += 1

                # Title
                pdf.set_font("Helvetica", "B", 14)
                pdf.cell(0, 10, f"Page {loaded.page_number} - {loaded.emotional_tone.capitalize()}", ln=True)

                # Panels
                pdf.set_font("Helvetica", size=9)
                for i, panel in enumerate(loaded.panels):
                    pdf.set_font("Helvetica", "B", 10)
                    pdf.cell(0, 6, f"Panel {i+1}: {panel.narrative_beat.value.upper()}", ln=True)
                    pdf.set_font("Helvetica", size=9)
                    pdf.multi_cell(0, 5, f"Visual: {panel.visual_cue[:120]}")
                    for line in panel.dialogue:
                        pdf.multi_cell(0, 5, f'  {line.character_name}: "{line.text}"')
                    pdf.ln(3)

                pdf.set_font("Helvetica", "I", 9)
                pdf.multi_cell(0, 5, f"Summary: {loaded.narrative_summary}")

        out_path = output_path or str(
            self._output_dir / project_id / "export" / f"comic_{datetime.now().strftime('%Y%m%d')}.pdf"
        )
        Path(out_path).parent.mkdir(parents=True, exist_ok=True)
        pdf.output(out_path)

        return ComicExportResult(
            success=True, format="pdf", output_path=out_path, pages_exported=total_pages
        )
