#!/usr/bin/env python3
"""
StoryCore-Engine Demo - Improved Version

Run with: python demo_simple_v2.py
"""

import json
import logging
from typing import Any, Dict, List, Optional
from enum import Enum
from datetime import datetime, timezone
import os

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Enums
class SceneType(str, Enum):
    INT = "INT"
    EXT = "EXT"
    MIX = "MIX"

class CharacterRole(str, Enum):
    PROTAGONISTE = "protagoniste"
    ANTAGONISTE = "antagoniste"
    ALLIE = "allie"
    FIGURANT = "figurant"

class TensionLevel(str, Enum):
    BASSE = "basse"
    MOYENNE = "moyenne"
    ELEVEE = "elevee"

class MomentNarratif(str, Enum):
    INTRODUCTION = "introduction"
    DEVELOPPEMENT = "developpement"
    CLIMAX = "climax"
    DENOUEMENT = "denouement"


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
        chars = self.extract_characters_heuristic()
        story = self.raw_story.lower()
        conflicts = [w for w in ['conflit', 'combat', 'danger', 'quete'] if w in story]
        if len(chars) >= 2:
            return f"Dans {self.title}, {chars[0]} affronte {', '.join(chars[1:3])}."
        return f"{self.title}: Une histoire captivante."
    
    def extract_theme(self) -> tuple:
        story = self.raw_story.lower()
        themes = []
        if any(w in story for w in ['amour', 'passion']): themes.append("amour")
        elif any(w in story for w in ['combat', 'danger']): themes.append("survie")
        elif any(w in story for w in ['secret', 'mystere']): themes.append("mystere")
        else: themes.append("aventure")
        return (themes[0], themes)
    
    def extract_ton(self) -> tuple:
        story = self.raw_story.lower()
        if any(w in story for w in ['sombre', 'mort', 'danger']): return ("sombre", ["sombre"])
        if any(w in story for w in ['mystere', 'secret']): return ("mysterieux", ["mysterieux"])
        return ("dramatique", ["dramatique"])
    
    def extract_enjeux(self) -> List[str]:
        story = self.raw_story.lower()
        enjeux = []
        if any(w in story for w in ['mort', 'survie']): enjeux.append("Enjeu de vie ou de mort")
        if any(w in story for w in ['verite', 'secret']): enjeux.append("La verite")
        if any(w in story for w in ['monde', 'humanite']): enjeux.append("Sort du monde")
        return enjeux or ["Survie et transformation"]
    
    def extract_characters_heuristic(self) -> List[str]:
        chars = []
        skip_words = {'The', 'A', 'In', 'With', 'Her', 'His', 'She', 'He', 'They', 'But', 
                      'And', 'Or', 'This', 'That', 'When', 'Where', 'How', 'Why', 'What',
                      'An', 'Their', 'Its'}
        skip_names = ['Laboratory', 'Research', 'Facility', 'World', 'Choice', 
                     'Document', 'Confrontation', 'Midnight', 'Conspiracy', 'Secret']
        
        for line in self.lines:
            words = line.split()
            for i, word in enumerate(words):
                # Clean punctuation
                clean_word = word.strip('.,;:!?()[]{}"')
                if clean_word and clean_word[0].isupper():
                    # Build potential name
                    name = clean_word
                    if i + 1 < len(words):
                        next_word = words[i + 1].strip('.,;:!?()[]{}"')
                        if next_word and next_word[0].isupper():
                            name = f"{clean_word} {next_word}"
                    
                    # Validate
                    if (len(name) > 2 and 
                        name not in skip_words and
                        name not in chars and
                        name not in skip_names):
                        chars.append(name)
        
        return chars[:10]
    
    def extract_locations_heuristic(self) -> List[str]:
        locs = []
        for line in self.lines:
            for loc in ['laboratory', 'facility', 'house', 'city', 'street', 'forest', 
                       'hospital', 'school', 'office', 'restaurant', 'beach', 'mountain']:
                if loc in line.lower() and loc not in locs:
                    locs.append(loc.title())
        return locs
    
    def extract_objects_heuristic(self) -> List[str]:
        objs = []
        for line in self.lines:
            for obj in ['document', 'weapon', 'key', 'letter', 'jewelry', 'file', 'computer']:
                if obj in line.lower() and obj not in objs:
                    objs.append(obj.title())
        return objs


