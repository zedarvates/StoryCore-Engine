"""
Dialogue Automation Module
Génération de dialogues basée sur les personnages existants.

Ce module étend l'ai_character_engine.py existant pour fournir
des capacités de génération de dialogues automatiques.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any, Tuple
from enum import Enum
from datetime import datetime
from pathlib import Path
import json
import uuid

# Import des modules existants
try:
    from src.ai_character_engine import (
        GeneratedCharacter,
        PersonalityTrait,
        BehaviorPattern,
        StressResponse,
        ConflictStyle
    )
except ImportError:
    from ai_character_engine import (
        GeneratedCharacter,
        PersonalityTrait,
        BehaviorPattern,
        StressResponse,
        ConflictStyle
    )


class DialogueType(Enum):
    """Types de dialogues supportés."""
    NARRATIVE = "narrative"      # Narration, description
    CONVERSATION = "conversation"  # Échange entre personnages
    MONOLOGUE = "monologue"      # Un seul personnage parle
    CONFLICT = "conflict"        # Confrontation, tension
    RESOLUTION = "resolution"    # Règlement, conclusion
    INTRO = "intro"              # Introduction de scène
    OUTRO = "outro"              # Conclusion de scène


class EmotionIntensity(Enum):
    """Intensité émotionnelle du dialogue."""
    SUBDUED = 0.3    # Très discret, sotto voce
    MODERATE = 0.5   # Conversation normale
    INTENSE = 0.7    # Exclamations, émotion forte
    EXTREME = 1.0    # Cri, transformation, révélation


class DialogueLineFormat(Enum):
    """Format d'affichage d'une ligne de dialogue."""
    STANDARD = "standard"    # "NOM: Dialogue"
    QUOTED = "quoted"        # "NOM: « Dialogue »"
    NARRATED = "narrated"   # "NOM (pensée): [Dialogue]"
    STAGE = "stage"         # "[Note de scène] NOM: Dialogue"


@dataclass
class DialogueContext:
    """Contexte de la scène de dialogue."""
    location: str = "Unknown Location"
    time_of_day: str = "day"  # "dawn", "morning", "afternoon", "dusk", "night", "midnight"
    situation: str = "neutral"  # "combat", "meeting", "travel", "rest", "ceremony", "crisis"
    weather: Optional[str] = None  # "sunny", "rainy", "stormy", "foggy", "snowy"
    mood: str = "neutral"  # "tense", "peaceful", "mysterious", "epic", "joyful", "somber"
    time_period: Optional[str] = None  # "ancient", "medieval", "modern", "future"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "location": self.location,
            "time_of_day": self.time_of_day,
            "situation": self.situation,
            "weather": self.weather,
            "mood": self.mood,
            "time_period": self.time_period
        }


@dataclass
class DialogueLine:
    """Une ligne de dialogue individuelle."""
    line_id: str
    character_id: str
    character_name: str
    dialogue: str
    emotion: str  # "neutral", "happy", "angry", "sad", "surprised", "fearful", "determined"
    is_thought: bool = False  # True = pensée, False = parole
    gesture_note: Optional[str] = None  # Note de mise en scène
    voice_direction: Optional[str] = None  # "whispers", "shouts", "slowly", "quickly"
    format: DialogueLineFormat = DialogueLineFormat.STANDARD
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "line_id": self.line_id,
            "character_id": self.character_id,
            "character_name": self.character_name,
            "dialogue": self.dialogue,
            "emotion": self.emotion,
            "is_thought": self.is_thought,
            "gesture_note": self.gesture_note,
            "voice_direction": self.voice_direction,
            "format": self.format.value
        }
    
    def to_display(self) -> str:
        """Retourne une représentation affichable de la ligne."""
        prefix = ""
        if self.is_thought:
            prefix = f"({self.character_name} pense) "
        else:
            prefix = f"{self.character_name}: "
        
        # Appliquer le format
        if self.format == DialogueLineFormat.QUOTED:
            prefix = f"{prefix}« "
            suffix = " »"
        elif self.format == DialogueLineFormat.NARRATED:
            prefix = f"[{self.emotion}] {prefix}"
            suffix = ""
        else:
            suffix = ""
        
        # Ajouter la direction vocale
        if self.voice_direction:
            suffix = f" ({self.voice_direction}){suffix}"
        
        return f"{prefix}{self.dialogue}{suffix}"


@dataclass
class DialogueScene:
    """Scène de dialogue complète."""
    scene_id: str
    title: str
    context: DialogueContext
    characters: List[GeneratedCharacter]
    lines: List[DialogueLine]
    created_at: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "scene_id": self.scene_id,
            "title": self.title,
            "context": self.context.to_dict(),
            "character_ids": [c.character_id for c in self.characters],
            "character_names": [c.name for c in self.characters],
            "lines": [line.to_dict() for line in self.lines],
            "created_at": self.created_at.isoformat(),
            "metadata": self.metadata
        }
    
    def to_json(self) -> str:
        """Sérialise la scène en JSON."""
        return json.dumps(self.to_dict(), indent=2, ensure_ascii=False)
    
    def to_script_format(self) -> str:
        """Retourne la scène au format scénario."""
        lines = []
        lines.append(f"INT. {self.context.location.upper()} - {self.context.time_of_day.upper()}")
        lines.append(f"[Mood: {self.context.mood}]")
        lines.append("")
        
        for line in self.lines:
            lines.append(line.to_display())
            lines.append("")
        
        return "\n".join(lines)


@dataclass
class DialogueHistoryEntry:
    """Entrée dans l'historique des dialogues."""
    scene: DialogueScene
    generation_params: Dict[str, Any]
    duration_ms: float


