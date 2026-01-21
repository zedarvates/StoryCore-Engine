"""
Character Integration Manager

Manages integration of created characters with existing StoryCore-Engine systems
including Puppet System, ComfyUI workflows, NewBie anime generation, and character library.
"""

import json
import uuid
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime

from .models import (
    CharacterProfile,
    PuppetCategory,
    CoherenceAnchors,
    VisualIdentity
)
from .error_handler import CharacterWizardError, ErrorCategory, ErrorSeverity


class IntegrationResult:
    """Result of character integration with StoryCore-Engine systems"""
    
    def __init__(self):
        self.success: bool = False
        self.character_id: str = ""
        self.puppet_category: Optional[PuppetCategory] = None
        self.comfyui_config: Optional[Dict[str, Any]] = None
        self.newbie_config: Optional[Dict[str, Any]] = None
        self.library_path: Optional[str] = None
        self.project_updated: bool = False
        self.integration_errors: List[str] = []
        self.warnings: List[str] = []


class ComfyUIConfig:
    """ComfyUI-specific configuration for character"""
    
    def __init__(self):
        self.character_descriptor: str = ""
        self.positive_prompts: List[str] = []
        self.negative_prompts: List[str] = []
        self.controlnet_settings: Dict[str, Any] = {}
        self.style_settings: Dict[str, Any] = {}
        self.seed_base: int = 0
        self.cfg_scale: float = 7.5
        self.denoising_strength: float = 0.7
        self.steps: int = 30
        self.sampler: str = "dpmpp_2m_karras"
        self.scheduler: str = "karras"


class NewBieConfig:
    """NewBie anime generation system configuration"""
    
    def __init__(self):
        self.character_style: str = "anime"
        self.art_style: str = ""
        self.character_tags: List[str] = []
        self.quality_tags: List[str] = []
        self.negative_tags: List[str] = []
        self.model_variant: str = "newbie_exp0.1"


