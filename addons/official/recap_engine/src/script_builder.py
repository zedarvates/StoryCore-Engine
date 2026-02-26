"""
Recap Engine - Script Builder
Transforme les données d'une BD StoryCore en script narratif continu
optimisé pour la voix off d'un recap vidéo.

Pipeline :
  BD Pages → Extraire dialogues + narration → Script continu → RecapScenes
"""

import json
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any
from uuid import uuid4

from .types import (
    RecapScene, RecapTimeline, RecapCharacterStyle, RecapGenerationRequest,
    RecapGenerationResult, CameraMove, TransitionType, RecapStyle, RecapRenderResult,
)

logger = logging.getLogger(__name__)


# ============================================================================
# Emotional → Camera Move Mapping
# ============================================================================

EMOTION_CAMERA_MAP: Dict[str, CameraMove] = {
    "tension":    CameraMove.SLOW_PUSH,
    "climax":     CameraMove.SHAKE,
    "revelation": CameraMove.ZOOM_IN,
    "resolution": CameraMove.ZOOM_OUT,
    "setup":      CameraMove.PAN_LEFT,
    "transition": CameraMove.PAN_RIGHT,
    "calm":       CameraMove.STATIC,
    "action":     CameraMove.SHAKE,
    "mystery":    CameraMove.SLOW_PUSH,
    "romance":    CameraMove.ZOOM_IN,
}

EMOTION_DURATION_MAP: Dict[str, float] = {
    "tension":    6.0,
    "climax":     8.0,
    "revelation": 7.0,
    "resolution": 5.0,
    "setup":      4.5,
    "transition": 3.5,
    "calm":       4.0,
    "action":     5.5,
    "mystery":    6.5,
    "romance":    5.5,
}

NARRATIVE_BEAT_TRANSITIONS: Dict[str, tuple] = {
    "setup":      (TransitionType.FADE_BLACK, TransitionType.DISSOLVE),
    "tension":    (TransitionType.CUT, TransitionType.CUT),
    "revelation": (TransitionType.FADE_WHITE, TransitionType.DISSOLVE),
    "climax":     (TransitionType.CUT, TransitionType.CUT),
    "resolution": (TransitionType.DISSOLVE, TransitionType.FADE_BLACK),
    "transition": (TransitionType.DISSOLVE, TransitionType.DISSOLVE),
}


# ============================================================================
# Character Color Palette (style manga recap YouTube)
# ============================================================================

CHARACTER_COLOR_PALETTE = [
    {"frame": "#00aaff", "glow": "#0066ee", "bubble": "round_soft"},    # Protagoniste — bleu
    {"frame": "#ff4444", "glow": "#cc2200", "bubble": "spiky"},          # Antagoniste — rouge
    {"frame": "#44cc88", "glow": "#229955", "bubble": "square_clean"},   # Allié 1 — vert
    {"frame": "#ffaa00", "glow": "#cc7700", "bubble": "round_soft"},     # Allié 2 — or
    {"frame": "#cc44ff", "glow": "#8800cc", "bubble": "cloud"},          # Mystérieux — violet
    {"frame": "#ff8844", "glow": "#cc5500", "bubble": "square_clean"},   # Neutre — orange
    {"frame": "#44ccff", "glow": "#0099cc", "bubble": "round_soft"},     # Allié 3 — cyan
]

NARRATOR_STYLE = {
    "frame": "#1a1a2e",
    "glow": "#16213e",
    "bubble": "square_clean",
}

VOICE_PRESETS = {
    "narrator_fr": "fr-FR-DeniseNeural",
    "narrator_en": "en-US-JennyNeural",
    "hero_fr":     "fr-FR-HenriNeural",
    "villain_fr":  "fr-FR-AlainNeural",
    "child_fr":    "fr-FR-EloiseNeural",
}


# ============================================================================
# Script Builder
# ============================================================================

