"""
StoryCore-Engine Project Builder

This module creates project files for characters, locations, and objects
extracted from the scenario. Each asset gets its own JSON file and reference image path.

Project Structure:
projects/{project_id}/
├── scenario.json              # Main scenario
├── characters/
│   ├── {char_id}.json        # Character profile
│   └── {char_id}_ref.png     # Reference image path
├── locations/
│   ├── {loc_id}.json         # Location profile
│   └── {loc_id}_ref.png      # Reference image path
├── objects/
│   ├── {obj_id}.json         # Object profile
│   └── {obj_id}_ref.png      # Reference image path
└── prompts/
    ├── character_prompts.json
    ├── location_prompts.json
    └── scene_prompts.json

Requirements: Q1 2026 - Project Asset Management
"""

import json
import logging
import os
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.story_transformer import StructuredScenario

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class CharacterAsset:
    """Character asset file"""
    id: str
    project_id: str
    nom: str
    description_visuelle: str
    prompt_image: str
    negative_prompt: str
    style_reference: List[str]
    couleurs: List[str]
    vetements: List[str]
    expressions: List[str]
    traits_personnalite: List[str]
    age: str
    physique: str
    histoire: str
    role_narratif: str
    objectifs: List[str]
    relations: List[Dict[str, str]]
    apparitions_scenes: List[int]
    image_path: str = ""
    date_creation: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "project_id": self.project_id,
            "nom": self.nom,
            "description_visuelle": self.description_visuelle,
            "prompt_image": self.prompt_image,
            "negative_prompt": self.negative_prompt,
            "style_reference": self.style_reference,
            "couleurs": self.couleurs,
            "vetements": self.vetements,
            "expressions": self.expressions,
            "traits_personnalite": self.traits_personnalite,
            "age": self.age,
            "physique": self.physique,
            "histoire": self.histoire,
            "role_narratif": self.role_narratif,
            "objectifs": self.objectifs,
            "relations": self.relations,
            "apparitions_scenes": self.apparitions_scenes,
            "image_path": self.image_path,
            "date_creation": self.date_creation or datetime.utcnow().isoformat()
        }
    
    def save(self, project_path: str) -> bool:
        try:
            chars_dir = os.path.join(project_path, "characters")
            os.makedirs(chars_dir, exist_ok=True)
            filepath = os.path.join(chars_dir, f"{self.id}.json")
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(self.to_dict(), f, ensure_ascii=False, indent=2)
            logger.info(f"Character asset saved: {filepath}")
            return True
        except Exception as e:
            logger.error(f"Failed to save character: {e}")
            return False


@dataclass
class LocationAsset:
    """Location asset file"""
    id: str
    project_id: str
    nom: str
    description: str
    prompt_image: str
    negative_prompt: str
    style_reference: List[str]
    type_: str  # interieur/exterieur
    categorie: str
    atmosphere: str
    eclairage: str
    periode: str
    elements_architecturaux: List[str]
    objetspresents: List[str]
    ambiance_sonore: List[str]
    historique: str
    significance_narrative: str
    scenes_apparitions: List[int]
    image_path: str = ""
    date_creation: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "project_id": self.project_id,
            "nom": self.nom,
            "description": self.description,
            "prompt_image": self.prompt_image,
            "negative_prompt": self.negative_prompt,
            "style_reference": self.style_reference,
            "type": self.type_,
            "categorie": self.categorie,
            "atmosphere": self.atmosphere,
            "eclairage": self.eclairage,
            "periode": self.periode,
            "elements_architecturaux": self.elements_architecturaux,
            "objetspresents": self.objetspresents,
            "ambiance_sonore": self.ambiance_sonore,
            "historique": self.historique,
            "significance_narrative": self.significance_narrative,
            "scenes_apparitions": self.scenes_apparitions,
            "image_path": self.image_path,
            "date_creation": self.date_creation or datetime.utcnow().isoformat()
        }
    
    def save(self, project_path: str) -> bool:
        try:
            locs_dir = os.path.join(project_path, "locations")
            os.makedirs(locs_dir, exist_ok=True)
            filepath = os.path.join(locs_dir, f"{self.id}.json")
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(self.to_dict(), f, ensure_ascii=False, indent=2)
            logger.info(f"Location asset saved: {filepath}")
            return True
        except Exception as e:
            logger.error(f"Failed to save location: {e}")
            return False


