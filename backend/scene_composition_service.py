from enum import Enum
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

class ShotType(Enum):
    WIDE = "wide"           # Establishing shot
    MEDIUM = "medium"       # Standard dialogue
    CLOSE_UP = "close_up"   # Emotional
    EXTREME_CLOSE_UP = "ecu"  # Extreme close-up
    POV = "pov"             # Point of view
    DRONE = "drone"         # Aerial
    TRACKING = "tracking"   # Moving shot
    STATIC = "static"       # Fixed shot
    HANDHELD = "handheld"   # Documentary/action feel
    TILT = "tilt"           # Vertical movement
    PAN = "pan"             # Horizontal movement
    CRANE = "crane"         # Elevated movement

class CameraMovement(Enum):
    STATIC = "static"
    PAN_LEFT = "pan_left"
    PAN_RIGHT = "pan_right"
    TILT_UP = "tilt_up"
    TILT_DOWN = "tilt_down"
    ZOOM_IN = "zoom_in"
    ZOOM_OUT = "zoom_out"
    DOLLY_IN = "dolly_in"
    DOLLY_OUT = "dolly_out"
    CRANE_UP = "crane_up"
    CRANE_DOWN = "crane_down"
    TRACKING_SHOT = "tracking"
    STEADICAM = "steadicam"
    HANDHELD = "handheld"
    WHIP_PAN = "whip_pan"
    SMASH_ZOOM = "smash_zoom"
    PAN = "pan"

class LightingStyle(Enum):
    NATURAL = "natural"
    HIGH_KEY = "high_key"
    LOW_KEY = "low_key"
    CHIAROSCURO = "chiaroscuro"
    FLAT = "flat"
    SILHOUETTE = "silhouette"
    GOLDEN_HOUR = "golden_hour"
    BLUE_HOUR = "blue_hour"
    MOONLIGHT = "moonlight"
    DRAMATIC = "dramatic"
    STAGE = "stage"
    CANDELIGHT = "candlelight"
    NEON = "neon"
    PRACTICAL = "practical"
    WARM = "warm"
    COOL = "cool"

class ColorGradingPreset(Enum):
    NATURAL = "natural"
    CINEMATIC = "cinematic"
    VINTAGE = "vintage"
    DESATURATED = "desaturated"
    HIGH_CONTRAST = "high_contrast"
    WARM = "warm"
    COOL = "cool"
    BLEACH_BYPASS = "bleach_bypass"
    TEAL_ORANGE = "teal_orange"
    FILM_NOIR = "film_noir"

class CompositionRule(Enum):
    RULE_OF_THIRDS = "rule_of_thirds"
    GOLDEN_RATIO = "golden_ratio"
    GOLDEN_SPIRAL = "golden_spiral"
    LEADING_LINES = "leading_lines"
    SYMMETRY = "symmetry"
    FRAMING = "framing"
    DEPTH = "depth"
    NEGATIVE_SPACE = "negative_space"
    CROP = "crop"

@dataclass
class CompositionRule:
    id: str
    name: str
    description: str
    rule_type: str
    application: str = ""  # How to apply this rule
    parameters: Dict[str, Any] = field(default_factory=dict)

@dataclass
class CameraSetup:
    id: str
    shot_type: ShotType
    camera_movement: CameraMovement
    lens: int = 50  # mm focal length
    aperture: str = "f/2.8"
    shutter_speed: str = "1/60"
    framing: str = ""
    focus_point: str = ""
    duration_estimate: float = 5.0
    notes: str = ""
    camera_height: float = 1.7  # meters
    camera_distance: float = 3.0  # meters
    angle: str = "eye_level"  # eye_level, low, high, dutch

@dataclass
class LightingSetup:
    id: str
    style: LightingStyle
    key_light_intensity: float = 1.0
    key_light_direction: str = "front_right"
    fill_light_intensity: float = 0.5
    back_light_intensity: float = 0.3
    color_temperature: int = 5600  # Kelvin
    gels: List[str] = field(default_factory=list)
    practical_lights: List[str] = field(default_factory=list)
    shadows_style: str = "soft"  # soft, hard, dramatic

