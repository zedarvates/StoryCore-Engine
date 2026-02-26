"""
Service de gestion des templates de prompts optimisés.
Basé sur les patterns de Robert's Tech Toolbox.

Ce module implémente un système de templates en couches:
- Foundation: Prompt de base, définit la logique
- Execution: Ajoute les pipelines et contraintes
- Master: Combine tout, prêt à utiliser
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from uuid import uuid4
from enum import Enum
from datetime import datetime
import json
import re
import os
from pathlib import Path


class PromptCategory(Enum):
    """Catégories de templates de prompts"""
    VIDEO = "video"
    VOICE = "voice"
    CHARACTER = "character"
    SCENE = "scene"
    SEO = "seo"
    IDENTITY = "identity"


class PromptLayer(Enum):
    """Couches de templates (pattern en couches)"""
    FOUNDATION = "foundation"  # Prompt de base, définit la logique
    EXECUTION = "execution"    # Ajoute les pipelines et contraintes
    MASTER = "master"          # Combine tout, prêt à utiliser


@dataclass
class PromptVariable:
    """Variable dynamique dans un template"""
    name: str
    description: str
    default_value: str = ""
    required: bool = True
    type: str = "string"  # string, number, list, json

    def to_dict(self) -> Dict:
        return {
            "name": self.name,
            "description": self.description,
            "default_value": self.default_value,
            "required": self.required,
            "type": self.type
        }

    @classmethod
    def from_dict(cls, data: Dict) -> "PromptVariable":
        return cls(
            name=data["name"],
            description=data["description"],
            default_value=data.get("default_value", ""),
            required=data.get("required", True),
            type=data.get("type", "string")
        )


@dataclass
class PromptTemplate:
    """Template de prompt complet"""
    id: str = field(default_factory=lambda: str(uuid4()))
    name: str = ""
    description: str = ""
    category: PromptCategory = PromptCategory.VIDEO
    layer: PromptLayer = PromptLayer.MASTER
    
    # Contenu du template avec variables {variable_name}
    template: str = ""
    
    # Variables définies
    variables: List[PromptVariable] = field(default_factory=list)
    
    # Métadonnées
    tags: List[str] = field(default_factory=list)
    author: str = "system"
    version: str = "1.0"
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    
    # Templates liés (pour composition)
    parent_id: Optional[str] = None
    child_ids: List[str] = field(default_factory=list)
    
    def render(self, variables: Dict[str, Any]) -> str:
        """Rend le template avec les variables fournies"""
        result = self.template
        for var in self.variables:
            value = variables.get(var.name, var.default_value)
            result = result.replace(f"{{{var.name}}}", str(value))
        return result
    
    def validate_variables(self, variables: Dict[str, Any]) -> List[str]:
        """Valide les variables fournies et retourne les erreurs"""
        errors = []
        for var in self.variables:
            if var.required and var.name not in variables:
                if not var.default_value:
                    errors.append(f"Variable requise manquante: {var.name}")
        return errors
    
    def extract_variable_names(self) -> List[str]:
        """Extrait les noms de variables du template"""
        pattern = r'\{(\w+)\}'
        return list(set(re.findall(pattern, self.template)))
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "category": self.category.value,
            "layer": self.layer.value,
            "template": self.template,
            "variables": [v.to_dict() for v in self.variables],
            "tags": self.tags,
            "author": self.author,
            "version": self.version,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "parent_id": self.parent_id,
            "child_ids": self.child_ids
        }

    @classmethod
    def from_dict(cls, data: Dict) -> "PromptTemplate":
        return cls(
            id=data["id"],
            name=data["name"],
            description=data["description"],
            category=PromptCategory(data["category"]),
            layer=PromptLayer(data["layer"]),
            template=data["template"],
            variables=[PromptVariable.from_dict(v) for v in data.get("variables", [])],
            tags=data.get("tags", []),
            author=data.get("author", "system"),
            version=data.get("version", "1.0"),
            created_at=datetime.fromisoformat(data["created_at"]) if "created_at" in data else datetime.now(),
            updated_at=datetime.fromisoformat(data["updated_at"]) if "updated_at" in data else datetime.now(),
            parent_id=data.get("parent_id"),
            child_ids=data.get("child_ids", [])
        )


class PromptTemplateService:
    """Service principal de gestion des templates"""
    
    def __init__(self, storage_path: str = "data/prompt_templates"):
        self.storage_path = Path(storage_path)
        self._templates: Dict[str, PromptTemplate] = {}
        self._name_index: Dict[str, str] = {}  # name -> id mapping
        self._ensure_storage_dir()
        self._load_builtin_templates()
        self._load_custom_templates()
    
    def _ensure_storage_dir(self):
        """Crée le répertoire de stockage si nécessaire"""
        self.storage_path.mkdir(parents=True, exist_ok=True)
    
    def _load_builtin_templates(self):
        """Charge les templates prédéfinis"""
        
        # === VIDEO TEMPLATES ===
        
        # Foundation - Video Generation
        self._add_template(PromptTemplate(
            name="video_foundation",
            description="Template de base pour génération vidéo",
            category=PromptCategory.VIDEO,
            layer=PromptLayer.FOUNDATION,
            template="""Generate a video scene with the following specifications:
