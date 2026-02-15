"""
StoryCore-Engine Story to Scenario Transformer

This module transforms raw story text into a structured cinematic scenario JSON.
Implements the complete transformation pipeline from "Histoire Brute" to "Scenario Structure".

MODULE : TRANSFORMATION HISTOIRE -> SCENARIO
FORMAT : UTF-8
SORTIE : FICHIER .json STRICTEMENT VALIDE

Requirements: Q1 2026 - Story Transformation Pipeline
"""

import json
import logging
import re
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional
from enum import Enum
from datetime import datetime
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.llm_api import call_llm_mock, LLMRequest, should_use_mock_llm

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# =============================================================================
# ENUMS
# =============================================================================

class TonType(str, Enum):
    SOMBRE = "sombre"
    HUMORISTIQUE = "humoristique"
    EPIQUE = "epique"
    ROMANTIQUE = "romantique"
    MYSTERIEUX = "mysterieux"
    DRAMATIQUE = "dramatique"
    TERRIFIANT = "terrorisant"
    NOSTALGIQUE = "nostalgique"
    OPTIMISTE = "optimiste"
    MELANCOLIQUE = "melancolique"


class SceneType(str, Enum):
    INT = "INT"
    EXT = "EXT"
    MIX = "MIX"


class MomentType(str, Enum):
    JOUR = "JOUR"
    NUIT = "NUIT"
    AUBE = "AUBE"
    CREPUSCULE = "CREPUSCULE"


class CharacterRole(str, Enum):
    PROTAGONISTE = "protagoniste"
    ANTAGONISTE = "antagoniste"
    MENTOR = "mentor"
    ALLIE = "allie"
    FIGURANT = "figurant"
    OBJET_DESIR = "objet_desir"


class RelationType(str, Enum):
    AMI = "ami"
    ENNEMI = "ennemi"
    FAMILLE = "famille"
    AMOUR = "amour"
    MENTOR = "mentor"


class LieuType(str, Enum):
    INTERIEUR = "interieur"
    EXTERIEUR = "exterieur"
    MIXTE = "mixte"


class LieuCategorie(str, Enum):
    MAISON = "maison"
    RUE = "rue"
    FORET = "foret"
    VILLE = "ville"
    BATEAU = "bateau"
    AVION = "avion"
    LABORATOIRE = "laboratoire"
    BUREAU = "bureau"
    AUTRE = "autre"


# =============================================================================
# LOCATION LOGIC LOOP ENUMS AND CLASSES
# Ref: "Writing Blueprint That Turns Generic Settings Into Compelling Worlds"
# Framework: Function → Constraints → Culture → Reputation → Emergent Details
# =============================================================================

class LocationFunction(str, Enum):
    """Primary function/purpose of a location"""
    ECONOMIC = "economic"           # Trade hub, resource extraction, market
    DEFENSIVE = "defensive"         # Fortress, garrison, watchtower
    SOCIAL = "social"               # Pilgrimage site, university, sanctuary
    LOGISTICAL = "logistical"       # Way station, refueling depot, resupply


class LocationSubFunction(str, Enum):
    """Sub-functions for more specific categorization"""
    # Economic sub-functions
    TRADE_HUB = "trade_hub"         # Crossroads of commerce
    MINING = "mining"               # Resource extraction
    FISHING = "fishing"             # Maritime resources
    AGRICULTURAL = "agricultural"  # Farming region
    MANUFACTURING = "manufacturing" # Production center
    
    # Defensive sub-functions
    FORTRESS = "fortress"           # Impregnable stronghold
    BORDER_POST = "border_post"      # Frontier garrison
    WATCHTOWER = "watchtower"       # Surveillance outpost
    SANCTUARY = "sanctuary"         # Protected refuge
    
    # Social/Religious sub-functions
    PILGRIMAGE = "pilgrimage"       # Holy site
    UNIVERSITY = "university"       # Knowledge center
    RESISTANCE = "resistance"       # Underground headquarters
    ROYAL_COURT = "royal_court"     # Political center
    
    # Logistical sub-functions
    WAYSTATION = "waystation"       # Army resupply
    SPACE_STATION = "space_station" # Space refueling
    CARAVAN_STOP = "caravan_stop"   # Trade route rest point
    COMMUNICATION = "communication" # Message relay hub


class ConstraintType(str, Enum):
    """Types of constraints a location faces"""
    ENVIRONMENTAL = "environmental"  # Weather, terrain, natural disasters
    RESOURCE_SCARCITY = "resource_scarcity"  # Missing essential resources
    EXTERNAL_THREAT = "external_threat"      # Enemies, monsters, rivals


class ExternalThreatType(str, Enum):
    """Specific external threat categories"""
    NATURAL_DISASTER = "natural_disaster"    # Earthquakes, floods, volcanoes
    MONSTERS = "monsters"                    # Dragons, creatures, supernatural
    HOSTILE_FACTION = "hostile_faction"     # Rival kingdoms, pirates, raiders
    DISEASE = "disease"                     # Plague, sickness
    ECONOMIC = "economic"                   # Blockades, trade wars


class CulturalAdaptationType(str, Enum):
    """How culture adapts to constraints"""
    ARCHITECTURE = "architecture"           # Building styles, materials
    SOCIAL_STRUCTURE = "social_structure"   # Guilds, castes, hierarchies
    RELIGION = "religion"                   # Faiths, rituals, beliefs
    LAWS = "laws"                           # Legal systems, punishments
    TECHNOLOGY = "technology"               # Tools, innovations, techniques
    TRADITIONS = "traditions"               # Festivals, customs, rituals
    FASHION = "fashion"                    # Clothing, adornment
    CUISINE = "cuisine"                    # Food, eating habits
    ARTISANry = "artisanry"                # Craft traditions, valued skills


class EclairageType(str, Enum):
    JOUR = "jour"
    NUIT = "nuit"
    AUBE = "aube"
    CREPUSCULE = "crepuscule"
    ARTIFICIEL = "artificiel"
    SOMBRE = "sombre"
    CLAIR = "clair"


class TensionLevel(str, Enum):
    BASSE = "basse"
    MOYENNE = "moyenne"
    ELEVEE = "elevee"
    CRITIQUE = "critique"


class MomentNarratif(str, Enum):
    INTRODUCTION = "introduction"
    DEVELOPPEMENT = "developpement"
    CLIMAX = "climax"
    DENOUEMENT = "denouement"


class ObjectType(str, Enum):
    OBJET_DESIR = "objet_desir"
    ARTEFACT = "artefact"
    DOCUMENT = "document"
    ARME = "arme"
    CLEF = "clef"
    MESSAGE = "message"
    ORDINATEUR = "ordinateur"
    AUTRE = "autre"


# =============================================================================
# DATA CLASSES - PERSONNAGES DÉTAILLÉS
# =============================================================================

@dataclass
class CharacterRelation:
    personnage: str
    type: str
    description: str
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class Character:
    id: int
    nom: str
    age: str
    role: str
    description: str
    objectif: str
    motivation: str
    conflit_interne: str
    conflit_externe: str
    traits: List[str]
    forces: List[str]
    faiblesses: List[str]
    secrets: str
    relations: List[Dict[str, str]]
    arc_narratif: str
    apparitions_scenes: List[int]
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# =============================================================================
# DATA CLASSES - LIEUX DÉTAILLÉS
# =============================================================================

