"""
StoryCore AI Assistant - Main Orchestration Class.

This is the main entry point for the StoryCore AI Assistant, coordinating
all component managers to provide a unified interface for project generation,
management, and modification.
"""

from pathlib import Path
from typing import Optional, Dict, List, Tuple
from datetime import datetime
import uuid

from .models import (
    Project, GeneratedProject, ProjectMetadata, ParsedPrompt
)
from .file_operations import FileOperationsManager
from .storage_monitor import StorageMonitor
from .validator import DataContractValidator
from .project_generator import ProjectGenerator
from .project_manager import ProjectManager
from .autosave_manager import AutoSaveManager
from .comfyui_config import ComfyUIConfigGenerator, ComfyUIConfig
from .prompt_parser import PromptParser, MockLLMClient
from .exceptions import (
    ResourceError, ValidationError, ProjectError, StorageLimitExceededError
)
from .logging_config import get_logger
from .rlm_engine import RLMEngine, RLMAgentCore, RLMSubtask
from .nsm_engine import NSMEngine
from .knowledge_graph import StoryGraph, GraphRAG
from backend.n8n_service import n8n_service

logger = get_logger(__name__)


def create_llm_client(provider: str = "mock", model: Optional[str] = None):
    """
    Create an LLM client based on provider.
    
    Args:
        provider: Provider name ("mock", "openai", "anthropic", "openrouter")
        model: Specific model ID to use
        
    Returns:
        LLM client instance
    """
    if provider == "mock":
        return MockLLMClient()
    elif provider == "openai":
        try:
            from .prompt_parser import OpenAIClient
            kwargs = {"model": model} if model else {}
            return OpenAIClient(**kwargs)
        except ImportError:
            logger.warning("OpenAI package not installed, using mock client")
            return MockLLMClient()
    elif provider == "anthropic":
        try:
            from .prompt_parser import AnthropicClient
            kwargs = {"model": model} if model else {}
            return AnthropicClient(**kwargs)
        except ImportError:
            logger.warning("Anthropic package not installed, using mock client")
            return MockLLMClient()
    elif provider == "openrouter":
        try:
            from .prompt_parser import OpenRouterClient
            kwargs = {"model": model} if model else {}
            return OpenRouterClient(**kwargs)
        except ImportError:
            logger.warning("OpenAI package (required for OpenRouter) not installed, using mock client")
            return MockLLMClient()
    else:
        logger.warning(f"Unknown provider {provider}, using mock client")
        return MockLLMClient()


class ProjectPreview:
    """Preview of a generated project before finalization."""
    
    def __init__(self, preview_id: str, generated_project: GeneratedProject,
                 comfyui_config: ComfyUIConfig):
        """
        Initialize project preview.
        
        Args:
            preview_id: Unique identifier for this preview
            generated_project: The generated project data
            comfyui_config: ComfyUI configuration for generation
        """
        self.preview_id = preview_id
        self.generated_project = generated_project
        self.comfyui_config = comfyui_config
        self.created_at = datetime.now()


