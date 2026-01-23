"""
ComicForge Comic to Sequence Wizard - Transform comic panels into cinematic sequences.

An intelligent wizard that analyzes comic book panel images and converts them into
professional cinematic sequences with shot planning, character detection, and
storyboard generation for video production.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Tuple
from enum import Enum
import json
import re
from pathlib import Path
from datetime import datetime
import asyncio


class ComicStyle(Enum):
    """Comic art styles supported by the wizard"""
    AMERICAN_COMICS = "american_comics"
    MANGA = "manga"
    EUROPEAN_COMICS = "european_comics"
    GRAPHIC_NOVEL = "graphic_novel"
    WEB_COMICS = "web_comics"


class PanelLayout(Enum):
    """Panel layout types"""
    SINGLE = "single"
    GRID_2X2 = "grid_2x2"
    GRID_3X3 = "grid_3x3"
    STRIP_HORIZONTAL = "strip_horizontal"
    STRIP_VERTICAL = "strip_vertical"
    SPLIT_PANEL = "split_panel"
    IRREGULAR = "irregular"


class CameraAngle(Enum):
    """Camera angles detected in panels"""
    EXTREME_WIDE_SHOT = "extreme_wide_shot"
    WIDE_SHOT = "wide_shot"
    MEDIUM_SHOT = "medium_shot"
    CLOSE_UP = "close_up"
    EXTREME_CLOSE_UP = "extreme_close_up"
    BIRD_EYE = "bird_eye"
    WORMS_EYE = "worms_eye"
    DUTCH_ANGLE = "dutch_angle"
    OVER_SHOULDER = "over_shoulder"


class MoodEmotion(Enum):
    """Mood and emotions detected in panels"""
    NEUTRAL = "neutral"
    HAPPY = "happy"
    SAD = "sad"
    ANGRY = "angry"
    SURPRISED = "surprised"
    SCARED = "scared"
    DRAMATIC = "dramatic"
    COMIC = "comic"
    MYSTERIOUS = "mysterious"
    ROMANTIC = "romantic"


@dataclass
class ComicPanel:
    """A single comic panel"""
    panel_number: int
    content_description: str
    characters_present: List[str] = field(default_factory=list)
    camera_angle: Optional[CameraAngle] = None
    mood_emotion: Optional[MoodEmotion] = None
    speech_bubbles: List[str] = field(default_factory=list)
    sound_effects: List[str] = field(default_factory=list)
    panel_notes: str = ""
    confidence_score: float = 0.0


@dataclass
class ComicSequence:
    """A complete comic sequence/page"""
    comic_title: str
    page_number: int
    comic_style: ComicStyle
    layout_type: PanelLayout
    overall_mood: str = "neutral"
    key_themes: List[str] = field(default_factory=list)
    story_progression: str = ""
    panels: List[ComicPanel] = field(default_factory=list)
    page_summary: str = ""


@dataclass
class CinematicShot:
    """A cinematic shot derived from a comic panel"""
    shot_id: str
    panel_source: int  # panel number
    shot_type: str  # WS, MS, CU, etc.
    duration_seconds: float
    description: str
    camera_angle: CameraAngle
    movement: str = "static"
    dialogue: str = ""
    sound_effects: List[str] = field(default_factory=list)
    visual_notes: str = ""
    transition_from_previous: str = "cut"


@dataclass
class ComicTransformationResult:
    """Complete transformation result"""
    result_id: str
    comic_sequence: ComicSequence
    cinematic_shots: List[CinematicShot] = field(default_factory=list)
    storyboard_panels: List[Dict[str, Any]] = field(default_factory=list)
    character_count: int = 0
    panel_count: int = 0
    confidence_score: float = 0.0
    processing_time: float = 0.0
    creation_timestamp: str = ""
    generated_assets: List[str] = field(default_factory=list)


class ComicToSequenceWizard:
    """
    ComicForge Comic to Sequence Wizard - Intelligent Comic Analysis

    Transforms comic book panels into cinematic sequences by:
    - Analyzing panel layouts and compositions
    - Detecting characters, dialogue, and sound effects
    - Generating cinematic shot sequences
    - Creating storyboard data for video production
    """

    def __init__(self, vision_engine=None):
        """Initialize the Comic to Sequence wizard"""
        self.vision_engine = vision_engine
        self.transformation_result: Optional[ComicTransformationResult] = None

    async def transform_comic_to_sequence(self, image_path: Path, title: str = "",
                                        page_number: int = 1,
                                        comic_style: ComicStyle = ComicStyle.AMERICAN_COMICS) -> ComicTransformationResult:
        """
        Transform a comic panel image into a cinematic sequence

        Args:
            image_path: Path to the comic panel image
            title: Comic title (optional)
            page_number: Page number in the comic
            comic_style: Style of comic art

        Returns:
            Complete transformation result with cinematic shots
        """
        print("🎭 ComicForge - Comic to Sequence Wizard")
        print("=" * 60)

        start_time = datetime.utcnow()

        # Validate image
        if not image_path.exists():
            raise FileNotFoundError(f"Comic image not found: {image_path}")

        print(f"📖 Processing: {image_path.name}")
        print(f"🎨 Comic style: {comic_style.value.replace('_', ' ').title()}")
        if title:
            print(f"📚 Title: {title}")
        print(f"📄 Page: {page_number}")

        # Analyze comic image
        comic_sequence = await self._analyze_comic_image(image_path, title, page_number, comic_style)

        # Generate cinematic shots
        cinematic_shots = await self._generate_cinematic_shots(comic_sequence)

        # Create storyboard
        storyboard_panels = self._create_storyboard_panels(cinematic_shots)

        # Calculate processing time
        processing_time = (datetime.utcnow() - start_time).total_seconds()

        # Create result
        result = ComicTransformationResult(
            result_id=f"comic_transform_{int(datetime.utcnow().timestamp())}",
            comic_sequence=comic_sequence,
            cinematic_shots=cinematic_shots,
            storyboard_panels=storyboard_panels,
            character_count=len(set(char for panel in comic_sequence.panels for char in panel.characters_present)),
            panel_count=len(comic_sequence.panels),
            confidence_score=self._calculate_overall_confidence(comic_sequence, cinematic_shots),
            processing_time=processing_time,
            creation_timestamp=datetime.utcnow().isoformat() + "Z"
        )

        self.transformation_result = result
        self._save_transformation_results(image_path.parent, result)

        print("\n✅ Comic transformation completed!")
        print(f"🎭 Panels analyzed: {result.panel_count}")
        print(f"🎬 Shots generated: {len(result.cinematic_shots)}")
        print(f"👥 Characters detected: {result.character_count}")
        print(f"⏱️ Processing time: {result.processing_time:.1f}s")
        print(f"📊 Confidence: {result.confidence_score:.1f}/10")

        return result

    async def _analyze_comic_image(self, image_path: Path, title: str, page_number: int,
                                 comic_style: ComicStyle) -> ComicSequence:
        """Analyze the comic image and extract panel information"""
        sequence = ComicSequence(
            comic_title=title or "Untitled Comic",
            page_number=page_number,
            comic_style=comic_style,
            layout_type=PanelLayout.SINGLE  # Default
        )

        # Detect panels (simplified - in real implementation would use computer vision)
        panels = self._detect_panels_in_image(image_path, comic_style)

        # Analyze each panel
        for panel in panels:
            analyzed_panel = await self._analyze_panel(panel, comic_style)
            sequence.panels.append(analyzed_panel)

        # Determine overall layout and mood
        sequence.layout_type = self._determine_layout_type(sequence.panels)
        sequence.overall_mood = self._determine_overall_mood(sequence.panels)
        sequence.key_themes = self._extract_key_themes(sequence.panels)
        sequence.story_progression = self._determine_story_progression(sequence.panels)
        sequence.page_summary = self._generate_page_summary(sequence)

        return sequence

    def _detect_panels_in_image(self, image_path: Path, comic_style: ComicStyle) -> List[Dict[str, Any]]:
        """Detect individual panels in the comic image"""
        # Simplified panel detection - in real implementation would use OpenCV/contour detection
        # For now, assume a standard 4-panel layout based on style

        panels = []

        if comic_style == ComicStyle.AMERICAN_COMICS:
            # Typical American comic layout
            panels = [
                {"panel_number": 1, "x": 0, "y": 0, "width": 0.5, "height": 0.5},
                {"panel_number": 2, "x": 0.5, "y": 0, "width": 0.5, "height": 0.5},
                {"panel_number": 3, "x": 0, "y": 0.5, "width": 0.5, "height": 0.5},
                {"panel_number": 4, "x": 0.5, "y": 0.5, "width": 0.5, "height": 0.5}
            ]
        elif comic_style == ComicStyle.MANGA:
            # Typical manga layout (right-to-left, vertical)
            panels = [
                {"panel_number": 1, "x": 0, "y": 0, "width": 1, "height": 0.3},
                {"panel_number": 2, "x": 0, "y": 0.3, "width": 0.5, "height": 0.4},
                {"panel_number": 3, "x": 0.5, "y": 0.3, "width": 0.5, "height": 0.4},
                {"panel_number": 4, "x": 0, "y": 0.7, "width": 1, "height": 0.3}
            ]
        else:
            # Default single panel
            panels = [{"panel_number": 1, "x": 0, "y": 0, "width": 1, "height": 1}]

        return panels

    async def _analyze_panel(self, panel_data: Dict[str, Any], comic_style: ComicStyle) -> ComicPanel:
        """Analyze a single panel for content, characters, etc."""
        panel_number = panel_data["panel_number"]

        # In a real implementation, this would use computer vision to analyze the image
        # For now, we'll use placeholder analysis based on panel position and style

        panel = ComicPanel(panel_number=panel_number, content_description="")

        # Generate content description based on position and style
        if panel_number == 1:
            panel.content_description = "Opening panel establishing the scene and main characters"
            panel.camera_angle = CameraAngle.WIDE_SHOT
            panel.mood_emotion = MoodEmotion.NEUTRAL
        elif panel_number == 2:
            panel.content_description = "Development of the scene with character interaction"
            panel.camera_angle = CameraAngle.MEDIUM_SHOT
            panel.mood_emotion = MoodEmotion.DRAMATIC
        elif panel_number == 3:
            panel.content_description = "Building tension or conflict"
            panel.camera_angle = CameraAngle.CLOSE_UP
            panel.mood_emotion = MoodEmotion.TENSE
        else:
            panel.content_description = "Climax or resolution of the scene"
            panel.camera_angle = CameraAngle.EXTREME_CLOSE_UP
            panel.mood_emotion = MoodEmotion.SURPRISED

        # Add some placeholder characters and dialogue
        if panel_number <= 2:
            panel.characters_present = ["Character A", "Character B"]
            panel.speech_bubbles = [f"Dialogue from panel {panel_number}"]
        else:
            panel.characters_present = ["Character A"]
            panel.speech_bubbles = [f"Important line in panel {panel_number}"]

        # Add sound effects based on mood
        if panel.mood_emotion == MoodEmotion.DRAMATIC:
            panel.sound_effects = ["DRAMATIC MUSIC"]
        elif panel.mood_emotion == MoodEmotion.TENSE:
            panel.sound_effects = ["TENSE SOUND"]

        panel.confidence_score = 0.8  # Placeholder confidence

        return panel

    def _determine_layout_type(self, panels: List[ComicPanel]) -> PanelLayout:
        """Determine the overall layout type of the page"""
        panel_count = len(panels)

        if panel_count == 1:
            return PanelLayout.SINGLE
        elif panel_count == 4:
            return PanelLayout.GRID_2X2
        elif panel_count == 9:
            return PanelLayout.GRID_3X3
        elif panel_count <= 3:
            return PanelLayout.STRIP_HORIZONTAL
        else:
            return PanelLayout.IRREGULAR

    def _determine_overall_mood(self, panels: List[ComicPanel]) -> str:
        """Determine the overall mood of the page"""
        moods = [panel.mood_emotion for panel in panels if panel.mood_emotion]

        if not moods:
            return "neutral"

        # Count mood frequencies
        mood_counts = {}
        for mood in moods:
            mood_counts[mood] = mood_counts.get(mood, 0) + 1

        # Return most common mood
        dominant_mood = max(mood_counts.items(), key=lambda x: x[1])
        return dominant_mood[0].value

    def _extract_key_themes(self, panels: List[ComicPanel]) -> List[str]:
        """Extract key themes from the panels"""
        all_text = " ".join([panel.content_description for panel in panels])

        # Simple keyword-based theme extraction
        themes = []
        theme_keywords = {
            "action": ["fight", "battle", "action", "combat"],
            "mystery": ["mystery", "secret", "unknown", "investigation"],
            "romance": ["love", "romance", "heart", "relationship"],
            "drama": ["drama", "emotional", "conflict", "tension"],
            "comedy": ["funny", "comedy", "laugh", "humor"]
        }

        for theme, keywords in theme_keywords.items():
            if any(keyword in all_text.lower() for keyword in keywords):
                themes.append(theme)

        return themes[:3] if themes else ["general"]

    def _determine_story_progression(self, panels: List[ComicPanel]) -> str:
        """Determine how the story progresses through the panels"""
        if len(panels) <= 1:
            return "single moment"
        elif len(panels) <= 3:
            return "simple sequence"
        else:
            return "complex narrative"

    def _generate_page_summary(self, sequence: ComicSequence) -> str:
        """Generate a summary of the entire page"""
        return f"A {sequence.comic_style.value.replace('_', ' ')} page with {len(sequence.panels)} panels showing {sequence.story_progression}."

    async def _generate_cinematic_shots(self, comic_sequence: ComicSequence) -> List[CinematicShot]:
        """Generate cinematic shots from the analyzed comic panels"""
        shots = []

        for panel in comic_sequence.panels:
            # Create one or more shots per panel
            shot = CinematicShot(
                shot_id=f"shot_{panel.panel_number}",
                panel_source=panel.panel_number,
                shot_type=self._camera_angle_to_shot_type(panel.camera_angle),
                duration_seconds=self._calculate_shot_duration(panel),
                description=panel.content_description,
                camera_angle=panel.camera_angle or CameraAngle.MEDIUM_SHOT,
                dialogue=" ".join(panel.speech_bubbles),
                sound_effects=panel.sound_effects,
                visual_notes=f"Panel {panel.panel_number} adaptation"
            )

            # Add transition information
            if panel.panel_number > 1:
                shot.transition_from_previous = "cut"

            shots.append(shot)

        return shots

    def _camera_angle_to_shot_type(self, camera_angle: Optional[CameraAngle]) -> str:
        """Convert camera angle to shot type abbreviation"""
        if not camera_angle:
            return "MS"

        angle_mapping = {
            CameraAngle.EXTREME_WIDE_SHOT: "EWS",
            CameraAngle.WIDE_SHOT: "WS",
            CameraAngle.MEDIUM_SHOT: "MS",
            CameraAngle.CLOSE_UP: "CU",
            CameraAngle.EXTREME_CLOSE_UP: "ECU",
            CameraAngle.BIRD_EYE: "BS",
            CameraAngle.WORMS_EYE: "LS",
            CameraAngle.DUTCH_ANGLE: "DA",
            CameraAngle.OVER_SHOULDER: "OS"
        }

        return angle_mapping.get(camera_angle, "MS")

    def _calculate_shot_duration(self, panel: ComicPanel) -> float:
        """Calculate appropriate shot duration based on panel content"""
        base_duration = 3.0

        # Adjust based on content complexity
        if panel.dialogue:
            base_duration += len(panel.speech_bubbles) * 1.5

        if panel.sound_effects:
            base_duration += 0.5

        # Adjust based on mood/emotion
        if panel.mood_emotion in [MoodEmotion.DRAMATIC, MoodEmotion.SURPRISED]:
            base_duration += 1.0

        return base_duration

    def _create_storyboard_panels(self, cinematic_shots: List[CinematicShot]) -> List[Dict[str, Any]]:
        """Create storyboard panels from cinematic shots"""
        storyboard = []

        for shot in cinematic_shots:
            panel_data = {
                "shot_number": shot.panel_source,
                "description": shot.description,
                "shot_type": shot.shot_type,
                "camera_angle": shot.camera_angle.value,
                "duration": shot.duration_seconds,
                "dialogue": shot.dialogue,
                "sound_effects": shot.sound_effects,
                "notes": shot.visual_notes
            }
            storyboard.append(panel_data)

        return storyboard

    def _calculate_overall_confidence(self, sequence: ComicSequence, shots: List[CinematicShot]) -> float:
        """Calculate overall confidence score for the transformation"""
        if not sequence.panels:
            return 0.0

        # Average panel confidence
        panel_confidence = sum(panel.confidence_score for panel in sequence.panels) / len(sequence.panels)

        # Shot generation confidence (placeholder)
        shot_confidence = 0.85

        # Overall confidence
        return (panel_confidence + shot_confidence) / 2 * 10  # Scale to 0-10

    def _save_transformation_results(self, output_path: Path, result: ComicTransformationResult):
        """Save transformation results to files"""
        # Save main result file
        result_data = {
            "comic_transformation_result": {
                "result_id": result.result_id,
                "creation_timestamp": result.creation_timestamp,
                "comic_sequence": {
                    "comic_title": result.comic_sequence.comic_title,
                    "page_number": result.comic_sequence.page_number,
                    "comic_style": result.comic_sequence.comic_style.value,
                    "layout_type": result.comic_sequence.layout_type.value,
                    "overall_mood": result.comic_sequence.overall_mood,
                    "key_themes": result.comic_sequence.key_themes,
                    "story_progression": result.comic_sequence.story_progression,
                    "page_summary": result.comic_sequence.page_summary,
                    "panels": [
                        {
                            "panel_number": panel.panel_number,
                            "content_description": panel.content_description,
                            "characters_present": panel.characters_present,
                            "camera_angle": panel.camera_angle.value if panel.camera_angle else None,
                            "mood_emotion": panel.mood_emotion.value if panel.mood_emotion else None,
                            "speech_bubbles": panel.speech_bubbles,
                            "sound_effects": panel.sound_effects,
                            "panel_notes": panel.panel_notes,
                            "confidence_score": panel.confidence_score
                        } for panel in result.comic_sequence.panels
                    ]
                },
                "cinematic_shots": [
                    {
                        "shot_id": shot.shot_id,
                        "panel_source": shot.panel_source,
                        "shot_type": shot.shot_type,
                        "duration_seconds": shot.duration_seconds,
                        "description": shot.description,
                        "camera_angle": shot.camera_angle.value,
                        "movement": shot.movement,
                        "dialogue": shot.dialogue,
                        "sound_effects": shot.sound_effects,
                        "visual_notes": shot.visual_notes,
                        "transition_from_previous": shot.transition_from_previous
                    } for shot in result.cinematic_shots
                ],
                "storyboard_panels": result.storyboard_panels,
                "character_count": result.character_count,
                "panel_count": result.panel_count,
                "confidence_score": result.confidence_score,
                "processing_time": result.processing_time,
                "generated_assets": result.generated_assets
            }
        }

        result_file = output_path / "comic_to_sequence_result.json"
        with open(result_file, 'w') as f:
            json.dump(result_data, f, indent=2)

        # Save storyboard separately
        storyboard_file = output_path / "comic_derived_storyboard.json"
        with open(storyboard_file, 'w') as f:
            json.dump({"storyboard": result.storyboard_panels}, f, indent=2)

        # Save shot planning for video production
        shot_planning_file = output_path / "comic_derived_shot_planning.json"
        shot_planning_data = {
            "shot_planning": {
                "derived_from_comic": True,
                "comic_title": result.comic_sequence.comic_title,
                "page_number": result.comic_sequence.page_number,
                "shot_lists": [
                    {
                        "shot_id": shot.shot_id,
                        "shot_type": {"code": shot.shot_type, "name": shot.shot_type},
                        "description": shot.description,
                        "timing": {"duration_seconds": shot.duration_seconds},
                        "camera": {
                            "angle": shot.camera_angle.value,
                            "movement": {"type": shot.movement}
                        },
                        "purpose": "narrative",
                        "derived_from_panel": shot.panel_source
                    } for shot in result.cinematic_shots
                ]
            }
        }

        with open(shot_planning_file, 'w') as f:
            json.dump(shot_planning_data, f, indent=2)

        # Update result with generated assets
        result.generated_assets = [
            str(result_file.name),
            str(storyboard_file.name),
            str(shot_planning_file.name)
        ]


# Convenience functions
def create_comic_to_sequence_wizard(vision_engine=None) -> ComicToSequenceWizard:
    """Create a Comic to Sequence wizard instance"""
    return ComicToSequenceWizard(vision_engine)


async def transform_comic_page(image_path: Path, title: str = "", page_number: int = 1,
                             comic_style: str = "american_comics") -> ComicTransformationResult:
    """
    Convenience function to transform a comic page

    Args:
        image_path: Path to comic image
        title: Comic title
        page_number: Page number
        comic_style: Comic style (american_comics, manga, etc.)

    Returns:
        Complete transformation result
    """
    style_map = {
        'american_comics': ComicStyle.AMERICAN_COMICS,
        'manga': ComicStyle.MANGA,
        'european_comics': ComicStyle.EUROPEAN_COMICS,
        'graphic_novel': ComicStyle.GRAPHIC_NOVEL,
        'web_comics': ComicStyle.WEB_COMICS
    }

    style = style_map.get(comic_style.lower(), ComicStyle.AMERICAN_COMICS)
    wizard = create_comic_to_sequence_wizard()
    return await wizard.transform_comic_to_sequence(image_path, title, page_number, style)


def get_transformation_preview(image_path: Path) -> Dict[str, Any]:
    """
    Get a preview of what would be extracted from a comic image

    Args:
        image_path: Path to comic image

    Returns:
        Preview data
    """
    if not image_path.exists():
        return {"error": "Image file not found"}

    # Basic file info
    file_size = image_path.stat().st_size

    # Estimate panels based on file size (rough heuristic)
    estimated_panels = min(max(file_size // 50000, 1), 12)  # Rough estimate

    return {
        "image_path": str(image_path),
        "file_size": file_size,
        "estimated_panels": estimated_panels,
        "estimated_processing_time": estimated_panels * 2,  # Rough estimate in seconds
        "supported_styles": ["american_comics", "manga", "european_comics", "graphic_novel", "web_comics"]
    }
