"""
Project Pipeline Manager for StoryCore LLM Assistant
Orchestrates full project creation workflow with step-by-step confirmation
"""

import json
import os
from datetime import datetime
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum


class PipelineStep(Enum):
    PARSE_PROMPT = "parse_prompt"
    GENERATE_NAME = "generate_name"
    CONFIRM_NAME = "confirm_name"
    GENERATE_WORLD = "generate_world"
    GENERATE_CHARACTERS = "generate_characters"
    GENERATE_STORY = "generate_story"
    GENERATE_DIALOGUE = "generate_dialogue"
    GENERATE_SEQUENCES = "generate_sequences"
    GENERATE_MUSIC = "generate_music"
    CREATE_PROJECT = "create_project"
    FINALIZE = "finalize"


class PipelineStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    WAITING_CONFIRMATION = "waiting_confirmation"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class PipelineStepResult:
    step: PipelineStep
    status: PipelineStatus
    data: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat() + "Z")


@dataclass
class PipelineProgress:
    current_step: PipelineStep
    total_steps: int
    step_progress: int
    overall_progress: float
    status: PipelineStatus
    message: str
    start_time: str = field(default_factory=lambda: datetime.now().isoformat() + "Z")


class ProjectPipelineManager:
    """Orchestrates full project creation with confirmation and tracking"""

    # Default project directory - Documents\StoryCore Projects
    DEFAULT_PROJECTS_DIR = os.path.join(os.path.expanduser("~"), "Documents", "StoryCore Projects")

    def __init__(self, base_output_dir: str = None):
        self.base_output_dir = base_output_dir or self.DEFAULT_PROJECTS_DIR
        self.steps = [
            PipelineStep.PARSE_PROMPT,
            PipelineStep.GENERATE_NAME,
            PipelineStep.CONFIRM_NAME,
            PipelineStep.GENERATE_WORLD,
            PipelineStep.GENERATE_CHARACTERS,
            PipelineStep.GENERATE_STORY,
            PipelineStep.GENERATE_DIALOGUE,
            PipelineStep.GENERATE_SEQUENCES,
            PipelineStep.GENERATE_MUSIC,
            PipelineStep.CREATE_PROJECT,
            PipelineStep.FINALIZE
        ]
        self.step_results: Dict[PipelineStep, PipelineStepResult] = {}
        self.progress_callbacks: List[Callable] = []
        self.confirmation_callbacks: Dict[PipelineStep, Callable] = {}
        
        for step in self.steps:
            self.step_results[step] = PipelineStepResult(
                step=step,
                status=PipelineStatus.PENDING
            )

    def set_confirmation_callback(self, step: PipelineStep, callback: Callable):
        self.confirmation_callbacks[step] = callback

    def add_progress_callback(self, callback: Callable):
        self.progress_callbacks.append(callback)

    def _notify_progress(self, progress: PipelineProgress):
        for callback in self.progress_callbacks:
            try:
                callback(progress)
            except Exception as e:
                print(f"Progress callback error: {e}")

    def _update_step_result(self, step: PipelineStep, status: PipelineStatus,
                           data: Dict[str, Any] = None, error: str = None):
        self.step_results[step] = PipelineStepResult(
            step=step,
            status=status,
            data=data or {},
            error=error,
            timestamp=datetime.now().isoformat() + "Z"
        )

    def get_step_index(self, step: PipelineStep) -> int:
        try:
            return self.steps.index(step)
        except ValueError:
            return -1

    def get_next_step(self, current_step: PipelineStep) -> Optional[PipelineStep]:
        current_index = self.get_step_index(current_step)
        if current_index >= 0 and current_index < len(self.steps) - 1:
            return self.steps[current_index + 1]
        return None

    async def run_pipeline(self, initial_prompt: str, 
                          options: Dict[str, Any] = None) -> Dict[PipelineStep, PipelineStepResult]:
        """Run complete pipeline"""
        options = options or {}
        results = {}
        
        for step in self.steps:
            if step.value in options.get("disabled_steps", []):
                self._update_step_result(step, PipelineStatus.SKIPPED)
                results[step] = self.step_results[step]
                continue
            
            try:
                await self._execute_step(step, initial_prompt, options)
                results[step] = self.step_results[step]
            except Exception as e:
                self._update_step_result(step, PipelineStatus.FAILED, error=str(e))
                results[step] = self.step_results[step]
                
                if step in [PipelineStep.PARSE_PROMPT, PipelineStep.GENERATE_NAME, PipelineStep.CREATE_PROJECT]:
                    break
        
        return results

    async def _execute_step(self, step: PipelineStep, prompt: str, options: Dict[str, Any]):
        current_index = self.get_step_index(step)
        overall_progress = (current_index / len(self.steps)) * 100
        
        self._notify_progress(PipelineProgress(
            current_step=step,
            total_steps=len(self.steps),
            step_progress=0,
            overall_progress=overall_progress,
            status=PipelineStatus.IN_PROGRESS,
            message=f"Executing {step.value.replace('_', ' ').title()}..."
        ))
        
        self._update_step_result(step, PipelineStatus.IN_PROGRESS)
        
        if step == PipelineStep.PARSE_PROMPT:
            await self._step_parse_prompt(prompt, options)
        elif step == PipelineStep.GENERATE_NAME:
            await self._step_generate_name(prompt, options)
        elif step == PipelineStep.CONFIRM_NAME:
            await self._step_confirm_name(options)
        elif step == PipelineStep.GENERATE_WORLD:
            await self._step_generate_world(options)
        elif step == PipelineStep.GENERATE_CHARACTERS:
            await self._step_generate_characters(options)
        elif step == PipelineStep.GENERATE_STORY:
            await self._step_generate_story(options)
        elif step == PipelineStep.GENERATE_DIALOGUE:
            await self._step_generate_dialogue(options)
        elif step == PipelineStep.GENERATE_SEQUENCES:
            await self._step_generate_sequences(options)
        elif step == PipelineStep.GENERATE_MUSIC:
            await self._step_generate_music(options)
        elif step == PipelineStep.CREATE_PROJECT:
            await self._step_create_project(options)
        elif step == PipelineStep.FINALIZE:
            await self._step_finalize(options)
        
        self._update_step_result(step, PipelineStatus.COMPLETED,
                                  data=self.step_results[step].data)
        
        self._notify_progress(PipelineProgress(
            current_step=step,
            total_steps=len(self.steps),
            step_progress=100,
            overall_progress=overall_progress + (100 / len(self.steps)),
            status=PipelineStatus.COMPLETED,
            message=f"Completed {step.value.replace('_', ' ').title()}"
        ))

    async def _step_parse_prompt(self, prompt: str, options: Dict[str, Any]):
        """Parse user prompt"""
        try:
            from llm.prompt_parser import PromptParser
            parser = PromptParser()
            parsed = await parser.parse(prompt)
            self._update_step_result(PipelineStep.PARSE_PROMPT, PipelineStatus.COMPLETED,
                                      data={"parsed_prompt": parsed})
        except ImportError:
            # Fallback rule-based parsing
            parsed = {
                "project_title": "Untitled Project",
                "genre": "drama",
                "mood": ["neutral"],
                "setting": "unspecified",
                "timePeriod": "present",
                "videoType": "trailer",
                "aspectRatio": "16:9",
                "durationSeconds": 60,
                "raw_prompt": prompt
            }
            self._update_step_result(PipelineStep.PARSE_PROMPT, PipelineStatus.COMPLETED,
                                      data={"parsed_prompt": parsed})

    async def _step_generate_name(self, prompt: str, options: Dict[str, Any]):
        """Generate project name"""
        try:
            from llm.project_name_generator import ProjectNameGenerator
            generator = ProjectNameGenerator()
            parsed = self.step_results[PipelineStep.PARSE_PROMPT].data.get("parsed_prompt", {})
            suggestions = generator.generateSuggestions({
                "projectTitle": parsed.get("project_title"),
                "genre": parsed.get("genre"),
                "setting": parsed.get("setting"),
                "keyElements": parsed.get("keyElements", [])
            })
            self._update_step_result(PipelineStep.GENERATE_NAME, PipelineStatus.COMPLETED,
                                      data={"name_suggestions": suggestions})
        except ImportError:
            suggestions = [{"suggested_name": "My Project", "full_name": "My Project", "is_duplicate": False, "project_path": "./My_Project"}]
            self._update_step_result(PipelineStep.GENERATE_NAME, PipelineStatus.COMPLETED,
                                      data={"name_suggestions": suggestions})

    async def _step_confirm_name(self, options: Dict[str, Any]):
        """Confirm project name with user"""
        suggestions = self.step_results[PipelineStep.GENERATE_NAME].data.get("name_suggestions", [])
        if suggestions:
            selected = suggestions[0]
            confirmed = True
            if PipelineStep.CONFIRM_NAME in self.confirmation_callbacks:
                confirmed = self.confirmation_callbacks[PipelineStep.CONFIRM_NAME]({"suggestions": suggestions})
            self._update_step_result(PipelineStep.CONFIRM_NAME, PipelineStatus.COMPLETED, data={
                "confirmed_name": selected["full_name"] if confirmed else None,
                "selected_suggestion": selected, "confirmed": confirmed
            })

    async def _step_generate_world(self, options: Dict[str, Any]):
        if not options.get("generate_world", True):
            self._update_step_result(PipelineStep.GENERATE_WORLD, PipelineStatus.SKIPPED)
            return
        try:
            from llm.world_config_generator import WorldConfigGenerator
            parsed = self.step_results[PipelineStep.PARSE_PROMPT].data.get("parsed_prompt", {})
            confirmed_name = self.step_results[PipelineStep.CONFIRM_NAME].data.get("confirmed_name")
            generator = WorldConfigGenerator()
            world_config = generator.generateWorldConfig({
                "projectTitle": confirmed_name, "genre": parsed.get("genre"),
                "mood": parsed.get("mood"), "setting": parsed.get("setting"),
                "timePeriod": parsed.get("timePeriod"), "prompt": parsed.get("raw_prompt")
            })
            self._update_step_result(PipelineStep.GENERATE_WORLD, PipelineStatus.COMPLETED,
                                      data={"world_config": world_config})
        except ImportError:
            self._update_step_result(PipelineStep.GENERATE_WORLD, PipelineStatus.SKIPPED)

    async def _step_generate_characters(self, options: Dict[str, Any]):
        if not options.get("generate_characters", True):
            self._update_step_result(PipelineStep.GENERATE_CHARACTERS, PipelineStatus.SKIPPED)
            return
        try:
            from llm.character_generator import CharacterGenerator
            parsed = self.step_results[PipelineStep.PARSE_PROMPT].data.get("parsed_prompt", {})
            confirmed_name = self.step_results[PipelineStep.CONFIRM_NAME].data.get("confirmed_name")
            generator = CharacterGenerator()
            characters = generator.generateCharacters({
                "projectTitle": confirmed_name, "genre": parsed.get("genre"),
                "mood": parsed.get("mood"), "prompt": parsed.get("raw_prompt")
            })
            self._update_step_result(PipelineStep.GENERATE_CHARACTERS, PipelineStatus.COMPLETED,
                                      data={"characters": characters})
        except ImportError:
            self._update_step_result(PipelineStep.GENERATE_CHARACTERS, PipelineStatus.SKIPPED)

    async def _step_generate_story(self, options: Dict[str, Any]):
        if not options.get("generate_story", True):
            self._update_step_result(PipelineStep.GENERATE_STORY, PipelineStatus.SKIPPED)
            return
        try:
            from llm.story_generator import StoryGenerator
            parsed = self.step_results[PipelineStep.PARSE_PROMPT].data.get("parsed_prompt", {})
            confirmed_name = self.step_results[PipelineStep.CONFIRM_NAME].data.get("confirmed_name")
            generator = StoryGenerator()
            story = generator.generateStory({
                "projectTitle": confirmed_name, "genre": parsed.get("genre"),
                "mood": parsed.get("mood"), "setting": parsed.get("setting"),
                "targetDuration": parsed.get("durationSeconds", 60)
            })
            self._update_step_result(PipelineStep.GENERATE_STORY, PipelineStatus.COMPLETED,
                                      data={"story": story})
        except ImportError:
            self._update_step_result(PipelineStep.GENERATE_STORY, PipelineStatus.SKIPPED)

    async def _step_generate_dialogue(self, options: Dict[str, Any]):
        if not options.get("generate_dialogues", True):
            self._update_step_result(PipelineStep.GENERATE_DIALOGUE, PipelineStatus.SKIPPED)
            return
        try:
            from llm.dialogue_generator import DialogueGenerator
            parsed = self.step_results[PipelineStep.PARSE_PROMPT].data.get("parsed_prompt", {})
            confirmed_name = self.step_results[PipelineStep.CONFIRM_NAME].data.get("confirmed_name")
            generator = DialogueGenerator()
            dialogue = generator.generateDialogue({
                "projectTitle": confirmed_name, "genre": parsed.get("genre"),
                "mood": parsed.get("mood"),
                "targetDuration": parsed.get("durationSeconds", 60)
            })
            self._update_step_result(PipelineStep.GENERATE_DIALOGUE, PipelineStatus.COMPLETED,
                                      data={"dialogue": dialogue})
        except ImportError:
            self._update_step_result(PipelineStep.GENERATE_DIALOGUE, PipelineStatus.SKIPPED)

    async def _step_generate_sequences(self, options: Dict[str, Any]):
        if not options.get("generate_sequences", True):
            self._update_step_result(PipelineStep.GENERATE_SEQUENCES, PipelineStatus.SKIPPED)
            return
        try:
            from llm.sequence_planner import SequencePlanner
            parsed = self.step_results[PipelineStep.PARSE_PROMPT].data.get("parsed_prompt", {})
            confirmed_name = self.step_results[PipelineStep.CONFIRM_NAME].data.get("confirmed_name")
            planner = SequencePlanner()
            planner.updateConfig({
                "aspectRatio": parsed.get("aspectRatio", "16:9"),
                "targetDuration": parsed.get("durationSeconds", 60)
            })
            sequences = planner.generateSequencePlan({
                "prompt": parsed.get("raw_prompt", ""), "parsed": parsed
            })
            self._update_step_result(PipelineStep.GENERATE_SEQUENCES, PipelineStatus.COMPLETED,
                                      data={"sequences": sequences})
        except ImportError:
            self._update_step_result(PipelineStep.GENERATE_SEQUENCES, PipelineStatus.SKIPPED)

    async def _step_generate_music(self, options: Dict[str, Any]):
        if not options.get("generate_music", True):
            self._update_step_result(PipelineStep.GENERATE_MUSIC, PipelineStatus.SKIPPED)
            return
        try:
            from llm.music_sound_generator import MusicSoundGenerator
            parsed = self.step_results[PipelineStep.PARSE_PROMPT].data.get("parsed_prompt", {})
            confirmed_name = self.step_results[PipelineStep.CONFIRM_NAME].data.get("confirmed_name")
            generator = MusicSoundGenerator()
            generator.updateConfig({"targetDuration": parsed.get("durationSeconds", 60)})
            music = generator.generateAudioDescription({
                "projectTitle": confirmed_name, "genre": parsed.get("genre"),
                "mood": parsed.get("mood", []), "tone": parsed.get("tone", "neutral"),
                "videoType": parsed.get("videoType", "trailer")
            })
            self._update_step_result(PipelineStep.GENERATE_MUSIC, PipelineStatus.COMPLETED,
                                      data={"music": music})
        except ImportError:
            self._update_step_result(PipelineStep.GENERATE_MUSIC, PipelineStatus.SKIPPED)

    async def _step_create_project(self, options: Dict[str, Any]):
        """Create project directory and save all files"""
        from project_templates import ProjectTemplateGenerator, generate_project_template
        
        confirmed_name = self.step_results[PipelineStep.CONFIRM_NAME].data.get("confirmed_name")
        parsed = self.step_results[PipelineStep.PARSE_PROMPT].data.get("parsed_prompt", {})
        
        # Create project directory
        project_path = os.path.join(self.base_output_dir, confirmed_name.replace(" ", "_"))
        os.makedirs(project_path, exist_ok=True)
        os.makedirs(os.path.join(project_path, "assets"), exist_ok=True)
        
        # Create template
        generator = ProjectTemplateGenerator()
        template = generator.generate_template(
            project_name=confirmed_name,
            parsed_prompt=parsed,
            aspect_ratio=parsed.get("aspectRatio", "16:9"),
            quality_tier="preview"
        )
        template.save(os.path.join(project_path, "project_template.json"))
        
        # Collect all generated data
        project_data = {
            "project_name": confirmed_name,
            "project_path": project_path,
            "created_at": datetime.now().isoformat() + "Z",
            "genre": parsed.get("genre"),
            "video_type": parsed.get("videoType"),
            "duration": parsed.get("durationSeconds"),
            "aspect_ratio": parsed.get("aspectRatio")
        }
        
        # Save project.json
        with open(os.path.join(project_path, "project.json"), 'w') as f:
            json.dump(project_data, f, indent=2)
        
        self._update_step_result(PipelineStep.CREATE_PROJECT, PipelineStatus.COMPLETED,
                                  data={"project_path": project_path, "project_data": project_data})

    async def _step_finalize(self, options: Dict[str, Any]):
        """Finalize and summarize the project"""
        project_data = self.step_results[PipelineStep.CREATE_PROJECT].data.get("project_data", {})
        world_config = self.step_results[PipelineStep.GENERATE_WORLD].data.get("world_config")
        characters = self.step_results[PipelineStep.GENERATE_CHARACTERS].data.get("characters")
        story = self.step_results[PipelineStep.GENERATE_STORY].data.get("story")
        sequences = self.step_results[PipelineStep.GENERATE_SEQUENCES].data.get("sequences")
        music = self.step_results[PipelineStep.GENERATE_MUSIC].data.get("music")
        
        summary = {
            "project_name": project_data.get("project_name"),
            "project_path": project_data.get("project_path"),
            "components_created": {
                "world_config": world_config is not None,
                "characters": characters is not None,
                "story": story is not None,
                "sequences": sequences is not None,
                "music": music is not None
            },
            "completed_at": datetime.now().isoformat() + "Z"
        }
        
        self._update_step_result(PipelineStep.FINALIZE, PipelineStatus.COMPLETED,
                                  data={"summary": summary})


# Convenience function
async def create_project_from_prompt(
    prompt: str,
    base_output_dir: str = None,
    options: Dict[str, Any] = None,
    on_progress: Callable = None,
    on_confirm: Callable = None
) -> Dict[str, Any]:
    """Create a complete project from a user prompt"""
    
    manager = ProjectPipelineManager(base_output_dir)
    
    if on_progress:
        manager.add_progress_callback(on_progress)
    
    if on_confirm:
        manager.set_confirmation_callback(PipelineStep.CONFIRM_NAME, on_confirm)
    
    results = await manager.run_pipeline(prompt, options)
    
    # Extract key results
    return {
        "success": all(r.status == PipelineStatus.COMPLETED for r in results.values() if r.status != PipelineStatus.SKIPPED),
        "project_path": results.get(PipelineStep.CREATE_PROJECT, {}).data.get("project_path"),
        "confirmed_name": results.get(PipelineStep.CONFIRM_NAME, {}).data.get("confirmed_name"),
        "parsed_prompt": results.get(PipelineStep.PARSE_PROMPT, {}).data.get("parsed_prompt"),
        "step_results": {s.value: r.to_dict() for s, r in results.items()}
    }