- Scene Description: {scene_description}
- Duration: {duration} seconds
- Style: {visual_style}
- Mood: {mood}
- Camera Movement: {camera_movement}""",
            variables=[
                PromptVariable("scene_description", "Description de la scène", "", True),
                PromptVariable("duration", "Durée en secondes", "8", False),
                PromptVariable("visual_style", "Style visuel", "cinematic", False),
                PromptVariable("mood", "Ambiance émotionnelle", "neutral", False),
                PromptVariable("camera_movement", "Mouvement de caméra", "static", False),
            ],
            tags=["video", "generation", "foundation"]
        ))
        
        # Execution - Video with Constraints
        self._add_template(PromptTemplate(
            name="video_execution",
            description="Template avec contraintes techniques vidéo",
            category=PromptCategory.VIDEO,
            layer=PromptLayer.EXECUTION,
            template="""{foundation_prompt}

Technical Constraints:
- Resolution: {resolution}
- Frame Rate: {frame_rate} fps
- Aspect Ratio: {aspect_ratio}
- Quality: {quality}

JSON Parameters:
{json_params}""",
            variables=[
                PromptVariable("foundation_prompt", "Prompt de base généré", "", True),
                PromptVariable("resolution", "Résolution", "1920x1080", False),
                PromptVariable("frame_rate", "Images par seconde", "24", False),
                PromptVariable("aspect_ratio", "Ratio d'image", "16:9", False),
                PromptVariable("quality", "Qualité de rendu", "high", False),
                PromptVariable("json_params", "Paramètres JSON additionnels", "{}", False),
            ],
            tags=["video", "technical", "execution"]
        ))
        
        # Master - Complete Video Prompt
        self._add_template(PromptTemplate(
            name="video_master",
            description="Template complet pour génération vidéo cinéma",
            category=PromptCategory.VIDEO,
            layer=PromptLayer.MASTER,
            template="""[IDENTITY LOCK]
{identity_description}
[/IDENTITY LOCK]

[SCENE]
{scene_description}
Duration: {duration}s | Style: {visual_style} | Mood: {mood}
[/SCENE]

[TECHNICAL]
Resolution: {resolution} | FPS: {frame_rate} | Aspect: {aspect_ratio}
Camera: {camera_type} | Movement: {camera_movement}
Lighting: {lighting_setup}
[/TECHNICAL]