@dataclass
class ObjectAsset:
    """Object/Artefact asset file"""
    id: str
    project_id: str
    nom: str
    description: str
    prompt_image: str
    negative_prompt: str
    style_reference: List[str]
    type_: str
    pouvoir_capacite: str
    proprietaire_actuel: str
    proprietaire_precedent: str
    significance: str
    histoire: str
    utilisation_scène: int
    materiaux: List[str]
    apparence: str
    scenes_apparitions: List[int]
    image_path: str = ""
    date_creation: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "project_id": self.project_id,
            "nom": self.nom,
            "description": self.description,
            "prompt_image": self.prompt_image,
            "negative_prompt": self.negative_prompt,
            "style_reference": self.style_reference,
            "type": self.type_,
            "pouvoir_capacite": self.pouvoir_capacite,
            "proprietaire_actuel": self.proprietaire_actuel,
            "proprietaire_precedent": self.proprietaire_precedent,
            "significance": self.significance,
            "histoire": self.histoire,
            "utilisation_scene": self.utilisation_scène,
            "materiaux": self.materiaux,
            "apparence": self.apparence,
            "scenes_apparitions": self.scenes_apparitions,
            "image_path": self.image_path,
            "date_creation": self.date_creation or datetime.utcnow().isoformat()
        }
    
    def save(self, project_path: str) -> bool:
        try:
            objs_dir = os.path.join(project_path, "objects")
            os.makedirs(objs_dir, exist_ok=True)
            filepath = os.path.join(objs_dir, f"{self.id}.json")
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(self.to_dict(), f, ensure_ascii=False, indent=2)
            logger.info(f"Object asset saved: {filepath}")
            return True
        except Exception as e:
            logger.error(f"Failed to save object: {e}")
            return False


@dataclass
class PromptAsset:
    """Prompt asset for image generation"""
    id: str
    project_id: str
    target_type: str  # character, location, object, scene
    target_id: str
    target_name: str
    positive_prompt: str
    negative_prompt: str
    style: str
    width: int
    height: int
    cfg_scale: float
    steps: int
    sampler: str
    model: str
    seed: int
    date_creation: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "project_id": self.project_id,
            "target_type": self.target_type,
            "target_id": self.target_id,
            "target_name": self.target_name,
            "positive_prompt": self.positive_prompt,
            "negative_prompt": self.negative_prompt,
            "style": self.style,
            "width": self.width,
            "height": self.height,
            "cfg_scale": self.cfg_scale,
            "steps": self.steps,
            "sampler": self.sampler,
            "model": self.model,
            "seed": self.seed,
            "date_creation": self.date_creation or datetime.utcnow().isoformat()
        }
    
    def save(self, project_path: str) -> bool:
        try:
            prompts_dir = os.path.join(project_path, "prompts")
            os.makedirs(prompts_dir, exist_ok=True)
            filepath = os.path.join(prompts_dir, f"{self.target_type}_prompts.json")
            
            # Append to existing file or create new
            existing = []
            if os.path.exists(filepath):
                with open(filepath, 'r', encoding='utf-8') as f:
                    try:
                        existing = json.load(f)
                    except:
                        existing = []
            
            existing.append(self.to_dict())
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(existing, f, ensure_ascii=False, indent=2)
            
            logger.info(f"Prompt saved: {filepath}")
            return True
        except Exception as e:
            logger.error(f"Failed to save prompt: {e}")
            return False


# =============================================================================
# PROJECT BUILDER
# =============================================================================