@dataclass
class SceneComposition:
    id: str
    scene_id: str
    title: str
    shots: List[CameraSetup] = field(default_factory=list)
    lighting: List[LightingSetup] = field(default_factory=list)
    lighting_style: LightingStyle = LightingStyle.NATURAL
    color_grading: ColorGradingPreset = ColorGradingPreset.NATURAL
    color_palette: List[str] = field(default_factory=list)
    composition_rules: List[CompositionRule] = field(default_factory=list)
    visual_references: List[str] = field(default_factory=list)
    mood: str = "neutral"
    atmosphere: str = ""
    camera_movements_sequence: List[CameraMovement] = field(default_factory=list)

class SceneCompositionService:
    """Service de composition automatique de scènes"""
    
    COMPOSITION_RULES = {
        "rule_of_thirds": CompositionRule(
            id="rule_of_thirds",
            name="Rule of Thirds",
            description="Divide frame into 9 sections, place subjects on intersections",
            rule_type="composition",
            application="Position subjects at 1/3 and 2/3 lines"
        ),
        "golden_ratio": CompositionRule(
            id="golden_ratio",
            name="Golden Ratio (Phi Grid)",
            description="Use phi grid for natural proportions (1:1.618)",
            rule_type="composition",
            application="Similar to rule of thirds but with different proportions"
        ),
        "golden_spiral": CompositionRule(
            id="golden_spiral",
            name="Golden Spiral",
            description="Use logarithmic spiral for leading the eye",
            rule_type="composition",
            application="Position main subject at spiral's origin"
        ),
        "leading_lines": CompositionRule(
            id="leading_lines",
            name="Leading Lines",
            description="Use lines to guide viewer attention",
            rule_type="composition",
            application="Draw lines from edges toward main subject"
        ),
        "symmetry": CompositionRule(
            id="symmetry",
            name="Symmetrical Balance",
            description="Mirror composition for dramatic effect",
            rule_type="composition",
            application="Center subject or create mirrored elements"
        ),
        "framing": CompositionRule(
            id="framing",
            name="Natural Framing",
            description="Use environmental elements to frame subject",
            rule_type="composition",
            application="Windows, doors, arches as frame"
        ),
        "depth": CompositionRule(
            id="depth",
            name="Depth Composition",
            description="Create foreground, middle ground, background",
            rule_type="composition",
            application="Layer elements at different distances"
        ),
        "negative_space": CompositionRule(
            id="negative_space",
            name="Negative Space",
            description="Use empty space intentionally",
            rule_type="composition",
            application="Leave space in direction of movement/gaze"
        )
    }
    
    SHOT_SEQUENCES = {
        "dialogue": [ShotType.WIDE, ShotType.MEDIUM, ShotType.CLOSE_UP, ShotType.MEDIUM],
        "action": [ShotType.WIDE, ShotType.TRACKING, ShotType.MEDIUM, ShotType.CLOSE_UP],
        "tension": [ShotType.WIDE, ShotType.CLOSE_UP, ShotType.POV, ShotType.EXTREME_CLOSE_UP],
        "establishing": [ShotType.DRONE, ShotType.WIDE, ShotType.MEDIUM],
        "emotional": [ShotType.MEDIUM, ShotType.CLOSE_UP, ShotType.EXTREME_CLOSE_UP],
        "transition": [ShotType.WIDE, ShotType.WIDE, ShotType.MEDIUM]
    }
    
    def __init__(self):
        self.compositions: Dict[str, SceneComposition] = {}
        self._id_counter = 0
    
    def generate_composition(
        self,
        scene_description: str,
        characters: List[str] = None,
        mood: str = "neutral",
        style_references: List[str] = None,
        scene_id: str = ""
    ) -> SceneComposition:
        """Générer une composition automatique basée sur la description"""
        composition = SceneComposition(
            id=str(uuid.uuid4()),
            scene_id=scene_id,
            title=self._extract_title(scene_description),
            shots=self._generate_shot_list(scene_description, characters, mood),
            lighting=self._generate_lighting_setup(mood),
            lighting_style=self._infer_lighting(mood),
            color_grading=self._infer_color_grading(mood),
            color_palette=self._generate_color_palette(mood),
            composition_rules=self._select_rules(scene_description, characters),
            visual_references=style_references or [],
            mood=mood,
            atmosphere=self._generate_atmosphere(mood),
            camera_movements_sequence=self._generate_camera_sequence(mood)
        )
        
        self.compositions[composition.id] = composition
        return composition
    
    def _extract_title(self, description: str) -> str:
        """Extraire un titre de la description"""
        words = description.split()[:5]
        return " ".join(words).title()
    
    def _generate_shot_list(
        self,
        scene_description: str,
        characters: List[str] = None,
        mood: str = "neutral"
    ) -> List[CameraSetup]:
        """Générer une liste de plans pour la scène"""
        # Déterminer le type de séquence
        sequence_type = self._infer_sequence_type(scene_description, mood)
        shot_types = self.SHOT_SEQUENCES.get(sequence_type, self.SHOT_SEQUENCES["dialogue"])
        
        shots = []
        
        for i, shot_type in enumerate(shot_types):
            # Ajouter un establishing shot au début
            if i == 0 and ShotType.WIDE in shot_types:
                shots.append(self._create_camera_setup(
                    ShotType.WIDE, CameraMovement.DOLLY_OUT, i,
                    lens=24,
                    framing="Full frame showing environment",
                    notes="Establishing shot - set the scene"
                ))
            else:
                movement = self._infer_camera_movement(shot_type, mood)
                lens = self._infer_lens(shot_type)
                framing = self._generate_framing(shot_type, characters[i % len(characters)] if characters else None)
                
                shots.append(self._create_camera_setup(
                    shot_type, movement, i,
                    lens=lens,
                    framing=framing,
                    duration_estimate=self._estimate_duration(mood, i)
                ))
        
        return shots
    
    def _create_camera_setup(
        self,
        shot_type: ShotType,
        movement: CameraMovement,
        index: int,
        lens: int = 50,
        framing: str = "",
        duration_estimate: float = 5.0,
        notes: str = ""
    ) -> CameraSetup:
        """Créer une configuration de caméra"""
        return CameraSetup(
            id=str(uuid.uuid4()),
            shot_type=shot_type,
            camera_movement=movement,
            lens=lens,
            aperture=self._infer_aperture(shot_type),
            framing=framing or f"Shot {index + 1}",
            focus_point="Subject's eyes",
            duration_estimate=duration_estimate,
            notes=notes
        )
    
    def _infer_sequence_type(self, description: str, mood: str) -> str:
        """Déduire le type de séquence"""
        desc_lower = description.lower()
        
        if any(word in desc_lower for word in ["dialogue", "conversation", "talk", "speak"]):
            return "dialogue"
        elif any(word in desc_lower for word in ["fight", "chase", "run", "action"]):
            return "action"
        elif any(word in desc_lower for word in ["tension", "fear", "suspense", "waiting"]):
            return "tension"
        elif any(word in desc_lower for word in ["establishing", "location", "setting"]):
            return "establishing"
        elif mood in ["emotional", "romantic", "sad", "happy"]:
            return "emotional"
        
        return "dialogue"
    
    def _infer_camera_movement(self, shot_type: ShotType, mood: str) -> CameraMovement:
        """Déduire le mouvement de caméra"""
        if shot_type == ShotType.WIDE:
            return CameraMovement.DOLLY_OUT if mood == "epic" else CameraMovement.STATIC
        elif shot_type == ShotType.MEDIUM:
            return CameraMovement.STATIC
        elif shot_type == ShotType.CLOSE_UP:
            return CameraMovement.ZOOM_IN if mood == "intense" else CameraMovement.STATIC
        elif shot_type == ShotType.TRACKING:
            return CameraMovement.TRACKING_SHOT
        else:
            return CameraMovement.STATIC
    
    def _infer_lens(self, shot_type: ShotType) -> int:
        """Déduire la focale"""
        lens_map = {
            ShotType.WIDE: 24,
            ShotType.MEDIUM: 50,
            ShotType.CLOSE_UP: 85,
            ShotType.EXTREME_CLOSE_UP: 135,
            ShotType.POV: 35,
            ShotType.DRONE: 16,
            ShotType.TRACKING: 35,
            ShotType.STATIC: 50,
            ShotType.HANDHELD: 35,
            ShotType.TILT: 35,
            ShotType.PAN: 35,
            ShotType.CRANE: 24
        }
        return lens_map.get(shot_type, 50)
    
    def _generate_framing(self, shot_type: ShotType, character: str = None) -> str:
        """Générer la description du cadrage"""
        framings = {
            ShotType.WIDE: f"Full body shot, subject in environment{' - ' + character if character else ''}",
            ShotType.MEDIUM: f"Waist-up shot, focuses on subject{' - ' + character if character else ''}",
            ShotType.CLOSE_UP: f"Head and shoulders, captures expressions{' - ' + character if character else ''}",
            ShotType.EXTREME_CLOSE_UP: "Close on face, eyes or specific detail",
            ShotType.POV: "First person perspective",
            ShotType.DRONE: "Aerial view, bird's eye",
            ShotType.TRACKING: "Following subject in motion"
        }
        return framings.get(shot_type, "Standard framing")
    
    def _estimate_duration(self, mood: str, shot_index: int) -> float:
        """Estimer la durée du plan"""
        base_durations = {
            "tension": [3.0, 5.0, 7.0, 4.0],  # Longer takes for tension
            "action": [2.0, 1.5, 2.0, 1.5],  # Quick cuts
            "dialogue": [4.0, 3.0, 5.0, 4.0],  # Moderate pacing
            "emotional": [5.0, 6.0, 7.0, 5.0],  # Longer emotional beats
            "neutral": [4.0, 4.0, 4.0, 4.0]
        }
        
        durations = base_durations.get(mood, base_durations["neutral"])
        return durations[min(shot_index, len(durations) - 1)]
    
    def _infer_aperture(self, shot_type: ShotType) -> str:
        """Déduire l'ouverture"""
        aperture_map = {
            ShotType.WIDE: "f/8",
            ShotType.MEDIUM: "f/2.8",
            ShotType.CLOSE_UP: "f/1.8",
            ShotType.EXTREME_CLOSE_UP: "f/1.4",
            ShotType.POV: "f/2.8",
            ShotType.DRONE: "f/11",
            ShotType.TRACKING: "f/4"
        }
        return aperture_map.get(shot_type, "f/2.8")
    
    def _infer_lighting(self, mood: str) -> LightingStyle:
        """Déduire le style d'éclairage basé sur l'ambiance"""
        mood_lighting = {
            "happy": LightingStyle.HIGH_KEY,
            "sad": LightingStyle.LOW_KEY,
            "tense": LightingStyle.CHIAROSCURO,
            "romantic": LightingStyle.GOLDEN_HOUR,
            "mysterious": LightingStyle.LOW_KEY,
            "epic": LightingStyle.NATURAL,
            "horror": LightingStyle.LOW_KEY,
            "fantasy": LightingStyle.DRAMATIC,
            "scifi": LightingStyle.NEON,
            "documentary": LightingStyle.NATURAL,
            "noir": LightingStyle.FLAT,
            "warm": LightingStyle.CANDELIGHT
        }
        return mood_lighting.get(mood, LightingStyle.NATURAL)
    
    def _infer_color_grading(self, mood: str) -> ColorGradingPreset:
        """Déduire le preset de color grading"""
        mood_grading = {
            "happy": ColorGradingPreset.WARM,
            "sad": ColorGradingPreset.DESATURATED,
            "tense": ColorGradingPreset.HIGH_CONTRAST,
            "romantic": ColorGradingPreset.VINTAGE,
            "mysterious": ColorGradingPreset.COOL,
            "epic": ColorGradingPreset.CINEMATIC,
            "horror": ColorGradingPreset.TEAL_ORANGE,
            "fantasy": ColorGradingPreset.WARM,
            "scifi": ColorGradingPreset.COOL,
            "noir": ColorGradingPreset.FILM_NOIR
        }
        return mood_grading.get(mood, ColorGradingPreset.NATURAL)
    
    def _generate_color_palette(self, mood: str) -> List[str]:
        """Générer une palette de couleurs"""
        palettes = {
            "happy": ["#FFD700", "#FF69B4", "#87CEEB", "#98FB98", "#FFA500"],
            "sad": ["#4A5568", "#718096", "#2D3748", "#1A202C", "#A0AEC0"],
            "tense": ["#C0392B", "#2C3E50", "#1a1a1a", "#8B0000", "#4a4a4a"],
            "romantic": ["#FF69B4", "#FFB6C1", "#FFE4E1", "#DDA0DD", "#FFC0CB"],
            "mysterious": ["#1a1a2e", "#16213e", "#0f3460", "#533483", "#2a2a4a"],
            "epic": ["#2C3E50", "#3498DB", "#ECF0F1", "#E74C3C", "#F39C12"],
            "horror": ["#000000", "#1a0000", "#330000", "#4a0000", "#2a2a2a"],
            "fantasy": ["#9B59B6", "#3498DB", "#1ABC9C", "#F1C40F", "#E74C3C"],
            "scifi": ["#00FFFF", "#FF00FF", "#1a1a2e", "#0a0a1a", "#4a4a6a"],
            "neutral": ["#FFFFFF", "#000000", "#808080", "#D3D3D3", "#A9A9A9"]
        }
        return palettes.get(mood, palettes["neutral"])
    
    def _generate_lighting_setup(self, mood: str) -> List[LightingSetup]:
        """Générer la configuration d'éclairage"""
        style = self._infer_lighting(mood)
        
        setup = LightingSetup(
            id=str(uuid.uuid4()),
            style=style,
            key_light_intensity=self._get_light_intensity(style),
            fill_light_intensity=0.5,
            back_light_intensity=0.3,
            color_temperature=self._get_color_temp(style),
            shadows_style=self._get_shadow_style(mood)
        )
        
        return [setup]
    
    def _get_light_intensity(self, style: LightingStyle) -> float:
        """Obtenir l'intensité de la lumière principale"""
        intensity_map = {
            LightingStyle.HIGH_KEY: 1.5,
            LightingStyle.LOW_KEY: 0.5,
            LightingStyle.CHIAROSCURO: 0.7,
            LightingStyle.NATURAL: 1.0,
            LightingStyle.GOLDEN_HOUR: 1.2,
            LightingStyle.DRAMATIC: 0.8
        }
        return intensity_map.get(style, 1.0)
    
    def _get_color_temp(self, style: LightingStyle) -> int:
        """Obtenir la température de couleur"""
        temp_map = {
            LightingStyle.GOLDEN_HOUR: 4500,
            LightingStyle.BLUE_HOUR: 8000,
            LightingStyle.MOONLIGHT: 12000,
            LightingStyle.NATURAL: 5600,
            "warm": 3200,
            "cool": 7000,
            LightingStyle.CANDELIGHT: 2000,
            LightingStyle.NEON: 5500
        }
        return temp_map.get(style, 5600)
    
    def _get_shadow_style(self, mood: str) -> str:
        """Obtenir le style des ombres"""
        shadow_map = {
            "happy": "soft",
            "sad": "soft",
            "tense": "hard",
            "romantic": "soft",
            "mysterious": "hard",
            "epic": "soft",
            "horror": "dramatic",
            "fantasy": "soft"
        }
        return shadow_map.get(mood, "soft")
    
    def _generate_atmosphere(self, mood: str) -> str:
        """Générer la description de l'atmosphère"""
        atmospheres = {
            "happy": "Bright, airy, full of energy and life",
            "sad": "Dim, melancholic, heavy with emotion",
            "tense": "Stifling, electric, full of anticipation",
            "romantic": "Warm, intimate, soft and dreamy",
            "mysterious": "Shadowy, enigmatic, full of secrets",
            "epic": "Grand, sweeping, awe-inspiring",
            "horror": "Dark, oppressive, full of dread",
            "fantasy": "Enchanted, magical, otherworldly",
            "scifi": "Sleek, sterile, futuristic"
        }
        return atmospheres.get(mood, "Neutral atmosphere")
    
    def _generate_camera_sequence(self, mood: str) -> List[CameraMovement]:
        """Générer une séquence de mouvements de caméra"""
        sequences = {
            "tension": [CameraMovement.STATIC, CameraMovement.ZOOM_IN, CameraMovement.PAN_LEFT, CameraMovement.STATIC],
            "action": [CameraMovement.TRACKING_SHOT, CameraMovement.DOLLY_IN, CameraMovement.STATIC, CameraMovement.DOLLY_OUT],
            "emotional": [CameraMovement.DOLLY_IN, CameraMovement.STATIC, CameraMovement.ZOOM_IN, CameraMovement.STATIC],
            "transition": [CameraMovement.DOLLY_OUT, CameraMovement.PAN, CameraMovement.DOLLY_IN],
            "neutral": [CameraMovement.STATIC, CameraMovement.STATIC, CameraMovement.STATIC, CameraMovement.STATIC]
        }
        return sequences.get(mood, sequences["neutral"])
    
    def _select_rules(
        self,
        description: str,
        characters: List[str] = None
    ) -> List[CompositionRule]:
        """Sélectionner les règles de composition"""
        selected = []
        desc_lower = description.lower()
        
        # Sélection basée sur le contenu
        if any(word in desc_lower for word in ["landscape", "wide", "outdoor", "environment"]):
            selected.append(self.COMPOSITION_RULES["leading_lines"])
            selected.append(self.COMPOSITION_RULES["depth"])
        
        if any(word in desc_lower for word in ["portrait", "face", "character", "emotion"]):
            selected.append(self.COMPOSITION_RULES["rule_of_thirds"])
            selected.append(self.COMPOSITION_RULES["framing"])
        
        if any(word in desc_lower for word in ["symmetry", "mirror", "palace", "hall"]):
            selected.append(self.COMPOSITION_RULES["symmetry"])
        
        if any(word in desc_lower for word in ["alone", "isolated", "contemplative"]):
            selected.append(self.COMPOSITION_RULES["negative_space"])
        
        # Ajouter règle de base si rien n'est sélectionné
        if not selected:
            selected.append(self.COMPOSITION_RULES["rule_of_thirds"])
            selected.append(self.COMPOSITION_RULES["leading_lines"])
        
        return selected
    
    def add_shot(
        self,
        composition_id: str,
        shot_data: dict
    ) -> CameraSetup:
        """Ajouter un plan à une composition"""
        composition = self.compositions.get(composition_id)
        if not composition:
            raise ValueError("Composition not found")
        
        shot = CameraSetup(**shot_data)
        composition.shots.append(shot)
        return shot
    
    def get_composition(self, composition_id: str) -> Optional[SceneComposition]:
        """Récupérer une composition par ID"""
        return self.compositions.get(composition_id)
    
    def list_compositions(self) -> List[SceneComposition]:
        """Lister toutes les compositions"""
        return list(self.compositions.values())
    
    def export_composition(self, composition_id: str) -> Dict[str, Any]:
        """Exporter la composition"""
        composition = self.compositions.get(composition_id)
        if not composition:
            return {"error": "Composition not found"}
        
        return {
            "id": composition.id,
            "scene_id": composition.scene_id,
            "title": composition.title,
            "mood": composition.mood,
            "atmosphere": composition.atmosphere,
            "shots": [
                {
                    "id": s.id,
                    "shot_type": s.shot_type.value,
                    "camera_movement": s.camera_movement.value,
                    "lens": s.lens,
                    "aperture": s.aperture,
                    "framing": s.framing,
                    "focus_point": s.focus_point,
                    "duration_estimate": s.duration_estimate,
                    "angle": s.angle,
                    "notes": s.notes
                }
                for s in composition.shots
            ],
            "lighting_style": composition.lighting_style.value,
            "color_grading": composition.color_grading.value,
            "color_palette": composition.color_palette,
            "rules": [
                {
                    "id": r.id,
                    "name": r.name,
                    "description": r.description,
                    "application": r.application
                }
                for r in composition.composition_rules
            ],
            "camera_sequence": [m.value for m in composition.camera_movements_sequence]
        }
    
    def analyze_composition(self, composition_id: str) -> Dict[str, Any]:
        """Analyser la composition"""
        composition = self.compositions.get(composition_id)
        if not composition:
            return {"error": "Composition not found"}
        
        # Analyser la variété des plans
        shot_types_used = set(s.shot_type.value for s in composition.shots)
        movements_used = set(s.camera_movement.value for s in composition.shots)
        
        # Calculer les métriques
        variety_score = len(shot_types_used) / 5.0  # Normaliser
        pacing_score = sum(s.duration_estimate for s in composition.shots) / len(composition.shots)
        
        return {
            "composition_id": composition_id,
            "total_shots": len(composition.shots),
            "shot_types_used": list(shot_types_used),
            "movements_used": list(movements_used),
            "variety_score": round(min(1.0, variety_score), 2),
            "estimated_duration": sum(s.duration_estimate for s in composition.shots),
            "pacing_analysis": "fast" if pacing_score < 4.0 else ("slow" if pacing_score > 6.0 else "moderate"),
            "rule_compliance": len(composition.composition_rules) / 3.0,
            "recommendations": self._get_composition_recommendations(composition)
        }
    
    def _get_composition_recommendations(self, composition: SceneComposition) -> List[str]:
        """Obtenir des recommandations pour améliorer la composition"""
        recommendations = []
        
        if len(composition.shots) < 4:
            recommendations.append("Consider adding more shots for better pacing")
        
        shot_types = [s.shot_type for s in composition.shots]
        if ShotType.CLOSE_UP not in shot_types:
            recommendations.append("Close-ups add emotional impact")
        
        if ShotType.WIDE not in shot_types:
            recommendations.append("Wide shots help establish location")
        
        movements = [s.camera_movement for s in composition.shots]
        if all(m == CameraMovement.STATIC for m in movements):
            recommendations.append("Camera movements can add dynamism")
        
        return recommendations
