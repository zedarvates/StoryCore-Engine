from enum import Enum
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

class StoryGenre(Enum):
    ADVENTURE = "adventure"
    DRAMA = "drama"
    COMEDY = "comedy"
    HORROR = "horror"
    ROMANCE = "romance"
    SCIFI = "scifi"
    FANTASY = "fantasy"
    THRILLER = "thriller"
    DOCUMENTARY = "documentary"

class StoryStructure(Enum):
    THREE_ACT = "three_act"
    HERO_JOURNEY = "hero_journey"
    SAVE_THE_CAT = "save_the_cat"
    FIVE_POINT = "five_point"
    SEQUENCE = "sequence"

class ProductionMode(Enum):
    FICTION = "fiction"
    DOCUMENTARY = "documentary"
    INTERVIEW = "interview"
    MUSIC_VIDEO = "music_video"
    SOCIAL_MEDIA = "social_media"
    CINEMATIC = "cinematic"
    AUDIODRAMA = "audiodrama"

@dataclass
class StoryProp:
    id: str
    name: str
    description: str
    is_immutale: bool = False
    owner_id: Optional[str] = None
    interaction_type: str = ""

@dataclass
class StorySFX:
    id: str
    name: str
    category: str  # action, character, ambiance
    description: str
    associated_entity_id: Optional[str] = None # Char, Prop, or Location ID

@dataclass
class StoryBeat:
    id: str
    name: str
    description: str
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    emotional_beat: str = ""
    narrative_function: str = ""
    characters_involved: List[str] = field(default_factory=list)
    scene_reference: Optional[str] = None

@dataclass
class StoryArc:
    id: str
    name: str
    genre: StoryGenre
    structure: StoryStructure
    beats: List[StoryBeat] = field(default_factory=list)
    theme: str = ""
    conflict: str = ""
    resolution: str = ""

@dataclass
class StoryScene:
    id: str
    title: str
    description: str
    location: Optional[str] = None
    time_of_day: Optional[str] = None
    characters: List[str] = field(default_factory=list)
    dialogue: List[Dict[str, str]] = field(default_factory=list)
    beat_ids: List[str] = field(default_factory=list)
    visual_direction: str = ""
    audio_mood: str = ""
    props: List[str] = field(default_factory=list)
    sfx: List[str] = field(default_factory=list)

@dataclass
class Story:
    id: str
    title: str
    synopsis: str
    genre: StoryGenre
    mode: ProductionMode = ProductionMode.FICTION
    arcs: List[StoryArc] = field(default_factory=list)
    scenes: List[StoryScene] = field(default_factory=list)
    characters: List[Dict[str, Any]] = field(default_factory=list)
    locations: List[Dict[str, Any]] = field(default_factory=list)
    props: List[StoryProp] = field(default_factory=list)
    sfx: List[StorySFX] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

