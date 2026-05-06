"""
Comic Generator - Narrative Adapter
Analyzes StoryCore project data and produces mini BD scripts for each page.
"""

import logging
from typing import List, Dict, Any, Optional
from uuid import uuid4
from datetime import datetime

from .types import (
    ComicStyle,
    BubbleShape,
    NarrativeBeat,
    DialogueLine,
    PanelScript,
    ComicPage,
    CharacterState,
    NarrativeCheckpoint,
    CharacterVisualSignature,
    PageGenerationRequest,
    PageGenerationResult,
)

logger = logging.getLogger(__name__)


# ============================================================================
# Visual Signature Generator
# ============================================================================

BUBBLE_THEME_DEFAULTS: Dict[str, Dict[str, Any]] = {
    "hero": {
        "bubble_theme": BubbleShape.ROUND,
        "primary_color": "#4A90E2",
        "border": "#2C5F8A",
    },
    "villain": {
        "bubble_theme": BubbleShape.FLAME,
        "primary_color": "#E24A4A",
        "border": "#8A2C2C",
    },
    "ally": {
        "bubble_theme": BubbleShape.ROUND,
        "primary_color": "#4AE27A",
        "border": "#2C8A4F",
    },
    "neutral": {
        "bubble_theme": BubbleShape.ROUND,
        "primary_color": "#E2CC4A",
        "border": "#8A7A2C",
    },
    "robot": {
        "bubble_theme": BubbleShape.RECTANGLE,
        "primary_color": "#4AE2CC",
        "border": "#2C8A7A",
    },
    "spirit": {
        "bubble_theme": BubbleShape.CLOUD,
        "primary_color": "#CC4AE2",
        "border": "#7A2C8A",
    },
    "ai": {
        "bubble_theme": BubbleShape.GLITCH,
        "primary_color": "#FF00FF",
        "border": "#990099",
    },
    "default": {
        "bubble_theme": BubbleShape.ROUND,
        "primary_color": "#FFFFFF",
        "border": "#CCCCCC",
    },
}


def get_character_visual_signature(
    character: Dict[str, Any],
) -> CharacterVisualSignature:
    """Derive a visual signature from a StoryCore character's role/archetype."""
    archetype = (
        character.get("role", {}).get("archetype", "")
        or character.get("archetype", "")
        or "default"
    ).lower()

    # Map archetype keywords to theme
    theme_key = "default"
    for key in BUBBLE_THEME_DEFAULTS:
        if key in archetype:
            theme_key = key
            break

    theme = BUBBLE_THEME_DEFAULTS[theme_key]
    return CharacterVisualSignature(
        character_id=character.get("character_id", character.get("id", "")),
        character_name=character.get("name", "Unknown"),
        primary_color=theme["primary_color"],
        bubble_theme=theme["bubble_theme"],
        text_effect=None,
        bubble_border_color=theme["border"],
        bubble_background_color=theme["primary_color"],
        voice_profile=None,
    )


# ============================================================================
# Narrative Beat Selector
# ============================================================================


def select_narrative_beat(
    story_progression: float,
    arc_position: float,
    last_event: str,
) -> NarrativeBeat:
    """
    Select the most appropriate narrative beat for the next page
    based on where we are in the story.
    """
    # Story structure: setup → tension → climax → resolution
    if story_progression < 0.15:
        return NarrativeBeat.SETUP
    elif story_progression < 0.40:
        return NarrativeBeat.TENSION
    elif story_progression < 0.60:
        return NarrativeBeat.REVELATION
    elif story_progression < 0.80:
        return NarrativeBeat.CLIMAX
    else:
        return NarrativeBeat.RESOLUTION


# ============================================================================
# Script Builder
# ============================================================================