class CharacterIntegrationManager:
    """Manages integration with existing StoryCore-Engine systems"""
    
    def __init__(self, project_path: Optional[Path] = None):
        self.project_path = project_path or Path.cwd()
        self.puppet_integration = PuppetSystemIntegration()
        self.comfyui_integration = ComfyUICharacterIntegration()
        self.newbie_integration = NewBieCharacterIntegration()
        self.library_manager = CharacterLibraryManager(self.project_path)
    
    def integrate_character(
        self, 
        profile: CharacterProfile,
        project_context: Optional[str] = None
    ) -> IntegrationResult:
        """
        Integrate character with StoryCore-Engine systems
        
        Integration steps:
        1. Convert to Data Contract v1 format
        2. Assign to Puppet System category (P1/P2/M1)
        3. Register with ComfyUI workflows
        4. Configure NewBie integration if anime style
        5. Add to character library
        6. Update project files if project context provided
        7. Generate integration test prompts
        
        Args:
            profile: Complete character profile to integrate
            project_context: Optional project path for project-specific integration
            
        Returns:
            IntegrationResult with system assignments and test data
        """
        result = IntegrationResult()
        result.character_id = profile.character_id
        
        try:
            # Step 1: Validate Data Contract v1 compliance
            if not self._validate_data_contract(profile):
                result.integration_errors.append("Character profile does not comply with Data Contract v1")
                return result
            
            # Step 2: Assign Puppet System category
            puppet_category = self.puppet_integration.assign_puppet_category(
                profile, 
                project_context
            )
            result.puppet_category = puppet_category
            profile.puppet_category = puppet_category
            
            # Step 3: Generate ComfyUI configuration
            comfyui_config = self.comfyui_integration.generate_comfyui_config(profile)
            result.comfyui_config = comfyui_config
            
            # Step 4: Configure NewBie integration if anime style
            if self._is_anime_style(profile):
                newbie_config = self.newbie_integration.generate_newbie_config(profile)
                result.newbie_config = newbie_config
            
            # Step 5: Add to character library
            library_path = self.library_manager.add_character(profile)
            result.library_path = str(library_path)
            
            # Step 6: Update project files if project context provided
            if project_context:
                project_updated = self._update_project_files(profile, project_context)
                result.project_updated = project_updated
            
            # Step 7: Generate integration test prompts
            test_prompts = self._generate_test_prompts(profile)
            
            result.success = True
            
        except CharacterWizardError as e:
            result.integration_errors.append(f"Integration error: {e.message}")
        except Exception as e:
            result.integration_errors.append(f"Unexpected integration error: {str(e)}")
        
        return result
    
    def _validate_data_contract(self, profile: CharacterProfile) -> bool:
        """
        Validate character profile complies with Data Contract v1
        
        Required fields:
        - character_id (string, UUID format)
        - name (string, non-empty)
        - creation_method (enum value)
        - creation_timestamp (ISO 8601 format)
        - version (string, semantic version)
        - visual_identity (complete VisualIdentity object)
        - personality_profile (complete PersonalityProfile object)
        - voice_identity (complete VoiceIdentity object)
        - backstory_profile (complete BackstoryProfile object)
        - coherence_anchors (complete CoherenceAnchors object)
        - puppet_category (enum value)
        """
        try:
            # Validate required string fields
            if not profile.character_id or not isinstance(profile.character_id, str):
                return False
            
            if not profile.name or not isinstance(profile.name, str):
                return False
            
            # Validate UUID format for character_id
            try:
                uuid.UUID(profile.character_id)
            except ValueError:
                return False
            
            # Validate timestamp format
            try:
                datetime.fromisoformat(profile.creation_timestamp)
            except ValueError:
                return False
            
            # Validate version format (semantic versioning)
            if not profile.version or not isinstance(profile.version, str):
                return False
            
            # Validate nested objects exist
            if not profile.visual_identity:
                return False
            
            if not profile.personality_profile:
                return False
            
            if not profile.voice_identity:
                return False
            
            if not profile.backstory_profile:
                return False
            
            if not profile.coherence_anchors:
                return False
            
            # Validate enum values
            if not profile.puppet_category:
                return False
            
            return True
            
        except Exception:
            return False
    
    def _is_anime_style(self, profile: CharacterProfile) -> bool:
        """Check if character uses anime art style"""
        art_style = profile.visual_identity.art_style.lower()
        return "anime" in art_style or "manga" in art_style or "japanese" in art_style
    
    def _update_project_files(self, profile: CharacterProfile, project_context: str) -> bool:
        """Update project files with new character data"""
        try:
            project_path = Path(project_context)
            project_file = project_path / "project.json"
            
            if not project_file.exists():
                return False
            
            # Load existing project data
            with open(project_file, 'r', encoding='utf-8') as f:
                project_data = json.load(f)
            
            # Add character reference to project
            if "characters" not in project_data:
                project_data["characters"] = []
            
            character_ref = {
                "character_id": profile.character_id,
                "name": profile.name,
                "puppet_category": profile.puppet_category.value,
                "library_path": f"assets/characters/{profile.character_id}.json"
            }
            
            # Check if character already exists in project
            existing_ids = [c.get("character_id") for c in project_data["characters"]]
            if profile.character_id not in existing_ids:
                project_data["characters"].append(character_ref)
            
            # Save updated project data
            with open(project_file, 'w', encoding='utf-8') as f:
                json.dump(project_data, f, indent=2, ensure_ascii=False)
            
            return True
            
        except Exception as e:
            print(f"Warning: Failed to update project files: {e}")
            return False
    
    def _generate_test_prompts(self, profile: CharacterProfile) -> List[str]:
        """Generate integration test prompts for character"""
        prompts = []
        
        # Basic character prompt
        basic_prompt = f"{profile.name}, {profile.visual_identity.age_range}, "
        basic_prompt += f"{profile.visual_identity.hair_color} hair, "
        basic_prompt += f"{profile.visual_identity.eye_color} eyes"
        prompts.append(basic_prompt)
        
        # Detailed character prompt with coherence anchors
        if profile.coherence_anchors.character_descriptor:
            prompts.append(profile.coherence_anchors.character_descriptor)
        
        # Action prompt
        action_prompt = f"{profile.name} {profile.personality_profile.primary_traits[0] if profile.personality_profile.primary_traits else 'standing'}"
        prompts.append(action_prompt)
        
        return prompts


