"""
Comic Generator Addon - Tests
Tests for narrative adapter, pipeline, and panel generator.
"""

import asyncio
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

# Add the addon to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from addons.official.comic_generator.src.types import (
    ComicStyle,
    NarrativeBeat,
    PanelScript,
    ComicPage,
    NarrativeCheckpoint,
    CharacterState,
    PageGenerationRequest,
    BubbleShape,
    DialogueLine,
)
from addons.official.comic_generator.src.narrative_adapter import (
    NarrativeAdapter,
    get_character_visual_signature,
    select_narrative_beat,
)
from addons.official.comic_generator.src.comic_pipeline import ComicPipeline


# ============================================================================
# Fixtures
# ============================================================================

SAMPLE_CHARACTER = {
    "character_id": "char_001",
    "name": "Aria",
    "role": {
        "archetype": "hero",
        "type": "protagonist",
    },
    "visual_identity": {
        "clothing_style": "futuristic leather jacket",
    },
    "personality": "brave and determined",
}

SAMPLE_CHARACTER_2 = {
    "character_id": "char_002",
    "name": "Vex",
    "role": {
        "archetype": "villain",
        "type": "antagonist",
    },
    "visual_identity": {
        "clothing_style": "dark energy armor",
    },
}

SAMPLE_LOCATION = {
    "location_id": "loc_001",
    "name": "The Neon Wastelands",
    "location_type": "exterior",
    "metadata": {
        "description": "A desolate cyberpunk cityscape ravaged by digital storms",
        "atmosphere": "dark and oppressive",
        "genre_tags": ["cyberpunk", "post-apocalyptic"],
    },
}

SAMPLE_STORY_CONTEXT = (
    "In a fractured future, Aria discovers that Vex has stolen the quantum core "
    "that powers the resistance's last hope. She must confront him in the Neon "
    "Wastelands before he escapes through the dimensional rift."
)


# ============================================================================
# Type Tests
# ============================================================================

class TestTypes(unittest.TestCase):
    def test_comic_style_values(self):
        for val in ["franco-belge", "comics-us", "manga", "webtoon"]:
            self.assertEqual(ComicStyle(val).value, val)

    def test_narrative_beat_values(self):
        for val in ["setup", "tension", "revelation", "transition", "climax", "resolution"]:
            self.assertEqual(NarrativeBeat(val).value, val)

    def test_dialogue_line(self):
        line = DialogueLine(
            character_id="char_001",
            character_name="Aria",
            text="You can't escape the truth.",
            bubble_shape=BubbleShape.ROUND,
            bubble_color="#FFFFFF",
        )
        self.assertEqual(line.text, "You can't escape the truth.")
        self.assertEqual(line.bubble_shape, BubbleShape.ROUND)


# ============================================================================
# Narrative Adapter Tests
# ============================================================================

