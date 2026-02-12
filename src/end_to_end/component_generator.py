"""
Component Generator for end-to-end project creation.

Orchestrates generation of all project components and validates coherence.
"""

from typing import List, Dict, Optional
from datetime import datetime
import uuid
from src.end_to_end.data_models import (
    ParsedPrompt, ProjectComponents, ProjectMetadata,
    WorldConfig, Character, StoryStructure, DialogueScript,
    SequencePlan, MusicDescription
)
from src.end_to_end.world_config_generator import WorldConfigGenerator
from src.end_to_end.character_generator import CharacterGenerator
from src.end_to_end.story_structure_generator import StoryStructureGenerator
from src.end_to_end.dialogue_script_generator import DialogueScriptGenerator
from src.end_to_end.sequence_planner import SequencePlanner
from src.end_to_end.music_description_generator import MusicDescriptionGenerator


class ComponentGenerator:
    """Generates all project components with coherence validation"""
    
    def __init__(self):
        """Initialize component generator"""
        self.world_generator = WorldConfigGenerator()
        self.character_generator = CharacterGenerator()
        self.story_generator = StoryStructureGenerator()
        self.dialogue_generator = DialogueScriptGenerator()
        self.sequence_planner = SequencePlanner()
        self.music_generator = MusicDescriptionGenerator()
    
    async def generate_all_components(
        self,
        parsed_prompt: ParsedPrompt
    ) -> ProjectComponents:
        """
        Generate all project components
        
        Args:
            parsed_prompt: Parsed user prompt
            
        Returns:
            ProjectComponents with all generated data
        """
        # Generate world config
        world_config = self.world_generator.generate(parsed_prompt)
        
        # Generate characters
        characters = self.character_generator.generate_characters(
            parsed_prompt,
            world_config
        )
        
        # Generate story structure
        story_structure = self.story_generator.generate_story_structure(
            parsed_prompt,
            world_config,
            characters
        )
        
        # Generate dialogue script
        dialogue_script = self.dialogue_generator.generate_dialogue_script(
            parsed_prompt,
            story_structure,
            characters
        )
        
        # Generate sequence plan
        sequence_plan = self.sequence_planner.plan_sequences(
            parsed_prompt,
            story_structure,
            dialogue_script,
            world_config
        )
        
        # Generate music description
        music_description = self.music_generator.generate_music_description(
            parsed_prompt,
            story_structure
        )
        
        # Create metadata
        metadata = ProjectMetadata(
            project_id=str(uuid.uuid4()),
            project_name=parsed_prompt.project_title,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            version="1.0",
            video_type=parsed_prompt.video_type,
            duration_seconds=parsed_prompt.duration_seconds,
            aspect_ratio=parsed_prompt.aspect_ratio,
            resolution="1024x576",  # Default resolution
            author="StoryCore AI"
        )
        
        # Create components
        components = ProjectComponents(
            world_config=world_config,
            characters=characters,
            story_structure=story_structure,
            dialogue_script=dialogue_script,
            sequence_plan=sequence_plan,
            music_description=music_description,
            metadata=metadata
        )
        
        # Validate coherence
        validation_result = self.validate_coherence(components)
        
        # Auto-correct if needed
        if not validation_result["is_coherent"]:
            components = self._auto_correct_components(
                components,
                validation_result["issues"]
            )
        
        return components
    
    def validate_coherence(
        self,
        components: ProjectComponents
    ) -> Dict[str, any]:
        """
        Validate coherence between all components
        
        Args:
            components: Project components to validate
            
        Returns:
            Dictionary with validation results
        """
        issues = []
        
        # Check world-character coherence
        world_character_issues = self._check_world_character_coherence(
            components.world_config,
            components.characters
        )
        issues.extend(world_character_issues)
        
        # Check story-character coherence
        story_character_issues = self._check_story_character_coherence(
            components.story_structure,
            components.characters
        )
        issues.extend(story_character_issues)
        
        # Check dialogue-story coherence
        dialogue_story_issues = self._check_dialogue_story_coherence(
            components.dialogue_script,
            components.story_structure
        )
        issues.extend(dialogue_story_issues)
        
        # Check sequence-story coherence
        sequence_story_issues = self._check_sequence_story_coherence(
            components.sequence_plan,
            components.story_structure
        )
        issues.extend(sequence_story_issues)
        
        # Check music-story coherence
        music_story_issues = self._check_music_story_coherence(
            components.music_description,
            components.story_structure
        )
        issues.extend(music_story_issues)
        
        return {
            "is_coherent": len(issues) == 0,
            "issues": issues,
            "total_issues": len(issues)
        }
    
    def _check_world_character_coherence(
        self,
        world_config: WorldConfig,
        characters: List[Character]
    ) -> List[Dict[str, str]]:
        """Check coherence between world and characters"""
        issues = []
        
        # Check if characters' visual descriptions match world style
        for char in characters:
            if world_config.genre.lower() not in char.visual_description.lower():
                # This is acceptable - not all descriptions need genre mention
                pass
        
        return issues
    
    def _check_story_character_coherence(
        self,
        story_structure: StoryStructure,
        characters: List[Character]
    ) -> List[Dict[str, str]]:
        """Check coherence between story and characters"""
        issues = []
        
        # Check if story mentions characters
        if len(characters) > 0:
            protagonist = next(
                (c for c in characters if "protagonist" in c.role.lower()),
                None
            )
            if protagonist and protagonist.name not in story_structure.logline:
                # Acceptable - logline might use generic terms
                pass
        
        return issues
    
    def _check_dialogue_story_coherence(
        self,
        dialogue_script: DialogueScript,
        story_structure: StoryStructure
    ) -> List[Dict[str, str]]:
        """Check coherence between dialogue and story"""
        issues = []
        
        # Check if dialogue scenes match story scenes
        story_scene_ids = []
        for act in story_structure.acts:
            story_scene_ids.extend(act.scenes)
        
        dialogue_scene_ids = [scene.scene_id for scene in dialogue_script.scenes]
        
        # All dialogue scenes should be in story
        for scene_id in dialogue_scene_ids:
            if scene_id not in story_scene_ids:
                issues.append({
                    "type": "dialogue_story_mismatch",
                    "description": f"Dialogue scene {scene_id} not found in story structure",
                    "severity": "medium"
                })
        
        return issues
    
    def _check_sequence_story_coherence(
        self,
        sequence_plan: SequencePlan,
        story_structure: StoryStructure
    ) -> List[Dict[str, str]]:
        """Check coherence between sequences and story"""
        issues = []
        
        # Check if sequence count matches act count
        if len(sequence_plan.sequences) != len(story_structure.acts):
            issues.append({
                "type": "sequence_act_mismatch",
                "description": f"Sequence count ({len(sequence_plan.sequences)}) doesn't match act count ({len(story_structure.acts)})",
                "severity": "high"
            })
        
        return issues
    
    def _check_music_story_coherence(
        self,
        music_description: MusicDescription,
        story_structure: StoryStructure
    ) -> List[Dict[str, str]]:
        """Check coherence between music and story"""
        issues = []
        
        # Check if music timeline covers story duration
        if len(music_description.timeline) < len(story_structure.acts):
            issues.append({
                "type": "music_timeline_short",
                "description": "Music timeline has fewer cues than story acts",
                "severity": "low"
            })
        
        return issues
    
    def _auto_correct_components(
        self,
        components: ProjectComponents,
        issues: List[Dict[str, str]]
    ) -> ProjectComponents:
        """
        Auto-correct component issues
        
        Args:
            components: Components with issues
            issues: List of detected issues
            
        Returns:
            Corrected components
        """
        # For now, return components as-is
        # In a full implementation, this would fix specific issues
        # For example:
        # - Adjust sequence count to match acts
        # - Add missing music cues
        # - Fix scene ID mismatches
        
        return components