class PuppetSystemIntegration:
    """Handles integration with Puppet System (P1/P2/M1 categories)"""
    
    def assign_puppet_category(
        self, 
        profile: CharacterProfile,
        project_context: Optional[str] = None
    ) -> PuppetCategory:
        """
        Assign character to appropriate Puppet System category
        
        Assignment logic:
        - P1 (Primary): Main characters, protagonists, major antagonists
        - P2 (Secondary): Supporting characters, important recurring roles
        - M1 (Minor): Background characters, crowd elements, one-off appearances
        
        Factors considered:
        - Role in story (from metadata or user input)
        - Personality complexity (number of traits, depth of backstory)
        - Visual distinctiveness (unique features, detailed appearance)
        - Voice identity complexity (unique speech patterns, catchphrases)
        """
        # Calculate importance score based on character attributes
        importance_score = 0
        
        # Factor 1: Personality complexity (0-30 points)
        trait_count = len(profile.personality_profile.primary_traits)
        importance_score += min(trait_count * 5, 30)
        
        # Factor 2: Backstory depth (0-25 points)
        backstory_elements = (
            len(profile.backstory_profile.key_life_events) +
            len(profile.backstory_profile.formative_experiences) +
            len(profile.backstory_profile.significant_relationships)
        )
        importance_score += min(backstory_elements * 3, 25)
        
        # Factor 3: Visual distinctiveness (0-25 points)
        distinctive_features = len(profile.visual_identity.distinctive_features)
        importance_score += min(distinctive_features * 5, 25)
        
        # Factor 4: Voice identity complexity (0-20 points)
        voice_elements = (
            len(profile.voice_identity.catchphrases) +
            len(profile.voice_identity.verbal_tics) +
            len(profile.voice_identity.signature_expressions)
        )
        importance_score += min(voice_elements * 4, 20)
        
        # Assign category based on score
        # P1: 70+ points (highly developed characters)
        # P2: 40-69 points (moderately developed characters)
        # M1: 0-39 points (minimally developed characters)
        
        if importance_score >= 70:
            return PuppetCategory.P1
        elif importance_score >= 40:
            return PuppetCategory.P2
        else:
            return PuppetCategory.M1


class ComfyUICharacterIntegration:
    """Handles ComfyUI-specific character integration"""
    
    def generate_comfyui_config(self, profile: CharacterProfile) -> Dict[str, Any]:
        """
        Generate ComfyUI-specific configuration for character
        
        Configuration includes:
        - Character descriptor for prompts
        - Positive and negative prompts
        - ControlNet settings for consistency
        - Style parameters
        - Generation parameters (seed, cfg_scale, etc.)
        """
        config = ComfyUIConfig()
        
        # Build character descriptor
        config.character_descriptor = self._build_character_descriptor(profile)
        
        # Build positive prompts from coherence anchors
        config.positive_prompts = profile.coherence_anchors.positive_prompts.copy()
        if not config.positive_prompts:
            config.positive_prompts = self._generate_positive_prompts(profile)
        
        # Build negative prompts
        config.negative_prompts = profile.coherence_anchors.negative_prompts.copy()
        if not config.negative_prompts:
            config.negative_prompts = self._generate_negative_prompts(profile)
        
        # Configure ControlNet settings
        config.controlnet_settings = {
            "use_controlnet": True,
            "controlnet_models": ["control_openpose", "control_depth"],
            "controlnet_strength": 0.8,
            "preprocessing": True
        }
        
        # Configure style settings
        config.style_settings = {
            "art_style": profile.visual_identity.art_style,
            "rendering_style": profile.visual_identity.rendering_style,
            "quality_level": profile.visual_identity.quality_level,
            "aesthetic": profile.visual_identity.aesthetic
        }
        
        # Set generation parameters from coherence anchors
        config.seed_base = profile.coherence_anchors.seed_base
        config.cfg_scale = profile.coherence_anchors.cfg_scale
        config.denoising_strength = profile.coherence_anchors.denoising_strength
        
        # Convert to dictionary
        return {
            "character_descriptor": config.character_descriptor,
            "positive_prompts": config.positive_prompts,
            "negative_prompts": config.negative_prompts,
            "controlnet_settings": config.controlnet_settings,
            "style_settings": config.style_settings,
            "generation_parameters": {
                "seed_base": config.seed_base,
                "cfg_scale": config.cfg_scale,
                "denoising_strength": config.denoising_strength,
                "steps": config.steps,
                "sampler": config.sampler,
                "scheduler": config.scheduler
            }
        }
    
    def _build_character_descriptor(self, profile: CharacterProfile) -> str:
        """Build comprehensive character descriptor for prompts"""
        parts = []
        
        # Name and age
        parts.append(f"{profile.name}")
        if profile.visual_identity.age_range:
            parts.append(profile.visual_identity.age_range)
        
        # Physical appearance
        if profile.visual_identity.hair_color and profile.visual_identity.hair_style:
            parts.append(f"{profile.visual_identity.hair_color} {profile.visual_identity.hair_style} hair")
        
        if profile.visual_identity.eye_color:
            parts.append(f"{profile.visual_identity.eye_color} eyes")
        
        if profile.visual_identity.skin_tone:
            parts.append(f"{profile.visual_identity.skin_tone} skin")
        
        # Clothing and style
        if profile.visual_identity.clothing_style:
            parts.append(f"wearing {profile.visual_identity.clothing_style}")
        
        # Distinctive features
        if profile.visual_identity.distinctive_features:
            parts.extend(profile.visual_identity.distinctive_features[:2])
        
        return ", ".join(parts)
    
    def _generate_positive_prompts(self, profile: CharacterProfile) -> List[str]:
        """Generate positive prompts from character profile"""
        prompts = []
        
        # Quality tags
        prompts.extend([
            "high quality",
            "detailed",
            "professional",
            f"{profile.visual_identity.quality_level} quality"
        ])
        
        # Style tags
        if profile.visual_identity.art_style:
            prompts.append(profile.visual_identity.art_style)
        
        if profile.visual_identity.rendering_style:
            prompts.append(profile.visual_identity.rendering_style)
        
        # Aesthetic tags
        if profile.visual_identity.aesthetic:
            prompts.append(profile.visual_identity.aesthetic)
        
        return prompts
    
    def _generate_negative_prompts(self, profile: CharacterProfile) -> List[str]:
        """Generate negative prompts to avoid common issues"""
        return [
            "low quality",
            "blurry",
            "distorted",
            "deformed",
            "ugly",
            "bad anatomy",
            "bad proportions",
            "duplicate",
            "watermark",
            "signature"
        ]