class NarrativeAdapter:
    """
    Converts StoryCore project data into structured BD mini-scripts.

    Responsibilities:
    - Analyze story arc, characters, locations, objects
    - Decide narrative beat for next page
    - Build panel-by-panel scripts with dialogue and visual cues
    - Maintain narrative continuity across pages
    """

    STYLE_PANEL_COUNTS = {
        ComicStyle.FRANCO_BELGE: (4, 6),
        ComicStyle.COMICS_US: (3, 5),
        ComicStyle.MANGA: (4, 6),
        ComicStyle.WEBTOON: (4, 8),
    }

    STYLE_LAYOUT_HINTS = {
        ComicStyle.FRANCO_BELGE: "Regular square panels, clear dialogue, centered composition",
        ComicStyle.COMICS_US: "Dynamic panels with diagonals, dramatic close-ups, action lines",
        ComicStyle.MANGA: "Variable panel size, emotional large panels, screentone effects",
        ComicStyle.WEBTOON: "Vertical scroll format, wide panels with breathing space",
    }

    def __init__(self, llm_service=None):
        self._llm = llm_service

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def generate_page_script(
        self,
        request: PageGenerationRequest,
    ) -> PageGenerationResult:
        """Generate a full page script from project narrative data."""
        try:
            # 1. Determine narrative beat
            checkpoint = request.narrative_checkpoint
            progression = checkpoint.story_arc_position if checkpoint else 0.0
            last_event = checkpoint.last_dramatic_event if checkpoint else ""
            beat = select_narrative_beat(progression, progression, last_event)

            # 2. Select active characters for this page (max 3 for clarity)
            active_chars = self._select_active_characters(
                request.characters, checkpoint, max_count=3
            )

            # 3. Select location
            location = self._select_location(request.locations, checkpoint, beat)

            # 4. Determine panel count for this style
            min_p, max_p = self.STYLE_PANEL_COUNTS[request.style]
            panels_count = min(max(request.panels_count, min_p), max_p)

            # 5. Generate panel scripts
            panels = await self._build_panels(
                request=request,
                active_chars=active_chars,
                location=location,
                beat=beat,
                panels_count=panels_count,
                progression=progression,
            )

            # 6. Build page
            page_id = f"page_{str(uuid4())[:8]}"
            narrative_summary = self._summarize_page(panels, beat)

            page = ComicPage(
                id=page_id,
                chapter_id=request.chapter_id,
                page_number=0,  # Will be set by pipeline
                panels=panels,
                narrative_summary=narrative_summary,
                emotional_tone=beat.value,
                arc_position=str(round(progression + 0.05, 2)),
                style=request.style,
                layout_template=self._choose_layout(request.style, panels_count),
                created_at=datetime.now().isoformat(),
            )

            # 7. Update narrative checkpoint
            new_checkpoint = self._update_checkpoint(
                request=request,
                page=page,
                beat=beat,
                old_checkpoint=checkpoint,
                progression=progression,
            )

            return PageGenerationResult(
                success=True,
                page=page,
                new_checkpoint=new_checkpoint,
                image_prompts=[p.image_prompt for p in panels],
            )

        except Exception as e:
            logger.error(
                f"[NarrativeAdapter] Page generation failed: {e}", exc_info=True
            )
            return PageGenerationResult(
                success=False,
                page=None,
                new_checkpoint=request.narrative_checkpoint,
                image_prompts=[],
                error=str(e),
            )

    # ------------------------------------------------------------------
    # Character Selection
    # ------------------------------------------------------------------

    def _select_active_characters(
        self,
        characters: List[Dict[str, Any]],
        checkpoint: Optional[NarrativeCheckpoint],
        max_count: int = 3,
    ) -> List[Dict[str, Any]]:
        """Select the most narratively relevant characters for this page."""
        if not characters:
            return []

        # Prioritize characters seen recently in checkpoint
        if checkpoint and checkpoint.active_characters:
            recent_ids = {c.character_id for c in checkpoint.active_characters}
            recent = [
                c
                for c in characters
                if c.get("character_id", c.get("id")) in recent_ids
            ]
            others = [
                c
                for c in characters
                if c.get("character_id", c.get("id")) not in recent_ids
            ]
            ordered = recent + others
        else:
            ordered = characters

        return ordered[:max_count]

    # ------------------------------------------------------------------
    # Location Selection
    # ------------------------------------------------------------------

    def _select_location(
        self,
        locations: List[Dict[str, Any]],
        checkpoint: Optional[NarrativeCheckpoint],
        beat: NarrativeBeat,
    ) -> Optional[Dict[str, Any]]:
        """Select the most contextually appropriate location."""
        if not locations:
            return None

        # For CLIMAX, prefer dramatic/exterior locations
        if beat == NarrativeBeat.CLIMAX:
            exterior = [
                loc
                for loc in locations
                if "exterior" in str(loc.get("location_type", "")).lower()
                or "exterior"
                in str(loc.get("metadata", {}).get("description", "")).lower()
            ]
            if exterior:
                return exterior[0]

        return locations[0]

    # ------------------------------------------------------------------
    # Panel Builder
    # ------------------------------------------------------------------

    async def _build_panels(
        self,
        request: PageGenerationRequest,
        active_chars: List[Dict[str, Any]],
        location: Optional[Dict[str, Any]],
        beat: NarrativeBeat,
        panels_count: int,
        progression: float,
    ) -> List[PanelScript]:
        """Build individual panel scripts."""
        panels: List[PanelScript] = []

        location_name = (
            location.get("name", "Unknown Location") if location else "Unknown"
        )
        location_id = (
            location.get("location_id", location.get("id")) if location else None
        )
        location_desc = (
            location.get("metadata", {}).get("description", "") if location else ""
        )
        style_hint = self.STYLE_LAYOUT_HINTS[request.style]

        for i in range(panels_count):
            panel_role = self._panel_role(i, panels_count, beat)
            chars_in_panel = active_chars[
                : max(1, len(active_chars) - (panels_count - 1 - i))
            ]

            dialogue = self._build_dialogue(
                characters=chars_in_panel,
                panel_role=panel_role,
                beat=beat,
                story_context=request.story_context,
            )

            visual_cue = self._build_visual_cue(
                characters=chars_in_panel,
                location_name=location_name,
                location_desc=location_desc,
                panel_role=panel_role,
                beat=beat,
                style_hint=style_hint,
            )

            image_prompt = self._build_image_prompt(
                visual_cue=visual_cue,
                style=request.style,
                characters=chars_in_panel,
                location_desc=location_desc,
            )

            panel = PanelScript(
                id=f"panel_{str(uuid4())[:8]}",
                page_id="",  # Will be filled by page
                panel_index=i,
                characters=[
                    c.get("character_id", c.get("id", "")) for c in chars_in_panel
                ],
                character_names=[c.get("name", "") for c in chars_in_panel],
                location=location_name,
                location_id=location_id,
                dialogue=dialogue,
                visual_cue=visual_cue,
                image_prompt=image_prompt,
                negative_prompt="blurry, low quality, bad anatomy, watermark, signature",
                seed=42 + i,  # Stable seed per panel for consistency
                narrative_beat=NarrativeBeat(panel_role),
                panel_size=self._panel_size(i, panels_count, beat, request.style),
            )
            panels.append(panel)

        return panels

    def _panel_role(self, index: int, total: int, beat: NarrativeBeat) -> str:
        """Assign a narrative role to a panel based on its position."""
        if total <= 1:
            return beat.value
        fraction = index / (total - 1)
        if fraction < 0.2:
            return NarrativeBeat.SETUP.value
        elif fraction < 0.5:
            return NarrativeBeat.TENSION.value
        elif fraction < 0.8:
            return beat.value
        else:
            return NarrativeBeat.TRANSITION.value

    def _panel_size(
        self,
        index: int,
        total: int,
        beat: NarrativeBeat,
        style: ComicStyle,
    ) -> str:
        """Determine panel size for layout."""
        # Climax middle panels get a bigger size
        if beat == NarrativeBeat.CLIMAX and index == total // 2:
            return "wide" if style == ComicStyle.COMICS_US else "tall"
        return "normal"

    # ------------------------------------------------------------------
    # Dialogue Builder
    # ------------------------------------------------------------------

    def _build_dialogue(
        self,
        characters: List[Dict[str, Any]],
        panel_role: str,
        beat: NarrativeBeat,
        story_context: str,
    ) -> List[DialogueLine]:
        """Build placeholder dialogue lines for a panel."""
        lines: List[DialogueLine] = []

        if not characters:
            return lines

        # Simple rule-based dialogue placeholders
        # In production, this would be replaced by LLM-generated dialogue
        templates = {
            "setup": [
                "I never expected to find you here.",
                "Something feels wrong about this place.",
                "We don't have much time.",
            ],
            "tension": [
                "You don't understand what's at stake.",
                "Every choice leads us deeper.",
                "There's no turning back now.",
            ],
            "revelation": [
                "The truth has been right in front of us.",
                "I remember everything now.",
                "It was never about the mission.",
            ],
            "climax": [
                "This ends here.",
                "I won't let you go through with this!",
                "Everything changes after tonight.",
            ],
            "resolution": [
                "It's finally over.",
                "We made it through.",
                "What happens now?",
            ],
            "transition": ["..."],
        }

        role_templates = templates.get(panel_role, templates["tension"])

        for i, char in enumerate(characters[:2]):  # max 2 speakers per panel
            sig = get_character_visual_signature(char)
            text = role_templates[i % len(role_templates)]
            lines.append(
                DialogueLine(
                    character_id=char.get("character_id", char.get("id", "")),
                    character_name=char.get("name", "Character"),
                    text=text,
                    bubble_shape=sig.bubble_theme,
                    bubble_color=sig.bubble_background_color,
                )
            )

        return lines

    # ------------------------------------------------------------------
    # Image Prompt Builders
    # ------------------------------------------------------------------

    def _build_visual_cue(
        self,
        characters: List[Dict[str, Any]],
        location_name: str,
        location_desc: str,
        panel_role: str,
        beat: NarrativeBeat,
        style_hint: str,
    ) -> str:
        """Build a human-readable visual description for the panel."""
        char_names = ", ".join(c.get("name", "character") for c in characters)

        angle_map = {
            "setup": "establishing wide shot",
            "tension": "medium close-up with tension",
            "revelation": "dramatic close-up on face",
            "climax": "dynamic action angle",
            "resolution": "calm medium shot",
            "transition": "silent panel",
        }
        angle = angle_map.get(panel_role, "medium shot")

        return (
            f"{angle} of {char_names or 'the scene'} at {location_name}. "
            f"{location_desc[:80]}. Emotional tone: {beat.value}. Style: {style_hint}."
        )

    def _build_image_prompt(
        self,
        visual_cue: str,
        style: ComicStyle,
        characters: List[Dict[str, Any]],
        location_desc: str,
    ) -> str:
        """Build a full AI image generation prompt."""
        style_modifiers = {
            ComicStyle.FRANCO_BELGE: "clear ligne claire comic style, vibrant colors, sharp outlines, European BD",
            ComicStyle.COMICS_US: "American superhero comics style, dynamic inking, bold colors, cross-hatching",
            ComicStyle.MANGA: "manga style, screentone texture, black and white, expressive eyes, speed lines",
            ComicStyle.WEBTOON: "webtoon style, full color, clean digital art, Korean manhwa aesthetic",
        }
        modifier = style_modifiers.get(style, "comic style, high quality")

        char_descriptions = ". ".join(
            f"{c.get('name', 'character')}: {c.get('visual_identity', {}).get('clothing_style', 'distinctive outfit')}"
            for c in characters[:2]
        )

        return (
            f"{visual_cue} "
            f"Characters: {char_descriptions}. "
            f"{modifier}. "
            f"Professional comic book art, detailed, cinematic lighting, panel composition."
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _choose_layout(self, style: ComicStyle, panels_count: int) -> str:
        """Choose a layout template based on style and panel count."""
        if style == ComicStyle.WEBTOON:
            return f"webtoon_vertical_{panels_count}"
        elif style == ComicStyle.COMICS_US:
            return f"us_dynamic_{panels_count}"
        elif style == ComicStyle.MANGA:
            return f"manga_grid_{panels_count}"
        else:
            return f"franco_grid_{panels_count}"

    def _summarize_page(self, panels: List[PanelScript], beat: NarrativeBeat) -> str:
        """Generate a one-sentence narrative summary for the page."""
        if not panels:
            return "An empty page."
        char_names = list(
            set(name for panel in panels for name in panel.character_names)
        )
        chars_str = " and ".join(char_names[:2]) if char_names else "The characters"
        location = panels[0].location if panels else "an unknown location"
        return f"{chars_str} face a moment of {beat.value} at {location}."

    def _update_checkpoint(
        self,
        request: PageGenerationRequest,
        page: ComicPage,
        beat: NarrativeBeat,
        old_checkpoint: Optional[NarrativeCheckpoint],
        progression: float,
    ) -> NarrativeCheckpoint:
        """Update the narrative checkpoint after page generation."""
        new_progression = min(1.0, progression + 0.05)
        char_states = [
            CharacterState(
                character_id=c.get("character_id", c.get("id", "")),
                character_name=c.get("name", ""),
                emotional_state=beat.value,
                physical_state="healthy",
                location=page.panels[0].location if page.panels else None,
                relationships={},
                active_objects=[],
                last_seen_page=page.page_number,
            )
            for c in request.characters[:5]
        ]

        active_conflicts = old_checkpoint.active_conflicts if old_checkpoint else []
        revealed_secrets = old_checkpoint.revealed_secrets if old_checkpoint else []

        if beat == NarrativeBeat.REVELATION:
            revealed_secrets = revealed_secrets + [page.narrative_summary]

        return NarrativeCheckpoint(
            checkpoint_id=str(uuid4()),
            page_id=page.id,
            page_number=page.page_number,
            story_arc_position=new_progression,
            active_characters=char_states,
            revealed_secrets=revealed_secrets,
            active_conflicts=active_conflicts,
            last_dramatic_event=page.narrative_summary,
            story_summary=page.narrative_summary,
            created_at=datetime.now().isoformat(),
        )
