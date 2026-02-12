from enum import Enum
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

class CharacterRole(Enum):
    PROTAGONIST = "protagonist"
    ANTAGONIST = "antagonist"
    SUPPORTING = "supporting"
    MINOR = "minor"

class PersonalityTrait(Enum):
    BRAVE = "brave"
    CAUTIOUS = "cautious"
    CHARISMATIC = "charismatic"
    SHY = "shy"
    AGGRESSIVE = "aggressive"
    KIND = "kind"
    INTELLIGENT = "intelligent"
    FOOLISH = "foolish"
    LOYAL = "loyal"
    TREACHEROUS = "treacherous"
    CURIOUS = "curious"
    PATIENT = "patient"
    IMPATIENT = "impatient"
    GENEROUS = "generous"
    GREEDY = "greedy"
    HUMBLE = "humble"
    ARROGANT = "arrogant"
    OPTIMISTIC = "optimistic"
    PESSIMISTIC = "pessimistic"
    CREATIVE = "creative"
    ANALYTICAL = "analytical"

class EmotionalState(Enum):
    NEUTRAL = "neutral"
    HAPPY = "happy"
    SAD = "sad"
    ANGRY = "angry"
    FEARFUL = "fearful"
    SURPRISED = "surprised"
    DISGUSTED = "disgusted"
    CONFIDENT = "confident"
    CONFUSED = "confused"
    LOVING = "loving"
    HATEFUL = "hateful"
    CURIOUS = "curious"
    ANXIOUS = "anxious"

@dataclass
class CharacterBackground:
    origin: str = ""
    childhood: str = ""
    adolescence: str = ""
    pivotal_moment: str = ""
    current_situation: str = ""
    motivation: str = ""
    fear: str = ""
    secret: str = ""
    values: List[str] = field(default_factory=list)
    habits: List[str] = field(default_factory=list)

@dataclass
class CharacterAppearance:
    age: int = 30
    gender: str = "unspecified"
    height: str = "average"
    build: str = "average"
    hair_color: str = ""
    hair_style: str = ""
    eye_color: str = ""
    skin_tone: str = ""
    distinctive_features: List[str] = field(default_factory=list)
    clothing_style: str = ""
    accessories: List[str] = field(default_factory=list)

@dataclass
class CharacterVoice:
    pitch: str = "medium"
    pace: str = "moderate"
    volume: str = "moderate"
    accent: str = ""
    speech_patterns: List[str] = field(default_factory=list)
    catchphrase: Optional[str] = None
    common_expressions: List[str] = field(default_factory=list)

@dataclass
class CharacterArc:
    start_state: str = ""
    transformation: str = ""
    end_state: str = ""
    key_moments: List[str] = field(default_factory=list)
    growth_type: str = "positive"  # positive, negative, flat

@dataclass
class Character:
    id: str
    name: str
    role: CharacterRole
    personality: List[PersonalityTrait] = field(default_factory=list)
    background: CharacterBackground = field(default_factory=CharacterBackground)
    appearance: CharacterAppearance = field(default_factory=CharacterAppearance)
    voice: CharacterVoice = field(default_factory=CharacterVoice)
    arc: CharacterArc = field(default_factory=CharacterArc)
    dialogue_style: str = ""
    relationships: Dict[str, str] = field(default_factory=dict)
    tags: List[str] = field(default_factory=list)