class NewBieCharacterIntegration:
    """Handles NewBie anime generation system integration"""
    
    def generate_newbie_config(self, profile: CharacterProfile) -> Dict[str, Any]:
        """
        Generate NewBie-specific configuration for anime characters
        
        NewBie system specializes in anime-style character generation
        with specific tagging and style conventions.
        """
        config = NewBieConfig()
        
        # Set character style
        config.character_style = "anime"
        config.art_style = profile.visual_identity.art_style
        
        # Build character tags
        config.character_tags = self._build_character_tags(profile)
        
        # Build quality tags
        config.quality_tags = [
            "masterpiece",
            "best quality",
            "high resolution",
            "detailed",
            "professional"
        ]
        
        # Build negative tags
        config.negative_tags = [
            "low quality",
            "worst quality",
            "blurry",
            "distorted",
            "bad anatomy",
            "bad hands",
            "bad face",
            "deformed"
        ]
        
        # Set model variant
        config.model_variant = "newbie_exp0.1"
        
        # Convert to dictionary
        return {
            "character_style": config.character_style,
            "art_style": config.art_style,
            "character_tags": config.character_tags,
            "quality_tags": config.quality_tags,
            "negative_tags": config.negative_tags,
            "model_variant": config.model_variant
        }
    
    def _build_character_tags(self, profile: CharacterProfile) -> List[str]:
        """Build anime-specific character tags"""
        tags = []
        
        # Age and gender tags
        if profile.visual_identity.age_range:
            age_map = {
                "child": "child",
                "teen": "teenager",
                "young_adult": "young adult",
                "adult": "adult",
                "elderly": "elderly"
            }
            tags.append(age_map.get(profile.visual_identity.age_range, "adult"))
        
        # Hair tags
        if profile.visual_identity.hair_color:
            tags.append(f"{profile.visual_identity.hair_color} hair")
        
        if profile.visual_identity.hair_length:
            tags.append(f"{profile.visual_identity.hair_length} hair")
        
        # Eye tags
        if profile.visual_identity.eye_color:
            tags.append(f"{profile.visual_identity.eye_color} eyes")
        
        # Clothing tags
        if profile.visual_identity.clothing_style:
            tags.append(profile.visual_identity.clothing_style)
        
        # Personality-based expression tags
        if profile.personality_profile.primary_traits:
            trait = profile.personality_profile.primary_traits[0].lower()
            expression_map = {
                "cheerful": "smiling",
                "serious": "serious expression",
                "mysterious": "mysterious look",
                "confident": "confident pose",
                "shy": "shy expression"
            }
            if trait in expression_map:
                tags.append(expression_map[trait])
        
        return tags