@dataclass
class Prop:
    nom: str
    description: str
    utilisation: str
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class Lieu:
    id: int
    nom: str
    type: str
    categorie: str
    description: str
    atmosphere: str
    ambiance_sonore: List[str]
    elements_visuels: List[str]
    eclairage: str
    historique: str
    significance_narrative: str
    props: List[Dict[str, str]]
    apparitions_scenes: List[int]
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# =============================================================================
# LOCATION LOGIC LOOP DATA CLASSES
# Ref: "Writing Blueprint That Turns Generic Settings Into Compelling Worlds"
# Framework: Function → Constraints → Culture → Reputation → Emergent Details
# =============================================================================

@dataclass
class LocationConstraint:
    """Constraints that shape a location's development"""
    type: str  # environmental, resource_scarcity, external_threat
    description: str
    severity: str  # low, medium, high, critical
    impact_on_function: str  # How this constraint affects the location's primary function
    
    # Specific constraint details
    environmental_pressure: Optional[str] = None  # Weather, terrain, natural disasters
    resource_scarcity: Optional[str] = None  # What resources are lacking
    external_threat: Optional[str] = None  # Monsters, enemies, rivals
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class LocationCulture:
    """Cultural adaptations resulting from function + constraints"""
    # How the culture has adapted
    behaviors: List[str]  # Daily behaviors shaped by constraints
    traditions: List[str]  # Traditions that emerged to cope with challenges
    laws: List[str]  # Laws that address specific constraints
    technologies: List[str]  # Innovations developed to overcome limitations
    
    # Social structure shaped by constraints
    social_hierarchy: str  # How society is organized
    valued_skills: List[str]  # Skills highly valued in this culture
    revered_professions: List[str]  # Jobs that earn respect
    
    # Cultural identity
    worldview: str  # How people see their world
    attitude_towards_danger: str  # How they view the threats they face
    relationship_with_environment: str  # Harmony, struggle, adaptation
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class LocationReputation:
    """External perception vs internal reality"""
    # What outsiders believe
    external_reputation: str  # Simplified external view (e.g., "dangerous mining town")
    rumored_wealth: str  # What people think they can find here
    perceived_danger: str  # How dangerous outsiders think it is
    
    # The reality gap
    reality_vs_rumor: str  # How reality differs from reputation
    what_locals_know: str  # What locals know that outsiders don't
    
    # Local attitude towards reputation
    pride_shame: str  # Source of pride or shame
    how_locals_handle_it: str  # Do they lean into it or fight against it?
    
    # Who is attracted here
    who_comes_here: List[str]  # Who is drawn to this place (desperate, greedy, brave?)
    who_avoids: List[str]  # Who stays away
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class EmergentDetails:
    """Names, landmarks, and features that emerge from the logic"""
    # Name etymology
    name_origin: str  # Why this name (fossilized history)
    name_meaning: str  # What the name means in local terms
    historical_names: List[str]  # Previous names if any
    
    # Landmarks that emerged
    landmarks: List[Dict[str, str]]  # [{"name": "", "description": "", "significance": ""}]
    notable_buildings: List[Dict[str, str]]  # [{"name": "", "type": "", "description": ""}]
    
    # Geography shaped by function/constraints
    layout_principle: str  # How the geography serves function
    key_geographical_features: List[str]  # Mountains, rivers, etc.
    defensive_features: List[str]  # Walls, towers, etc.
    
    # Visual identity
    architectural_style: str  # Style influenced by constraints
    color_palette: List[str]  # Colors common in this place
    common_materials: List[str]  # Building materials used
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class LogicLoopLocation:
    """
    Enhanced location with full Location Logic Loop integration.
    
    This dataclass represents a location built using the 5-question framework:
    1. Function - Why does it exist?
    2. Constraints - What pressures/challenges?
    3. Culture - How do people adapt?
    4. Reputation - How do others see it?
    5. Emergent Details - Names, landmarks, geography
    """
    # Basic info (from original Lieu)
    id: int
    nom: str
    type: str
    categorie: str
    description: str
    atmosphere: str
    ambiance_sonore: List[str]
    elements_visuels: List[str]
    eclairage: str
    historique: str
    significance_narrative: str
    props: List[Dict[str, str]]
    apparitions_scenes: List[int]
    
    # LOCATION LOGIC LOOP FIELDS
    
    # Layer 1: Function
    function: str  # economic, defensive, social, logistical
    sub_function: str  # More specific category
    function_description: str  # Detailed explanation of purpose
    
    # Layer 2: Constraints
    constraints: List[Dict[str, Any]]  # List of LocationConstraint dicts
    
    # Layer 3: Culture
    culture: Dict[str, Any]  # LocationCulture dict
    
    # Layer 4: Reputation
    reputation: Dict[str, Any]  # LocationReputation dict
    
    # Layer 5: Emergent Details
    emergent_details: Dict[str, Any]  # EmergentDetails dict
    
    # Story potential
    story_hooks: List[str]  # Narrative possibilities from the logic
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "nom": self.nom,
            "type": self.type,
            "categorie": self.categorie,
            "description": self.description,
            "atmosphere": self.atmosphere,
            "ambiance_sonore": self.ambiance_sonore,
            "elements_visuels": self.elements_visuels,
            "eclairage": self.eclairage,
            "historique": self.historique,
            "significance_narrative": self.significance_narrative,
            "props": self.props,
            "apparitions_scenes": self.apparitions_scenes,
            # Location Logic Loop
            "function": {
                "primary": self.function,
                "sub_function": self.sub_function,
                "description": self.function_description
            },
            "constraints": self.constraints,
            "culture": self.culture,
            "reputation": self.reputation,
            "emergent_details": self.emergent_details,
            "story_hooks": self.story_hooks
        }


# =============================================================================
# DATA CLASSES - OBJETS/ARTEFACTS
# =============================================================================

@dataclass
class StoryObject:
    id: int
    nom: str
    type: str
    description: str
    pouvoir_capacite: str
    proprietaire_actuel: str
    proprietaire_precedent: str
    significance: str
    histoire: str
    apparitions_scenes: List[int]
    utilisation_narrative: str
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# =============================================================================
# DATA CLASSES - STRUCTURE NARRATIVE
# =============================================================================

@dataclass
class ActeInfo:
    titre: str
    description: str
    duree: str
    points_cle: List[str]
    sequences_ids: List[int]
    
    # Optional fields for acte 2 and 3
    midpoint: Optional[str] = None
    climax: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class NarrativeStructure:
    acte_1: Dict[str, Any]
    acte_2: Dict[str, Any]
    acte_3: Dict[str, Any]
    themes_principaux: List[str]
    themes_secondaires: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# =============================================================================
# DATA CLASSES - SÉQUENCES
# =============================================================================

@dataclass
class Sequence:
    id: int
    titre: str
    acte: int
    objectif: str
    lieu_principal: str
    lieu_id: int
    moment_journee: str
    duree_approx: str
    personnages: List[str]
    personnages_ids: List[int]
    resume: str
    description_detaillee: str
    actions_cles: List[str]
    dialogues_cles: List[str]
    tension: str
    progression_narrative: str
    scenes_ids: List[int]
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# =============================================================================
# DATA CLASSES - SCÈNES DÉTAILLÉES
# =============================================================================