[OUTPUT]
Format: {output_format} | Quality: {quality}
[/OUTPUT]""",
            variables=[
                PromptVariable("identity_description", "Description du personnage verrouillé", "", True),
                PromptVariable("scene_description", "Description de la scène", "", True),
                PromptVariable("duration", "Durée", "8", False),
                PromptVariable("visual_style", "Style visuel", "cinematic", False),
                PromptVariable("mood", "Ambiance", "neutral", False),
                PromptVariable("resolution", "Résolution", "1920x1080", False),
                PromptVariable("frame_rate", "FPS", "24", False),
                PromptVariable("aspect_ratio", "Ratio", "16:9", False),
                PromptVariable("camera_type", "Type de caméra", "professional", False),
                PromptVariable("camera_movement", "Mouvement", "smooth dolly", False),
                PromptVariable("lighting_setup", "Éclairage", "natural", False),
                PromptVariable("output_format", "Format de sortie", "mp4", False),
                PromptVariable("quality", "Qualité", "high", False),
            ],
            tags=["video", "master", "cinematic", "complete"]
        ))
        
        # === CHARACTER TEMPLATES ===
        
        self._add_template(PromptTemplate(
            name="character_identity_lock",
            description="Template de verrouillage d'identité personnage",
            category=PromptCategory.CHARACTER,
            layer=PromptLayer.MASTER,
            template="""CHARACTER IDENTITY: {character_name}

[LOCKED ATTRIBUTES]
Face Shape: {face_shape}
Skin Tone: {skin_tone}
Eye Color: {eye_color}
Hair: {hair_color} {hair_style} {hair_length}
Body Type: {body_type}
Age Appearance: {age_appearance}
Height: {height}
[/LOCKED ATTRIBUTES]

[STYLE]
Clothing: {clothing_style}
Accessories: {accessories}
Distinctive Features: {distinctive_features}
[/STYLE]

[BEHAVIOR]
Personality: {personality_traits}
Typical Expressions: {expressions}
[/BEHAVIOR]

MAINTAIN THIS IDENTITY ACROSS ALL SCENES.""",
            variables=[
                PromptVariable("character_name", "Nom du personnage", "", True),
                PromptVariable("face_shape", "Forme du visage", "", False),
                PromptVariable("skin_tone", "Teint", "", False),
                PromptVariable("eye_color", "Couleur des yeux", "", False),
                PromptVariable("hair_color", "Couleur des cheveux", "", False),
                PromptVariable("hair_style", "Style de coiffure", "", False),
                PromptVariable("hair_length", "Longueur des cheveux", "", False),
                PromptVariable("body_type", "Type de corps", "", False),
                PromptVariable("age_appearance", "Âge apparent", "", False),
                PromptVariable("height", "Taille", "", False),
                PromptVariable("clothing_style", "Style vestimentaire", "", False),
                PromptVariable("accessories", "Accessoires", "none", False),
                PromptVariable("distinctive_features", "Traits distinctifs", "none", False),
                PromptVariable("personality_traits", "Traits de personnalité", "", False),
                PromptVariable("expressions", "Expressions typiques", "", False),
            ],
            tags=["character", "identity", "lock", "consistency"]
        ))
        
        # === VOICE TEMPLATES ===
        
        self._add_template(PromptTemplate(
            name="voice_synthesis",
            description="Template pour synthèse vocale",
            category=PromptCategory.VOICE,
            layer=PromptLayer.MASTER,
            template="""Voice Synthesis Parameters:

[VOICE PROFILE]
Speaker: {speaker_name}
Voice Type: {voice_type}
Language: {language}
Accent: {accent}
[/VOICE PROFILE]

[SPEECH STYLE]
Tone: {tone}
Speed: {speed}x
Emotion: {emotion}
Emphasis: {emphasis_pattern}
[/SPEECH STYLE]

[TEXT TO SPEAK]
{text}
[/TEXT TO SPEAK]

[OUTPUT]
Format: {audio_format}
Sample Rate: {sample_rate} Hz
Quality: {audio_quality}
[/OUTPUT]""",
            variables=[
                PromptVariable("speaker_name", "Nom du locuteur", "", True),
                PromptVariable("voice_type", "Type de voix", "neutral", False),
                PromptVariable("language", "Langue", "fr", False),
                PromptVariable("accent", "Accent", "neutral", False),
                PromptVariable("tone", "Ton", "neutral", False),
                PromptVariable("speed", "Vitesse (0.5-2.0)", "1.0", False),
                PromptVariable("emotion", "Émotion", "neutral", False),
                PromptVariable("emphasis_pattern", "Pattern d'emphase", "normal", False),
                PromptVariable("text", "Texte à prononcer", "", True),
                PromptVariable("audio_format", "Format audio", "wav", False),
                PromptVariable("sample_rate", "Taux d'échantillonnage", "44100", False),
                PromptVariable("audio_quality", "Qualité audio", "high", False),
            ],
            tags=["voice", "synthesis", "tts", "audio"]
        ))
        
        # === SCENE TEMPLATES ===
        
        self._add_template(PromptTemplate(
            name="scene_composition",
            description="Template pour composition de scène",
            category=PromptCategory.SCENE,
            layer=PromptLayer.MASTER,
            template="""Scene Composition: {scene_name}