class RecapScriptBuilder:
    """
    Construit le script narratif d'un recap à partir des données BD.
    
    Il transforme chaque panel + dialogue en une scène de narration continue,
    comme le ferait un voiceover humain dans un recap YouTube.
    """

    def __init__(self, language: str = "fr"):
        self.language = language

    def build_from_comic_json(
        self,
        comic_data: Dict[str, Any],
        story_context: str,
        characters: List[Dict[str, Any]],
        style: RecapStyle,
    ) -> RecapGenerationResult:
        """
        Génère un RecapTimeline complet depuis les données JSON d'une BD.
        
        Args:
            comic_data: Données JSON exportées par le Comic Generator
            story_context: Contexte narratif global du projet
            characters: Données personnages StoryCore
            style: Style visuel du recap
        """
        try:
            # 1. Construire les styles par personnage
            char_styles = self._build_character_styles(characters)

            # 2. Extraire tous les panels de toutes les pages
            all_scenes: List[RecapScene] = []
            total_pages = 0

            for chapter in comic_data.get("chapters", []):
                for page_summary in chapter.get("pages", []):
                    page_number = page_summary.get("page_number", total_pages + 1)
                    panels = page_summary.get("panels", [])
                    arc_position = page_summary.get("arc_position", "setup")
                    narrative_summary = page_summary.get("narrative_summary", "")

                    for panel_idx, panel in enumerate(panels):
                        scene = self._build_scene_from_panel(
                            panel=panel,
                            panel_idx=panel_idx,
                            page_number=page_number,
                            narrative_summary=narrative_summary,
                            arc_position=arc_position,
                            char_styles=char_styles,
                            story_context=story_context,
                        )
                        all_scenes.append(scene)

                    total_pages += 1

            if not all_scenes:
                return RecapGenerationResult(
                    success=False,
                    timeline=None,
                    scenes_count=0,
                    estimated_duration=0.0,
                    error="Aucun panel trouvé dans les données BD",
                )

            # 3. Calculer la durée totale estimée
            total_duration = sum(s.duration + s.transition_duration for s in all_scenes)

            # 4. Construire la timeline
            project_id = comic_data.get("project_id", "unknown")
            timeline = RecapTimeline(
                timeline_id=str(uuid4()),
                project_id=project_id,
                title=f"Recap — {story_context[:60]}…" if len(story_context) > 60 else f"Recap — {story_context}",
                subtitle=f"{total_pages} planches · {len(all_scenes)} scènes",
                style=style,
                scenes=all_scenes,
                character_styles=char_styles,
                target_duration=total_duration,
                actual_duration=total_duration,
                resolution="1920x1080",
                fps=30,
            )

            logger.info(
                f"[RecapScriptBuilder] Timeline générée : {len(all_scenes)} scènes, "
                f"durée estimée {total_duration:.1f}s (~{total_duration/60:.1f} min)"
            )

            return RecapGenerationResult(
                success=True,
                timeline=timeline,
                scenes_count=len(all_scenes),
                estimated_duration=total_duration,
            )

        except Exception as e:
            logger.error(f"[RecapScriptBuilder] Erreur : {e}", exc_info=True)
            return RecapGenerationResult(
                success=False,
                timeline=None,
                scenes_count=0,
                estimated_duration=0.0,
                error=str(e),
            )

    def build_from_pages_directory(
        self,
        pages_dir: Path,
        story_context: str,
        characters: List[Dict[str, Any]],
        style: RecapStyle,
        project_id: str,
    ) -> RecapGenerationResult:
        """
        Génère un recap en lisant directement les dossiers page_XXX
        du Comic Generator.
        """
        try:
            char_styles = self._build_character_styles(characters)
            all_scenes: List[RecapScene] = []

            # Scanner tous les dossiers de pages
            page_dirs = sorted(pages_dir.glob("page_*"))

            for page_dir in page_dirs:
                page_json = page_dir / "page.json"
                if not page_json.exists():
                    continue

                page_data = json.loads(page_json.read_text(encoding="utf-8"))
                page_number = page_data.get("page_number", 0)
                arc_position = page_data.get("arc_position", "setup")
                narrative_summary = page_data.get("narrative_summary", "")

                for panel_idx, panel in enumerate(page_data.get("panels", [])):
                    scene = self._build_scene_from_panel(
                        panel=panel,
                        panel_idx=panel_idx,
                        page_number=page_number,
                        narrative_summary=narrative_summary,
                        arc_position=arc_position,
                        char_styles=char_styles,
                        story_context=story_context,
                    )
                    all_scenes.append(scene)

            total_duration = sum(s.duration + s.transition_duration for s in all_scenes)

            timeline = RecapTimeline(
                timeline_id=str(uuid4()),
                project_id=project_id,
                title=f"Recap BD",
                subtitle=f"{len(page_dirs)} planches · {len(all_scenes)} scènes",
                style=style,
                scenes=all_scenes,
                character_styles=char_styles,
                target_duration=total_duration,
                actual_duration=total_duration,
            )

            return RecapGenerationResult(
                success=True,
                timeline=timeline,
                scenes_count=len(all_scenes),
                estimated_duration=total_duration,
            )

        except Exception as e:
            logger.error(f"[RecapScriptBuilder] Erreur scan pages : {e}", exc_info=True)
            return RecapGenerationResult(
                success=False, timeline=None, scenes_count=0,
                estimated_duration=0.0, error=str(e),
            )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _build_character_styles(
        self, characters: List[Dict[str, Any]]
    ) -> Dict[str, RecapCharacterStyle]:
        """Assigne une palette visuelle unique à chaque personnage."""
        styles: Dict[str, RecapCharacterStyle] = {}
        palette = CHARACTER_COLOR_PALETTE

        for i, char in enumerate(characters):
            char_id = char.get("id", f"char_{i}")
            char_name = char.get("name", f"Personnage {i+1}")
            color = palette[i % len(palette)]

            styles[char_id] = RecapCharacterStyle(
                character_id=char_id,
                character_name=char_name,
                frame_color=color["frame"],
                frame_glow=color["glow"],
                bubble_style=color["bubble"],
                highlight_effect="soft_glow" if i == 0 else "pulse",
                voice_id=self._pick_voice(char, i),
                voice_pitch=1.0 + (i * 0.05),  # Légère variation par personnage
                voice_speed=1.0,
                narrator_role=self._pick_role(char, i),
            )

        return styles

    def _pick_voice(self, char: Dict[str, Any], index: int) -> str:
        """Sélectionne une voix TTS appropriée."""
        if self.language == "fr":
            voices = ["fr-FR-HenriNeural", "fr-FR-AlainNeural", "fr-FR-EloiseNeural",
                      "fr-FR-DeniseNeural", "fr-FR-YvetteNeural"]
        else:
            voices = ["en-US-GuyNeural", "en-US-TonyNeural", "en-US-JennyNeural",
                      "en-US-AriaNeural", "en-US-DavisNeural"]
        return voices[index % len(voices)]

    def _pick_role(self, char: Dict[str, Any], index: int) -> str:
        """Détermine le rôle narratif d'un personnage."""
        archetype = str(char.get("archetype", "")).lower()
        if "villain" in archetype or "antagonist" in archetype:
            return "villain"
        if index == 0:
            return "hero"
        return "character"

    def _build_scene_from_panel(
        self,
        panel: Dict[str, Any],
        panel_idx: int,
        page_number: int,
        narrative_summary: str,
        arc_position: str,
        char_styles: Dict[str, RecapCharacterStyle],
        story_context: str,
    ) -> RecapScene:
        """Construit une RecapScene depuis les données d'un panel BD."""
        # Extraire les dialogues
        dialogue_lines = panel.get("dialogue", [])
        visual_cue = panel.get("visual_cue", "")
        narrative_beat = panel.get("narrative_beat", "setup")
        characters_in_panel = panel.get("characters", [])

        # Construire le texte de narration
        narration = self._build_narration_text(
            dialogue_lines=dialogue_lines,
            visual_cue=visual_cue,
            narrative_summary=narrative_summary if panel_idx == 0 else "",
            arc_position=arc_position,
        )

        # Choisir le mouvement caméra selon l'émotion
        emotion = arc_position.lower() if arc_position else narrative_beat.lower()
        camera_move = EMOTION_CAMERA_MAP.get(emotion, CameraMove.SLOW_PUSH)
        duration = EMOTION_DURATION_MAP.get(emotion, 5.0)

        # Ajuster la durée selon la longueur du texte
        words = len(narration.split())
        reading_time = words / 2.5  # ~2.5 mots/seconde pour TTS
        duration = max(3.0, min(12.0, max(duration, reading_time)))

        # Transitions
        trans_in, trans_out = NARRATIVE_BEAT_TRANSITIONS.get(
            narrative_beat, (TransitionType.DISSOLVE, TransitionType.DISSOLVE)
        )

        # Personnage narrateur (premier qui parle)
        narrator_id = "narrator"
        if dialogue_lines:
            narrator_id = dialogue_lines[0].get("character_id", "narrator")

        return RecapScene(
            scene_id=str(uuid4()),
            panel_id=panel.get("id", f"panel_{page_number}_{panel_idx}"),
            source_page_number=page_number,
            source_panel_index=panel_idx,
            narration_text=narration,
            narrator_character_id=narrator_id,
            subtitle_text=narration[:120] + "…" if len(narration) > 120 else narration,
            image_path=panel.get("generated_image_path", ""),
            duration=duration,
            camera_move=camera_move,
            camera_intensity=0.15 if camera_move == CameraMove.SHAKE else 0.08,
            transition_in=trans_in,
            transition_out=trans_out,
            transition_duration=0.5,
            highlight_bubbles=bool(dialogue_lines),
            highlight_characters=characters_in_panel[:2],
            sfx_tags=self._pick_sfx_tags(narrative_beat),
        )

    def _build_narration_text(
        self,
        dialogue_lines: List[Dict[str, Any]],
        visual_cue: str,
        narrative_summary: str,
        arc_position: str,
    ) -> str:
        """
        Construit le texte de narration pour cette scène.
        Combine description visuelle + dialogues en prose continue.
        """
        parts = []

        # Intro de page (résumé narratif)
        if narrative_summary:
            parts.append(narrative_summary.strip())

        # Description visuelle si aucun dialogue
        if not dialogue_lines and visual_cue:
            parts.append(visual_cue.strip())

        # Dialogues transformés en narration
        for line in dialogue_lines:
            char = line.get("character_name", line.get("character", "Un personnage"))
            text = line.get("text", "").strip()
            if text:
                if self.language == "fr":
                    parts.append(f'{char} déclare : « {text} »')
                else:
                    parts.append(f'{char} says: "{text}"')

        return " ".join(parts) if parts else visual_cue

    def _pick_sfx_tags(self, narrative_beat: str) -> List[str]:
        """Associe des effets sonores au type de scène."""
        sfx_map = {
            "climax":     ["dramatic_hit", "whoosh"],
            "tension":    ["tension_rise"],
            "revelation": ["dramatic_reveal"],
            "action":     ["whoosh", "impact"],
            "setup":      [],
            "resolution": ["soft_whoosh"],
        }
        return sfx_map.get(narrative_beat, [])