class ProjectBuilder:
    """
    Builds complete project structure from structured scenario.
    Creates asset files for characters, locations, objects with image prompts.
    """
    
    def __init__(self, scenario: StructuredScenario, project_id: Optional[str] = None):
        self.scenario = scenario
        self.project_id = project_id or str(uuid.uuid4())
        self.project_path = os.path.join("./projects", self.project_id)
        
        # Asset storage
        self.characters: List[CharacterAsset] = []
        self.locations: List[LocationAsset] = []
        self.objects: List[ObjectAsset] = []
        self.prompts: List[PromptAsset] = []
    
    def build_project(self) -> Dict[str, Any]:
        """
        Build complete project structure.
        
        Returns:
            Project summary with paths to all created files
        """
        logger.info(f"Building project: {self.project_id}")
        
        # Create project directories
        self._create_directories()
        
        # Save main scenario
        self._save_scenario()
        
        # Build character assets
        self._build_character_assets()
        
        # Build location assets
        self._build_location_assets()
        
        # Build object assets
        self._build_object_assets()
        
        # Build prompts for image generation
        self._build_prompts()
        
        # Create project manifest
        manifest = self._create_manifest()
        
        logger.info(f"Project built successfully: {self.project_path}")
        
        return manifest
    
    def _create_directories(self):
        """Create project directory structure"""
        dirs = [
            self.project_path,
            os.path.join(self.project_path, "characters"),
            os.path.join(self.project_path, "locations"),
            os.path.join(self.project_path, "objects"),
            os.path.join(self.project_path, "prompts"),
            os.path.join(self.project_path, "images"),
            os.path.join(self.project_path, "scenes")
        ]
        
        for d in dirs:
            os.makedirs(d, exist_ok=True)
            logger.debug(f"Created directory: {d}")
    
    def _save_scenario(self):
        """Save main scenario file"""
        filepath = os.path.join(self.project_path, "scenario.json")
        self.scenario.save_to_file(filepath)
        logger.info(f"Scenario saved: {filepath}")
    
    def _build_character_assets(self):
        """Build character assets from scenario"""
        meta = self.scenario.meta
        ton = meta.get("ton", "cinematic")
        
        for char_data in self.scenario.personnages:
            char_id = f"char_{char_data.get('id', len(self.characters) + 1):03d}"
            
            # Generate prompt for this character
            prompt, neg_prompt = self._generate_character_prompt(char_data, ton)
            
            asset = CharacterAsset(
                id=char_id,
                project_id=self.project_id,
                nom=char_data.get("nom", "Inconnu"),
                description_visuelle=self._generate_visual_description(char_data),
                prompt_image=prompt,
                negative_prompt=neg_prompt,
                style_reference=["cinematic", "realistic", "detailed"],
                couleurs=self._extract_couleurs(char_data),
                vetements=self._extract_vetements(char_data),
                expressions=self._extract_expressions(char_data, ton),
                traits_personnalite=char_data.get("traits", []),
                age=char_data.get("age", "Inconnu"),
                physique="Average build",
                histoire=char_data.get("description", ""),
                role_narratif=char_data.get("role", ""),
                objectifs=[char_data.get("objectif", "")],
                relations=char_data.get("relations", []),
                apparitions_scenes=char_data.get("apparitions_scenes", []),
                image_path=f"characters/{char_id}_ref.png",
                date_creation=datetime.utcnow().isoformat()
            )
            
            asset.save(self.project_path)
            self.characters.append(asset)
    
    def _build_location_assets(self):
        """Build location assets from scenario"""
        meta = self.scenario.meta
        ton = meta.get("ton", "cinematic")
        
        for loc_data in self.scenario.lieux:
            loc_id = f"loc_{loc_data.get('id', len(self.locations) + 1):03d}"
            
            prompt, neg_prompt = self._generate_location_prompt(loc_data, ton)
            
            asset = LocationAsset(
                id=loc_id,
                project_id=self.project_id,
                nom=loc_data.get("nom", "Inconnu"),
                description=loc_data.get("description", ""),
                prompt_image=prompt,
                negative_prompt=neg_prompt,
                style_reference=["cinematic", "atmospheric", "detailed"],
                type_=loc_data.get("type", "exterieur"),
                categorie=loc_data.get("categorie", "autre"),
                atmosphere=loc_data.get("atmosphere", "neutral"),
                eclairage=loc_data.get("eclairage", "jour"),
                periode="Present",
                elements_architecturaux=loc_data.get("elements_visuels", []),
                objetspresents=[p.get("nom", "") for p in loc_data.get("props", [])],
                ambiance_sonore=loc_data.get("ambiance_sonore", []),
                historique=loc_data.get("historique", ""),
                significance_narrative=loc_data.get("significance_narrative", ""),
                scenes_apparitions=loc_data.get("apparitions_scenes", []),
                image_path=f"locations/{loc_id}_ref.png",
                date_creation=datetime.utcnow().isoformat()
            )
            
            asset.save(self.project_path)
            self.locations.append(asset)
    
    def _build_object_assets(self):
        """Build object/artefact assets from scenario"""
        meta = self.scenario.meta
        ton = meta.get("ton", "cinematic")
        
        for obj_data in self.scenario.objets:
            obj_id = f"obj_{obj_data.get('id', len(self.objects) + 1):03d}"
            
            prompt, neg_prompt = self._generate_object_prompt(obj_data, ton)
            
            asset = ObjectAsset(
                id=obj_id,
                project_id=self.project_id,
                nom=obj_data.get("nom", "Inconnu"),
                description=obj_data.get("description", ""),
                prompt_image=prompt,
                negative_prompt=neg_prompt,
                style_reference=["cinematic", "detailed", "realistic"],
                type_=obj_data.get("type", "autre"),
                pouvoir_capacite=obj_data.get("pouvoir_capacite", ""),
                proprietaire_actuel=obj_data.get("proprietaire_actuel", ""),
                proprietaire_precedent=obj_data.get("proprietaire_precedent", ""),
                significance=obj_data.get("significance", ""),
                histoire=obj_data.get("histoire", ""),
                utilisation_scène=0,
                materiaux=["unknown"],
                apparence="",
                scenes_apparitions=obj_data.get("apparitions_scenes", []),
                image_path=f"objects/{obj_id}_ref.png",
                date_creation=datetime.utcnow().isoformat()
            )
            
            asset.save(self.project_path)
            self.objects.append(asset)
    
    def _build_prompts(self):
        """Build image generation prompts for all assets"""
        # Character prompts
        for char in self.characters:
            prompt = PromptAsset(
                id=str(uuid.uuid4()),
                project_id=self.project_id,
                target_type="character",
                target_id=char.id,
                target_name=char.nom,
                positive_prompt=char.prompt_image,
                negative_prompt=char.negative_prompt,
                style="cinematic",
                width=1024,
                height=1024,
                cfg_scale=7.0,
                steps=30,
                sampler="Euler a",
                model="absolutereality_v1.8",
                seed=-1
            )
            prompt.save(self.project_path)
            self.prompts.append(prompt)
        
        # Location prompts
        for loc in self.locations:
            prompt = PromptAsset(
                id=str(uuid.uuid4()),
                project_id=self.project_id,
                target_type="location",
                target_id=loc.id,
                target_name=loc.nom,
                positive_prompt=loc.prompt_image,
                negative_prompt=loc.negative_prompt,
                style="cinematic",
                width=1920,
                height=1080,
                cfg_scale=7.0,
                steps=30,
                sampler="Euler a",
                model="absolutereality_v1.8",
                seed=-1
            )
            prompt.save(self.project_path)
            self.prompts.append(prompt)
        
        # Object prompts
        for obj in self.objects:
            prompt = PromptAsset(
                id=str(uuid.uuid4()),
                project_id=self.project_id,
                target_type="object",
                target_id=obj.id,
                target_name=obj.nom,
                positive_prompt=obj.prompt_image,
                negative_prompt=obj.negative_prompt,
                style="cinematic",
                width=512,
                height=512,
                cfg_scale=7.0,
                steps=25,
                sampler="Euler a",
                model="absolutereality_v1.8",
                seed=-1
            )
            prompt.save(self.project_path)
            self.prompts.append(prompt)
    
    def _create_manifest(self) -> Dict[str, Any]:
        """Create project manifest file"""
        manifest = {
            "id": self.project_id,
            "titre": self.scenario.meta.get("titre", "Sans titre"),
            "created_at": datetime.utcnow().isoformat(),
            "paths": {
                "scenario": f"{self.project_id}/scenario.json",
                "characters_dir": f"{self.project_id}/characters/",
                "locations_dir": f"{self.project_id}/locations/",
                "objects_dir": f"{self.project_id}/objects/",
                "prompts_dir": f"{self.project_id}/prompts/",
                "images_dir": f"{self.project_id}/images/"
            },
            "stats": {
                "characters_count": len(self.characters),
                "locations_count": len(self.locations),
                "objects_count": len(self.objects),
                "prompts_count": len(self.prompts),
                "sequences_count": len(self.scenario.sequences),
                "scenes_count": len(self.scenario.scenes)
            }
        }
        
        filepath = os.path.join(self.project_path, "manifest.json")
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, ensure_ascii=False, indent=2)
        
        logger.info(f"Manifest saved: {filepath}")
        
        return manifest
    
    # =============================================================================
    # PROMPT GENERATION HELPERS
    # =============================================================================
    
    def _generate_character_prompt(self, char_data: Dict, ton: str) -> tuple:
        """Generate image prompt for character"""
        nom = char_data.get("nom", "person")
        role = char_data.get("role", "")
        
        positive = f"cinematic portrait, {nom}, {role}, "
        positive += "detailed face, realistic skin texture, cinematic lighting, "
        positive += "professional photography, 8k resolution, highly detailed"
        
        negative = "blurry, low quality, deformed, extra limbs, watermark, text, "
        negative += "distorted face, bad anatomy, poorly drawn face"
        
        return positive, negative
    
    def _generate_location_prompt(self, loc_data: Dict, ton: str) -> tuple:
        """Generate image prompt for location"""
        nom = loc_data.get("nom", "location")
        atmosphere = loc_data.get("atmosphere", "")
        eclairage = loc_data.get("eclairage", "day")
        
        positive = f"cinematic wide shot, {nom}, {atmosphere} atmosphere, "
        positive += f"{eclairage} lighting, dramatic composition, "
        positive += "professional cinematography, 8k, highly detailed"
        
        negative = "blurry, low quality, distortion, watermark, text"
        
        return positive, negative
    
    def _generate_object_prompt(self, obj_data: Dict, ton: str) -> tuple:
        """Generate image prompt for object"""
        nom = obj_data.get("nom", "object")
        obj_type = obj_data.get("type", "")
        
        positive = f"cinematic product shot, {nom}, {obj_type}, "
        positive += "isolated on neutral background, studio lighting, "
        positive += "professional photography, 8k, sharp focus"
        
        negative = "blurry, low quality, watermark, text, distorted"
        
        return positive, negative
    
    def _generate_visual_description(self, char_data: Dict) -> str:
        """Generate visual description for character"""
        return f"Character portrait of {char_data.get('nom', 'Unknown')}"
    
    def _extract_couleurs(self, char_data: Dict) -> List[str]:
        """Extract color palette from character"""
        return ["blue", "white", "black"]
    
    def _extract_vetements(self, char_data: Dict) -> List[str]:
        """Extract clothing from character data"""
        return ["casual"]
    
    def _extract_expressions(self, char_data: Dict, ton: str) -> List[str]:
        """Extract typical expressions based on ton"""
        if ton in ["sombre", "dramatique"]:
            return ["serious", "determined", "intense"]
        elif ton in ["humoristique"]:
            return ["happy", "playful", "smiling"]
        else:
            return ["neutral", "serious", "determined"]


def build_project_from_scenario(
    scenario: StructuredScenario, 
    project_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Convenience function to build complete project from scenario.
    
    Args:
        scenario: StructuredScenario object
        project_id: Optional custom project ID
    
    Returns:
        Project manifest dictionary
    """
    builder = ProjectBuilder(scenario, project_id)
    return builder.build_project()


if __name__ == "__main__":
    # Test with sample scenario
    from backend.story_transformer import transform_story_to_scenario
    
    sample_story = """
    Marie is a young scientist who discovers a dangerous secret in her laboratory.
    She must choose between her career and the truth.
    Her mentor, Professor Dubois, helps her in her quest.
    But the antagonist, Mr. Noir, wants to use the discovery for evil.
    In a secret laboratory, Marie makes an unexpected encounter.
    The race against time begins.
    She must face her fears and find the strength to reveal the truth.
    """
    
    scenario = transform_story_to_scenario(sample_story, "The Discovery")
    manifest = build_project_from_scenario(scenario)
    
    print(f"Project created: {manifest['id']}")
    print(f"Characters: {manifest['stats']['characters_count']}")
    print(f"Locations: {manifest['stats']['locations_count']}")
    print(f"Objects: {manifest['stats']['objects_count']}")