[SETTING]
Location: {location}
Time of Day: {time_of_day}
Weather: {weather}
Season: {season}
[/SETTING]

[LAYOUT]
Background: {background}
Midground: {midground}
Foreground: {foreground}
[/LAYOUT]

[LIGHTING]
Type: {lighting_type}
Direction: {lighting_direction}
Intensity: {lighting_intensity}
Color Temperature: {color_temperature}
[/LIGHTING]

[ATMOSPHERE]
Mood: {mood}
Fog/Haze: {atmospheric_effects}
Particles: {particle_effects}
[/ATMOSPHERE]

[CAMERA]
Position: {camera_position}
Angle: {camera_angle}
Lens: {lens_type}
Depth of Field: {depth_of_field}
[/CAMERA]""",
            variables=[
                PromptVariable("scene_name", "Nom de la scène", "", True),
                PromptVariable("location", "Lieu", "", True),
                PromptVariable("time_of_day", "Moment de la journée", "day", False),
                PromptVariable("weather", "Météo", "clear", False),
                PromptVariable("season", "Saison", "summer", False),
                PromptVariable("background", "Arrière-plan", "", False),
                PromptVariable("midground", "Plan moyen", "", False),
                PromptVariable("foreground", "Premier plan", "", False),
                PromptVariable("lighting_type", "Type d'éclairage", "natural", False),
                PromptVariable("lighting_direction", "Direction de la lumière", "front", False),
                PromptVariable("lighting_intensity", "Intensité lumineuse", "medium", False),
                PromptVariable("color_temperature", "Température de couleur", "neutral", False),
                PromptVariable("mood", "Ambiance", "neutral", False),
                PromptVariable("atmospheric_effects", "Effets atmosphériques", "none", False),
                PromptVariable("particle_effects", "Effets de particules", "none", False),
                PromptVariable("camera_position", "Position de caméra", "eye level", False),
                PromptVariable("camera_angle", "Angle de caméra", "straight on", False),
                PromptVariable("lens_type", "Type d'objectif", "50mm", False),
                PromptVariable("depth_of_field", "Profondeur de champ", "deep", False),
            ],
            tags=["scene", "composition", "environment", "lighting"]
        ))
        
        # === SEO TEMPLATES ===
        
        self._add_template(PromptTemplate(
            name="youtube_metadata",
            description="Template pour métadonnées YouTube",
            category=PromptCategory.SEO,
            layer=PromptLayer.MASTER,
            template="""Generate YouTube metadata for:

[VIDEO INFO]
Title: {video_title}
Description Preview: {description_preview}
Category: {video_category}
[/VIDEO INFO]

[GENERATE]
1. Optimized Title (max 60 chars, include main keyword)
2. Description (first 150 chars for preview, include keywords naturally)
3. Tags (10-15 relevant tags, mix of broad and specific)
4. Thumbnail Suggestions (3 text descriptions for AI generation)

[KEYWORDS]
Primary: {primary_keyword}
Secondary: {secondary_keywords}
[/KEYWORDS]

[AUDIENCE]
Target: {target_audience}
Tone: {content_tone}
[/AUDIENCE]