class TestNarrativeAdapter(unittest.TestCase):

    def test_get_character_visual_signature_hero(self):
        sig = get_character_visual_signature(SAMPLE_CHARACTER)
        self.assertEqual(sig.character_id, "char_001")
        self.assertEqual(sig.character_name, "Aria")
        self.assertEqual(sig.bubble_theme, BubbleShape.ROUND)
        self.assertIn("#", sig.primary_color)

    def test_get_character_visual_signature_villain(self):
        sig = get_character_visual_signature(SAMPLE_CHARACTER_2)
        self.assertEqual(sig.bubble_theme, BubbleShape.FLAME)

    def test_select_narrative_beat_early_story(self):
        beat = select_narrative_beat(0.05, 0.05, "")
        self.assertEqual(beat, NarrativeBeat.SETUP)

    def test_select_narrative_beat_mid_tension(self):
        beat = select_narrative_beat(0.30, 0.30, "conflict started")
        self.assertEqual(beat, NarrativeBeat.TENSION)

    def test_select_narrative_beat_climax(self):
        beat = select_narrative_beat(0.70, 0.70, "confrontation")
        self.assertEqual(beat, NarrativeBeat.CLIMAX)

    def test_select_narrative_beat_resolution(self):
        beat = select_narrative_beat(0.90, 0.90, "aftermath")
        self.assertEqual(beat, NarrativeBeat.RESOLUTION)

    def test_generate_page_script_basic(self):
        """Test basic page script generation (sync wrapper)."""
        adapter = NarrativeAdapter()
        request = PageGenerationRequest(
            project_id="test_project",
            chapter_id="chapter_001",
            story_context=SAMPLE_STORY_CONTEXT,
            previous_page_summary=None,
            narrative_checkpoint=None,
            characters=[SAMPLE_CHARACTER, SAMPLE_CHARACTER_2],
            locations=[SAMPLE_LOCATION],
            objects=[],
            style=ComicStyle.MANGA,
            panels_count=4,
        )

        result = asyncio.run(adapter.generate_page_script(request))

        self.assertTrue(result.success, f"Expected success, got error: {result.error}")
        self.assertIsNotNone(result.page)
        self.assertEqual(len(result.page.panels), 4)
        self.assertIsNotNone(result.new_checkpoint)

    def test_generate_page_script_all_styles(self):
        """Test that all comic styles produce valid pages."""
        adapter = NarrativeAdapter()
        for style in ComicStyle:
            request = PageGenerationRequest(
                project_id="test_styles",
                chapter_id="chapter_styles",
                story_context="A short scene.",
                previous_page_summary=None,
                narrative_checkpoint=None,
                characters=[SAMPLE_CHARACTER],
                locations=[SAMPLE_LOCATION],
                objects=[],
                style=style,
                panels_count=4,
            )
            result = asyncio.run(adapter.generate_page_script(request))
            self.assertTrue(result.success, f"Failed for style {style.value}: {result.error}")
            self.assertRegex(
                result.page.layout_template, 
                r"(franco|us|manga|webtoon)_",
                f"Unexpected layout for {style.value}"
            )

    def test_panels_have_required_fields(self):
        """Verify each panel has all required fields populated."""
        adapter = NarrativeAdapter()
        request = PageGenerationRequest(
            project_id="test_fields",
            chapter_id="ch_001",
            story_context="The battle begins.",
            previous_page_summary=None,
            narrative_checkpoint=None,
            characters=[SAMPLE_CHARACTER],
            locations=[SAMPLE_LOCATION],
            objects=[],
            style=ComicStyle.COMICS_US,
            panels_count=3,
        )
        result = asyncio.run(adapter.generate_page_script(request))
        self.assertTrue(result.success)

        for panel in result.page.panels:
            self.assertIsNotNone(panel.id)
            self.assertIsNotNone(panel.visual_cue)
            self.assertGreater(len(panel.visual_cue), 0)
            self.assertIsNotNone(panel.image_prompt)
            self.assertGreater(len(panel.image_prompt), 0)
            self.assertIn("comic", panel.image_prompt.lower())

    def test_narrative_continuity_checkpoint(self):
        """Test that an existing checkpoint is properly used for continuity."""
        checkpoint = NarrativeCheckpoint(
            checkpoint_id="cp_001",
            page_id="page_001",
            page_number=1,
            story_arc_position=0.4,
            active_characters=[
                CharacterState(
                    character_id="char_001",
                    character_name="Aria",
                    emotional_state="angry",
                    physical_state="injured",
                    location="The Neon Wastelands",
                    relationships={},
                    active_objects=[],
                    last_seen_page=1,
                )
            ],
            revealed_secrets=["The core was a trap"],
            active_conflicts=["Aria vs Vex"],
            last_dramatic_event="Aria was ambushed by Vex's drones",
            story_summary="Aria barely escaped the ambush",
            created_at="2025-01-01T00:00:00",
        )

        adapter = NarrativeAdapter()
        request = PageGenerationRequest(
            project_id="test_continuity",
            chapter_id="ch_002",
            story_context="Aria recovers and pushes forward.",
            previous_page_summary="Aria barely escaped the ambush",
            narrative_checkpoint=checkpoint,
            characters=[SAMPLE_CHARACTER, SAMPLE_CHARACTER_2],
            locations=[SAMPLE_LOCATION],
            objects=[],
            style=ComicStyle.MANGA,
            panels_count=4,
        )

        result = asyncio.run(adapter.generate_page_script(request))
        self.assertTrue(result.success)

        # Checkpoint should be updated
        self.assertNotEqual(result.new_checkpoint.checkpoint_id, checkpoint.checkpoint_id)
        self.assertGreater(
            result.new_checkpoint.story_arc_position,
            checkpoint.story_arc_position
        )


# ============================================================================
# Pipeline Tests
# ============================================================================

