"""
ComfyUI Backend Configuration Generator.

This module prepares StoryCore projects for AI generation by creating
ComfyUI-compatible configuration including prompts, parameters, and
layer-aware conditioning setup.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional
from .models import Project, Scene, Character, Shot, Sequence


@dataclass
class GenerationParameters:
    """Parameters for AI generation."""
    resolution: tuple[int, int] = (1024, 576)  # 16:9 aspect ratio
    quality: str = "high"  # "low", "medium", "high", "ultra"
    style_strength: float = 0.8  # 0.0 to 1.0
    seed: Optional[int] = None  # None for random
    steps: int = 30  # Inference steps
    cfg_scale: float = 7.5  # Classifier-free guidance scale
    sampler: str = "euler_a"  # Sampling method


@dataclass
class VisualPrompt:
    """Visual generation prompt for a shot."""
    shot_id: str
    positive_prompt: str
    negative_prompt: str
    character_references: List[str]  # Character IDs to include
    style_tags: List[str]
    parameters: GenerationParameters


@dataclass
class LayerConfig:
    """Layer-aware conditioning configuration."""
    layer_type: str  # "background", "character", "foreground", "effects"
    prompt: str
    mask: Optional[str] = None  # Path to mask image
    blend_mode: str = "normal"
    opacity: float = 1.0


@dataclass
class ComfyUIConfig:
    """Complete ComfyUI configuration for a project."""
    project_name: str
    master_style_prompt: str  # Master Coherence Sheet style
    character_prompts: Dict[str, str]  # Character ID -> appearance prompt
    shot_prompts: Dict[str, VisualPrompt]  # Shot ID -> visual prompt
    generation_parameters: GenerationParameters
    layer_configs: Dict[str, List[LayerConfig]]  # Shot ID -> layer configs
    ready_for_generation: bool = False
    validation_errors: List[str] = field(default_factory=list)


class ComfyUIConfigGenerator:
    """Generate ComfyUI configuration for StoryCore projects."""
    
    def __init__(self):
        """Initialize the ComfyUI configuration generator."""
        self.default_negative_prompt = (
            "low quality, blurry, distorted, deformed, ugly, bad anatomy, "
            "bad proportions, watermark, text, signature, out of frame"
        )
    
    def generate_config(self, project: Project) -> ComfyUIConfig:
        """
        Generate complete ComfyUI configuration for a project.
        
        Args:
            project: The StoryCore project to configure
            
        Returns:
            ComfyUIConfig with all generation settings
        """
        # Extract master style from parsed prompt if available
        master_style = self._extract_master_style(project)
        
        # Generate character prompts
        character_prompts = self._generate_character_prompts(project.characters)
        
        # Generate shot prompts
        shot_prompts = self._generate_shot_prompts(
            project.scenes,
            project.sequences,
            project.characters,
            master_style
        )
        
        # Generate layer configurations
        layer_configs = self._generate_layer_configs(
            project.sequences,
            project.characters
        )
        
        # Create default generation parameters
        gen_params = GenerationParameters()
        
        # Validate configuration
        validation_errors = self._validate_config(
            project,
            character_prompts,
            shot_prompts
        )
        
        config = ComfyUIConfig(
            project_name=project.name,
            master_style_prompt=master_style,
            character_prompts=character_prompts,
            shot_prompts=shot_prompts,
            generation_parameters=gen_params,
            layer_configs=layer_configs,
            ready_for_generation=len(validation_errors) == 0,
            validation_errors=validation_errors
        )
        
        return config
    
    def _extract_master_style(self, project: Project) -> str:
        """
        Extract master style prompt from project.
        
        This creates the "Visual DNA" for the Master Coherence Sheet.
        """
        # Get visual style from first scene if available
        if project.scenes and project.scenes[0].visual_notes:
            base_style = project.scenes[0].visual_notes
        else:
            base_style = "cinematic, professional, high quality"
        
        # Get visual style from first sequence if available
        if project.sequences and project.sequences[0].shots:
            shot_style = project.sequences[0].shots[0].visual_style
            if shot_style:
                base_style = f"{base_style}, {shot_style}"
        
        return base_style
    
    def _generate_character_prompts(
        self,
        characters: List[Character]
    ) -> Dict[str, str]:
        """
        Generate appearance prompts for each character.
        
        These prompts ensure visual consistency across all shots.
        """
        character_prompts = {}
        
        for character in characters:
            # Use the detailed appearance description
            prompt = character.appearance if character.appearance else ""
            
            # Add personality traits for expression guidance (only if appearance exists)
            if prompt and character.personality:
                prompt = f"{prompt}, personality: {character.personality}"
            
            character_prompts[character.id] = prompt
        
        return character_prompts
    
    def _generate_shot_prompts(
        self,
        scenes: List[Scene],
        sequences: List[Sequence],
        characters: List[Character],
        master_style: str
    ) -> Dict[str, VisualPrompt]:
        """
        Generate visual prompts for each shot.
        
        Combines scene context, shot description, character appearances,
        and master style into complete generation prompts.
        """
        shot_prompts = {}
        
        # Create character lookup
        char_lookup = {char.id: char for char in characters}
        scene_lookup = {scene.id: scene for scene in scenes}
        
        for sequence in sequences:
            scene = scene_lookup.get(sequence.scene_id)
            if not scene:
                continue
            
            for shot in sequence.shots:
                # Build positive prompt
                positive_parts = []
                
                # Add shot description
                positive_parts.append(shot.description)
                
                # Add scene location and time
                positive_parts.append(f"{scene.location}, {scene.time_of_day}")
                
                # Add camera information
                positive_parts.append(f"{shot.type} shot, {shot.camera_movement} camera")
                
                # Add character appearances for characters in scene
                char_refs = []
                for char_id in scene.characters:
                    if char_id in char_lookup:
                        char = char_lookup[char_id]
                        positive_parts.append(f"{char.name}: {char.appearance}")
                        char_refs.append(char_id)
                
                # Add visual style
                if shot.visual_style:
                    positive_parts.append(shot.visual_style)
                
                # Add master style
                positive_parts.append(master_style)
                
                # Combine into final prompt
                positive_prompt = ", ".join(positive_parts)
                
                # Create visual prompt
                visual_prompt = VisualPrompt(
                    shot_id=shot.id,
                    positive_prompt=positive_prompt,
                    negative_prompt=self.default_negative_prompt,
                    character_references=char_refs,
                    style_tags=self._extract_style_tags(shot.visual_style, master_style),
                    parameters=GenerationParameters()
                )
                
                shot_prompts[shot.id] = visual_prompt
        
        return shot_prompts
    
    def _generate_layer_configs(
        self,
        sequences: List[Sequence],
        characters: List[Character]
    ) -> Dict[str, List[LayerConfig]]:
        """
        Generate layer-aware conditioning configurations.
        
        This sets up multi-layer generation for complex shots with
        separate background, character, and effects layers.
        """
        layer_configs = {}
        
        for sequence in sequences:
            for shot in sequence.shots:
                layers = []
                
                # Background layer
                bg_layer = LayerConfig(
                    layer_type="background",
                    prompt=f"{shot.description}, background only, no characters",
                    blend_mode="normal",
                    opacity=1.0
                )
                layers.append(bg_layer)
                
                # Character layers (one per character if multiple)
                # For now, use a single character layer
                char_layer = LayerConfig(
                    layer_type="character",
                    prompt=f"{shot.description}, characters only, transparent background",
                    blend_mode="normal",
                    opacity=1.0
                )
                layers.append(char_layer)
                
                # Effects layer for special effects
                if "effects" in shot.description.lower() or "magic" in shot.description.lower():
                    effects_layer = LayerConfig(
                        layer_type="effects",
                        prompt=f"{shot.description}, special effects only",
                        blend_mode="add",
                        opacity=0.8
                    )
                    layers.append(effects_layer)
                
                layer_configs[shot.id] = layers
        
        return layer_configs
    
    def _extract_style_tags(self, shot_style: str, master_style: str) -> List[str]:
        """Extract style tags from style descriptions."""
        tags = []
        
        # Combine styles
        combined = f"{shot_style} {master_style}".lower()
        
        # Common style keywords
        style_keywords = [
            "cinematic", "dramatic", "moody", "bright", "dark",
            "colorful", "monochrome", "vintage", "modern", "futuristic",
            "realistic", "stylized", "painterly", "photographic"
        ]
        
        for keyword in style_keywords:
            if keyword in combined:
                tags.append(keyword)
        
        return tags
    
    def _validate_config(
        self,
        project: Project,
        character_prompts: Dict[str, str],
        shot_prompts: Dict[str, VisualPrompt]
    ) -> List[str]:
        """
        Validate that configuration is complete and ready for generation.
        
        Returns list of validation errors (empty if valid).
        """
        errors = []
        
        # Check that all characters have prompts
        for character in project.characters:
            if character.id not in character_prompts:
                errors.append(f"Missing prompt for character: {character.name}")
            elif not character_prompts[character.id] or not character_prompts[character.id].strip():
                errors.append(f"Empty prompt for character: {character.name}")
            elif len(character_prompts[character.id].strip()) < 20:
                errors.append(f"Character prompt too short for: {character.name}")
        
        # Check that all shots have prompts
        for sequence in project.sequences:
            for shot in sequence.shots:
                if shot.id not in shot_prompts:
                    errors.append(f"Missing prompt for shot: {shot.id}")
                else:
                    visual_prompt = shot_prompts[shot.id]
                    if not visual_prompt.positive_prompt:
                        errors.append(f"Empty positive prompt for shot: {shot.id}")
                    elif len(visual_prompt.positive_prompt) < 30:
                        errors.append(f"Shot prompt too short for: {shot.id}")
        
        # Check that project has at least one scene
        if not project.scenes:
            errors.append("Project has no scenes")
        
        # Check that project has at least one character
        if not project.characters:
            errors.append("Project has no characters")
        
        # Check that project has at least one sequence
        if not project.sequences:
            errors.append("Project has no sequences")
        
        return errors
    
    def update_generation_parameters(
        self,
        config: ComfyUIConfig,
        resolution: Optional[tuple[int, int]] = None,
        quality: Optional[str] = None,
        style_strength: Optional[float] = None,
        seed: Optional[int] = None
    ) -> ComfyUIConfig:
        """
        Update generation parameters in an existing configuration.
        
        Args:
            config: Existing ComfyUI configuration
            resolution: New resolution (width, height)
            quality: New quality setting
            style_strength: New style strength (0.0 to 1.0)
            seed: New seed value
            
        Returns:
            Updated configuration
        """
        if resolution is not None:
            config.generation_parameters.resolution = resolution
        
        if quality is not None:
            config.generation_parameters.quality = quality
            # Adjust steps based on quality
            quality_steps = {
                "low": 20,
                "medium": 30,
                "high": 40,
                "ultra": 50
            }
            config.generation_parameters.steps = quality_steps.get(quality, 30)
        
        if style_strength is not None:
            config.generation_parameters.style_strength = max(0.0, min(1.0, style_strength))
        
        if seed is not None:
            config.generation_parameters.seed = seed
        
        return config
    
    def export_config_to_dict(self, config: ComfyUIConfig) -> Dict:
        """
        Export configuration to dictionary for JSON serialization.
        
        This format can be saved to project files and loaded by ComfyUI.
        """
        return {
            "project_name": config.project_name,
            "master_style_prompt": config.master_style_prompt,
            "character_prompts": config.character_prompts,
            "shot_prompts": {
                shot_id: {
                    "shot_id": prompt.shot_id,
                    "positive_prompt": prompt.positive_prompt,
                    "negative_prompt": prompt.negative_prompt,
                    "character_references": prompt.character_references,
                    "style_tags": prompt.style_tags,
                    "parameters": {
                        "resolution": prompt.parameters.resolution,
                        "quality": prompt.parameters.quality,
                        "style_strength": prompt.parameters.style_strength,
                        "seed": prompt.parameters.seed,
                        "steps": prompt.parameters.steps,
                        "cfg_scale": prompt.parameters.cfg_scale,
                        "sampler": prompt.parameters.sampler
                    }
                }
                for shot_id, prompt in config.shot_prompts.items()
            },
            "generation_parameters": {
                "resolution": config.generation_parameters.resolution,
                "quality": config.generation_parameters.quality,
                "style_strength": config.generation_parameters.style_strength,
                "seed": config.generation_parameters.seed,
                "steps": config.generation_parameters.steps,
                "cfg_scale": config.generation_parameters.cfg_scale,
                "sampler": config.generation_parameters.sampler
            },
            "layer_configs": {
                shot_id: [
                    {
                        "layer_type": layer.layer_type,
                        "prompt": layer.prompt,
                        "mask": layer.mask,
                        "blend_mode": layer.blend_mode,
                        "opacity": layer.opacity
                    }
                    for layer in layers
                ]
                for shot_id, layers in config.layer_configs.items()
            },
            "ready_for_generation": config.ready_for_generation,
            "validation_errors": config.validation_errors
        }