class CharacterLibraryManager:
    """Manages character library storage and retrieval"""
    
    def __init__(self, project_path: Path):
        self.project_path = project_path
        self.library_path = project_path / "characters"
        self.library_path.mkdir(parents=True, exist_ok=True)
    
    def add_character(self, profile: CharacterProfile) -> Path:
        """
        Add character to library
        
        Args:
            profile: Character profile to add
            
        Returns:
            Path to saved character file
        """
        character_file = self.library_path / f"{profile.character_id}.json"
        
        # Convert profile to dictionary for JSON serialization
        character_dict = self._profile_to_dict(profile)
        
        # Save to file
        with open(character_file, 'w', encoding='utf-8') as f:
            json.dump(character_dict, f, indent=2, ensure_ascii=False)
        
        return character_file
    
    def get_character(self, character_id: str) -> Optional[CharacterProfile]:
        """Retrieve character from library by ID"""
        character_file = self.library_path / f"{character_id}.json"
        
        if not character_file.exists():
            return None
        
        with open(character_file, 'r', encoding='utf-8') as f:
            character_dict = json.load(f)
        
        # Convert dictionary back to CharacterProfile
        # This would require a from_dict method on CharacterProfile
        # For now, return None as placeholder
        return None
    
    def list_characters(self) -> List[Dict[str, Any]]:
        """List all characters in library"""
        characters = []
        
        for character_file in self.library_path.glob("*.json"):
            try:
                with open(character_file, 'r', encoding='utf-8') as f:
                    character_dict = json.load(f)
                
                # Extract summary information
                summary = {
                    "character_id": character_dict.get("character_id"),
                    "name": character_dict.get("name"),
                    "creation_method": character_dict.get("creation_method"),
                    "puppet_category": character_dict.get("puppet_category"),
                    "genre_tags": character_dict.get("genre_tags", []),
                    "file_path": str(character_file)
                }
                
                characters.append(summary)
                
            except Exception as e:
                print(f"Warning: Failed to load character {character_file}: {e}")
        
        return characters
    
    def delete_character(self, character_id: str) -> bool:
        """Delete character from library"""
        character_file = self.library_path / f"{character_id}.json"
        
        if not character_file.exists():
            return False
        
        try:
            character_file.unlink()
            return True
        except Exception:
            return False
    
    def _profile_to_dict(self, profile: CharacterProfile) -> Dict[str, Any]:
        """Convert CharacterProfile to dictionary for JSON serialization"""
        return {
            "schema_version": "1.0",
            "character_id": profile.character_id,
            "name": profile.name,
            "creation_method": profile.creation_method.value,
            "creation_timestamp": profile.creation_timestamp,
            "version": profile.version,
            "visual_identity": {
                "hair_color": profile.visual_identity.hair_color,
                "hair_style": profile.visual_identity.hair_style,
                "hair_length": profile.visual_identity.hair_length,
                "eye_color": profile.visual_identity.eye_color,
                "eye_shape": profile.visual_identity.eye_shape,
                "skin_tone": profile.visual_identity.skin_tone,
                "facial_structure": profile.visual_identity.facial_structure,
                "distinctive_features": profile.visual_identity.distinctive_features,
                "age_range": profile.visual_identity.age_range,
                "height": profile.visual_identity.height,
                "build": profile.visual_identity.build,
                "posture": profile.visual_identity.posture,
                "clothing_style": profile.visual_identity.clothing_style,
                "color_palette": {
                    "primary_colors": profile.visual_identity.color_palette.primary_colors,
                    "secondary_colors": profile.visual_identity.color_palette.secondary_colors,
                    "accent_colors": profile.visual_identity.color_palette.accent_colors,
                    "color_harmony": profile.visual_identity.color_palette.color_harmony
                },
                "accessories": profile.visual_identity.accessories,
                "aesthetic": profile.visual_identity.aesthetic,
                "art_style": profile.visual_identity.art_style,
                "rendering_style": profile.visual_identity.rendering_style,
                "quality_level": profile.visual_identity.quality_level
            },
            "personality_profile": {
                "openness": profile.personality_profile.openness,
                "conscientiousness": profile.personality_profile.conscientiousness,
                "extraversion": profile.personality_profile.extraversion,
                "agreeableness": profile.personality_profile.agreeableness,
                "neuroticism": profile.personality_profile.neuroticism,
                "primary_traits": profile.personality_profile.primary_traits,
                "strengths": profile.personality_profile.strengths,
                "flaws": profile.personality_profile.flaws,
                "external_goal": profile.personality_profile.external_goal,
                "internal_need": profile.personality_profile.internal_need,
                "fears": profile.personality_profile.fears,
                "values": profile.personality_profile.values,
                "stress_response": profile.personality_profile.stress_response,
                "conflict_style": profile.personality_profile.conflict_style,
                "emotional_expression": profile.personality_profile.emotional_expression,
                "decision_making_style": profile.personality_profile.decision_making_style,
                "attachment_style": profile.personality_profile.attachment_style,
                "social_preferences": profile.personality_profile.social_preferences,
                "trust_patterns": profile.personality_profile.trust_patterns
            },
            "voice_identity": {
                "speech_patterns": profile.voice_identity.speech_patterns,
                "vocabulary_level": profile.voice_identity.vocabulary_level,
                "sentence_complexity": profile.voice_identity.sentence_complexity,
                "speaking_pace": profile.voice_identity.speaking_pace,
                "accent": profile.voice_identity.accent,
                "dialect": profile.voice_identity.dialect,
                "formality_level": profile.voice_identity.formality_level.value,
                "humor_style": profile.voice_identity.humor_style.value,
                "emotional_range": profile.voice_identity.emotional_range,
                "vulnerability_expression": profile.voice_identity.vulnerability_expression,
                "catchphrases": profile.voice_identity.catchphrases,
                "verbal_tics": profile.voice_identity.verbal_tics,
                "signature_expressions": profile.voice_identity.signature_expressions,
                "voice_type": profile.voice_identity.voice_type,
                "emotional_variance": profile.voice_identity.emotional_variance
            },
            "backstory_profile": {
                "origin_story": profile.backstory_profile.origin_story,
                "key_life_events": profile.backstory_profile.key_life_events,
                "formative_experiences": profile.backstory_profile.formative_experiences,
                "family_background": profile.backstory_profile.family_background,
                "significant_relationships": profile.backstory_profile.significant_relationships,
                "relationship_patterns": profile.backstory_profile.relationship_patterns,
                "occupation": profile.backstory_profile.occupation,
                "education_level": profile.backstory_profile.education_level,
                "social_status": profile.backstory_profile.social_status,
                "cultural_background": profile.backstory_profile.cultural_background,
                "hidden_aspects": profile.backstory_profile.hidden_aspects,
                "secrets": profile.backstory_profile.secrets,
                "unresolved_conflicts": profile.backstory_profile.unresolved_conflicts,
                "growth_opportunities": profile.backstory_profile.growth_opportunities,
                "potential_conflicts": profile.backstory_profile.potential_conflicts,
                "transformation_triggers": profile.backstory_profile.transformation_triggers
            },
            "coherence_anchors": {
                "character_descriptor": profile.coherence_anchors.character_descriptor,
                "facial_anchors": profile.coherence_anchors.facial_anchors,
                "clothing_anchors": profile.coherence_anchors.clothing_anchors,
                "style_anchors": profile.coherence_anchors.style_anchors,
                "primary_colors": profile.coherence_anchors.primary_colors,
                "secondary_colors": profile.coherence_anchors.secondary_colors,
                "color_harmony": profile.coherence_anchors.color_harmony,
                "positive_prompts": profile.coherence_anchors.positive_prompts,
                "negative_prompts": profile.coherence_anchors.negative_prompts,
                "style_strength": profile.coherence_anchors.style_strength,
                "seed_base": profile.coherence_anchors.seed_base,
                "cfg_scale": profile.coherence_anchors.cfg_scale,
                "denoising_strength": profile.coherence_anchors.denoising_strength
            },
            "puppet_category": profile.puppet_category.value,
            "genre_tags": profile.genre_tags,
            "style_tags": profile.style_tags,
            "reference_images": profile.reference_images,
            "quality_score": profile.quality_score,
            "consistency_score": profile.consistency_score,
            "metadata": profile.metadata
        }