class StoryGenerationService:
    """Service de génération de stories avec IA"""
    
    PROMPT_TEMPLATES = {
        StoryGenre.ADVENTURE: """
        ## METHODOLOGIE BOUT EN BOUT - FICTION/ADVENTURE
        Create an adventure story bible.
        CONTRAINTES STRICTES:
        - Personnages: Min. 3 (Triangle de relation).
        - Lieux: Min. 3 (Progression spatiale).
        - Objets: Min. 1 porté par perso + 2 immuables.
        - SFX: 1 par objet + signatures personnages + ambiance par lieu.
        """,
        StoryGenre.DOCUMENTARY: """
        ## METHODOLOGIE BOUT EN BOUT - DOCUMENTAIRE
        Create a factual documentary structure.
        CONTRAINTES STRICTES:
        - Personnages: Min. 2 (Intervenants/Narrateurs).
        - Lieux: Min. 2 (Contextes réels).
        - Objets: Min. 3 objets de preuve/illustration.
        - SFX: Ambiances sonores réelles (diegetic).
        """,
        ProductionMode.INTERVIEW: """
        ## METHODOLOGIE BOUT EN BOUT - INTERVIEW
        Create a conversational flow.
        CONTRAINTES: 2 Personnes minimum. Focus sur l'échange et les réactions.
        """,
        ProductionMode.MUSIC_VIDEO: """
        ## METHODOLOGIE BOUT EN BOUT - CLIP MUSICAL
        Create a visual structure synced to music.
        CONTRAINTES: 
        - Structure: Intro, Verset 1, Refrain, Verset 2, Refrain, Outro.
        - SFX: Focus sur les sons rythmiques et synchronisation visuelle.
        """,
        ProductionMode.SOCIAL_MEDIA: """
        ## METHODOLOGIE BOUT EN BOUT - SOCIAL/SHORT
        Create high-retention short content.
        CONTRAINTES:
        - 0-3s: Hook ultra-visuel.
        - 3-15s: Contenu rapide (coupes rapides).
        - Outro: Call to Action.
        """,
        ProductionMode.CINEMATIC: """
        ## METHODOLOGIE BOUT EN BOUT - CINEMATOGRAPHIE PRO
        Create high-fidelity cinematic project.
        CONTRAINTES:
        - Direction visuelle: Focus sur l'éclairage et les objectifs (Lenses).
        - Mouvements: Dolly, Pan, Tilt spécifiés pour chaque scène.
        """
    }
    
    STRUCTURES = {
        StoryStructure.THREE_ACT: {
            "beats_count": 8,
            "distribution": [0.15, 0.25, 0.60],  # Act 1, 2, 3
            "act_beats": [
                ["Inciting Incident", "First Plot Point"],
                ["Midpoint", "All Is Lost"],
                ["Climax", "Resolution"]
            ]
        },
        StoryStructure.HERO_JOURNEY: {
            "beats_count": 12,
            "steps": [
                "Ordinary World", "Call to Adventure", "Refusal",
                "Meeting Mentor", "Crossing Threshold", "Tests",
                "Allies", "Enemy", "Ordeal", "Reward",
                "Road Back", "Resurrection", "Return"
            ]
        },
        StoryStructure.SAVE_THE_CAT: {
            "beats_count": 15,
            "beats": [
                "Opening Image", "Theme Stated", "Set-Up",
                "Catalyst", "Debate", "Break into Two",
                "B Story", "Fun and Games", "Midpoint",
                "Bad Guys Close In", "All Is Lost",
                "Dark Night of the Soul", "Break into Three",
                "Finale", "Final Image"
            ]
        },
        StoryStructure.FIVE_POINT: {
            "beats_count": 5,
            "beats": [
                "Exposition", "Rising Action", "Climax",
                "Falling Action", "Resolution"
            ]
        }
    }
    
    def __init__(self, llm_service=None):
        self.llm = llm_service
        self.stories: Dict[str, Story] = {}
    
    def generate_story(
        self,
        prompt: str,
        genre: StoryGenre,
        structure: StoryStructure,
        mode: ProductionMode = ProductionMode.FICTION,
        length: str = "medium",  # short, medium, long
        characters: List[Dict[str, Any]] = None
    ) -> Story:
        """Générer une story complète à partir d'un prompt"""
        story = Story(
            id=str(uuid.uuid4()),
            title=self._extract_title(prompt),
            synopsis=prompt,
            genre=genre,
            mode=mode,
            arcs=[],
            scenes=[],
            characters=characters or []
        )
        
        # Générer la bible de production (méthodologie bout en bout)
        self._populate_production_bible(story)
        
        # Générer les arcs narratifs
        story.arcs = self._generate_arcs(story, structure)
        
        # Générer les scènes
        story.scenes = self._generate_scenes(story, length)
        
        # Enrichir avec les beats
        self._populate_beats(story, structure)
        
        self.stories[story.id] = story
        return story

    def _populate_production_bible(self, story: Story):
        """
        Implémente la règle 'Bout en Bout' : 
        Force la création du triangle relationnel, de la trinité spatiale, 
        des objets immuables et des SFX.
        """
        import random
        
        # 1. Personnages (Triangle de relation)
        min_chars = 3 if story.mode == ProductionMode.FICTION else 2
        if not story.characters:
            for i in range(min_chars):
                char_id = str(uuid.uuid4())
                story.characters.append({
                    "id": char_id,
                    "nom": f"Personnage {i+1}",
                    "role": "Protagoniste" if i == 0 else "Antagoniste" if i == 1 else "Allié",
                    "description": "Généré via méthodologie bout en bout"
                })

        # 2. Lieux (Trinité spatiale)
        min_locs = 3 if story.mode == ProductionMode.FICTION else 2
        for i in range(min_locs):
            loc_id = str(uuid.uuid4())
            story.locations.append({
                "id": loc_id,
                "nom": f"Lieu {i+1} ({['Départ', 'Transition', 'Résolution'][i] if i < 3 else 'Autre'})",
                "description": "Ancrage spatial consistant"
            })

        # 3. Objets (Props)
        # Portés (1 par perso)
        for char in story.characters:
            prop = StoryProp(
                id=str(uuid.uuid4()),
                name=f"Accessoire de {char['nom']}",
                description="Objet porté consistant",
                owner_id=char['id']
            )
            story.props.append(prop)
        
        # Immuables (Min 2)
        for i in range(2):
            prop = StoryProp(
                id=str(uuid.uuid4()),
                name=f"Objet Immuable {i+1} (ex: Porte, Cloche)",
                description="Élément de décor interactif",
                is_immutale=True
            )
            story.props.append(prop)

        # 4. SFX (Bruitages)
        # SFX d'interaction (1 par prop)
        for prop in story.props:
            sfx = StorySFX(
                id=str(uuid.uuid4()),
                name=f"Son de {prop.name}",
                category="action",
                description=f"SFX lié à {prop.name}",
                associated_entity_id=prop.id
            )
            story.sfx.append(sfx)
        
        # SFX Ambiance (1 par lieu)
        for loc in story.locations:
            sfx = StorySFX(
                id=str(uuid.uuid4()),
                name=f"Ambiance de {loc['nom']}",
                category="ambiance",
                description=f"Son d'ambiance pour {loc['nom']}",
                associated_entity_id=loc['id']
            )
            story.sfx.append(sfx)
    
    def _generate_arcs(self, story: Story, structure: StoryStructure) -> List[StoryArc]:
        """Générer les arcs narratifs basés sur la structure"""
        config = self.STRUCTURES.get(structure, self.STRUCTURES[StoryStructure.THREE_ACT])
        arc_count = 3
        
        arc_names = {
            StoryStructure.THREE_ACT: ["Act 1 - Setup", "Act 2 - Confrontation", "Act 3 - Resolution"],
            StoryStructure.HERO_JOURNEY: ["Departure", "Initiation", "Return"],
            StoryStructure.SAVE_THE_CAT: ["Break into Two", "Fun and Games", "Finale"],
            StoryStructure.FIVE_POINT: ["Rising", "Climax", "Falling"],
            StoryStructure.SEQUENCE: ["Opening", "Development", "Closing"]
        }
        
        arcs = []
        for i in range(arc_count):
            arc = StoryArc(
                id=str(uuid.uuid4()),
                name=arc_names.get(structure, f"Arc {i+1}")[i],
                genre=story.genre,
                structure=structure,
                beats=[],
                theme=self._generate_theme(story.genre),
                conflict=self._generate_conflict(story.genre),
                resolution=""
            )
            arcs.append(arc)
        
        return arcs
    
    def _generate_scenes(self, story: Story, length: str) -> List[StoryScene]:
        """Générer les scènes de la story"""
        scene_count = {"short": 5, "medium": 15, "long": 30}.get(length, 15)
        
        scenes = []
        for i in range(scene_count):
            scene = StoryScene(
                id=str(uuid.uuid4()),
                title=self._generate_scene_title(i + 1),
                description=self._generate_scene_description(i, scene_count),
                location=self._generate_location(story.genre),
                time_of_day=self._generate_time_of_day(),
                characters=[],
                dialogue=[],
                beat_ids=[],
                visual_direction=self._generate_visual_direction(story.genre),
                audio_mood=self._generate_audio_mood(story.genre)
            )
            scenes.append(scene)
        
        return scenes
    
    def _populate_beats(self, story: Story, structure: StoryStructure):
        """Remplir les beats pour chaque arc"""
        config = self.STRUCTURES.get(structure, self.STRUCTURES[StoryStructure.THREE_ACT])
        beats_list = config.get("beats", [])
        
        beat_index = 0
        scenes_per_arc = len(story.scenes) // len(story.arcs) if story.arcs else len(story.scenes)
        
        for arc in story.arcs:
            for i in range(min(scenes_per_arc, len(beats_list) - beat_index)):
                if beat_index < len(beats_list):
                    beat = StoryBeat(
                        id=str(uuid.uuid4()),
                        name=beats_list[beat_index],
                        description=f"Beat {beat_index + 1} in {arc.name}",
                        emotional_beat=self._generate_emotional_beat(),
                        narrative_function=self._generate_narrative_function(),
                        characters_involved=[],
                        scene_reference=None
                    )
                    arc.beats.append(beat)
                    beat_index += 1
    
    def _extract_title(self, prompt: str) -> str:
        """Extraire un titre du prompt"""
        words = prompt.split()
        if len(words) <= 6:
            return " ".join(words).title()
        return " ".join(words[:6]).title() + "..."
    
    def _generate_scene_title(self, scene_number: int) -> str:
        """Générer un titre de scène"""
        prefixes = ["Opening", "Discovery", "Conflict", "Tension", "Revelation", "Climax", "Resolution"]
        return f"{prefixes[scene_number % len(prefixes)]} Scene {scene_number}"
    
    def _generate_scene_description(self, scene_index: int, total_scenes: int) -> str:
        """Générer une description de scène"""
        position = scene_index / total_scenes if total_scenes > 0 else 0
        
        if position < 0.2:
            return "Introduction of characters and setting. Establishing the world and initial situation."
        elif position < 0.5:
            return "Development of conflict. Characters face challenges and relationships develop."
        elif position < 0.8:
            return "Rising tension. Stakes increase as obstacles mount."
        else:
            return "Climax and resolution. Conflicts reach their peak and find conclusion."
    
    def _generate_theme(self, genre: StoryGenre) -> str:
        """Générer un thème basé sur le genre"""
        themes = {
            StoryGenre.ADVENTURE: "Heroism and discovery",
            StoryGenre.DRAMA: "Personal growth and relationships",
            StoryGenre.COMEDY: "Life's absurdities and joy",
            StoryGenre.HORROR: "Fear of the unknown",
            StoryGenre.ROMANCE: "Love conquers all",
            StoryGenre.SCIFI: "Technology and humanity",
            StoryGenre.FANTASY: "Magic and destiny",
            StoryGenre.THRILLER: "Survival and justice",
            StoryGenre.DOCUMENTARY: "Truth and understanding"
        }
        return themes.get(genre, "Universal themes")
    
    def _generate_conflict(self, genre: StoryGenre) -> str:
        """Générer un conflit basé sur le genre"""
        conflicts = {
            StoryGenre.ADVENTURE: "External obstacles and physical challenges",
            StoryGenre.DRAMA: "Internal struggles and relationships",
            StoryGenre.COMEDY: "Misunderstandings and comedic situations",
            StoryGenre.HORROR: "Supernatural or psychological threats",
            StoryGenre.ROMANCE: "Barriers to love",
            StoryGenre.SCIFI: "Technological or existential threats",
            StoryGenre.FANTASY: "Dark forces and magical challenges",
            StoryGenre.THRILLER: "Danger and deception",
            StoryGenre.DOCUMENTARY: "Social and real-world issues"
        }
        return conflicts.get(genre, "Character vs Circumstance")
    
    def _generate_location(self, genre: StoryGenre) -> str:
        """Générer un lieu basé sur le genre"""
        locations = {
            StoryGenre.ADVENTURE: "Exotic landscapes and ancient ruins",
            StoryGenre.DRAMA: "Domestic settings and urban environments",
            StoryGenre.COMEDY: "Everyday locations with comedic potential",
            StoryGenre.HORROR: "Dark, isolated, or abandoned places",
            StoryGenre.ROMANCE: "Romantic and picturesque settings",
            StoryGenre.SCIFI: "Futuristic facilities and space stations",
            StoryGenre.FANTASY: "Magical realms and mythical lands",
            StoryGenre.THRILLER: "Urban environments with hidden dangers",
            StoryGenre.DOCUMENTARY: "Real-world locations and documentary settings"
        }
        return locations.get(genre, "Various locations")
    
    def _generate_time_of_day(self) -> str:
        """Générer un moment de la journée"""
        times = ["Dawn", "Morning", "Afternoon", "Dusk", "Night", "Midnight"]
        import random
        return random.choice(times)
    
    def _generate_visual_direction(self, genre: StoryGenre) -> str:
        """Générer des directions visuelles"""
        directions = {
            StoryGenre.ADVENTURE: "Sweeping vistas, dynamic camera movements",
            StoryGenre.DRAMA: "Intimate close-ups, natural lighting",
            StoryGenre.COMEDY: "Bright colors, wide shots for physical comedy",
            StoryGenre.HORROR: "Dark shadows, low-key lighting, POV shots",
            StoryGenre.ROMANCE: "Warm tones, soft focus, golden hour lighting",
            StoryGenre.SCIFI: "Clean lines, cool colors, technological aesthetics",
            StoryGenre.FANTASY: "Rich colors, magical lighting effects",
            StoryGenre.THRILLER: "Handheld camera, tension-building framing",
            StoryGenre.DOCUMENTARY: "Direct address, documentary-style footage"
        }
        return directions.get(genre, "Standard cinematographic techniques")
    
    def _generate_audio_mood(self, genre: StoryGenre) -> str:
        """Générer une ambiance sonore"""
        moods = {
            StoryGenre.ADVENTURE: "Epic orchestral with percussion",
            StoryGenre.DRAMA: "Emotional strings and piano",
            StoryGenre.COMEDY: "Light, playful musical cues",
            StoryGenre.HORROR: "Dissonant strings, ambient dread",
            StoryGenre.ROMANCE: "Warm strings and romantic melodies",
            StoryGenre.SCIFI: "Electronic, futuristic soundscapes",
            StoryGenre.FANTASY: "Orchestral fantasy score",
            StoryGenre.THRILLER: "Tense, rhythmic tension music",
            StoryGenre.DOCUMENTARY: "Ambient documentary score"
        }
        return moods.get(genre, "Adaptive scoring")
    
    def _generate_emotional_beat(self) -> str:
        """Générer un beat émotionnel"""
        beats = [
            "Hope rises", "Fear intensifies", "Joy emerges",
            "Sadness deepens", "Anger explodes", "Love blossoms",
            "Betrayal shocks", "Courage manifests", "Doubt creeps in",
            "Determination strengthens"
        ]
        import random
        return random.choice(beats)
    
    def _generate_narrative_function(self) -> str:
        """Générer une fonction narrative"""
        functions = [
            "Set up conflict", "Raise stakes", "Develop character",
            "Create tension", "Provide revelation", "Advance plot",
            "Deepen theme", "Create turning point", "Build to climax"
        ]
        import random
        return random.choice(functions)
    
    def add_beat(self, arc_id: str, beat_data: dict) -> StoryBeat:
        """Ajouter un beat narratif"""
        beat = StoryBeat(**beat_data)
        return beat
    
    def add_scene(self, story_id: str, scene_data: dict) -> StoryScene:
        """Ajouter une scène"""
        scene = StoryScene(**scene_data)
        if story_id in self.stories:
            self.stories[story_id].scenes.append(scene)
        return scene
    
    def get_story(self, story_id: str) -> Optional[Story]:
        """Récupérer une story par ID"""
        return self.stories.get(story_id)
    
    def list_stories(self) -> List[Story]:
        """Lister toutes les stories"""
        return list(self.stories.values())
    
    def export_story(self, story_id: str, format: str = "json") -> Dict[str, Any]:
        """Exporter la story dans différents formats"""
        story = self.stories[story_id]
        return {
            "id": story.id,
            "title": story.title,
            "synopsis": story.synopsis,
            "genre": story.genre.value,
            "arcs_count": len(story.arcs),
            "scenes_count": len(story.scenes),
            "arcs": [
                {
                    "id": arc.id,
                    "name": arc.name,
                    "theme": arc.theme,
                    "conflict": arc.conflict,
                    "resolution": arc.resolution,
                    "beats_count": len(arc.beats),
                    "beats": [
                        {
                            "id": beat.id,
                            "name": beat.name,
                            "description": beat.description,
                            "emotional_beat": beat.emotional_beat,
                            "narrative_function": beat.narrative_function
                        }
                        for beat in arc.beats
                    ]
                }
                for arc in story.arcs
            ],
            "scenes": [
                {
                    "id": s.id,
                    "title": s.title,
                    "description": s.description,
                    "location": s.location,
                    "time_of_day": s.time_of_day,
                    "characters": s.characters,
                    "visual_direction": s.visual_direction,
                    "audio_mood": s.audio_mood
                }
                for s in story.scenes
            ],
            "characters": story.characters,
            "locations": story.locations,
            "props": [
                {
                    "id": p.id,
                    "name": p.name,
                    "description": p.description,
                    "is_immutale": p.is_immutale,
                    "owner_id": p.owner_id
                }
                for p in story.props
            ],
            "sfx": [
                {
                    "id": s.id,
                    "name": s.name,
                    "category": s.category,
                    "description": s.description,
                    "associated_entity_id": s.associated_entity_id
                }
                for s in story.sfx
            ],
            "created_at": story.created_at.isoformat(),
            "updated_at": story.updated_at.isoformat()
        }
    
    def analyze_story_structure(self, story_id: str) -> Dict[str, Any]:
        """Analyser la structure narrative"""
        story = self.stories.get(story_id)
        if not story:
            return {"error": "Story not found"}
        
        total_beats = sum(len(arc.beats) for arc in story.arcs)
        total_scenes = len(story.scenes)
        
        # Calculer le pacing
        beats_per_scene = total_beats / total_scenes if total_scenes > 0 else 0
        pacing_score = 1.0 - abs(0.5 - beats_per_scene) if beats_per_scene > 0 else 0.5
        
        # Analyser la conformité à la structure
        structure_beats_count = self.STRUCTURES.get(
            story.arcs[0].structure if story.arcs else StoryStructure.THREE_ACT,
            self.STRUCTURES[StoryStructure.THREE_ACT]
        )["beats_count"]
        
        structure_compliance = min(1.0, total_beats / (structure_beats_count * len(story.arcs))) if story.arcs else 0.5
        
        # Générer des recommandations
        recommendations = []
        if pacing_score < 0.6:
            recommendations.append("Consider adding more beats to improve pacing")
        elif pacing_score > 0.9:
            recommendations.append("Pacing may be too fast, consider expanding scenes")
        
        if structure_compliance < 0.7:
            recommendations.append(f"Story structure could better follow {story.arcs[0].structure.value if story.arcs else 'standard'} pattern")
        
        return {
            "total_beats": total_beats,
            "total_scenes": total_scenes,
            "pacing_score": round(pacing_score, 2),
            "pacing_analysis": "balanced" if 0.6 <= pacing_score <= 0.9 else ("fast" if pacing_score > 0.9 else "slow"),
            "character_arcs": len(story.characters),
            "structure_compliance": round(structure_compliance, 2),
            "arc_distribution": [len(arc.beats) for arc in story.arcs],
            "recommendations": recommendations
        }
    
    def refine_story(self, story_id: str, feedback: Dict[str, Any]) -> Story:
        """Affiner une story basée sur le feedback"""
        story = self.stories.get(story_id)
        if not story:
            raise ValueError("Story not found")
        
        # Appliquer les modifications basées sur le feedback
        if "title" in feedback:
            story.title = feedback["title"]
        
        if "genre" in feedback:
            story.genre = StoryGenre(feedback["genre"]) if isinstance(feedback["genre"], str) else feedback["genre"]
        
        if "scenes" in feedback:
            # Raffiner les scènes
            for i, scene_data in enumerate(feedback["scenes"]):
                if i < len(story.scenes):
                    for key, value in scene_data.items():
                        if hasattr(story.scenes[i], key):
                            setattr(story.scenes[i], key, value)
        
        story.updated_at = datetime.now()
        return story