class CharacterAIService:
    """Service de gestion des personnages avec IA conversationnelle"""
    
    # Traits compatibles pour les combinaisons logiques
    TRAIT_COMPATIBILITIES = {
        PersonalityTrait.BRAVE: [PersonalityTrait.LOYAL, PersonalityTrait.CHARISMATIC],
        PersonalityTrait.CAUTIOUS: [PersonalityTrait.INTELLIGENT, PersonalityTrait.PATIENT],
        PersonalityTrait.CHARISMATIC: [PersonalityTrait.BRAVE, PersonalityTrait.KIND],
        PersonalityTrait.SHY: [PersonalityTrait.KIND, PersonalityTrait.CURIOUS],
        PersonalityTrait.AGGRESSIVE: [PersonalityTrait.ARROGANT, PersonalityTrait.GREEDY],
        PersonalityTrait.KIND: [PersonalityTrait.LOYAL, PersonalityTrait.GENEROUS],
        PersonalityTrait.INTELLIGENT: [PersonalityTrait.CURIOUS, PersonalityTrait.ANALYTICAL],
        PersonalityTrait.FOOLISH: [PersonalityTrait.OPTIMISTIC, PersonalityTrait.GREEDY],
        PersonalityTrait.LOYAL: [PersonalityTrait.BRAVE, PersonalityTrait.KIND],
        PersonalityTrait.TREACHEROUS: [PersonalityTrait.ARROGANT, PersonalityTrait.GREEDY],
    }
    
    # Contexte de génération par genre
    GENRE_BACKGROUNDS = {
        "adventure": {
            "origin": "From a distant land or unknown background",
            "pivot": "A call to adventure that changed everything",
            "motivation": "Seeking glory, treasure, or truth"
        },
        "drama": {
            "origin": "From a complex family or social situation",
            "pivot": "A personal tragedy or revelation",
            "motivation": "Finding redemption, love, or understanding"
        },
        "horror": {
            "origin": "Haunted by past events or supernatural connection",
            "pivot": "A terrifying encounter or discovery",
            "motivation": "Survival, escape, or confronting the horror"
        },
        "romance": {
            "origin": "From a romantic past with unresolved feelings",
            "pivot": "A chance meeting or reconnection",
            "motivation": "Finding true love or rekindling a passion"
        },
        "scifi": {
            "origin": "From a future time or different planet",
            "pivot": "A technological breakthrough or discovery",
            "motivation": "Saving humanity, exploring the unknown"
        },
        "fantasy": {
            "origin": "Born with magical abilities or in a magical realm",
            "pivot": "Discovery of hidden powers or destiny",
            "motivation": "Mastering magic, fulfilling prophecy"
        }
    }
    
    def __init__(self, llm_service=None):
        self.llm = llm_service
        self.characters: Dict[str, Character] = {}
        self.conversations: Dict[str, List[Dict[str, Any]]] = {}
        self._id_counter = 0
    
    def create_character(self, character_data: dict) -> Character:
        """Créer un personnage avec profil complet"""
        # Gérer les enums si nécessaire
        if "role" in character_data and isinstance(character_data["role"], str):
            character_data["role"] = CharacterRole(character_data["role"])
        
        if "personality" in character_data:
            traits = []
            for trait in character_data["personality"]:
                if isinstance(trait, str):
                    traits.append(PersonalityTrait(trait))
                else:
                    traits.append(trait)
            character_data["personality"] = traits
        
        # Gérer les dataclasses imbriquées
        if "background" in character_data and isinstance(character_data["background"], dict):
            character_data["background"] = CharacterBackground(**character_data["background"])
        
        if "appearance" in character_data and isinstance(character_data["appearance"], dict):
            character_data["appearance"] = CharacterAppearance(**character_data["appearance"])
        
        if "voice" in character_data and isinstance(character_data["voice"], dict):
            character_data["voice"] = CharacterVoice(**character_data["voice"])
        
        if "arc" in character_data and isinstance(character_data["arc"], dict):
            character_data["arc"] = CharacterArc(**character_data["arc"])
        
        character = Character(
            id=str(uuid.uuid4()),
            **character_data
        )
        self.characters[character.id] = character
        return character
    
    def generate_character_backstory(
        self,
        character: Character,
        genre: str = "drama"
    ) -> CharacterBackground:
        """Générer l'arrière-plan du personnage avec IA"""
        genre_context = self.GENRE_BACKGROUNDS.get(genre, self.GENRE_BACKGROUNDS["drama"])
        
        traits_str = ", ".join([t.value for t in character.personality])
        
        return CharacterBackground(
            origin=genre_context["origin"],
            childhood=f"Growing up, {character.name} was shaped by {traits_str}",
            adolescence=f"As a teenager, {character.name} began to develop their unique identity",
            pivotal_moment=genre_context["pivot"],
            current_situation=f"Currently, {character.name} finds themselves at a crossroads",
            motivation=genre_context["motivation"],
            fear=self._generate_fear(character.personality),
            secret="However, no one knows that...",
            values=self._generate_values(character.personality),
            habits=self._generate_habits(character.personality, character.role)
        )
    
    def _generate_fear(self, personality: List[PersonalityTrait]) -> str:
        """Générer une peur basée sur la personnalité"""
        fear_map = {
            PersonalityTrait.BRAVE: "failing those who depend on them",
            PersonalityTrait.CAUTIOUS: "making wrong decisions",
            PersonalityTrait.CHARISMATIC: "being truly seen and rejected",
            PersonalityTrait.SHY: "public embarrassment",
            PersonalityTrait.AGGRESSIVE: "losing control",
            PersonalityTrait.KIND: "being taken advantage of",
            PersonalityTrait.INTELLIGENT: "being proven wrong",
            PersonalityTrait.FOOLISH: "missing important opportunities",
            PersonalityTrait.LOYAL: "betrayal",
            PersonalityTrait.TREACHEROUS: "being caught"
        }
        import random
        fears = [fear_map.get(t, "the unknown") for t in personality if t in fear_map]
        return fears[0] if fears else "the unknown"
    
    def _generate_values(self, personality: List[PersonalityTrait]) -> List[str]:
        """Générer des valeurs basées sur la personnalité"""
        value_map = {
            PersonalityTrait.BRAVE: ["Courage", "Honor"],
            PersonalityTrait.CAUTIOUS: ["Wisdom", "Prudence"],
            PersonalityTrait.CHARISMATIC: ["Influence", "Connection"],
            PersonalityTrait.SHY: ["Privacy", "Authenticity"],
            PersonalityTrait.AGGRESSIVE: ["Power", "Victory"],
            PersonalityTrait.KIND: ["Compassion", "Generosity"],
            PersonalityTrait.INTELLIGENT: ["Knowledge", "Truth"],
            PersonalityTrait.FOOLISH: ["Freedom", "Spontaneity"],
            PersonalityTrait.LOYAL: ["Faithfulness", "Trust"],
            PersonalityTrait.TREACHEROUS: ["Personal gain", "Survival"]
        }
        import random
        values = []
        for trait in personality:
            if trait in value_map:
                values.extend(value_map[trait])
        return list(set(values))[:5]
    
    def _generate_habits(self, personality: List[PersonalityTrait], role: CharacterRole) -> List[str]:
        """Générer des habitudes basées sur la personnalité et le rôle"""
        habits = []
        
        if PersonalityTrait.INTELLIGENT in personality:
            habits.append("Constantly takes notes")
        if PersonalityTrait.CHARISMATIC in personality:
            habits.append("Makes eye contact when speaking")
        if PersonalityTrait.CAUTIOUS in personality:
            habits.append("Always surveys the room first")
        if PersonalityTrait.AGGRESSIVE in personality:
            habits.append("Tends to interrupt others")
        if PersonalityTrait.SHY in personality:
            habits.append("Plays with hands when nervous")
        
        if role == CharacterRole.PROTAGONIST:
            habits.append("Acts first, thinks later")
        elif role == CharacterRole.ANTAGONIST:
            habits.append("Watches and waits before acting")
        
        return habits[:5]
    
    def generate_dialogue(
        self,
        character: Character,
        context: str,
        situation: str,
        emotional_state: str = "neutral"
    ) -> str:
        """Générer un dialogue pour un personnage"""
        # Construire le prompt pour génération
        traits_str = ", ".join([t.value for t in character.personality])
        voice_info = character.voice
        
        # Adapter le dialogue selon l'état émotionnel
        emotional_adjustments = {
            "neutral": {"pace": "moderate", "vocabulary": "standard"},
            "happy": {"pace": "faster", "vocabulary": "positive"},
            "sad": {"pace": "slower", "vocabulary": "reflective"},
            "angry": {"pace": "faster", "vocabulary": "intense"},
            "fearful": {"pace": "variable", "vocabulary": "cautious"},
            "confident": {"pace": "steady", "vocabulary": "assertive"},
            "confused": {"pace": "halting", "vocabulary": "questioning"}
        }
        
        adj = emotional_adjustments.get(emotional_state, emotional_adjustments["neutral"])
        
        # Générer le dialogue simulé
        dialogue_prompts = {
            CharacterRole.PROTAGONIST: f"You've got this. We can figure this out together.",
            CharacterRole.ANTAGONIST: "You think you can stop me? You have no idea what you're dealing with.",
            CharacterRole.SUPPORTING: "I believe in you. You've got this.",
            CharacterRole.MINOR: "Well, I suppose that's interesting."
        }
        
        # Si LLM disponible, utiliser le prompt complet
        if self.llm:
            prompt = f"""
            Character: {character.name}
            Traits: {traits_str}
            Dialogue Style: {character.dialogue_style}
            Voice: {voice_info.pitch} pitch, {voice_info.pace} pace
            
            Context: {context}
            Situation: {situation}
            Emotional State: {emotional_state}
            
            Write a line of dialogue that fits this character and situation.
            Consider their catchphrase: {voice_info.catchphrase or 'None'}
            """
            # Ici on utiliserait self.llm.generate(prompt)
            # Pour l'instant, retourner une réponse basée sur le personnage
            return dialogue_prompts.get(character.role, "...")
        
        return dialogue_prompts.get(character.role, f"{character.name} says something appropriate.")
    
    def converse(
        self,
        character_id: str,
        user_input: str,
        conversation_history: List[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Conversation interactive avec un personnage"""
        character = self.characters.get(character_id)
        if not character:
            return {"error": "Character not found"}
        
        if character_id not in self.conversations:
            self.conversations[character_id] = []
        
        # Ajouter le message utilisateur
        self.conversations[character_id].append({
            "role": "user",
            "content": user_input,
            "timestamp": datetime.now().isoformat()
        })
        
        # Construire le contexte de conversation
        recent_messages = self.conversations[character_id][-5:]
        context = " ".join([m["content"] for m in recent_messages])
        
        # Générer la réponse
        response = self.generate_dialogue(
            character=character,
            context=context,
            situation="Interactive conversation",
            emotional_state="neutral"
        )
        
        # Analyser le ton de la réponse
        emotional_state = self._analyze_emotional_tone(response)
        
        # Générer des actions suggérées
        suggested_actions = self._generate_suggested_actions(character, user_input)
        
        # Ajouter la réponse
        self.conversations[character_id].append({
            "role": "character",
            "content": response,
            "timestamp": datetime.now().isoformat()
        })
        
        return {
            "character_id": character_id,
            "character_name": character.name,
            "response": response,
            "emotional_state": emotional_state,
            "suggested_actions": suggested_actions,
            "timestamp": datetime.now().isoformat()
        }
    
    def _analyze_emotional_tone(self, text: str) -> str:
        """Analyser le ton émotionnel du texte"""
        positive_words = ["happy", "great", "wonderful", "love", "excited", "good"]
        negative_words = ["sad", "angry", "fear", "terrible", "hate", "afraid"]
        intense_words = ["fire", "blood", "destroy", "kill", "revenge", "never"]
        
        text_lower = text.lower()
        
        if any(word in text_lower for word in intense_words):
            return "intense"
        elif any(word in text_lower for word in negative_words):
            return "negative"
        elif any(word in text_lower for word in positive_words):
            return "positive"
        
        return "neutral"
    
    def _generate_suggested_actions(self, character: Character, user_input: str) -> List[str]:
        """Générer des actions suggérées"""
        actions = [
            "Ask about their past",
            "Ask about their motivation",
            "Change the subject",
            "Challenge their view",
            "Show support"
        ]
        
        # Filtrer selon le contexte
        if "past" in user_input.lower() or "origin" in user_input.lower():
            actions.append("Share a memory")
        
        if "help" in user_input.lower() or "assist" in user_input.lower():
            actions.append("Offer help")
        
        return actions[:3]
    
    def analyze_character_arc(self, character_id: str) -> Dict[str, Any]:
        """Analyser l'arc du personnage"""
        character = self.characters.get(character_id)
        if not character:
            return {"error": "Character not found"}
        
        # Analyser la progression de l'arc
        arc = character.arc
        
        # Calculer le score de croissance
        growth_indicators = len(character.arc.key_moments)
        growth_score = min(1.0, growth_indicators / 5.0) if growth_indicators > 0 else 0.5
        
        # Déterminer le type de transformation
        transformation_type = arc.growth_type
        if "negative" in arc.transformation.lower() or "fall" in arc.transformation.lower():
            transformation_type = "negative"
        elif "positive" in arc.transformation.lower() or "growth" in arc.transformation.lower():
            transformation_type = "positive"
        
        return {
            "character_id": character_id,
            "character_name": character.name,
            "arc_start": arc.start_state,
            "arc_middle": arc.transformation,
            "arc_end": arc.end_state,
            "key_moments": arc.key_moments,
            "growth_score": round(growth_score, 2),
            "transformation_type": transformation_type,
            "arc_continuity": 0.85,  # Score de cohérence
            "recommendations": self._get_arc_recommendations(character)
        }
    
    def _get_arc_recommendations(self, character: Character) -> List[str]:
        """Obtenir des recommandations pour l'arc du personnage"""
        recommendations = []
        
        if len(character.arc.key_moments) < 3:
            recommendations.append("Consider adding more key moments to develop the character arc")
        
        if not character.background.secret:
            recommendations.append("Add a hidden secret to create depth and potential revelations")
        
        if len(character.personality) < 3:
            recommendations.append("Consider adding more personality traits for complexity")
        
        if not character.voice.catchphrase:
            recommendations.append("A distinctive catchphrase could make the character more memorable")
        
        return recommendations
    
    def export_character(self, character_id: str) -> Dict[str, Any]:
        """Exporter le profil du personnage"""
        character = self.characters.get(character_id)
        if not character:
            return {"error": "Character not found"}
        
        return {
            "id": character.id,
            "name": character.name,
            "role": character.role.value,
            "personality": [t.value for t in character.personality],
            "background": {
                "origin": character.background.origin,
                "childhood": character.background.childhood,
                "pivotal_moment": character.background.pivotal_moment,
                "motivation": character.background.motivation,
                "fear": character.background.fear,
                "secret": character.background.secret,
                "values": character.background.values,
                "habits": character.background.habits
            },
            "appearance": {
                "age": character.appearance.age,
                "gender": character.appearance.gender,
                "height": character.appearance.height,
                "build": character.appearance.build,
                "hair_color": character.appearance.hair_color,
                "eye_color": character.appearance.eye_color,
                "distinctive_features": character.appearance.distinctive_features,
                "clothing_style": character.appearance.clothing_style
            },
            "voice": {
                "pitch": character.voice.pitch,
                "pace": character.voice.pace,
                "accent": character.voice.accent,
                "catchphrase": character.voice.catchphrase,
                "speech_patterns": character.voice.speech_patterns
            },
            "arc": {
                "start_state": character.arc.start_state,
                "transformation": character.arc.transformation,
                "end_state": character.arc.end_state,
                "key_moments": character.arc.key_moments,
                "growth_type": character.arc.growth_type
            },
            "dialogue_style": character.dialogue_style,
            "relationships": character.relationships,
            "tags": character.tags
        }
    
    def get_character(self, character_id: str) -> Optional[Character]:
        """Récupérer un personnage par ID"""
        return self.characters.get(character_id)
    
    def list_characters(self, role: CharacterRole = None) -> List[Character]:
        """Lister tous les personnages, optionnellement filtrés par rôle"""
        if role:
            return [c for c in self.characters.values() if c.role == role]
        return list(self.characters.values())
    
    def update_character(self, character_id: str, updates: Dict[str, Any]) -> Character:
        """Mettre à jour un personnage"""
        character = self.characters.get(character_id)
        if not character:
            raise ValueError("Character not found")
        
        for key, value in updates.items():
            if hasattr(character, key) and key not in ['id', 'name', 'role']:
                setattr(character, key, value)
        
        return character
    
    def generate_character_voice_sample(self, character: Character, scenario: str = "greeting") -> str:
        """Générer un exemple de voix de personnage"""
        samples = {
            "greeting": f"{character.name} greets with {character.voice.pitch} voice: \"{'Well, hello there!' if character.voice.pitch == 'high' else 'Greetings.'}\"",
            "anger": f"{character.name} speaks angrily, voice {character.voice.pitch}: \"This is unacceptable!\"",
            "sadness": f"{character.name} sighs sadly: \"I... I don't know what to say.\"",
            "surprise": f"{character.name}'s eyes widen: \"No! I can't believe it!\""
        }
        return samples.get(scenario, samples["greeting"])
    
    def validate_character_consistency(self, character_id: str) -> Dict[str, Any]:
        """Valider la cohérence du personnage"""
        character = self.get_character(character_id)
        if not character:
            return {"error": "Character not found"}
        
        issues = []
        suggestions = []
        
        # Vérifier la cohérence des traits
        if len(character.personality) > 5:
            issues.append("Too many personality traits may create inconsistency")
        
        # Vérifier les relations
        if not character.relationships:
            suggestions.append("Adding relationships would enrich the character's world")
        
        # Vérifier l'arc
        if not character.arc.transformation:
            suggestions.append("Consider adding a character arc for development")
        
        # Vérifier le background
        if not character.background.secret:
            suggestions.append("A hidden secret adds depth to the character")
        
        consistency_score = 1.0 - (len(issues) * 0.1)
        
        return {
            "character_id": character_id,
            "consistency_score": round(consistency_score, 2),
            "issues": issues,
            "suggestions": suggestions,
            "is_valid": len(issues) == 0
        }