Output as JSON with keys: title, description, tags, thumbnail_suggestions""",
            variables=[
                PromptVariable("video_title", "Titre de la vidéo", "", True),
                PromptVariable("description_preview", "Aperçu de la description", "", False),
                PromptVariable("video_category", "Catégorie YouTube", "Entertainment", False),
                PromptVariable("primary_keyword", "Mot-clé principal", "", True),
                PromptVariable("secondary_keywords", "Mots-clés secondaires", "", False),
                PromptVariable("target_audience", "Audience cible", "general", False),
                PromptVariable("content_tone", "Ton du contenu", "engaging", False),
            ],
            tags=["seo", "youtube", "metadata", "optimization"]
        ))
        
        # === IDENTITY TEMPLATES ===
        
        self._add_template(PromptTemplate(
            name="identity_foundation",
            description="Template de base pour verrouillage d'identité",
            category=PromptCategory.IDENTITY,
            layer=PromptLayer.FOUNDATION,
            template="""Identity Reference: {identity_name}

Core Attributes:
- Type: {identity_type}
- Primary Features: {primary_features}
- Distinctive Marks: {distinctive_marks}

This identity must be maintained consistently across all generations.""",
            variables=[
                PromptVariable("identity_name", "Nom de l'identité", "", True),
                PromptVariable("identity_type", "Type (person, object, style)", "person", False),
                PromptVariable("primary_features", "Caractéristiques principales", "", True),
                PromptVariable("distinctive_marks", "Marques distinctives", "none", False),
            ],
            tags=["identity", "foundation", "consistency"]
        ))
    
    def _load_custom_templates(self):
        """Charge les templates personnalisés depuis le stockage"""
        if not self.storage_path.exists():
            return
        
        for file_path in self.storage_path.glob("*.json"):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    template = PromptTemplate.from_dict(data)
                    # Ne pas écraser les templates builtin
                    if template.id not in self._templates:
                        self._templates[template.id] = template
                        self._name_index[template.name] = template.id
            except Exception as e:
                print(f"Erreur chargement template {file_path}: {e}")
    
    def _add_template(self, template: PromptTemplate):
        """Ajoute un template au registre"""
        self._templates[template.id] = template
        self._name_index[template.name] = template.id
    
    def _save_template(self, template: PromptTemplate):
        """Sauvegarde un template sur disque"""
        file_path = self.storage_path / f"{template.id}.json"
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(template.to_dict(), f, indent=2, ensure_ascii=False)
    
    def get_template(self, template_id: str) -> Optional[PromptTemplate]:
        """Récupère un template par ID"""
        return self._templates.get(template_id)
    
    def get_template_by_name(self, name: str) -> Optional[PromptTemplate]:
        """Récupère un template par nom"""
        template_id = self._name_index.get(name)
        if template_id:
            return self._templates.get(template_id)
        return None
    
    def list_templates(
        self,
        category: Optional[PromptCategory] = None,
        layer: Optional[PromptLayer] = None,
        tags: Optional[List[str]] = None,
        search: Optional[str] = None
    ) -> List[PromptTemplate]:
        """Liste les templates avec filtres optionnels"""
        result = list(self._templates.values())
        
        if category:
            result = [t for t in result if t.category == category]
        if layer:
            result = [t for t in result if t.layer == layer]
        if tags:
            result = [t for t in result if any(tag in t.tags for tag in tags)]
        if search:
            search_lower = search.lower()
            result = [
                t for t in result 
                if search_lower in t.name.lower() 
                or search_lower in t.description.lower()
                or any(search_lower in tag.lower() for tag in t.tags)
            ]
        
        # Trier par nom
        result.sort(key=lambda t: t.name)
        return result
    
    def create_template(self, template: PromptTemplate) -> PromptTemplate:
        """Crée un nouveau template"""
        # Vérifier que le nom est unique
        if template.name in self._name_index:
            raise ValueError(f"Un template avec le nom '{template.name}' existe déjà")
        
        self._templates[template.id] = template
        self._name_index[template.name] = template.id
        self._save_template(template)
        return template
    
    def update_template(
        self,
        template_id: str,
        updates: Dict[str, Any]
    ) -> Optional[PromptTemplate]:
        """Met à jour un template"""
        template = self._templates.get(template_id)
        if not template:
            return None
        
        # Gérer le changement de nom
        if "name" in updates and updates["name"] != template.name:
            if updates["name"] in self._name_index:
                raise ValueError(f"Un template avec le nom '{updates['name']}' existe déjà")
            del self._name_index[template.name]
            self._name_index[updates["name"]] = template_id
        
        # Appliquer les mises à jour
        for key, value in updates.items():
            if key == "category" and isinstance(value, str):
                value = PromptCategory(value)
            elif key == "layer" and isinstance(value, str):
                value = PromptLayer(value)
            elif key == "variables" and isinstance(value, list):
                value = [PromptVariable.from_dict(v) if isinstance(v, dict) else v for v in value]
            
            if hasattr(template, key):
                setattr(template, key, value)
        
        template.updated_at = datetime.now()
        self._save_template(template)
        return template
    
    def delete_template(self, template_id: str) -> bool:
        """Supprime un template"""
        if template_id not in self._templates:
            return False
        
        template = self._templates[template_id]
        
        # Supprimer du fichier
        file_path = self.storage_path / f"{template_id}.json"
        if file_path.exists():
            file_path.unlink()
        
        # Supprimer des index
        del self._templates[template_id]
        if template.name in self._name_index:
            del self._name_index[template.name]
        
        return True
    
    def render_template(
        self,
        template_id: str,
        variables: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Rend un template avec les variables fournies"""
        template = self._templates.get(template_id)
        if not template:
            return {"error": "Template non trouvé", "success": False}
        
        # Valider les variables
        errors = template.validate_variables(variables)
        if errors:
            return {"error": "; ".join(errors), "success": False, "validation_errors": errors}
        
        rendered = template.render(variables)
        return {
            "success": True,
            "rendered": rendered,
            "template_id": template_id,
            "template_name": template.name
        }
    
    def render_template_by_name(
        self,
        name: str,
        variables: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Rend un template par son nom"""
        template = self.get_template_by_name(name)
        if not template:
            return {"error": f"Template '{name}' non trouvé", "success": False}
        return self.render_template(template.id, variables)
    
    def compose_templates(
        self,
        foundation_id: str,
        execution_id: str,
        variables: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Compose plusieurs templates (pattern en couches)"""
        foundation = self._templates.get(foundation_id)
        execution = self._templates.get(execution_id)
        
        if not foundation:
            return {"error": "Template foundation non trouvé", "success": False}
        if not execution:
            return {"error": "Template execution non trouvé", "success": False}
        
        # Rendre le foundation d'abord
        foundation_rendered = foundation.render(variables)
        
        # Injecter dans l'execution
        execution_vars = {**variables, "foundation_prompt": foundation_rendered}
        final_rendered = execution.render(execution_vars)
        
        return {
            "success": True,
            "rendered": final_rendered,
            "foundation_id": foundation_id,
            "execution_id": execution_id,
            "foundation_rendered": foundation_rendered
        }
    
    def get_template_schema(self, template_id: str) -> Optional[Dict]:
        """Retourne le schéma JSON d'un template pour validation"""
        template = self._templates.get(template_id)
        if not template:
            return None
        
        properties = {}
        required = []
        
        for var in template.variables:
            properties[var.name] = {
                "type": var.type,
                "description": var.description,
                "default": var.default_value
            }
            if var.required and not var.default_value:
                required.append(var.name)
        
        return {
            "type": "object",
            "properties": properties,
            "required": required
        }
    
    def get_statistics(self) -> Dict[str, Any]:
        """Retourne des statistiques sur les templates"""
        stats = {
            "total": len(self._templates),
            "by_category": {},
            "by_layer": {},
            "by_author": {}
        }
        
        for template in self._templates.values():
            # Par catégorie
            cat = template.category.value
            stats["by_category"][cat] = stats["by_category"].get(cat, 0) + 1
            
            # Par couche
            layer = template.layer.value
            stats["by_layer"][layer] = stats["by_layer"].get(layer, 0) + 1
            
            # Par auteur
            author = template.author
            stats["by_author"][author] = stats["by_author"].get(author, 0) + 1
        
        return stats


# Instance globale du service
_template_service_instance: Optional[PromptTemplateService] = None


def get_template_service() -> PromptTemplateService:
    """Retourne l'instance globale du service de templates"""
    global _template_service_instance
    if _template_service_instance is None:
        _template_service_instance = PromptTemplateService()
    return _template_service_instance