class TestComicPipeline(unittest.TestCase):

    def setUp(self):
        """Create a temp directory for each test."""
        self.tmp_dir = tempfile.mkdtemp()
        self.pipeline = ComicPipeline(
            output_dir=self.tmp_dir,
            comfyui_endpoint="http://localhost:8188",
            seed_base=42,
        )
        self.project_id = "test_project_pipeline"

    def test_init_and_load_state(self):
        """Test state initialization and persistence."""
        state = self.pipeline.init_state(self.project_id, ComicStyle.MANGA)
        self.assertEqual(state.project_id, self.project_id)
        self.assertEqual(state.total_pages, 0)
        self.assertEqual(state.style_preset, ComicStyle.MANGA)

        loaded = self.pipeline.load_state(self.project_id)
        self.assertIsNotNone(loaded)
        self.assertEqual(loaded.project_id, self.project_id)

    def test_load_state_nonexistent(self):
        """Loading state for a non-existent project returns None."""
        result = self.pipeline.load_state("nonexistent_project_xyz")
        self.assertIsNone(result)

    def test_generate_next_page_no_images(self):
        """Full pipeline run without image generation."""
        result = asyncio.run(self.pipeline.generate_next_page(
            project_id=self.project_id,
            story_context=SAMPLE_STORY_CONTEXT,
            characters=[SAMPLE_CHARACTER, SAMPLE_CHARACTER_2],
            locations=[SAMPLE_LOCATION],
            objects=[],
            style=ComicStyle.MANGA,
            generate_images=False,
            panels_count=4,
        ))

        self.assertTrue(result.success, f"Pipeline failed: {result.error}")
        self.assertIsNotNone(result.page)
        self.assertEqual(len(result.page.panels), 4)
        self.assertEqual(result.page.page_number, 1)

        # State should be updated
        state = self.pipeline.load_state(self.project_id)
        self.assertEqual(state.total_pages, 1)

    def test_multiple_page_generation(self):
        """Test generating multiple pages maintains progression."""
        for i in range(3):
            result = asyncio.run(self.pipeline.generate_next_page(
                project_id=self.project_id,
                story_context=SAMPLE_STORY_CONTEXT,
                characters=[SAMPLE_CHARACTER],
                locations=[SAMPLE_LOCATION],
                objects=[],
                generate_images=False,
            ))
            self.assertTrue(result.success)
            self.assertEqual(result.page.page_number, i + 1)

        state = self.pipeline.load_state(self.project_id)
        self.assertEqual(state.total_pages, 3)
        self.assertGreater(state.progression, 0)

    def test_placeholder_svgs_are_created(self):
        """Verify placeholder SVG files are created for each panel."""
        result = asyncio.run(self.pipeline.generate_next_page(
            project_id=self.project_id,
            story_context=SAMPLE_STORY_CONTEXT,
            characters=[SAMPLE_CHARACTER],
            locations=[SAMPLE_LOCATION],
            objects=[],
            generate_images=False,
            panels_count=4,
        ))
        self.assertTrue(result.success)

        for panel in result.page.panels:
            self.assertIsNotNone(panel.generated_image_path)
            svg_path = Path(panel.generated_image_path)
            self.assertTrue(svg_path.exists(), f"SVG not found: {svg_path}")
            content = svg_path.read_text(encoding='utf-8')
            self.assertIn("<svg", content)

    def test_page_json_is_saved(self):
        """Verify page JSON is persisted to disk after generation."""
        result = asyncio.run(self.pipeline.generate_next_page(
            project_id=self.project_id,
            story_context=SAMPLE_STORY_CONTEXT,
            characters=[SAMPLE_CHARACTER],
            locations=[SAMPLE_LOCATION],
            objects=[],
            generate_images=False,
        ))
        self.assertTrue(result.success)

        # Find the page JSON
        project_dir = Path(self.tmp_dir) / self.project_id
        state = self.pipeline.load_state(self.project_id)
        chapter_id = state.last_chapter_id
        page_dir = project_dir / chapter_id / "page_001"
        page_file = page_dir / "page.json"
        self.assertTrue(page_file.exists())

        data = json.loads(page_file.read_text())
        self.assertEqual(data["page_number"], 1)
        self.assertIn("panels", data)

    def test_load_page(self):
        """Test loading a previously generated page."""
        asyncio.run(self.pipeline.generate_next_page(
            project_id=self.project_id,
            story_context=SAMPLE_STORY_CONTEXT,
            characters=[SAMPLE_CHARACTER],
            locations=[SAMPLE_LOCATION],
            objects=[],
            generate_images=False,
        ))

        state = self.pipeline.load_state(self.project_id)
        chapter_id = state.last_chapter_id
        loaded = self.pipeline.load_page(self.project_id, chapter_id, 1)
        self.assertIsNotNone(loaded)
        self.assertEqual(loaded.page_number, 1)
        self.assertGreater(len(loaded.panels), 0)

    def test_export_to_json(self):
        """Test JSON export after generating pages."""
        asyncio.run(self.pipeline.generate_next_page(
            project_id=self.project_id,
            story_context=SAMPLE_STORY_CONTEXT,
            characters=[SAMPLE_CHARACTER],
            locations=[SAMPLE_LOCATION],
            objects=[],
            generate_images=False,
        ))

        result = asyncio.run(self.pipeline.export_to_json(self.project_id))
        self.assertTrue(result.success, f"Export failed: {result.error}")
        self.assertEqual(result.format, "json")
        self.assertGreater(result.pages_exported, 0)
        self.assertTrue(Path(result.output_path).exists())

        data = json.loads(Path(result.output_path).read_text())
        self.assertEqual(data["project_id"], self.project_id)

    def test_export_no_state_fails_gracefully(self):
        """Export fails gracefully when no state exists."""
        result = asyncio.run(self.pipeline.export_to_json("nonexistent_project_xyz"))
        self.assertFalse(result.success)
        self.assertIsNotNone(result.error)

    def test_regenerate_panel(self):
        """Test panel regeneration updates the image path."""
        gen_result = asyncio.run(self.pipeline.generate_next_page(
            project_id=self.project_id,
            story_context=SAMPLE_STORY_CONTEXT,
            characters=[SAMPLE_CHARACTER],
            locations=[SAMPLE_LOCATION],
            objects=[],
            generate_images=False,
        ))
        self.assertTrue(gen_result.success)
        page = gen_result.page
        original_path = page.panels[0].generated_image_path

        new_path = asyncio.run(self.pipeline.regenerate_panel(
            project_id=self.project_id,
            page=page,
            panel_index=0,
            generate_image=False,
        ))
        # A new path should be returned (regen suffix)
        self.assertIsNotNone(new_path)


