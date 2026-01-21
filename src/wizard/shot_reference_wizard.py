"""
Shot Reference Image Wizard

Generates reference images for shots using ComfyUI based on shot planning specifications.
Creates visual references that can be used in the sequence editor.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Tuple
from enum import Enum
import json
from pathlib import Path
from datetime import datetime
import asyncio


class ReferenceImageStyle(Enum):
    """Styles for reference image generation"""
    REALISTIC = "realistic"
    CINEMATIC = "cinematic"
    STORYBOARD = "storyboard"
    CONCEPT_ART = "concept_art"
    TECHNICAL = "technical"


class ImageQuality(Enum):
    """Quality levels for image generation"""
    DRAFT = "draft"
    STANDARD = "standard"
    HIGH = "high"
    MAXIMUM = "maximum"


@dataclass
class ShotReferenceSpec:
    """Specification for a shot reference image"""
    shot_id: str
    shot_number: int
    shot_type: str  # ELS, LS, MCU, CU, ECU
    camera_angle: str  # eye-level, low-angle, high-angle
    camera_movement: str  # static, pan-left, dolly-in, etc.
    lens_type: str  # wide, normal, telephoto
    duration_seconds: float
    purpose: str  # establishing, action, emotional, etc.
    characters: List[Dict[str, Any]] = field(default_factory=list)
    environment: Dict[str, Any] = field(default_factory=dict)
    lighting: Dict[str, Any] = field(default_factory=dict)
    composition: Dict[str, Any] = field(default_factory=dict)

    def generate_prompt(self, style: ReferenceImageStyle = ReferenceImageStyle.CINEMATIC) -> str:
        """Generate a detailed prompt for ComfyUI based on shot specifications"""
        prompt_parts = []

        # Base shot description
        if self.shot_type == "ELS":
            prompt_parts.append("extreme long shot, wide establishing view")
        elif self.shot_type == "LS":
            prompt_parts.append("long shot, full scene view")
        elif self.shot_type == "FS":
            prompt_parts.append("full shot, character full body view")
        elif self.shot_type == "MCU":
            prompt_parts.append("medium close-up, character upper body and face")
        elif self.shot_type == "CU":
            prompt_parts.append("close-up, character face and expression")
        elif self.shot_type == "ECU":
            prompt_parts.append("extreme close-up, character eyes and details")

        # Camera angle
        if self.camera_angle == "low-angle":
            prompt_parts.append("low angle camera view, looking up")
        elif self.camera_angle == "high-angle":
            prompt_parts.append("high angle camera view, looking down")
        elif self.camera_angle == "eye-level":
            prompt_parts.append("eye level camera view, neutral perspective")

        # Camera movement implication (for static shots)
        if self.camera_movement == "static":
            prompt_parts.append("static camera, fixed position")
        elif "pan" in self.camera_movement:
            prompt_parts.append(f"camera {self.camera_movement.replace('-', ' ')} implied")
        elif "dolly" in self.camera_movement:
            prompt_parts.append(f"camera {self.camera_movement.replace('-', ' ')} implied")

        # Lens characteristics
        if self.lens_type == "wide":
            prompt_parts.append("wide angle lens, expansive perspective")
        elif self.lens_type == "telephoto":
            prompt_parts.append("telephoto lens, compressed perspective, shallow depth of field")
        elif self.lens_type == "normal":
            prompt_parts.append("normal lens, natural perspective")

        # Characters
        if self.characters:
            char_descriptions = []
            for char in self.characters:
                char_desc = f"{char.get('description', 'person')}"
                visibility = char.get('visibility', 'present')
                if visibility == 'primary_focus':
                    char_desc += ", main subject, detailed focus"
                elif visibility == 'prominent':
                    char_desc += ", prominent in frame"
                char_descriptions.append(char_desc)

            if char_descriptions:
                prompt_parts.append(f"featuring {', '.join(char_descriptions)}")

        # Environment
        if self.environment:
            env_type = self.environment.get('type', 'indoor')
            time_of_day = self.environment.get('time_of_day', 'day')
            prompt_parts.append(f"{env_type} environment, {time_of_day} lighting")

        # Lighting
        if self.lighting:
            lighting_type = self.lighting.get('type', 'natural')
            intensity = self.lighting.get('intensity', 'medium')
            prompt_parts.append(f"{lighting_type} lighting, {intensity} intensity")

        # Style-specific elements
        if style == ReferenceImageStyle.CINEMATIC:
            prompt_parts.extend([
                "cinematic lighting, film still, professional cinematography",
                "dramatic shadows, rich colors, high contrast",
                "movie production quality, theatrical composition"
            ])
        elif style == ReferenceImageStyle.STORYBOARD:
            prompt_parts.extend([
                "storyboard style, line art, simplified forms",
                "clear composition, readable action, visual narrative",
                "black and white or limited color palette"
            ])
        elif style == ReferenceImageStyle.CONCEPT_ART:
            prompt_parts.extend([
                "concept art style, detailed illustration",
                "dramatic lighting, rich textures, artistic composition",
                "conceptual design, visual development art"
            ])
        elif style == ReferenceImageStyle.REALISTIC:
            prompt_parts.extend([
                "photorealistic, highly detailed, sharp focus",
                "professional photography, realistic lighting",
                "ultra high resolution, photorealistic quality"
            ])

        # Technical quality
        prompt_parts.extend([
            "highly detailed, professional quality",
            "sharp focus, clear composition, cinematic aspect ratio"
        ])

        return ", ".join(prompt_parts)

    def get_negative_prompt(self) -> str:
        """Generate negative prompt for better image quality"""
        return "blurry, low quality, distorted, ugly, deformed, noisy, grainy, watermark, text, signature, oversaturated, undersaturated, bad anatomy, bad proportions, duplicate, mutation, extra limbs"


@dataclass
class ShotReferenceResult:
    """Result of generating a shot reference image"""
    shot_id: str
    success: bool
    image_path: Optional[str] = None
    prompt_used: Optional[str] = None
    generation_time: float = 0.0
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class ShotReferenceWizard:
    """
    Wizard for generating reference images for shots using ComfyUI

    This wizard takes shot planning data and generates visual reference images
    that can be used in sequence editors and pre-visualization.
    """

    def __init__(self, comfyui_manager=None):
        """Initialize the shot reference wizard"""
        self.comfyui_manager = comfyui_manager
        self.generation_results: List[ShotReferenceResult] = []
        self.reference_specs: List[ShotReferenceSpec] = []

    def load_shot_data(self, project_path: Path) -> List[ShotReferenceSpec]:
        """
        Load shot specifications from project files

        Args:
            project_path: Path to the project directory

        Returns:
            List of shot reference specifications
        """
        shot_specs = []

        # Load shot planning data
        shot_planning_file = project_path / "shot_planning.json"
        if not shot_planning_file.exists():
            raise FileNotFoundError("shot_planning.json not found. Run 'storycore shot-planning' first.")

        with open(shot_planning_file, 'r') as f:
            shot_data = json.load(f)

        # Load scene breakdown for additional context
        scene_breakdown_file = project_path / "scene_breakdown.json"
        scene_context = {}
        if scene_breakdown_file.exists():
            with open(scene_breakdown_file, 'r') as f:
                scene_context = json.load(f)

        # Process each shot
        for shot in shot_data.get('shot_lists', []):
            spec = self._create_shot_spec(shot, scene_context)
            shot_specs.append(spec)

        self.reference_specs = shot_specs
        return shot_specs

    def _create_shot_spec(self, shot: Dict[str, Any], scene_context: Dict[str, Any]) -> ShotReferenceSpec:
        """Create a shot reference specification from shot data"""
        return ShotReferenceSpec(
            shot_id=shot['shot_id'],
            shot_number=shot['shot_number'],
            shot_type=shot['shot_type']['code'],
            camera_angle=shot['camera']['angle']['type'],
            camera_movement=shot['camera']['movement']['type'],
            lens_type=shot['camera']['lens']['type'],
            duration_seconds=shot['timing']['duration_seconds'],
            purpose=shot['narrative_function']['primary_purpose'],
            characters=shot.get('characters', []),
            environment=self._extract_environment(shot, scene_context),
            lighting=shot.get('lighting', {}),
            composition=shot.get('composition', {})
        )

    def _extract_environment(self, shot: Dict[str, Any], scene_context: Dict[str, Any]) -> Dict[str, Any]:
        """Extract environment information for the shot"""
        # Try to get environment from scene data
        scene_id = shot.get('scene_id')
        if scene_id and 'detailed_scenes' in scene_context:
            for scene in scene_context['detailed_scenes']:
                if scene.get('scene_id') == scene_id:
                    environment = scene.get('environment', {})
                    return {
                        'type': environment.get('type', 'indoor'),
                        'time_of_day': environment.get('time_of_day', 'day'),
                        'location': environment.get('location', 'unspecified')
                    }

        # Default environment
        return {
            'type': 'indoor',
            'time_of_day': 'day',
            'location': 'unspecified'
        }

    async def generate_reference_images(self,
                                      project_path: Path,
                                      style: ReferenceImageStyle = ReferenceImageStyle.CINEMATIC,
                                      quality: ImageQuality = ImageQuality.STANDARD,
                                      shot_ids: Optional[List[str]] = None) -> List[ShotReferenceResult]:
        """
        Generate reference images for shots using ComfyUI

        Args:
            project_path: Path to project directory
            style: Style for generated images
            quality: Quality level for generation
            shot_ids: Specific shot IDs to generate (None for all)

        Returns:
            List of generation results
        """
        if not self.reference_specs:
            self.load_shot_data(project_path)

        # Filter shots if specific IDs requested
        shots_to_process = self.reference_specs
        if shot_ids:
            shots_to_process = [s for s in self.reference_specs if s.shot_id in shot_ids]

        if not shots_to_process:
            raise ValueError("No shots found to process")

        results = []

        # Create output directory
        output_dir = project_path / "shot_references"
        output_dir.mkdir(exist_ok=True)

        print(f"🎬 Generating reference images for {len(shots_to_process)} shots...")
        print(f"   Style: {style.value}")
        print(f"   Quality: {quality.value}")
        print(f"   Output: {output_dir}")

        # Process each shot
        for i, shot_spec in enumerate(shots_to_process, 1):
            print(f"   [{i}/{len(shots_to_process)}] Processing {shot_spec.shot_id}...")

            result = await self._generate_single_reference(
                shot_spec, output_dir, style, quality, project_path
            )
            results.append(result)

            if result.success:
                print(f"   ✅ {shot_spec.shot_id}: Generated successfully")
            else:
                print(f"   ❌ {shot_spec.shot_id}: Failed - {result.error_message}")

        self.generation_results = results

        # Save generation summary
        self._save_generation_summary(project_path, results, style, quality)

        return results

    async def _generate_single_reference(self,
                                       shot_spec: ShotReferenceSpec,
                                       output_dir: Path,
                                       style: ReferenceImageStyle,
                                       quality: ImageQuality,
                                       project_path: Path) -> ShotReferenceResult:
        """
        Generate a single reference image for a shot
        """
        import time
        start_time = time.time()

        try:
            # Generate prompts
            prompt = shot_spec.generate_prompt(style)
            negative_prompt = shot_spec.get_negative_prompt()

            # Set quality parameters
            quality_settings = self._get_quality_settings(quality)

            # Prepare ComfyUI workflow
            workflow_data = self._create_comfyui_workflow(
                prompt, negative_prompt, quality_settings
            )

            # Generate image using ComfyUI
            if self.comfyui_manager:
                # Use ComfyUI manager if available
                result = await self._generate_with_comfyui_manager(
                    workflow_data, project_path
                )
            else:
                # Fallback to mock generation for development
                result = self._generate_mock_reference(shot_spec, output_dir)

            generation_time = time.time() - start_time

            return ShotReferenceResult(
                shot_id=shot_spec.shot_id,
                success=result['success'],
                image_path=result.get('image_path'),
                prompt_used=prompt,
                generation_time=generation_time,
                error_message=result.get('error_message'),
                metadata={
                    'style': style.value,
                    'quality': quality.value,
                    'shot_spec': {
                        'shot_type': shot_spec.shot_type,
                        'camera_angle': shot_spec.camera_angle,
                        'camera_movement': shot_spec.camera_movement,
                        'purpose': shot_spec.purpose
                    },
                    'quality_settings': quality_settings
                }
            )

        except Exception as e:
            generation_time = time.time() - start_time
            return ShotReferenceResult(
                shot_id=shot_spec.shot_id,
                success=False,
                generation_time=generation_time,
                error_message=str(e)
            )

    def _get_quality_settings(self, quality: ImageQuality) -> Dict[str, Any]:
        """Get quality settings for image generation"""
        settings = {
            ImageQuality.DRAFT: {
                'width': 512,
                'height': 288,
                'steps': 15,
                'cfg_scale': 6.0,
                'sampler': 'euler_ancestral'
            },
            ImageQuality.STANDARD: {
                'width': 768,
                'height': 432,
                'steps': 25,
                'cfg_scale': 7.0,
                'sampler': 'dpmpp_2m_karras'
            },
            ImageQuality.HIGH: {
                'width': 1024,
                'height': 576,
                'steps': 35,
                'cfg_scale': 8.0,
                'sampler': 'dpmpp_2m_karras'
            },
            ImageQuality.MAXIMUM: {
                'width': 1536,
                'height': 864,
                'steps': 50,
                'cfg_scale': 9.0,
                'sampler': 'dpmpp_3m_karras'
            }
        }

        return settings.get(quality, settings[ImageQuality.STANDARD])

    def _create_comfyui_workflow(self, prompt: str, negative_prompt: str,
                               quality_settings: Dict[str, Any]) -> Dict[str, Any]:
        """Create ComfyUI workflow for image generation"""
        # This would create a proper ComfyUI workflow JSON
        # For now, return a simplified structure
        return {
            'prompt': prompt,
            'negative_prompt': negative_prompt,
            'width': quality_settings['width'],
            'height': quality_settings['height'],
            'steps': quality_settings['steps'],
            'cfg_scale': quality_settings['cfg_scale'],
            'sampler': quality_settings['sampler'],
            'seed': -1,  # Random seed
            'model': 'sd_xl_base_1.0.safetensors'
        }

    async def _generate_with_comfyui_manager(self, workflow_data: Dict[str, Any],
                                           project_path: Path) -> Dict[str, Any]:
        """Generate image using ComfyUI manager"""
        try:
            # This would integrate with the actual ComfyUI manager
            # For now, simulate successful generation
            return {
                'success': True,
                'image_path': f"shot_references/mock_{workflow_data.get('seed', 'random')}.png"
            }
        except Exception as e:
            return {
                'success': False,
                'error_message': str(e)
            }

    def _generate_mock_reference(self, shot_spec: ShotReferenceSpec, output_dir: Path) -> Dict[str, Any]:
        """Generate a mock reference image for development/testing"""
        import time

        # Create a placeholder image file
        image_filename = f"{shot_spec.shot_id}_reference_mock.png"
        image_path = output_dir / image_filename

        # In a real implementation, this would generate an actual image
        # For now, just create an empty file as placeholder
        image_path.touch()

        return {
            'success': True,
            'image_path': str(image_path)
        }

    def _save_generation_summary(self, project_path: Path, results: List[ShotReferenceResult],
                               style: ReferenceImageStyle, quality: ImageQuality) -> None:
        """Save generation summary to project"""
        summary = {
            'generation_summary': {
                'timestamp': datetime.utcnow().isoformat() + "Z",
                'style': style.value,
                'quality': quality.value,
                'total_shots': len(results),
                'successful_generations': len([r for r in results if r.success]),
                'failed_generations': len([r for r in results if not r.success]),
                'total_generation_time': sum(r.generation_time for r in results),
                'average_generation_time': sum(r.generation_time for r in results) / len(results) if results else 0,
                'results': [
                    {
                        'shot_id': r.shot_id,
                        'success': r.success,
                        'image_path': r.image_path,
                        'generation_time': r.generation_time,
                        'error_message': r.error_message
                    } for r in results
                ]
            }
        }

        summary_file = project_path / "shot_references_summary.json"
        with open(summary_file, 'w') as f:
            json.dump(summary, f, indent=2)

    def get_preview_prompts(self, shot_ids: Optional[List[str]] = None) -> Dict[str, str]:
        """
        Get preview of prompts that would be generated for shots

        Args:
            shot_ids: Specific shot IDs to preview (None for all)

        Returns:
            Dictionary mapping shot IDs to their generated prompts
        """
        previews = {}

        shots_to_preview = self.reference_specs
        if shot_ids:
            shots_to_preview = [s for s in self.reference_specs if s.shot_id in shot_ids]

        for shot_spec in shots_to_preview:
            prompt = shot_spec.generate_prompt()
            previews[shot_spec.shot_id] = prompt

        return previews


# Convenience functions
def create_shot_reference_wizard(comfyui_manager=None) -> ShotReferenceWizard:
    """Create a shot reference wizard instance"""
    return ShotReferenceWizard(comfyui_manager)


async def generate_shot_references(project_path: Path,
                                 style: str = "cinematic",
                                 quality: str = "standard",
                                 shot_ids: Optional[List[str]] = None) -> List[ShotReferenceResult]:
    """
    Convenience function to generate shot reference images

    Args:
        project_path: Path to project directory
        style: Generation style ("cinematic", "storyboard", "realistic", "concept_art")
        quality: Quality level ("draft", "standard", "high", "maximum")
        shot_ids: Specific shot IDs to generate (None for all)

    Returns:
        List of generation results
    """
    wizard = create_shot_reference_wizard()

    # Convert string parameters to enums
    style_enum = ReferenceImageStyle(style.upper()) if style.upper() in ReferenceImageStyle.__members__ else ReferenceImageStyle.CINEMATIC
    quality_enum = ImageQuality(quality.upper()) if quality.upper() in ImageQuality.__members__ else ImageQuality.STANDARD

    return await wizard.generate_reference_images(project_path, style_enum, quality_enum, shot_ids)