@dataclass
class Dialogue:
    personnage: str
    texte: str
    ton: str
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class CameraInfo:
    mouvement: str
    angle: str
    plan: str
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ActionDetail:
    ordre: int
    description: str
    personnages: List[str]
    camera: Dict[str, str]
    dialogues: List[Dict[str, str]]
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ElementVisuel:
    type: str
    description: str
    importance: str
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class AmbianceSonore:
    musique: str
    bruitages: List[str]
    silence: bool
    intensite: str
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class PersonnagePresent:
    id: int
    nom: str
    presence: str
    focalisation: bool
    temps_ecran: str
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ProgressionScene:
    etat: str
    tension: str
    emotion: str
    information_revelee: str
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class LiensScene:
    scene_precedente: int
    scene_suivante: int
    type_lien: str
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class NotesScene:
    realisation: str
    dialogues: str
    technique: str
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class Scene:
    id: int
    sequence_id: int
    numero: int
    type: str
    lieu: str
    lieu_id: int
    moment: str
    duree_estimee: str
    description: str
    description_visuelle: str
    moment_narratif: str
    actions: List[Dict[str, Any]]
    elements_visuels: List[Dict[str, str]]
    ambiance_sonore: Dict[str, Any]
    personnagespresents: List[Dict[str, Any]]
    progression: Dict[str, str]
    liens: Dict[str, Any]
    notes: Dict[str, str]
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# =============================================================================
# DATA CLASSES - META & SCÉNARIO COMPLET
# =============================================================================

@dataclass
class MetaInfo:
    titre: str
    pitch: str
    theme: str
    sous_themes: List[str]
    ton: str
    ton_precisions: List[str]
    enjeux: List[str]
    version: str = "1.0"
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class StructuredScenario:
    meta: Dict[str, Any]
    personnages: List[Dict[str, Any]]
    lieux: List[Dict[str, Any]]
    objets: List[Dict[str, Any]]
    structure: Dict[str, Any]
    sequences: List[Dict[str, Any]]
    scenes: List[Dict[str, Any]]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "meta": self.meta,
            "personnages": self.personnages,
            "lieux": self.lieux,
            "objets": self.objets,
            "structure": self.structure,
            "sequences": self.sequences,
            "scenes": self.scenes
        }
    
    def to_json(self, encoding: str = "utf-8") -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=2)
    
    def save_to_file(self, filepath: str) -> bool:
        try:
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(self.to_json())
            logger.info(f"Scenario saved to {filepath}")
            return True
        except Exception as e:
            logger.error(f"Failed to save scenario: {e}")
            return False


# =============================================================================
# ANALYZERS
# =============================================================================

class StoryAnalyzer:
    def __init__(self, raw_story: str):
        self.raw_story = raw_story
        self.lines = [l.strip() for l in raw_story.split('\n') if l.strip()]
        self.title = self._extract_title()
        
    def _extract_title(self) -> str:
        for line in self.lines[:5]:
            if len(line) < 100 and not line.endswith('.'):
                return line
        return "Histoire Sans Titre"
    
    def extract_pitch(self) -> str:
        if should_use_mock_llm():
            return self._generate_pitch_with_llm()
        return self._generate_pitch_heuristic()
    
    def _generate_pitch_with_llm(self) -> str:
        prompt = f"Genere un pitch cinematographique pour cette histoire (2-3 phrases):\n\n{self.raw_story[:2000]}"
        try:
            import asyncio
            request = LLMRequest(prompt=prompt, model="gpt-4", temperature=0.7, max_tokens=200)
            response = asyncio.get_event_loop().run_until_complete(call_llm_mock(request, "system"))
            return response.text.strip()
        except:
            return self._generate_pitch_heuristic()
    
    def _generate_pitch_heuristic(self) -> str:
        story_lower = self.raw_story.lower()
        conflicts = [w for w in ['conflit', 'combat', 'mystere', 'danger', 'quete', 'amour'] if w in story_lower]
        chars = self.extract_characters_heuristic()
        if len(chars) >= 2:
            return f"Dans {self.title}, {chars[0]} affronte {', '.join(chars[1:3])} dans un recit de {conflicts[0] if conflicts else 'aventure'}."
        return f"{self.title}: Une histoire captivante aux enjeux majeurs."
    
    def extract_theme(self) -> tuple:
        story = self.raw_story.lower()
        themes_map = {
            "amour": ["amour", "passion", "coeur"], "courage": ["courage", "heroisme"],
            "survie": ["survie", "danger"], "justice": ["justice", "verite"],
            "identite": ["identite", "qui suis-je"], "pouvoir": ["pouvoir", "autorite"],
            "liberte": ["liberte", "emancipation"], "famille": ["famille", "heritage"],
            "redemption": ["redemption", "pardon"], "mystere": ["mystere", "secret"]
        }
        themes = []
        for theme, kws in themes_map.items():
            if any(kw in story for kw in kws):
                themes.append(theme)
        return (themes[0] if themes else "aventure", themes)
    
    def extract_ton(self) -> tuple:
        story = self.raw_story.lower()
        tones_map = {
            "sombre": ["sombre", "mort", "tragique"], "humoristique": ["drole", "humour"],
            "epique": ["epique", "heroique"], "romantique": ["amour", "passion"],
            "mysterieux": ["mystere", "secret"], "dramatique": ["drame", "tension"],
            "terrorisant": ["terreur", "horreur"], "nostalgique": ["nostalgie", "souvenir"],
            "optimiste": ["espoir", "lumiere"]
        }
        tones = []
        for ton, kws in tones_map.items():
            if any(kw in story for kw in kws):
                tones.append(ton)
        return (tones[0] if tones else "dramatique", tones)
    
    def extract_enjeux(self) -> List[str]:
        story = self.raw_story.lower()
        enjeux = []
        if any(w in story for w in ['mort', 'survie']): enjeux.append("Enjeu de vie ou de mort")
        if any(w in story for w in ['amour', 'passion']): enjeux.append("Amour et attachement")
        if any(w in story for w in ['pouvoir', 'autorite']): enjeux.append("Pouvoir et autorite")
        if any(w in story for w in ['justice', 'verite']): enjeux.append("Justice et verite")
        if any(w in story for w in ['liberte', 'prison']): enjeux.append("Liberte et captivate")
        if any(w in story for w in ['famille', 'heritage']): enjeux.append("Famille et heritage")
        if any(w in story for w in ['secret', 'mystere']): enjeux.append("Secret et mysterieux")
        return enjeux if enjeux else ["Survie et transformation"]
    
    def extract_characters_heuristic(self) -> List[str]:
        chars = []
        for line in self.lines:
            if re.match(r'^[A-Z][a-zA-Z]+(\s+[A-Z][a-zA-Z]+)?\s*[:\-]', line):
                name = re.split(r'[:\-]', line)[0].strip()
                if name and name not in chars:
                    chars.append(name)
        return chars[:15]
    
    def extract_locations_heuristic(self) -> List[str]:
        locs = []
        loc_patterns = ['maison', 'rue', 'ville', 'foret', 'laboratoire', 'hopital', 'ecole', 
                        'bureau', 'restaurant', 'plage', 'montagne', 'riviere', 'usine', 
                        'gare', 'aeroport', 'immeuble', 'appartement', 'chateau']
        for line in self.lines:
            for loc in loc_patterns:
                if loc in line.lower() and loc not in locs:
                    locs.append(loc)
        return locs
    
    def extract_objects_heuristic(self) -> List[str]:
        obj_patterns = ['lettre', 'document', 'arme', 'cle', 'bijou', 'medaille', 'journal', 
                       'carte', 'bouteille', 'boite', 'sac', 'telephone', 'ordinateur', 
                       'dossier', 'fichier', 'photo', 'bijoux', 'montre', 'pendentif', 'bourse']
        objs = []
        for line in self.lines:
            for obj in obj_patterns:
                if obj in line.lower() and obj not in objs:
                    objs.append(obj)
        return objs