class StoryCoreAssistant:
    """
    Main orchestration class for StoryCore AI Assistant.
    
    Coordinates all component managers to provide a unified interface for:
    - Natural language project generation
    - Project opening, closing, and management
    - Project modifications (scenes, characters, sequences)
    - ComfyUI backend preparation
    - Auto-save and state persistence
    """
    
    def __init__(
        self,
        project_directory: Path,
        storage_limit_gb: int = 50,
        file_limit: int = 248,
        llm_provider: str = "mock",
        llm_model: Optional[str] = None
    ):
        """
        Initialize the StoryCore AI Assistant.
        
        Args:
            project_directory: Root directory for all projects
            storage_limit_gb: Maximum storage in GB (default: 50)
            file_limit: Maximum number of files (default: 248)
            llm_provider: LLM provider for prompt parsing ("mock", "openai", "anthropic", "openrouter")
            llm_model: Specific model ID to use
        """
        logger.info(f"Initializing StoryCoreAssistant with project_directory={project_directory}")
        
        # Initialize component managers
        self.file_ops = FileOperationsManager(project_directory)
        self.storage_monitor = StorageMonitor(project_directory, storage_limit_gb, file_limit)
        self.validator = DataContractValidator()
        
        # Initialize LLM client and generators
        self.llm_provider = llm_provider
        self.llm_model = llm_model
        self.llm_client = create_llm_client(llm_provider, llm_model)
        self.prompt_parser = PromptParser(self.llm_client)
        self.project_generator = ProjectGenerator(self.llm_client)
        self.comfyui_generator = ComfyUIConfigGenerator()
        
        # Initialize project manager
        self.project_manager = ProjectManager(self.file_ops, self.validator)

        # Initialize auto-save manager
        self.autosave_manager = AutoSaveManager()

        # Initialize Knowledge Graph (in-memory, persisted per-project)
        self.story_graph = StoryGraph()
        self.graph_rag = GraphRAG(self.story_graph)

        # State
        self.active_previews: Dict[str, ProjectPreview] = {}
        
        logger.info("StoryCoreAssistant initialized successfully")
    
    def generate_project(
        self,
        prompt: str,
        language: str = "en",
        preferences: Optional[Dict] = None,
        llm_provider: Optional[str] = None,
        llm_model: Optional[str] = None
    ) -> ProjectPreview:
        """
        Generate a complete project from a natural language prompt.
        
        Args:
            prompt: Natural language description of the project
            language: Language code (default: "en")
            preferences: Optional preferences (sceneCount, duration, style)
            llm_provider: Optional override for LLM provider
            llm_model: Optional override for LLM model
            
        Returns:
            ProjectPreview object for review
            
        Raises:
            StorageError: If storage limits would be exceeded
            ValidationError: If generated project is invalid
        """
        logger.info(f"Generating project from prompt (language={language})")
        
        # Use provided client or global default
        client = self.llm_client
        if llm_provider:
            client = create_llm_client(llm_provider, llm_model)

        # Check storage limits before generation
        # Estimate: ~10 MB per project, ~50 files
        estimated_bytes = 10 * 1024 * 1024
        estimated_files = 50
        
        if not self.storage_monitor.estimate_operation(estimated_bytes, estimated_files):
            stats = self.storage_monitor.get_current_usage()
            # Determine which limit was exceeded
            if stats.total_bytes + estimated_bytes > stats.limit_bytes:
                raise StorageLimitExceededError(
                    limit_type="storage_size",
                    current_value=stats.total_gb,
                    limit_value=stats.limit_gb
                )
            else:
                raise StorageLimitExceededError(
                    limit_type="file_count",
                    current_value=stats.file_count,
                    limit_value=stats.file_limit
                )
        
        # Generate project structure
        # Temporarily use the overridden client if provided
        old_client = self.project_generator.llm
        self.project_generator.llm = client
        try:
            generated_project = self.project_generator.generate_project(
                prompt=prompt,
                language=language,
                preferences=preferences
            )
        finally:
            self.project_generator.llm = old_client
        
        # Create temporary project object for validation
        temp_project = Project(
            name=generated_project.name,
            path=self.file_ops.project_directory / generated_project.name,
            metadata=generated_project.metadata,
            scenes=generated_project.scenes,
            characters=generated_project.characters,
            sequences=generated_project.sequences,
            created_at=datetime.now(),
            modified_at=datetime.now()
        )
        
        # Validate generated project
        validation_result = self.validator.validate_project(temp_project)
        if not validation_result.valid:
            logger.error(f"Generated project validation failed: {validation_result.errors}")
            raise ValidationError(
                message="Generated project failed validation",
                code="GENERATION_VALIDATION_ERROR",
                details={
                    "errors": validation_result.errors,
                    "warnings": validation_result.warnings
                },
                suggested_action="Review prompt and try again"
            )
        
        # Generate ComfyUI configuration
        comfyui_config = self.comfyui_generator.generate_config(temp_project)
        
        # Create preview
        preview_id = str(uuid.uuid4())
        preview = ProjectPreview(
            preview_id=preview_id,
            generated_project=generated_project,
            comfyui_config=comfyui_config
        )
        
        # Store preview
        self.active_previews[preview_id] = preview
        
        logger.info(f"Project preview created: {preview_id}")
        return preview

    async def generate_complex_scenario_rlm(
        self, 
        main_prompt: str, 
        massive_context: str,
        llm_provider: Optional[str] = None,
        llm_model: Optional[str] = None
    ) -> Tuple[str, List[Dict]]:
        """
        Generates a complex scenario or story by using the Neural Substrate Manager (NSM) engine.
        This handles extremely long contexts by actively exploring and decomposing the task.
        
        Args:
            main_prompt: The request
            massive_context: Reference text
            llm_provider: Optional override for LLM provider
            llm_model: Optional override for LLM model
            
        Returns:
            Tuple of (final_answer, list_of_step_messages)
        """
        class StoryCoreRLMAgent(RLMAgentCore):
            def __init__(self, assistant_ref: 'StoryCoreAssistant', client_override: Optional[any] = None):
                self.assistant = assistant_ref
                self.client = client_override or assistant_ref.llm_client
                self.graph_rag = assistant_ref.graph_rag
                
            async def call_llm(self, prompt: str, system_prompt: Optional[str] = None) -> str:
                # Call the real LLM client
                return self.client.complete(prompt)
                
            async def query_database(self, query: str) -> str:
                # Search for specific mentions in project scenes/characters
                # This is a lightweight RAG over the current project state
                context = []
                query_lower = query.lower()
                
                # Check characters in the graph
                for node in self.assistant.story_graph._nodes.values():
                    if query_lower in node.name.lower() or query_lower in str(node.attributes).lower():
                        context.append(f"{node.entity_type.title()} '{node.name}': {node.attributes}")
                
                if not context:
                    return f"No specific project data found for '{query}'."
                return "\n".join(context[:5]) # Return top 5 matches

            async def query_graph(self, entities: List[str], max_depth: int = 1) -> str:
                # Use the real GraphRAG
                if not self.graph_rag:
                    return "Knowledge Graph not initialized."
                return self.graph_rag.query(entities, max_depth=max_depth)
                
            async def trigger_n8n(self, webhook_id: str, payload: Dict) -> Dict:
                # Call the n8n service
                return await n8n_service.trigger_workflow(webhook_id, payload)
                
            async def list_n8n(self) -> List[Dict]:
                # List n8n workflows
                return await n8n_service.list_workflows()
                
            async def create_n8n(self, name: str, nodes: List[Dict], connections: Dict) -> Dict:
                # Create n8n workflow
                return await n8n_service.create_workflow(name, nodes, connections)
                
        # Prepare the agent with optional client override
        client_override = None
        if llm_provider:
            client_override = create_llm_client(llm_provider, llm_model)

        agent = StoryCoreRLMAgent(self, client_override)
        
        # Determine rules path
        rules_path = str(Path(self.file_ops.project_directory).parent / "substrate.rules")
        
        # We can pass an optional step event callback to stream the process back to the UI
        def on_step(msg: str):
            logger.info(f"[NSM Substrate Update]: {msg}")
            
        # Use the new Neural Substrate Manager (NSM) Engine
        # This provides Cline-inspired Plan-Act-Observe loops
        engine = NSMEngine(agent, graph_rag=self.graph_rag, rules_path=rules_path)
        engine.on_step_callback = on_step
        
        # Determine project root for secure tool access
        active_project = self.get_active_project()
        project_root = str(active_project.path) if active_project else str(self.file_ops.project_directory)
        
        final_answer = await engine.process(main_prompt, massive_context, project_root=project_root)
        
        # Return the rich NSM trajectory
        return final_answer, engine.state.trajectory
    
    def finalize_project(self, preview_id: str) -> Project:
        """
        Finalize a project preview and save it to disk.
        
        This creates all project files, saves metadata, and makes the
        project available for opening and editing.
        
        Args:
            preview_id: ID of the preview to finalize
            
        Returns:
            Finalized Project object
            
        Raises:
            ResourceError: If preview not found
            ProjectError: If project creation fails
        """
        logger.info(f"Finalizing project preview: {preview_id}")
        
        # Get preview
        if preview_id not in self.active_previews:
            raise ResourceError(
                message=f"Preview not found: {preview_id}",
                code="PREVIEW_NOT_FOUND",
                details={"preview_id": preview_id},
                suggested_action="Generate a new project preview"
            )
        
        preview = self.active_previews[preview_id]
        generated = preview.generated_project
        
        # Create project directory
        project_path = self.file_ops.project_directory / generated.name
        project_path.mkdir(parents=True, exist_ok=True)
        
        # Create project object
        project = Project(
            name=generated.name,
            path=project_path,
            metadata=generated.metadata,
            scenes=generated.scenes,
            characters=generated.characters,
            sequences=generated.sequences,
            created_at=datetime.now(),
            modified_at=datetime.now()
        )
        
        # Save project files
        self._save_project_files(project, preview.comfyui_config)
        
        # Remove preview
        del self.active_previews[preview_id]
        
        logger.info(f"Project finalized: {generated.name}")
        return project
    
    def _save_project_files(self, project: Project, comfyui_config: ComfyUIConfig) -> None:
        """
        Save all project files to disk.
        
        Args:
            project: Project to save
            comfyui_config: ComfyUI configuration to save
        """
        # Prepare scenes data
        scenes_data = [
            {
                "id": scene.id,
                "number": scene.number,
                "title": scene.title,
                "description": scene.description,
                "location": scene.location,
                "time_of_day": scene.time_of_day,
                "duration": scene.duration,
                "characters": scene.characters,
                "key_actions": scene.key_actions,
                "visual_notes": scene.visual_notes
            }
            for scene in project.scenes
        ]
        
        # Prepare characters data
        characters_data = [
            {
                "id": char.id,
                "name": char.name,
                "role": char.role,
                "description": char.description,
                "appearance": char.appearance,
                "personality": char.personality,
                "visual_reference": char.visual_reference
            }
            for char in project.characters
        ]
        
        # Prepare sequences data
        sequences_data = [
            {
                "id": seq.id,
                "scene_id": seq.scene_id,
                "total_duration": seq.total_duration,
                "shots": [
                    {
                        "id": shot.id,
                        "number": shot.number,
                        "type": shot.type,
                        "camera_movement": shot.camera_movement,
                        "duration": shot.duration,
                        "description": shot.description,
                        "visual_style": shot.visual_style
                    }
                    for shot in seq.shots
                ]
            }
            for seq in project.sequences
        ]
        
        # Save project metadata with embedded scenes, characters, and sequences
        metadata_dict = {
            "schema_version": project.metadata.schema_version,
            "project_name": project.metadata.project_name,
            "capabilities": project.metadata.capabilities,
            "generation_status": project.metadata.generation_status,
            "created_at": project.created_at.isoformat(),
            "modified_at": project.modified_at.isoformat(),
            "scenes": scenes_data,
            "characters": characters_data,
            "sequences": sequences_data
        }
        
        metadata_path = project.path / "project.json"
        self.file_ops.write_json(metadata_path, metadata_dict)
        
        # Also save separate files for better organization
        scenes_path = project.path / "scenes.json"
        self.file_ops.write_json(scenes_path, {"scenes": scenes_data})
        
        characters_path = project.path / "characters.json"
        self.file_ops.write_json(characters_path, {"characters": characters_data})
        
        sequences_path = project.path / "sequences.json"
        self.file_ops.write_json(sequences_path, {"sequences": sequences_data})
        
        # Save ComfyUI configuration
        comfyui_dict = self.comfyui_generator.export_config_to_dict(comfyui_config)
        comfyui_path = project.path / "comfyui_config.json"
        self.file_ops.write_json(comfyui_path, comfyui_dict)
        
        # Update and save Knowledge Graph
        if hasattr(self, 'story_graph'):
            self.story_graph.ingest_project(metadata_dict)
            self.story_graph.save()
            logger.info(f"Knowledge Graph updated and saved for: {project.name}")
        
        logger.info(f"Project files saved: {project.name}")
    
    def open_project(self, project_name: str) -> Project:
        """
        Open an existing project by name.
        
        Loads the project, validates it, and sets it as the active project.
        Starts auto-save for the project.
        
        Args:
            project_name: Name of the project to open
            
        Returns:
            Opened Project object
            
        Raises:
            ResourceError: If project not found
            ValidationError: If project is invalid
        """
        logger.info(f"Opening project: {project_name}")
        
        # Use project manager to open
        project = self.project_manager.open_project(project_name)

        # Reload the Knowledge Graph for this project from its persisted file
        graph_file = project.path / "knowledge_graph.json"
        self.story_graph = StoryGraph(persistence_path=graph_file)
        self.graph_rag = GraphRAG(self.story_graph)

        # Ingest current project data into the graph (non-destructive update)
        project_dict = {
            "characters": [
                {
                    "name": c.name,
                    "role": c.role,
                    "personality": c.personality,
                    "appearance": c.appearance
                } for c in project.characters
            ],
            "scenes": [
                {
                    "id": s.id,
                    "title": s.title,
                    "description": s.description,
                    "location": s.location,
                    "time_of_day": s.time_of_day,
                    "characters": s.characters
                } for s in project.scenes
            ]
        }
        self.story_graph.ingest_project(project_dict)
        self.story_graph.save()

        logger.info(f"Knowledge Graph loaded: {self.story_graph.stats()}")

        # Start auto-save
        self.autosave_manager.start(self.project_manager)
        
        logger.info(f"Project opened: {project_name}")
        return project
    
    def close_project(self, save: bool = True) -> None:
        """
        Close the active project.
        
        Optionally saves the project before closing. Stops auto-save.
        
        Args:
            save: Whether to save before closing (default: True)
            
        Raises:
            ProjectError: If no active project
        """
        logger.info(f"Closing project (save={save})")
        
        # Stop auto-save
        self.autosave_manager.stop()
        
        # Use project manager to close
        self.project_manager.close_project(save=save)
        
        logger.info("Project closed")
    
    def get_active_project(self) -> Optional[Project]:
        """
        Get the currently active project.
        
        Returns:
            Active Project or None if no project is open
        """
        return self.project_manager.get_active_project()
    
    def has_active_project(self) -> bool:
        """
        Check if there is an active project.
        
        Returns:
            True if a project is open, False otherwise
        """
        return self.project_manager.has_active_project()
    
    def list_projects(self) -> List[str]:
        """
        List all available projects.
        
        Returns:
            List of project names
        """
        return self.project_manager.list_projects()
    
    def get_storage_stats(self):
        """
        Get current storage statistics.
        
        Returns:
            StorageStats object with usage information
        """
        return self.storage_monitor.get_current_usage()
    
    def modify_scene(self, scene_id: str, updates: Dict) -> None:
        """
        Modify a scene in the active project.
        
        Args:
            scene_id: ID of the scene to modify
            updates: Dictionary of fields to update
            
        Raises:
            ProjectError: If no active project
            ResourceError: If scene not found
            ValidationError: If updates are invalid
        """
        self.project_manager.modify_scene(scene_id, updates)
    
    def modify_character(self, character_id: str, updates: Dict) -> None:
        """
        Modify a character in the active project.
        
        Args:
            character_id: ID of the character to modify
            updates: Dictionary of fields to update
            
        Raises:
            ProjectError: If no active project
            ResourceError: If character not found
            ValidationError: If updates are invalid
        """
        self.project_manager.modify_character(character_id, updates)
    
    def modify_sequence(self, sequence_id: str, updates: Dict) -> None:
        """
        Modify a sequence in the active project.
        
        Args:
            sequence_id: ID of the sequence to modify
            updates: Dictionary of fields to update
            
        Raises:
            ProjectError: If no active project
            ResourceError: If sequence not found
            ValidationError: If updates are invalid
        """
        self.project_manager.modify_sequence(sequence_id, updates)
    
    def add_scene(self, scene_data: Dict) -> None:
        """
        Add a new scene to the active project.
        
        Args:
            scene_data: Dictionary with scene data
            
        Raises:
            ProjectError: If no active project
            ValidationError: If scene data is invalid
        """
        # Convert dict to Scene object
        from .models import Scene
        scene = Scene(
            id=scene_data.get("id", ""),
            number=scene_data.get("number", 0),
            title=scene_data.get("title", ""),
            description=scene_data.get("description", ""),
            location=scene_data.get("location", ""),
            time_of_day=scene_data.get("time_of_day", ""),
            duration=scene_data.get("duration", 0.0),
            characters=scene_data.get("characters", []),
            key_actions=scene_data.get("key_actions", []),
            visual_notes=scene_data.get("visual_notes")
        )
        self.project_manager.add_scene(scene)
    
    def remove_scene(self, scene_id: str, confirmed: bool = False) -> None:
        """
        Remove a scene from the active project.
        
        Args:
            scene_id: ID of the scene to remove
            confirmed: Whether deletion is confirmed
            
        Raises:
            ProjectError: If no active project
            ResourceError: If scene not found
            ConfirmationRequiredError: If not confirmed
        """
        self.project_manager.remove_scene(scene_id, confirmed=confirmed)