class DialogueTemplate(Enum):
    """Templates de structure de dialogue."""
    LINEAR = "linear"           # A parle, B répond, A parle, B répond
    MULTI_PARTY = "multi_party" # Plusieurs personnages participent
    INTERRUPTED = "interrupted" # Conversations interrompues
    PARALLEL = "parallel"       # Dialogues parallèles (pensées)
    BUILDING = "building"       # Tension croissante


# Templates de dialogue par archetype
ARCHETYPE_DIALOGUE_TEMPLATES = {
    # Héros
    "hero": {
        "opening": [
            "We need to act now!",
            "This is our chance!",
            "I won't let anyone else get hurt.",
            "We have to try, no matter the cost."
        ],
        "response": [
            "You're right. Let's do this.",
            "I'm with you until the end.",
            "Together, we can make a difference."
        ],
        "closing": [
            "We did it!",
            "This is just the beginning.",
            "We proved that hope still exists."
        ],
        "conflict": [
            "I won't back down!",
            "This is our fight!",
            "Stand back, I got this!"
        ],
        "emotions": ["determined", "brave", "hopeful", "protective"]
    },
    
    # Méchant
    "villain": {
        "opening": [
            "You think you can stop me?",
            "How naive of you to try.",
            "I've been waiting for this."
        ],
        "response": [
            "Your weakness is disappointing.",
            "You can't comprehend my power.",
            "This ends now."
        ],
        "closing": [
            "It was inevitable.",
            "You brought this upon yourselves.",
            "Now, nothing can stop me."
        ],
        "conflict": [
            "You'll regret this!",
            "You underestimate me!",
            "Power is the only truth."
        ],
        "emotions": ["cruel", "calculating", "defiant", "triumphant"]
    },
    
    # Mentor
    "mentor": {
        "opening": [
            "Patience, young one.",
            "The answer lies within you.",
            "Trust in the process."
        ],
        "response": [
            "What you seek is not found here.",
            "The path is clearer than you think.",
            "Sometimes, the hardest lesson is patience."
        ],
        "closing": [
            "Remember what you've learned.",
            "The journey is not yet over.",
            "May wisdom guide your steps."
        ],
        "conflict": [
            "Violence is not the answer.",
            "There is another way.",
            "Think before you act."
        ],
        "emotions": ["wise", "calm", "patient", "knowing"]
    },
    
    # Comic Relief
    "comic_relief": {
        "opening": [
            "Well, this is awkward.",
            "Did someone say snacks?",
            "I think I left the oven on..."
        ],
        "response": [
            "Wait, what were we talking about?",
            "Is it lunch yet?",
            "Sorry, I wasn't listening."
        ],
        "closing": [
            "And that's why we don't do that.",
            "We should probably not mention this.",
            "New rule: no more rules."
        ],
        "conflict": [
            "Okay, that's enough drama for me.",
            "Someone please change the subject.",
            "I'm too scared to look."
        ],
        "emotions": ["silly", "confused", "anxious", "oblivious"]
    },
    
    # Ally/Sidekick
    "sidekick": {
        "opening": [
            "I'm with you.",
            "What do we do next?",
            "We've got your back."
        ],
        "response": [
            "I'd follow you anywhere.",
            "You're the boss.",
            "Together, we can do anything."
        ],
        "closing": [
            "We make a great team.",
            "Couldn't have done it without you.",
            "Where to next?"
        ],
        "conflict": [
            "You can't do this alone!",
            "We're in this together!",
            "Leave some for me!"
        ],
        "emotions": ["loyal", "supportive", "brave", "reliable"]
    },
    
    # Antagonist
    "antagonist": {
        "opening": [
            "I was hoping we'd meet again.",
            "Your interference is noted.",
            "How... inconvenient."
        ],
        "response": [
            "You're making a mistake.",
            "Consider this a warning.",
            "We could have worked together."
        ],
        "closing": [
            "This isn't over.",
            "I'll remember this.",
            "Victory will be mine."
        ],
        "conflict": [
            "You're outmatched.",
            "Your arrogance is amusing.",
            "I won't be defeated."
        ],
        "emotions": ["cold", "calculating", "threatening", "patient"]
    }
}