# =============================================================================
# MAIN TRANSFORMER
# =============================================================================

class StoryTransformer:
    def __init__(self, raw_story: str, title: Optional[str] = None):
        self.raw_story = raw_story
        self.title = title or "Histoire Sans Titre"
        self.analyzer = StoryAnalyzer(raw_story)
        self.characters_data = []
        self.locations_data = []
        self.objects_data = []
    
    def transform(self) -> StructuredScenario:
        logger.info(f"Starting transformation: {self.title}")
        
        # Extract meta
        theme, sous_themes = self.analyzer.extract_theme()
        ton, ton_precisions = self.analyzer.extract_ton()
        meta = {
            "titre": self.title,
            "pitch": self.analyzer.extract_pitch(),
            "theme": theme,
            "sous_themes": sous_themes,
            "ton": ton,
            "ton_precisions": ton_precisions,
            "enjeux": self.analyzer.extract_enjeux(),
            "version": "1.0",
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Extract characters
        char_names = self.analyzer.extract_characters_heuristic()
        self.characters_data = self._build_detailed_characters(char_names)
        
        # Extract locations
        loc_names = self.analyzer.extract_locations_heuristic()
        self.locations_data = self._build_detailed_locations(loc_names)
        
        # Extract objects
        obj_names = self.analyzer.extract_objects_heuristic()
        self.objects_data = self._build_detailed_objects(obj_names)
        
        # Build structure
        structure = self._build_structure()
        
        # Build sequences
        sequences = self._build_sequences()
        
        # Build scenes
        scenes = self._build_scenes(sequences)
        
        logger.info(f"Transformation complete: {len(self.characters_data)} chars, {len(self.locations_data)} locs, {len(scenes)} scenes")
        
        return StructuredScenario(
            meta=meta,
            personnages=self.characters_data,
            lieux=self.locations_data,
            objets=self.objects_data,
            structure=structure,
            sequences=sequences,
            scenes=scenes
        )
    
    def _build_detailed_characters(self, names: List[str]) -> List[Dict[str, Any]]:
        chars = []
        for i, name in enumerate(names, 1):
            role = CharacterRole.PROTAGONISTE.value if i == 1 else (
                CharacterRole.ANTAGONISTE.value if i == 2 else 
                CharacterRole.ALLIE.value if i == 3 else CharacterRole.FIGURANT.value
            )
            chars.append({
                "id": i,
                "nom": name,
                "age": "Inconnu",
                "role": role,
                "description": f"Personnage important de l'histoire",
                "objectif": "Accomplir sa destinee",
                "motivation": "Survivre et prosperer",
                "conflit_interne": "Trouver sa place",
                "conflit_externe": "Obstacles et antagonistes",
                "traits": [], "forces": [], "faiblesses": [],
                "secrets": "",
                "relations": [],
                "arc_narratif": f"Evolution de {name}",
                "apparitions_scenes": []
            })
        return chars
    
    def _build_detailed_locations(self, names: List[str]) -> List[Dict[str, Any]]:
        locs = []
        for i, name in enumerate(names, 1):
            is_interieur = any(w in name.lower() for w in ['maison', 'bureau', 'laboratoire', 'appartement', 'immeuble'])
            locs.append({
                "id": i,
                "nom": name,
                "type": LieuType.INTERIEUR.value if is_interieur else LieuType.EXTERIEUR.value,
                "categorie": LieuCategorie.AUTRE.value,
                "description": f"Lieu important de l'histoire",
                "atmosphere": "Mysterieuse",
                "ambiance_sonore": [],
                "elements_visuels": [],
                "eclairage": EclairageType.JOUR.value,
                "historique": "Lieu charge d'histoire",
                "significance_narrative": f"{name} joue un role cle",
                "props": [],
                "apparitions_scenes": []
            })
        return locs
    
    def _build_detailed_objects(self, names: List[str]) -> List[Dict[str, Any]]:
        objs = []
        for i, name in enumerate(names, 1):
            obj_type = ObjectType.AUTRE.value
            if any(w in name.lower() for w in ['document', 'dossier', 'fichier']):
                obj_type = ObjectType.DOCUMENT.value
            elif any(w in name.lower() for w in ['arme', 'pistolet', 'couteau']):
                obj_type = ObjectType.ARME.value
            elif any(w in name.lower() for w in ['cle', 'cles']):
                obj_type = ObjectType.CLEF.value
            elif any(w in name.lower() for w in ['lettre', 'message', 'carte']):
                obj_type = ObjectType.MESSAGE.value
            elif any(w in name.lower() for w in ['ordinateur', 'ordinateur portable']):
                obj_type = ObjectType.ORDINATEUR.value
                
            objs.append({
                "id": i,
                "nom": name,
                "type": obj_type,
                "description": f"Objet important",
                "pouvoir_capacite": "",
                "proprietaire_actuel": "",
                "proprietaire_precedent": "",
                "significance": f"{name} est crucial pour l'histoire",
                "histoire": "",
                "apparitions_scenes": [],
                "utilisation_narrative": ""
            })
        return objs
    
    def _build_structure(self) -> Dict[str, Any]:
        theme = self.analyzer.extract_theme()[0]
        return {
            "acte_1": {
                "titre": "La Mise en Place",
                "description": "Introduction du monde et des personnages",
                "duree": "25%",
                "points_cles": ["Presentation du monde", "Appel a l'aventure"],
                "sequences_ids": [1, 2, 3]
            },
            "acte_2": {
                "titre": "La Confrontation",
                "description": "Les obstacles et le midpoint",
                "duree": "50%",
                "points_cles": ["Premiers defis", "Midpoint", "Crise"],
                "midpoint": "Revelation majeure",
                "sequences_ids": [4, 5, 6, 7]
            },
            "acte_3": {
                "titre": "La Resolution",
                "description": "Climax et denouement",
                "duree": "25%",
                "points_cles": ["Climax", "Resolution"],
                "climax": "Affrontement final",
                "sequences_ids": [8, 9, 10]
            },
            "themes_principaux": [theme],
            "themes_secondaires": []
        }
    
    def _build_sequences(self) -> List[Dict[str, Any]]:
        seq_defs = [
            (1, "L'Ordinaire", 1, "Presenter le monde", "Monde familier", "jour", 1),
            (2, "L'Appel", 1, "Declencheur", "Lieu du trigger", "jour", 1),
            (3, "La Decision", 1, "Reflexion", "Espace prive", "nuit", 1),
            (4, "La Traverse", 2, "Entre dans le monde", "Frontiere", "jour", 2),
            (5, "Premier Defi", 2, "Obstacle initial", "Nouveau monde", "jour", 2),
            (6, "Les Allies", 2, "Rencontres", "Point de rencontre", "jour", 3),
            (7, "La Crise", 2, "Midpoint", "Lieu de crise", "nuit", 1),
            (8, "Le Climax", 3, "Affrontement final", "Lieu final", "nuit", 4),
            (9, "Resolution", 3, "Denouement", "Nouveau monde", "jour", 2),
            (10, "Le Nouveau Monde", 3, "Conclusion", "Point final", "jour", 1)
        ]
        return [
            {
                "id": sid, "titre": title, "acte": acte, "objectif": obj,
                "lieu_principal": lieu, "lieu_id": lid, "moment_journee": moment,
                "duree_approx": "5-10 min", "personnages": [c["nom"] for c in self.characters_data],
                "personnages_ids": [c["id"] for c in self.characters_data],
                "resume": f"Sequence {title}", "description_detaillee": f"Description de {title}",
                "actions_cles": [], "dialogues_cles": [], "tension": TensionLevel.MOYENNE.value,
                "progression_narrative": f"Progression de {title}", "scenes_ids": []
            }
            for sid, title, acte, obj, lieu, moment, lid in seq_defs
        ]
    
    def _build_scenes(self, sequences: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        scenes = []
        scene_id = 1
        for seq in sequences:
            for i in range(2):
                scene = {
                    "id": scene_id, "sequence_id": seq["id"], "numero": i + 1,
                    "type": SceneType.EXT.value if i % 2 == 0 else SceneType.INT.value,
                    "lieu": seq["lieu_principal"], "lieu_id": seq["lieu_id"],
                    "moment": MomentType.JOUR.value if i % 2 == 0 else MomentType.NUIT.value,
                    "duree_estimee": "2-5 min", "description": f"Scene {i+1} de {seq['titre']}",
                    "description_visuelle": f"Visuel de la scene", "moment_narratif": MomentNarratif.DEVELOPPEMENT.value,
                    "actions": [{"ordre": 1, "description": "Action principale", "personnages": [], "camera": {"mouvement": "", "angle": "", "plan": ""}, "dialogues": []}],
                    "elements_visuels": [{"type": "decor", "description": "", "importance": "moyenne"}],
                    "ambiance_sonore": {"musique": "", "bruitages": [], "silence": False, "intensite": "moyenne"},
                    "personnagespresents": [{"id": 1, "nom": "", "presence": "principale", "focalisation": True, "temps_ecran": ""}],
                    "progression": {"etat": "developpement", "tension": "moyenne", "emotion": "", "information_revelee": ""},
                    "liens": {"scene_precedente": max(0, scene_id - 1), "scene_suivante": scene_id + 1, "type_lien": "continuite"},
                    "notes": {"realisation": "", "dialogues": "", "technique": ""}
                }
                scenes.append(scene)
                scene_id += 1
        return scenes


def transform_story_to_scenario(raw_story: str, title: Optional[str] = None) -> StructuredScenario:
    return StoryTransformer(raw_story, title).transform()


# =============================================================================
# LOCATION LOGIC LOOP GENERATOR
# Ref: "Writing Blueprint That Turns Generic Settings Into Compelling Worlds"
# Framework: Function → Constraints → Culture → Reputation → Emergent Details
# =============================================================================

def generate_logic_loop_location(
    location_name: str,
    genre: str,
    tone: str,
    function: str,
    constraints: List[Dict[str, Any]],
    story_context: str = ""
) -> Dict[str, Any]:
    """
    Generate a complete location using the Location Logic Loop framework.
    
    This function creates a location by applying the 5-question framework:
    1. Function - Why does it exist?
    2. Constraints - What pressures/challenges?
    3. Culture - How do people adapt?
    4. Reputation - How do others see it?
    5. Emergent Details - Names, landmarks, geography
    
    Args:
        location_name: Name of the location
        genre: Story genre (fantasy, sci-fi, etc.)
        tone: Story tone (dark, light, gritty, etc.)
        function: Primary function (economic, defensive, social, logistical)
        constraints: List of constraint dicts with type, description, severity
        story_context: Optional additional story context
    
    Returns:
        Complete LogicLoopLocation dict with all layers populated
    """
    # Determine type and category based on function
    is_interieur = any(w in location_name.lower() for w in ['maison', 'bureau', 'laboratoire', 'appartement', 'chambre', 'salle'])
    loc_type = LieuType.INTERIEUR.value if is_interieur else LieuType.EXTERIEUR.value
    loc_categorie = LieuCategorie.AUTRE.value
    
    # Determine sub_function based on function and name
    sub_function = _infer_sub_function(location_name, function)
    
    # Build function description
    function_description = _build_function_description(location_name, function, sub_function)
    
    # Generate culture from function + constraints
    culture = _generate_culture(function, constraints, tone)
    
    # Generate reputation from function + constraints + culture
    reputation = _generate_reputation(function, constraints, culture, location_name)
    
    # Generate emergent details from all above
    emergent_details = _generate_emergent_details(
        location_name, function, sub_function, constraints, culture, genre
    )
    
    # Generate story hooks
    story_hooks = _generate_story_hooks(function, constraints, culture, reputation)
    
    # Build atmosphere based on constraints and tone
    atmosphere = _derive_atmosphere(constraints, tone, function)
    
    # Build soundscape based on function and constraints
    ambiance_sonore = _derive_soundscape(function, constraints)
    
    # Build visual elements
    elements_visuels = _derive_visual_elements(emergent_details, function, constraints)
    
    # Determine lighting
    eclairage = _derive_lighting(constraints, function)
    
    # Build historical context
    historique = _build_history(location_name, function, constraints, emergent_details)
    
    # Determine narrative significance
    significance_narrative = _derive_significance(location_name, function, constraints, story_context)
    
    # Create the full location dict
    location = {
        "id": 1,
        "nom": location_name,
        "type": loc_type,
        "categorie": loc_categorie,
        "description": f"{location_name}: {function_description[:100]}...",
        "atmosphere": atmosphere,
        "ambiance_sonore": ambiance_sonore,
        "elements_visuels": elements_visuels,
        "eclairage": eclairage,
        "historique": historique,
        "significance_narrative": significance_narrative,
        "props": [],
        "apparitions_scenes": [],
        # Location Logic Loop
        "function": {
            "primary": function,
            "sub_function": sub_function,
            "description": function_description
        },
        "constraints": constraints,
        "culture": culture,
        "reputation": reputation,
        "emergent_details": emergent_details,
        "story_hooks": story_hooks
    }
    
    return location


def _infer_sub_function(name: str, primary_function: str) -> str:
    """Infer sub-function based on name and primary function"""
    name_lower = name.lower()
    
    if primary_function == "economic":
        if any(w in name_lower for w in ['mine', 'mineur', 'cristal', 'or', 'argent']):
            return "mining"
        elif any(w in name_lower for w in ['port', 'marche', 'commerce', 'route']):
            return "trade_hub"
        elif any(w in name_lower for w in ['ferme', 'agri', 'champ']):
            return "agricultural"
        return "trade_hub"
    
    elif primary_function == "defensive":
        if any(w in name_lower for w in ['fort', 'citadel', 'bastion']):
            return "fortress"
        elif any(w in name_lower for w in ['tour', 'guet', 'surveill']):
            return "watchtower"
        elif any(w in name_lower for w in ['frontiere', 'bord', 'limite']):
            return "border_post"
        return "fortress"
    
    elif primary_function == "social":
        if any(w in name_lower for w in ['temple', 'pilier', 'sacré', 'saint']):
            return "pilgrimage"
        elif any(w in name_lower for w in ['universite', 'bibliotheque', 'sage']):
            return "university"
        elif any(w in name_lower for w in ['refuge', 'sanctuaire', 'abri']):
            return "sanctuary"
        return "pilgrimage"
    
    elif primary_function == "logistical":
        if any(w in name_lower for w in ['station', 'depot', 'ravitail']):
            return "waystation"
        elif any(w in name_lower for w in ['caravane', 'relais']):
            return "caravan_stop"
        return "waystation"
    
    return "trade_hub"


def _build_function_description(name: str, function: str, sub_function: str) -> str:
    """Build detailed function description"""
    descriptions = {
        "economic": {
            "mining": f"{name} exists to extract precious resources from the earth. It was established at a location rich in minerals or magical crystals, and everything about it serves the extraction industry.",
            "trade_hub": f"{name} exists as a crossroads of commerce. Merchants, travelers, and traders converge here because of its strategic location, making it essential for the flow of goods.",
            "agricultural": f"{name} exists to cultivate and harvest the land. Its purpose is to produce food and resources that sustain the region.",
        },
        "defensive": {
            "fortress": f"{name} exists to provide impregnable defense. It was built to withstand siege and protect what lies behind its walls.",
            "watchtower": f"{name} exists to watch and warn. From its vantage point, guardians survey the horizon for approaching threats.",
            "border_post": f"{name} exists to control who enters and exits. It is the first line of defense and the last checkpoint before the unknown.",
        },
        "social": {
            "pilgrimage": f"{name} exists as a sacred destination. People travel here seeking spiritual connection, healing, or divine intervention.",
            "university": f"{name} exists to gather and share knowledge. Scholars, students, and seekers of wisdom come to learn and teach.",
            "sanctuary": f"{name} exists to protect those who cannot protect themselves. It offers refuge to the persecuted, the desperate, the seeking.",
        },
        "logistical": {
            "waystation": f"{name} exists to resupply and refresh. Armies, travelers, and merchants stop here to rest, refuel, and continue their journey.",
            "caravan_stop": f"{name} exists as a rest point on long routes. Those traveling far find shelter and provisions here.",
        }
    }
    
    func_descriptions = descriptions.get(function, {})
    return func_descriptions.get(sub_function, f"{name} serves a specific purpose defined by its function as a {function} location.")


def _generate_culture(function: str, constraints: List[Dict[str, Any]], tone: str) -> Dict[str, Any]:
    """Generate culture based on function + constraints"""
    
    # Determine social hierarchy based on function
    hierarchy_by_function = {
        "economic": "Guild-based system where merchants and artisans hold power alongside local nobles",
        "defensive": "Military hierarchy with warriors and strategists at the top",
        "social": "Meritocratic system valuing wisdom, spirituality, or lineage depending on type",
        "logistical": "Efficiency-focused hierarchy where organizers and providers are valued"
    }
    
    # Determine valued skills based on constraints
    valued_skills = ["Navigation", "Local knowledge"]
    revered_professions = []
    
    for constraint in constraints:
        ctype = constraint.get("type", "")
        if ctype == "environmental":
            valued_skills.extend(["Survival", "Weather reading", "Terrain navigation"])
        elif ctype == "resource_scarcity":
            valued_skills.extend(["Conservation", "Resource management", "Trade negotiation"])
            revered_professions.append("Traders who bring scarce resources")
        elif ctype == "external_threat":
            valued_skills.extend(["Combat", "Vigilance", "Self-defense"])
            revered_professions.append("Warriors and guards")
    
    # Add function-specific revered professions
    func_professions = {
        "economic": ["Merchants", "Artisans", "Miners"],
        "defensive": ["Soldiers", "Strategists", "Watchmen"],
        "social": ["Priests", "Scholars", "Healers"],
        "logistical": ["Guides", "Stablemasters", "Suppliers"]
    }
    revered_professions.extend(func_professions.get(function, []))
    
    # Generate worldview based on constraints and tone
    danger_count = sum(1 for c in constraints if c.get("severity") in ["high", "critical"])
    
    if danger_count > 0:
        worldview = f"A people who understand that survival requires constant vigilance. They know the world is harsh and only the prepared endure."
    else:
        worldview = f"A people shaped by their purpose. They see their role in the world as essential to something larger than themselves."
    
    # Attitude towards danger
    if tone == "dark":
        attitude = "They view danger as an old companion—expected, respected, but never fully accepted."
    elif tone == "hopeful":
        attitude = "They believe every challenge can be overcome with ingenuity and community."
    else:
        attitude = "They've learned to balance respect for danger with the determination to thrive."
    
    # Relationship with environment
    env_pressure = any(c.get("type") == "environmental" for c in constraints)
    if env_pressure:
        relationship = "A relationship of constant negotiation—with nature as both adversary and provider."
    else:
        relationship = "Harmony with their surroundings, shaped by generations of adaptation."
    
    return {
        "behaviors": [
            f"Daily routines adapted to {constraints[0].get('type', 'challenges') if constraints else 'their purpose'}",
            "Customs that mark the turning of seasons or shifts in fortune",
            "Rituals that connect them to their ancestors and their purpose"
        ],
        "traditions": [
            "Celebrations tied to their function",
            "Remembrance of those lost to their purpose",
            "Passing down of essential skills to the young"
        ],
        "laws": [
            "Strict rules protecting their core function",
            "Hospitality laws for travelers and traders",
            "Punishments severe for those who threaten their survival"
        ],
        "technologies": [
            "Tools specialized for their function",
            "Innovations born from necessity",
            "Techniques refined over generations"
        ],
        "social_hierarchy": hierarchy_by_function.get(function, "A structured society"),
        "valued_skills": list(set(valued_skills)),
        "revered_professions": list(set(revered_professions)),
        "worldview": worldview,
        "attitude_towards_danger": attitude,
        "relationship_with_environment": relationship
    }


def _generate_reputation(function: str, constraints: List[Dict[str, Any]], culture: Dict[str, Any], name: str) -> Dict[str, Any]:
    """Generate reputation based on function + constraints + culture"""
    
    # External reputation based on function
    func_reputations = {
        "economic": f"A place where fortunes can be made—or lost. {name} draws the desperate and the ambitious.",
        "defensive": f"A stronghold that outsiders either respect or fear. {name} is known for its warriors.",
        "social": f"A destination of spiritual or intellectual significance. {name} attracts seekers.",
        "logistical": f"A necessary stop on the road. Travelers know to expect shelter but not luxury."
    }
    
    external = func_reputations.get(function, f"{name} is known among those who travel here.")
    
    # Rumored wealth
    rumored_wealth = {
        "economic": "Rich in trade goods, rare materials, or the fruits of labor",
        "defensive": "Weapons, training, and the security that comes from strength",
        "social": "Wisdom, healing, or spiritual riches unavailable elsewhere",
        "logistical": "Supplies, rest, and the opportunity to continue one's journey"
    }
    
    # Perceived danger
    danger_severities = [c.get("severity") for c in constraints if c.get("type") == "external_threat"]
    if "critical" in danger_severities or "high" in danger_severities:
        perceived_danger = "Known as genuinely dangerous. Outsiders approach with real caution."
    elif danger_severities:
        perceived_danger = "Respected as having real risks, but manageable for the prepared."
    else:
        perceived_danger = "Generally safe, with ordinary precautions."
    
    # Reality vs rumor
    reality_gap = "The reality is more nuanced than rumors suggest. "
    if culture.get("worldview"):
        reality_gap += "Locals understand truths that outsiders miss."
    
    # What locals know
    what_locals = "They know which paths are safe, which strangers can be trusted, and how to read the signs that others miss."
    
    # Pride or shame
    pride_shame = f"Source of quiet pride. They know what they've built and what it costs to maintain."
    
    # How locals handle reputation
    how_handled = "They neither confirm nor deny the rumors. Let outsiders believe what they will."
    
    # Who comes here
    who_comes = ["Traders seeking profit", "Travelers needing rest"]
    if any(c.get("type") == "resource_scarcity" for c in constraints):
        who_comes.append("Those desperate enough to risk everything")
    
    # Who avoids
    who_avoids = ["Those who fear genuine challenge", "The comfortable who prefer certainty"]
    
    return {
        "external_reputation": external,
        "rumored_wealth": rumored_wealth.get(function, "Various riches"),
        "perceived_danger": perceived_danger,
        "reality_vs_rumor": reality_gap,
        "what_locals_know": what_locals,
        "pride_shame": pride_shame,
        "how_locals_handle_it": how_handled,
        "who_comes_here": who_comes,
        "who_avoids": who_avoids
    }


def _generate_emergent_details(
    name: str,
    function: str,
    sub_function: str,
    constraints: List[Dict[str, Any]],
    culture: Dict[str, Any],
    genre: str
) -> Dict[str, Any]:
    """Generate emergent details (names, landmarks, geography) from the logic"""
    
    # Name origin (fossilized history)
    name_origin = f"The name '{name}' originates from the language of the founders, reflecting their original purpose."
    name_meaning = "The name suggests purpose, struggle, or aspiration—whichever defined those who first settled here."
    
    # Generate landmarks based on function
    landmarks = []
    func_landmarks = {
        "economic": [
            {"name": "Market Square", "description": "The heart of commerce where deals are struck", "significance": "Center of all economic activity"},
            {"name": "Merchant's Guild Hall", "description": "Where traders gather to set prices", "significance": "Power center of the economy"}
        ],
        "defensive": [
            {"name": "The Walls", "description": "Imposing barriers that have stood for generations", "significance": "Symbol of security and determination"},
            {"name": "Watchtower", "description": "The highest point, watching for threats", "significance": "Eyes of the community"}
        ],
        "social": [
            {"name": "The Sacred Site", "description": "Where spiritual practices occur", "significance": "Heart of the community's faith"},
            {"name": "Hall of Gathering", "description": "Where communities meet and decide", "significance": "Center of social life"}
        ],
        "logistical": [
            {"name": "The Resting Grounds", "description": "Where travelers camp and recover", "significance": "Essential to the location's purpose"},
            {"name": "Supply Depot", "description": "Storage for provisions", "significance": "What makes continued travel possible"}
        ]
    }
    landmarks = func_landmarks.get(function, [])
    
    # Add constraint-influenced landmarks
    for constraint in constraints:
        if constraint.get("type") == "external_threat":
            landmarks.append({
                "name": "Memorial of the Fallen",
                "description": "A place honoring those lost to threats",
                "significance": "Reminder of what protection costs"
            })
        elif constraint.get("type") == "environmental":
            landmarks.append({
                "name": "Shelter of the Storm",
                "description": "Refuge from the environmental dangers",
                "significance": "Proof that they can survive anything"
            })
    
    # Notable buildings
    notable_buildings = []
    for lm in landmarks[:2]:
        notable_buildings.append({
            "name": lm["name"],
            "type": "Landmark",
            "description": lm["description"]
        })
    
    # Geography based on function
    layout_principle = "Organized around the primary function, with everything serving the core purpose."
    geo_features = ["The surrounding terrain that defines their world"]
    defensive_features = []
    
    if function == "defensive":
        layout_principle = "Built for defense first, with sightlines and barriers in mind."
        geo_features = ["Natural barriers that enhance defense", "Elevated positions", "Water sources that can be controlled"]
        defensive_features = ["Walls", "Towers", "Barriers", "Controlled entry points"]
    elif function == "economic":
        layout_principle = "Built for access, with trade routes flowing through."
        geo_features = ["Strategic crossroads", "Natural harbors or roads", "Resource deposits nearby"]
    
    # Visual identity
    style_by_genre = {
        "fantasy": "Stone and wood, with organic curves and mystical touches",
        "sci-fi": "Metallic surfaces, geometric patterns, and functional design",
        "horror": "Dark surfaces, oppressive architecture, and shadowed spaces",
        "romantic": "Flowing lines, natural materials, and beautiful details"
    }
    architectural_style = style_by_genre.get(genre, "Practical construction suited to their needs")
    
    color_palette = ["Earth tones", "Weathered surfaces", "Functional colors"]
    if function == "economic":
        color_palette = ["Rich colors of trade goods", "Gold and silver accents", "Vibrant market colors"]
    elif function == "defensive":
        color_palette = ["Stark grays", "Weathered stone", "Dark metals"]
    
    common_materials = {
        "economic": ["Wood", "Stone", "Import materials"],
        "defensive": ["Stone", "Iron", "Reinforced materials"],
        "social": ["Sacred materials appropriate to faith", "Artistic representations", "Historic stones"],
        "logistical": ["Practical materials", "Repairable structures", "Functional designs"]
    }
    common_materials = common_materials.get(function, ["Local materials"])
    
    return {
        "name_origin": name_origin,
        "name_meaning": name_meaning,
        "historical_names": [],
        "landmarks": landmarks,
        "notable_buildings": notable_buildings,
        "layout_principle": layout_principle,
        "key_geographical_features": geo_features,
        "defensive_features": defensive_features,
        "architectural_style": architectural_style,
        "color_palette": color_palette,
        "common_materials": common_materials
    }


def _generate_story_hooks(function: str, constraints: List[Dict[str, Any]], culture: Dict[str, Any], reputation: Dict[str, Any]) -> List[str]:
    """Generate narrative hooks based on the Location Logic Loop analysis"""
    
    hooks = []
    
    # Function-based hooks
    func_hooks = {
        "economic": [
            "A merchant arrives with a secret that could destabilize the local economy",
            "A new trade route threatens to bypass the location entirely"
        ],
        "defensive": [
            "The ancient defenses are tested by a threat no one anticipated",
            "A spy infiltrates, seeking to understand the true strength of the fortress"
        ],
        "social": [
            "A heretical question challenges the foundational beliefs of the community",
            "A seeker arrives claiming to have proof that the sacred site is elsewhere"
        ],
        "logistical": [
            "The supply lines are cut, forcing impossible choices",
            "A VIP arrives requiring protection through dangerous territory"
        ]
    }
    hooks.extend(func_hooks.get(function, []))
    
    # Constraint-based hooks
    for constraint in constraints:
        ctype = constraint.get("type", "")
        severity = constraint.get("severity", "medium")
        
        if ctype == "external_threat":
            hooks.append(f"The external threat escalates: {constraint.get('description', 'The danger grows')}")
        elif ctype == "resource_scarcity":
            hooks.append(f"Resource scarcity reaches crisis levels. Someone must make a terrible choice.")
        elif ctype == "environmental":
            hooks.append(f"The environment becomes hostile: {constraint.get('description', 'Nature turns against them')}")
    
    # Culture-based hooks
    if culture.get("secrets"):
        hooks.append(f"A secret from the culture's past resurfaces, challenging everything they believed.")
    
    # Reputation-based hooks
    if reputation.get("reality_vs_rumor"):
        hooks.append("An outsider discovers the truth behind the reputation—and decides what to do with it.")
    
    return hooks


def _derive_atmosphere(constraints: List[Dict[str, Any]], tone: str, function: str) -> str:
    """Derive atmosphere from constraints, tone, and function"""
    
    # Base atmosphere on the most severe constraint
    severe_constraints = [c for c in constraints if c.get("severity") in ["high", "critical"]]
    
    if severe_constraints:
        c = severe_constraints[0]
        ctype = c.get("type", "")
        if ctype == "environmental":
            return "Atmosphere of endurance against natural challenges"
        elif ctype == "resource_scarcity":
            return "Tense atmosphere where resources are never taken for granted"
        elif ctype == "external_threat":
            return "Vigilant atmosphere where danger could arrive at any moment"
    
    # Base on tone
    if tone == "dark":
        return "Heavy atmosphere where hope is scarce"
    elif tone == "hopeful":
        return "Warm atmosphere despite difficulties"
    elif tone == "mysterious":
        return "Shrouded atmosphere full of secrets"
    
    # Base on function
    func_atmospheres = {
        "economic": "Busy, energetic atmosphere of commerce and deal-making",
        "defensive": "Serious, watchful atmosphere of those who protect",
        "social": "Contemplative or spiritual atmosphere depending on type",
        "logistical": "Practical atmosphere of those focused on the next journey"
    }
    return func_atmospheres.get(function, "Functional atmosphere shaped by purpose")


def _derive_soundscape(function: str, constraints: List[Dict[str, Any]]) -> List[str]:
    """Derive soundscape from function and constraints"""
    
    sounds = []
    
    # Function-based sounds
    func_sounds = {
        "economic": ["Market chatter", "Coins exchanging hands", "Cart wheels on cobblestones"],
        "defensive": ["Watch bells", "Training drills", "Commands being called"],
        "social": ["Chants or prayers", "Discussions of wisdom", "Ceremonial music"],
        "logistical": ["Loading cargo", "Whips of caravans", "Resting travelers"]
    }
    sounds.extend(func_sounds.get(function, []))
    
    # Constraint-based sounds
    for constraint in constraints:
        if constraint.get("type") == "external_threat":
            sounds.extend(["Warning bells", "Weapons being readied"])
        elif constraint.get("type") == "environmental":
            sounds.extend(["Wind howling", "Rain or storms"])
    
    return sounds


def _derive_visual_elements(emergent: Dict[str, Any], function: str, constraints: List[Dict[str, Any]]) -> List[str]:
    """Derive visual elements from emergent details, function, and constraints"""
    
    elements = []
    
    # From emergent details
    if emergent.get("landmarks"):
        elements.append(f"Prominent landmarks defining the skyline")
    
    if emergent.get("architectural_style"):
        elements.append(f"Architecture reflecting {emergent['architectural_style']}")
    
    # From constraints
    for constraint in constraints:
        if constraint.get("type") == "environmental":
            elements.append(f"Evidence of environmental adaptation in every structure")
        elif constraint.get("type") == "external_threat":
            elements.append(f"Defensive features integrated into daily life")
    
    # From function
    func_elements = {
        "economic": ["Trading goods on display", "Evidence of wealth and poverty"],
        "defensive": ["Weapons as common sight", "Training grounds visible"],
        "social": ["Sacred or scholarly symbols", "Places of gathering"],
        "logistical": ["Supplies in piles", "Vehicles and animals"]
    }
    elements.extend(func_elements.get(function, []))
    
    return elements


def _derive_lighting(constraints: List[Dict[str, Any]], function: str) -> str:
    """Determine primary lighting based on constraints and function"""
    
    # Check for night-related constraints
    for constraint in constraints:
        if "dark" in constraint.get("description", "").lower():
            return "Often dim, lit by fire and torch"
    
    # Check for underground
    for constraint in constraints:
        if "cave" in constraint.get("description", "").lower() or "underground" in constraint.get("description", "").lower():
            return "Artificial lighting required, pockets of shadow"
    
    # Function-based lighting
    func_lighting = {
        "economic": "Bright during trading hours, dim at night",
        "defensive": "Watchtowers lit through the night, shadowed streets",
        "social": "Natural light in sacred spaces, candles in halls",
        "logistical": "Practical lighting for work, darkness for rest areas"
    }
    return func_lighting.get(function, "Natural light dominating")


def _build_history(name: str, function: str, constraints: List[Dict[str, Any]], emergent: Dict[str, Any]) -> str:
    """Build historical context for the location"""
    
    history = f"{name} was established to serve its function. "
    
    if constraints:
        severe = constraints[0]
        history += f"The founders faced {severe.get('description', 'significant challenges')}. "
        history += "These challenges shaped everything that followed."
    else:
        history += "Over time, it grew and adapted to serve its purpose ever more effectively."
    
    if emergent.get("historical_names"):
        history += f" It has been known by other names in the past: {', '.join(emergent['historical_names'][:3])}."
    
    return history


def _derive_significance(name: str, function: str, constraints: List[Dict[str, Any]], story_context: str) -> str:
    """Determine narrative significance"""
    
    sig = f"{name} plays a crucial role in the region because of its function as a {function} location. "
    
    if constraints:
        sig += f"Its struggles with {constraints[0].get('type', 'challenges')} have made it resilient and determined. "
    
    if story_context:
        sig += f"Within the larger story, {name} represents {story_context}."
    else:
        sig += "It is a place where important events unfold."
    
    return sig


# Alias for backward compatibility
LocationLogicLoopGenerator = {
    "generate": generate_logic_loop_location,
    "infer_sub_function": _infer_sub_function,
    "build_function_description": _build_function_description,
    "generate_culture": _generate_culture,
    "generate_reputation": _generate_reputation,
    "generate_emergent_details": _generate_emergent_details,
    "generate_story_hooks": _generate_story_hooks
}


if __name__ == "__main__":
    # Example usage of the Location Logic Loop
    example_constraints = [
        {
            "type": "external_threat",
            "description": "Territorial dragons nesting in the nearby mountains",
            "severity": "high",
            "impact_on_function": "Mining operations must avoid dragon flight paths"
        },
        {
            "type": "resource_scarcity",
            "description": "No timber for miles - everything must be stone or imported",
            "severity": "medium",
            "impact_on_function": "Building repairs are expensive and slow"
        }
    ]
    
    location = generate_logic_loop_location(
        location_name="Crystal Deep",
        genre="fantasy",
        tone="dark",
        function="economic",
        constraints=example_constraints,
        story_context="a place where wealth and death walk hand in hand"
    )
    
    print(json.dumps(location, indent=2, default=str))

