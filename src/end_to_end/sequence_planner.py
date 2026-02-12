"""
Sequence Planner for end-to-end project creation.

Plans sequences and shots from story structure and dialogue, including:
- Shot distribution logic
- Camera angle/movement selection
- Dialogue timing integration
- Prompt module generation
"""

import uuid
from typing import List, Dict
from src.end_to_end.data_models import (
    ParsedPrompt, StoryStructure, DialogueScript, WorldConfig,
    SequencePlan, Sequence, Shot, PromptModules
)


class SequencePlanner:
    """Plans sequences and shots from story and dialogue"""
    
    def __init__(self):
        """Initialize sequence planner"""
        self.camera_angles = self._init_camera_angles()
        self.camera_movements = self._init_camera_movements()
        self.shot_types = self._init_shot_types()
    
    def _init_camera_angles(self) -> List[str]:
        """Initialize camera angle options"""
        return [
            "eye level",
            "low angle",
            "high angle",
            "dutch angle",
            "over the shoulder",
            "bird's eye view",
            "worm's eye view"
        ]
    
    def _init_camera_movements(self) -> List[str]:
        """Initialize camera movement options"""
        return [
            "static",
            "pan left",
            "pan right",
            "tilt up",
            "tilt down",
            "dolly in",
            "dolly out",
            "tracking shot",
            "crane shot"
        ]
    
    def _init_shot_types(self) -> Dict[str, str]:
        """Initialize shot type descriptions"""
        return {
            "establishing": "wide shot establishing the location",
            "close-up": "close-up focusing on character emotion",
            "medium": "medium shot showing character interaction",
            "wide": "wide shot showing full scene",
            "extreme close-up": "extreme close-up on specific detail",
            "two-shot": "two-shot framing two characters"
        }
    
    def plan_sequences(
        self,
        parsed_prompt: ParsedPrompt,
        story_structure: StoryStructure,
        dialogue_script: DialogueScript,
        world_config: WorldConfig
    ) -> SequencePlan:
        """
        Plan complete sequence and shot breakdown
        
        Args:
            parsed_prompt: Parsed user prompt
            story_structure: Story structure
            dialogue_script: Dialogue script
            world_config: World configuration
            
        Returns:
            Complete SequencePlan object
        """
        sequence_id = str(uuid.uuid4())
        
        # Generate sequences from story acts
        sequences = self._generate_sequences(
            story_structure,
            dialogue_script,
            parsed_prompt,
            world_config
        )
        
        # Calculate totals
        total_shots = sum(len(seq.shots) for seq in sequences)
        
        return SequencePlan(
            sequence_id=sequence_id,
            total_duration=parsed_prompt.duration_seconds,
            sequences=sequences,
            total_shots=total_shots
        )
    
    def _generate_sequences(
        self,
        story_structure: StoryStructure,
        dialogue_script: DialogueScript,
        parsed_prompt: ParsedPrompt,
        world_config: WorldConfig
    ) -> List[Sequence]:
        """Generate sequences from story acts"""
        sequences = []
        
        for act in story_structure.acts:
            sequence = self._generate_sequence(
                act,
                dialogue_script,
                parsed_prompt,
                world_config
            )
            sequences.append(sequence)
        
        return sequences
    
    def _generate_sequence(
        self,
        act,
        dialogue_script: DialogueScript,
        parsed_prompt: ParsedPrompt,
        world_config: WorldConfig
    ) -> Sequence:
        """Generate a single sequence from an act"""
        sequence_id = str(uuid.uuid4())
        
        # Determine shot count for this sequence
        shot_count = self._calculate_shot_count(
            act.duration,
            parsed_prompt.video_type
        )
        
        # Generate shots
        shots = self._generate_shots(
            shot_count,
            act,
            dialogue_script,
            parsed_prompt,
            world_config
        )
        
        # Determine mood and visual direction
        mood = self._determine_sequence_mood(act, parsed_prompt)
        visual_direction = self._determine_visual_direction(act, world_config)
        
        return Sequence(
            sequence_id=sequence_id,
            name=act.name,
            duration=act.duration,
            shots=shots,
            mood=mood,
            visual_direction=visual_direction
        )
    
    def _calculate_shot_count(self, duration: int, video_type: str) -> int:
        """Calculate number of shots for sequence duration"""
        # Shot duration varies by video type
        shot_durations = {
            "trailer": 3,  # Fast cuts
            "teaser": 4,
            "short_film": 6,  # Longer shots
            "music_video": 2,  # Very fast cuts
            "commercial": 5,
            "default": 5
        }
        
        avg_shot_duration = shot_durations.get(
            video_type.lower(),
            shot_durations["default"]
        )
        
        # Calculate shot count
        shot_count = max(2, duration // avg_shot_duration)
        return shot_count
    
    def _generate_shots(
        self,
        shot_count: int,
        act,
        dialogue_script: DialogueScript,
        parsed_prompt: ParsedPrompt,
        world_config: WorldConfig
    ) -> List[Shot]:
        """Generate shots for a sequence"""
        shots = []
        shot_duration = act.duration // shot_count
        
        # Get dialogue lines for this act's scenes
        act_dialogue_lines = self._get_act_dialogue_lines(act, dialogue_script)
        
        for i in range(shot_count):
            shot = self._generate_shot(
                i + 1,
                shot_duration,
                act,
                parsed_prompt,
                world_config,
                act_dialogue_lines,
                shot_count
            )
            shots.append(shot)
        
        return shots
    
    def _get_act_dialogue_lines(self, act, dialogue_script: DialogueScript) -> List:
        """Get dialogue lines for an act's scenes"""
        lines = []
        for scene in dialogue_script.scenes:
            if scene.scene_id in act.scenes:
                lines.extend(scene.dialogue_lines)
        return lines
    
    def _generate_shot(
        self,
        shot_number: int,
        duration: int,
        act,
        parsed_prompt: ParsedPrompt,
        world_config: WorldConfig,
        dialogue_lines: List,
        total_shots: int
    ) -> Shot:
        """Generate a single shot"""
        shot_id = str(uuid.uuid4())
        
        # Determine shot type based on position
        shot_type = self._determine_shot_type(shot_number, total_shots)
        
        # Select camera angle and movement
        camera_angle = self._select_camera_angle(shot_number, shot_type)
        camera_movement = self._select_camera_movement(shot_number, shot_type)
        
        # Determine lighting and composition
        lighting = self._determine_lighting(world_config, act.act_number)
        composition = self._determine_composition(shot_type)
        
        # Generate description
        description = self._generate_shot_description(
            shot_type,
            act,
            parsed_prompt,
            dialogue_lines,
            shot_number
        )
        
        # Generate prompt modules
        prompt_modules = self._generate_prompt_modules(
            parsed_prompt,
            world_config,
            shot_type,
            camera_angle,
            lighting
        )
        
        return Shot(
            shot_id=shot_id,
            shot_number=shot_number,
            duration=duration,
            description=description,
            camera_angle=camera_angle,
            camera_movement=camera_movement,
            lighting=lighting,
            composition=composition,
            prompt_modules=prompt_modules
        )
    
    def _determine_shot_type(self, shot_number: int, total_shots: int) -> str:
        """Determine shot type based on position in sequence"""
        if shot_number == 1:
            return "establishing"
        elif shot_number == total_shots:
            return "wide"
        elif shot_number % 3 == 0:
            return "close-up"
        elif shot_number % 2 == 0:
            return "medium"
        else:
            return "two-shot"
    
    def _select_camera_angle(self, shot_number: int, shot_type: str) -> str:
        """Select camera angle for shot"""
        if shot_type == "establishing":
            return "high angle"
        elif shot_type == "close-up":
            return "eye level"
        elif shot_type == "wide":
            return "eye level"
        else:
            # Cycle through angles
            return self.camera_angles[shot_number % len(self.camera_angles)]
    
    def _select_camera_movement(self, shot_number: int, shot_type: str) -> str:
        """Select camera movement for shot"""
        if shot_type == "establishing":
            return "dolly in"
        elif shot_type == "close-up":
            return "static"
        elif shot_type == "wide":
            return "pan right"
        else:
            # Cycle through movements
            return self.camera_movements[shot_number % len(self.camera_movements)]
    
    def _determine_lighting(self, world_config: WorldConfig, act_number: int) -> str:
        """Determine lighting for shot"""
        base_lighting = world_config.lighting_style
        
        # Adjust based on act
        if act_number == 1:
            return f"{base_lighting}, establishing mood"
        elif act_number == 3:
            return f"{base_lighting}, dramatic intensity"
        else:
            return f"{base_lighting}, building tension"
    
    def _determine_composition(self, shot_type: str) -> str:
        """Determine composition for shot"""
        compositions = {
            "establishing": "rule of thirds, balanced frame",
            "close-up": "centered subject, shallow depth of field",
            "medium": "balanced composition, natural framing",
            "wide": "expansive frame, environmental context",
            "extreme close-up": "tight frame, detail focus",
            "two-shot": "balanced two-person frame"
        }
        return compositions.get(shot_type, "balanced composition")
    
    def _generate_shot_description(
        self,
        shot_type: str,
        act,
        parsed_prompt: ParsedPrompt,
        dialogue_lines: List,
        shot_number: int
    ) -> str:
        """Generate shot description"""
        base_desc = self.shot_types.get(shot_type, "shot of the scene")
        
        # Add context
        desc = f"{base_desc} in {parsed_prompt.setting}"
        
        # Add act context
        if act.act_number == 1:
            desc += ", introducing the world"
        elif act.act_number == 3:
            desc += ", showing the resolution"
        else:
            desc += ", developing the conflict"
        
        return desc
    
    def _generate_prompt_modules(
        self,
        parsed_prompt: ParsedPrompt,
        world_config: WorldConfig,
        shot_type: str,
        camera_angle: str,
        lighting: str
    ) -> PromptModules:
        """Generate prompt modules for shot"""
        # Base prompt
        base = f"{shot_type} of {parsed_prompt.setting}"
        
        # Style prompt
        style_elements = ", ".join(parsed_prompt.visual_style[:3])
        style = f"{parsed_prompt.genre} style, {style_elements}"
        
        # Lighting prompt
        lighting_prompt = f"{lighting}, {world_config.atmosphere} atmosphere"
        
        # Composition prompt
        composition = f"{camera_angle} angle, cinematic framing"
        
        # Camera prompt
        camera = f"professional cinematography, {shot_type} composition"
        
        return PromptModules(
            base=base,
            style=style,
            lighting=lighting_prompt,
            composition=composition,
            camera=camera
        )
    
    def _determine_sequence_mood(self, act, parsed_prompt: ParsedPrompt) -> str:
        """Determine mood for sequence"""
        if act.act_number == 1:
            return parsed_prompt.mood[0] if parsed_prompt.mood else "mysterious"
        elif act.act_number == 3:
            return "intense"
        else:
            return "tense"
    
    def _determine_visual_direction(self, act, world_config: WorldConfig) -> str:
        """Determine visual direction for sequence"""
        return f"{world_config.visual_style[0]} aesthetic with {world_config.lighting_style}"