class DialogueAutomation:
    """
    Moteur d'automatisation des dialogues.
    
    Génère des dialogues cohérents basés sur:
    - Les personnalités des personnages existants
    - Le contexte de la scène
    - Le type de dialogue souhaité
    
    Attributes:
        dialogue_history: Historique des dialogues générés
        templates: Templates par archetype
    """
    
    def __init__(self, storage_dir: str = "data/dialogues"):
        """
        Initialise le générateur de dialogues.
        
        Args:
            storage_dir: Répertoire de stockage des dialogues
        """
        self.dialogue_history: List[DialogueScene] = []
        self.templates = ARCHETYPE_DIALOGUE_TEMPLATES
        self.storage_dir = Path(storage_dir)
        
        # Créer le répertoire de stockage si nécessaire
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        
        # Charger l'historique existant
        self._load_history()
    
    def _load_history(self):
        """Charge l'historique des dialogues depuis le stockage."""
        if not self.storage_dir.exists():
            return
        
        for file_path in self.storage_dir.glob("*.json"):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    # Note: Reconstruction complète de l'objet 
                    # nécessiterait les personnages complets
            except Exception:
                pass  # Ignorer les fichiers corruptes
    
    def _save_scene(self, scene: DialogueScene):
        """Sauvegarde une scène de dialogue."""
        file_path = self.storage_dir / f"{scene.scene_id}.json"
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(scene.to_json())
    
    def generate_dialogue(
        self,
        characters: List[GeneratedCharacter],
        context: DialogueContext,
        dialogue_type: DialogueType = DialogueType.CONVERSATION,
        num_lines: Optional[int] = None,
        template: DialogueTemplate = DialogueTemplate.LINEAR,
        force_emotions: Optional[Dict[str, str]] = None
    ) -> DialogueScene:
        """
        Génère une scène de dialogue complète.
        
        Args:
            characters: Liste des personnages impliqués
            context: Contexte de la scène
            dialogue_type: Type de dialogue à générer
            num_lines: Nombre de lignes (auto-calculé si None)
            template: Structure du dialogue
            force_emotions: Émotions forcées par personnage
            
        Returns:
            DialogueScene générée
        """
        import time
        start_time = time.time()
        
        scene_id = str(uuid.uuid4())
        
        # Calculer le nombre de lignes si non spécifié
        if num_lines is None:
            num_lines = max(4, len(characters) * 4)
        
        # Générer les lignes
        lines = self._generate_lines(
            characters=characters,
            context=context,
            dialogue_type=dialogue_type,
            num_lines=num_lines,
            template=template,
            force_emotions=force_emotions
        )
        
        scene = DialogueScene(
            scene_id=scene_id,
            title=f"{dialogue_type.value.title()} at {context.location}",
            context=context,
            characters=characters,
            lines=lines
        )
        
        # Ajouter à l'historique
        self.dialogue_history.append(scene)
        
        # Sauvegarder
        self._save_scene(scene)
        
        duration_ms = (time.time() - start_time) * 1000
        
        return scene
    
    def _generate_lines(
        self,
        characters: List[GeneratedCharacter],
        context: DialogueContext,
        dialogue_type: DialogueType,
        num_lines: int,
        template: DialogueTemplate,
        force_emotions: Optional[Dict[str, str]]
    ) -> List[DialogueLine]:
        """Génère les lignes individuelles de dialogue."""
        lines = []
        
        # Obtenir les templates pour chaque personnage
        archetype_templates = self._get_archetype_templates(characters)
        
        for i in range(num_lines):
            # Sélectionner le personnage pour cette ligne
            if template == DialogueTemplate.LINEAR:
                # Alterner entre les personnages
                character = characters[i % len(characters)]
                speaker_idx = i % len(characters)
            elif template == DialogueTemplate.MULTI_PARTY:
                # Tous les personnages peuvent parler
                character = characters[i % len(characters)]
            elif template == DialogueTemplate.INTERRUPTED:
                # Avec interruptions
                if i > 0 and i % 3 == 0:
                    # Ligne interrompue
                    character = characters[(i - 1) % len(characters)]
                else:
                    character = characters[i % len(characters)]
            elif template == DialogueTemplate.PARALLEL:
                # Mélanger pensées et paroles
                character = characters[i % len(characters)]
            else:
                character = characters[i % len(characters)]
            
            # Obtenir l'émotion
            emotion = self._get_emotion(
                character=character,
                context=context,
                line_index=i,
                forced_emotions=force_emotions
            )
            
            # Générer le contenu
            dialogue = self._generate_content(
                character=character,
                templates=archetype_templates,
                context=context,
                dialogue_type=dialogue_type,
                line_index=i,
                total_lines=num_lines,
                speaker_idx=speaker_idx if 'speaker_idx' in locals() else 0
            )
            
            # Créer la ligne
            is_thought = (
                template == DialogueTemplate.PARALLEL and 
                i % 2 == 0
            )
            
            line = DialogueLine(
                line_id=str(uuid.uuid4()),
                character_id=character.character_id,
                character_name=character.name,
                dialogue=dialogue,
                emotion=emotion,
                is_thought=is_thought,
                gesture_note=self._generate_gesture_note(character, context, emotion),
                voice_direction=self._get_voice_direction(emotion, context)
            )
            
            lines.append(line)
        
        return lines
    
    def _get_archetype_templates(
        self,
        characters: List[GeneratedCharacter]
    ) -> Dict[str, Dict[str, Any]]:
        """Récupère les templates pour chaque personnage."""
        templates = {}
        for char in characters:
            archetype = char.archetype.value.lower()
            if archetype in self.templates:
                templates[char.character_id] = self.templates[archetype]
            else:
                # Utiliser le template par défaut (hero)
                templates[char.character_id] = self.templates["hero"]
        return templates
    
    def _get_emotion(
        self,
        character: GeneratedCharacter,
        context: DialogueContext,
        line_index: int,
        forced_emotions: Optional[Dict[str, str]]
    ) -> str:
        """Détermine l'émotion pour une ligne."""
        # Emotion forcée ?
        if forced_emotions and character.character_id in forced_emotions:
            return forced_emotions[character.character_id]
        
        # Émotion basée sur le contexte
        mood_emotions = {
            "tense": ["determined", "anxious", "alert", "fearful"],
            "peaceful": ["calm", "happy", "content", "thoughtful"],
            "mysterious": ["curious", "suspicious", "thoughtful", "neutral"],
            "epic": ["triumphant", "determined", "inspired", "proud"],
            "joyful": ["happy", "excited", "grateful", "proud"],
            "somber": ["sad", "reflective", "determined", "hopeful"]
        }
        
        context_emotions = mood_emotions.get(context.mood, ["neutral"])
        
        # Émotion basée sur la personnalité du personnage
        personality_emotions = character.personality.traits
        
        # Combiner les émotions
        base_emotion = context_emotions[line_index % len(context_emotions)]
        
        return base_emotion
    
    def _generate_content(
        self,
        character: GeneratedCharacter,
        templates: Dict[str, Dict[str, Any]],
        context: DialogueContext,
        dialogue_type: DialogueType,
        line_index: int,
        total_lines: int,
        speaker_idx: int = 0
    ) -> str:
        """Génère le contenu du dialogue."""
        char_templates = templates.get(character.character_id, self.templates["hero"])
        
        # Déterminer quelle partie du template utiliser
        position_ratio = line_index / total_lines if total_lines > 0 else 0.5
        
        if dialogue_type == DialogueType.CONFLICT:
            if position_ratio < 0.3:
                template_list = char_templates.get("opening", [])
            elif position_ratio > 0.7:
                template_list = char_templates.get("closing", [])
            else:
                template_list = char_templates.get("conflict", [])
        else:
            if position_ratio < 0.3:
                template_list = char_templates.get("opening", [])
            elif position_ratio > 0.7:
                template_list = char_templates.get("closing", [])
            else:
                template_list = char_templates.get("response", [])
        
        # Sélectionner un template aléatoire
        if template_list:
            selected = template_list[line_index % len(template_list)]
            # Personnaliser avec le contexte
            return self._personalize_dialogue(selected, character, context)
        
        # Fallback si pas de template
        return f"{character.name} says something relevant to {context.location}."
    
    def _personalize_dialogue(
        self,
        template: str,
        character: GeneratedCharacter,
        context: DialogueContext
    ) -> str:
        """Personnalise un template avec les détails du personnage/contexte."""
        # Remplacements dynamiques
        personalized = template
        
        # Remplacer {name} avec le nom du personnage
        personalized = personalized.replace("{name}", character.name)
        
        # Remplacer {location} avec le lieu
        personalized = personalized.replace("{location}", context.location)
        
        # Remplacer {pronoun} avec le pronom approprié
        # (Simplifié - dans une vraie implémentation, on utiliserait le genre)
        personalized = personalized.replace("{pronoun}", "they")
        
        return personalized
    
    def _generate_gesture_note(
        self,
        character: GeneratedCharacter,
        context: DialogueContext,
        emotion: str
    ) -> Optional[str]:
        """Génère une note de mise en scène."""
        # Notes basées sur l'émotion
        emotion_gestures = {
            "determined": ["steps forward", "clenches fists", "stands tall"],
            "angry": ["glares", "points accusingly", "steps closer"],
            "happy": ["smiles warmly", "nods enthusiastically", "gestures invitingly"],
            "sad": ["looks down", "fidgets", "sighs"],
            "fearful": ["takes a step back", "trembles", "looks around nervously"],
            "surprised": ["eyes widen", "takes a step back", "mouth opens"],
            "neutral": ["stands calmly", "maintains posture", "waits"]
        }
        
        gestures = emotion_gestures.get(emotion, ["gestures"])
        
        # Notes basées sur le contexte
        context_prefix = ""
        if context.situation == "combat":
            context_prefix = "in fighting stance "
        elif context.situation == "rest":
            context_prefix = "relaxed, "
        
        return f"{context_prefix}{gestures[0]}"
    
    def _get_voice_direction(
        self,
        emotion: str,
        context: DialogueContext
    ) -> Optional[str]:
        """Détermine la direction vocale."""
        # Direction basée sur l'émotion
        voice_directions = {
            "angry": "shouting",
            "fearful": "whispering",
            "surprised": "exclaiming",
            "sad": "softly",
            "happy": "brightly",
            "determined": "firmly"
        }
        
        # Direction basée sur le contexte
        if context.situation == "combat":
            return "over the noise"
        elif context.situation == "rest":
            return "quietly"
        
        return voice_directions.get(emotion)
    
    def get_scene_by_id(self, scene_id: str) -> Optional[DialogueScene]:
        """Récupère une scène par son ID."""
        for scene in self.dialogue_history:
            if scene.scene_id == scene_id:
                return scene
        return None
    
    def get_character_scenes(
        self,
        character_id: str
    ) -> List[DialogueScene]:
        """Récupère toutes les scènes impliquant un personnage."""
        return [
            scene for scene in self.dialogue_history
            if any(c.character_id == character_id for c in scene.characters)
        ]
    
    def get_dialogue_history(
        self,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Récupère l'historique des dialogues."""
        return [
            {
                "scene_id": scene.scene_id,
                "title": scene.title,
                "context": scene.context.to_dict(),
                "characters": [c.name for c in scene.characters],
                "line_count": len(scene.lines),
                "created_at": scene.created_at.isoformat()
            }
            for scene in self.dialogue_history[-limit:]
        ]
    
    def clear_history(self):
        """Efface l'historique des dialogues."""
        self.dialogue_history.clear()
    
    def export_scene(
        self,
        scene_id: str,
        format: str = "json"
    ) -> Optional[str]:
        """Exporte une scène dans le format spécifié."""
        scene = self.get_scene_by_id(scene_id)
        if not scene:
            return None
        
        if format == "json":
            return scene.to_json()
        elif format == "script":
            return scene.to_script_format()
        else:
            return None


# Factory function
def create_dialogue_automation(storage_dir: str = "data/dialogues") -> DialogueAutomation:
    """
    Crée et configure une instance de DialogueAutomation.
    
    Args:
        storage_dir: Répertoire de stockage
        
    Returns:
        Instance configurée de DialogueAutomation
    """
    return DialogueAutomation(storage_dir=storage_dir)