class StoryTransformer:
    def __init__(self, raw_story: str, title: Optional[str] = None):
        self.raw_story = raw_story
        self.title = title or "Histoire Sans Titre"
        self.analyzer = StoryAnalyzer(raw_story)
    
    def transform(self) -> Dict[str, Any]:
        logger.info(f"Transforming: {self.title}")
        
        meta = {
            "titre": self.title,
            "pitch": self.analyzer.extract_pitch(),
            "theme": self.analyzer.extract_theme()[0],
            "sous_themes": self.analyzer.extract_theme()[1],
            "ton": self.analyzer.extract_ton()[0],
            "enjeux": self.analyzer.extract_enjeux(),
            "version": "1.0",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Characters
        char_names = self.analyzer.extract_characters_heuristic()
        personnages = []
        for i, name in enumerate(char_names, 1):
            role = CharacterRole.PROTAGONISTE.value if i == 1 else (
                CharacterRole.ANTAGONISTE.value if i == 2 else 
                CharacterRole.ALLIE.value if i == 3 else CharacterRole.FIGURANT.value
            )
            personnages.append({
                "id": i, "nom": name, "age": "Inconnu", "role": role,
                "description": f"Personnage important", "objectif": "Accomplir sa destinee",
                "motivation": "Survivre", "conflit_interne": "Trouver sa place",
                "conflit_externe": "Obstacles", "traits": [], "forces": [], "faiblesses": [],
                "secrets": "", "relations": [], "arc_narratif": f"Evolution de {name}",
                "apparitions_scenes": []
            })
        
        # Locations
        loc_names = self.analyzer.extract_locations_heuristic()
        lieux = []
        for i, name in enumerate(loc_names, 1):
            is_interieur = any(w in name.lower() for w in ['laboratory', 'house', 'hospital', 'school', 'office', 'restaurant'])
            lieux.append({
                "id": i, "nom": name, "type": "interieur" if is_interieur else "exterieur",
                "categorie": "autre", "description": f"Lieu important",
                "atmosphere": "Mysterieuse", "ambiance_sonore": [],
                "elements_visuels": [], "eclairage": "jour",
                "historique": "", "significance_narrative": f"{name} joue un role cle",
                "props": [], "apparitions_scenes": []
            })
        
        # Objects
        obj_names = self.analyzer.extract_objects_heuristic()
        objets = []
        for i, name in enumerate(obj_names, 1):
            objets.append({
                "id": i, "nom": name, "type": "autre",
                "description": "Objet important", "pouvoir_capacite": "",
                "proprietaire_actuel": "", "significance": f"{name} est crucial",
                "apparitions_scenes": [], "utilisation_narrative": ""
            })
        
        # Structure
        structure = {
            "acte_1": {"titre": "La Mise en Place", "description": "Introduction", "duree": "25%"},
            "acte_2": {"titre": "La Confrontation", "description": "Obstacles", "duree": "50%"},
            "acte_3": {"titre": "La Resolution", "description": "Climax et fin", "duree": "25%"},
            "themes_principaux": [meta["theme"]], "themes_secondaires": []
        }
        
        # Sequences
        sequences = []
        seq_titles = [
            ("L'Ordinaire", 1, "Presenter le monde"),
            ("L'Appel", 1, "Declencheur"),
            ("La Decision", 1, "Reflexion"),
            ("La Traverse", 2, "Nouveau monde"),
            ("Les Defis", 2, "Obstacles"),
            ("Les Allies", 2, "Rencontres"),
            ("La Crise", 2, "Midpoint"),
            ("Le Climax", 3, "Affrontement final"),
            ("La Resolution", 3, "Denouement"),
            ("Le Nouveau Monde", 3, "Conclusion")
        ]
        for i, (titre, acte, objectif) in enumerate(seq_titles, 1):
            sequences.append({
                "id": i, "titre": titre, "acte": acte, "objectif": objectif,
                "lieu_principal": lieux[0]["nom"] if lieux else "Unknown",
                "lieu_id": 1, "moment_journee": "jour",
                "personnages": [p["nom"] for p in personnages],
                "resume": f"Sequence {titre}", "tension": TensionLevel.MOYENNE.value
            })
        
        # Scenes
        scenes = []
        for seq in sequences:
            for j in range(2):
                scenes.append({
                    "id": len(scenes) + 1,
                    "sequence_id": seq["id"],
                    "type": SceneType.EXT.value if j % 2 == 0 else SceneType.INT.value,
                    "lieu": seq["lieu_principal"],
                    "moment": "JOUR" if j % 2 == 0 else "NUIT",
                    "description": f"Scene {j+1} de {seq['titre']}",
                    "actions": [{"ordre": 1, "description": "Action principale"}],
                    "progression": {"etat": MomentNarratif.DEVELOPPEMENT.value, "tension": TensionLevel.MOYENNE.value}
                })
        
        logger.info(f"Done: {len(personnages)} chars, {len(lieux)} locs, {len(scenes)} scenes")
        
        return {
            "meta": meta,
            "personnages": personnages,
            "lieux": lieux,
            "objets": objets,
            "structure": structure,
            "sequences": sequences,
            "scenes": scenes
        }


def main():
    print("=" * 60)
    print("  StoryCore-Engine Demo v2 - Story Transformer")
    print("=" * 60)
    
    sample = """
    Marie is a brilliant scientist who discovers a dangerous secret in her laboratory.
    Her mentor, Professor Dubois, has been hiding the truth.
    The antagonist, Mr. Noir, wants to use the discovery for world domination.
    In the secret research facility, Marie must make a choice.
    She finds an old document that reveals everything.
    With her loyal colleague Jean, she prepares to expose the truth.
    The final confrontation happens at midnight.
    Marie successfully exposes the conspiracy.
    """
    
    print("\nInput Story:")
    print(sample.strip())
    
    transformer = StoryTransformer(sample, "The Discovery")
    scenario = transformer.transform()
    
    print("\n--- Meta ---")
    print(f"Titre: {scenario['meta']['titre']}")
    print(f"Pitch: {scenario['meta']['pitch']}")
    print(f"Theme: {scenario['meta']['theme']}")
    print(f"Ton: {scenario['meta']['ton']}")
    
    print("\n--- Characters ---")
    for char in scenario['personnages']:
        print(f"  - {char['nom']} ({char['role']})")
    
    print("\n--- Locations ---")
    for loc in scenario['lieux']:
        print(f"  - {loc['nom']} ({loc['type']})")
    
    print("\n--- Statistics ---")
    print(f"Characters: {len(scenario['personnages'])}")
    print(f"Locations: {len(scenario['lieux'])}")
    print(f"Objects: {len(scenario['objets'])}")
    print(f"Sequences: {len(scenario['sequences'])}")
    print(f"Scenes: {len(scenario['scenes'])}")
    
    # Save
    os.makedirs("./data", exist_ok=True)
    filepath = "./data/demo_scenario_v2.json"
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(scenario, f, ensure_ascii=False, indent=2)
    print(f"\nSaved to: {filepath}")
    
    print("\n" + "=" * 60)
    print("  Demo Complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()

