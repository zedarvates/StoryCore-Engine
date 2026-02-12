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


if __name__ == "__main__":
    sample = """
    Marie est une jeune scientifique qui decouvre un secret dangereux dans son laboratoire.
    Elle doit choisir entre sa carriere et la verite.
    Son mentor, le Professeur Dubois, l'aide dans saquete.
    Mais l'antagoniste, M. Noir, veut utiliser la decouverte pour le mal.
    Dans un laboratoire secret, Marie fait une rencontre inattendue.
    La course contre le temps commence.
    Elle devra affronter ses peurs et trouver la force de reveler la verite.
    """
    scenario = transform_story_to_scenario(sample, "La Decouverte")
    scenario.save_to_file("./data/scenario.json")
    print(scenario.to_json())