# ============================================================================
# Panel Generator Tests
# ============================================================================

class TestPanelGenerator(unittest.TestCase):

    def test_placeholder_svg_contains_panel_info(self):
        """Verify SVG placeholder contains relevant panel information."""
        from addons.official.comic_generator.src.panel_generator import PanelGenerator
        from addons.official.comic_generator.src.types import (
            PanelScript, NarrativeBeat, DialogueLine, BubbleShape
        )

        gen = PanelGenerator()
        panel = PanelScript(
            id="test_panel_001",
            page_id="page_001",
            panel_index=2,
            characters=["char_001"],
            character_names=["Aria"],
            location="The Neon Wastelands",
            location_id="loc_001",
            dialogue=[
                DialogueLine(
                    character_id="char_001",
                    character_name="Aria",
                    text="This ends now.",
                    bubble_shape=BubbleShape.ROUND,
                    bubble_color="#FFFFFF",
                )
            ],
            visual_cue="Dramatic close-up of Aria at the Neon Wastelands",
            image_prompt="...",
            narrative_beat=NarrativeBeat.CLIMAX,
        )

        svg = gen._create_placeholder_svg(panel, ComicStyle.MANGA)
        self.assertIn("<svg", svg)
        self.assertIn("Aria", svg)
        self.assertIn("The Neon Wastelands", svg)
        self.assertIn("CLIMAX", svg)
        self.assertIn("This ends now.", svg)
        self.assertIn("P3", svg)  # Panel index + 1


# ============================================================================
# Runner
# ============================================================================

if __name__ == "__main__":
    # Run with verbosity
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    suite.addTests(loader.loadTestsFromTestCase(TestTypes))
    suite.addTests(loader.loadTestsFromTestCase(TestNarrativeAdapter))
    suite.addTests(loader.loadTestsFromTestCase(TestComicPipeline))
    suite.addTests(loader.loadTestsFromTestCase(TestPanelGenerator))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
