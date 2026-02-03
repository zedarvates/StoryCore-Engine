#!/usr/bin/env python3
"""
Integration tests for EndToEndOrchestrator.

Tests the complete workflow from prompt to final project creation,
including error recovery, checkpoint resume, and various scenarios.
"""

import asyncio
import json
import os
import tempfile
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# Import the orchestrator and related modules
from src.end_to_end import (
    EndToEndOrchestrator,
    create_project,
    WorkflowStatus,
    OrchestratorConfig,
    ParsedPrompt,
    CharacterInfo,
    ProjectComponents,
    WorkflowStep,
)
from src.end_to_end.data_models import (
    WorkflowState,
    ProjectCreationResult,
    QualityReport,
    Issue,
)


class TestEndToEndOrchestrator:
    """Test cases for EndToEndOrchestrator class."""
    
    @pytest.fixture
    def temp_projects_dir(self):
        """Create a temporary directory for test projects."""
        temp_dir = tempfile.mkdtemp(prefix="storycore_test_")
        yield Path(temp_dir)
        # Cleanup
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)
    
    @pytest.fixture
    def orchestrator(self, temp_projects_dir):
        """Create an orchestrator instance for testing."""
        config = OrchestratorConfig(
            projects_directory=str(temp_projects_dir),
            comfyui_backend_url="http://localhost:8188",
            storycore_cli_path=str(Path(__file__).parent.parent / "storycore.py"),
            default_quality_tier="preview",
            max_retry_attempts=2,
            checkpoint_enabled=True,
            auto_cleanup_enabled=True,
            parallel_generation=False,
            max_concurrent_shots=2
        )
        
        def progress_callback(report):
            pass  # Silent progress for tests
        
        return EndToEndOrchestrator(config=config, progress_callback=progress_callback)
    
    @pytest.fixture
    def sample_prompt(self):
        """Sample prompt for testing."""
        return "Create a cyberpunk trailer featuring Snow White in 2048 with dark atmosphere and neon lights"
    
    @pytest.fixture
    def parsed_prompt(self):
        """Sample parsed prompt for testing."""
        return ParsedPrompt(
            project_title="Cyberpunk Snow White",
            genre="cyberpunk",
            video_type="trailer",
            mood=["dark", "epic"],
            setting="city",
            time_period="2048",
            characters=[
                CharacterInfo(name="Snow White", role="main", description="Princess in cyberpunk world")
            ],
            key_elements=["neon lights", "technology"],
            visual_style=["neon", "cinematic"],
            aspect_ratio="16:9",
            duration_seconds=60,
            raw_prompt="test prompt",
            confidence_scores={"title": 0.9, "genre": 0.8}
        )
    
    def test_orchestrator_initialization(self, orchestrator, temp_projects_dir):
        """Test that orchestrator initializes correctly."""
        assert orchestrator.workflow_id is not None
        assert orchestrator.status == WorkflowStatus.IDLE
        assert orchestrator.config.projects_directory == str(temp_projects_dir)
        assert orchestrator.prompt_parser is not None
        assert orchestrator.name_generator is not None
        assert orchestrator.component_generator is not None
        assert orchestrator.project_builder is not None
    
    def test_orchestrator_with_default_config(self):
        """Test orchestrator with default configuration."""
        orchestrator = EndToEndOrchestrator()
        assert orchestrator.config is not None
        assert orchestrator.status == WorkflowStatus.IDLE
    
    def test_get_progress_idle(self, orchestrator):
        """Test progress reporting when idle."""
        progress = orchestrator.get_progress()
        assert progress.current_step == "Not started"
        assert progress.progress_percent == 0.0
    
    def test_get_workflow_status(self, orchestrator):
        """Test getting workflow status."""
        status = orchestrator.get_workflow_status()
        assert status == WorkflowStatus.IDLE
    
    def test_get_project_path_no_project(self, orchestrator):
        """Test getting project path when no project is active."""
        path = orchestrator.get_project_path()
        assert path is None
    
    def test_get_workflow_state_no_workflow(self, orchestrator):
        """Test getting workflow state when no workflow is active."""
        state = orchestrator.get_workflow_state()
        assert state is None
    
    @pytest.mark.asyncio
    async def test_create_project_empty_prompt(self, orchestrator):
        """Test that empty prompt raises ValueError."""
        with pytest.raises(ValueError, match="Prompt cannot be empty"):
            await orchestrator.create_project_from_prompt("")
    
    @pytest.mark.asyncio
    async def test_create_project_short_prompt(self, orchestrator):
        """Test that short prompt raises ValueError."""
        with pytest.raises(ValueError, match="Prompt is too short"):
            await orchestrator.create_project_from_prompt("short")
    
    @pytest.mark.asyncio
    async def test_parsing_step(self, orchestrator, sample_prompt, parsed_prompt):
        """Test the parsing step specifically."""
        orchestrator.prompt_parser.parse = MagicMock(return_value=parsed_prompt)
        orchestrator.prompt_parser.validate_parsed_data = MagicMock(return_value=(True, []))
        
        result = await orchestrator._execute_parsing(sample_prompt)
        
        assert result == parsed_prompt
        assert orchestrator._current_state.current_step == WorkflowStep.NAME_GENERATION
        assert WorkflowStep.PARSING in orchestrator._current_state.completed_steps
    
    @pytest.mark.asyncio
    async def test_name_generation_step(self, orchestrator, parsed_prompt):
        """Test the name generation step."""
        orchestrator.name_generator.generate_project_name = MagicMock(
            return_value="cyberpunk_snow_white_trailer"
        )
        orchestrator.name_generator.validate_project_name = MagicMock(return_value=True)
        
        project_name = await orchestrator._execute_name_generation(parsed_prompt)
        
        assert project_name == "cyberpunk_snow_white_trailer"
        assert orchestrator._current_state.current_step == WorkflowStep.COMPONENT_GENERATION
        assert WorkflowStep.NAME_GENERATION in orchestrator._current_state.completed_steps
    
    @pytest.mark.asyncio
    async def test_name_sanitization(self, orchestrator, parsed_prompt):
        """Test that invalid names are sanitized."""
        orchestrator.name_generator.generate_project_name = MagicMock(
            return_value="Invalid/Name:With*Special"
        )
        orchestrator.name_generator.validate_project_name = MagicMock(return_value=False)
        orchestrator.name_generator.sanitize_project_name = MagicMock(
            return_value="invalid_name_with_special"
        )
        
        project_name = await orchestrator._execute_name_generation(parsed_prompt)
        
        assert orchestrator.name_generator.sanitize_project_name.called
        assert project_name == "invalid_name_with_special"
    
    @pytest.mark.asyncio
    async def test_cancel_workflow(self, orchestrator, sample_prompt):
        """Test workflow cancellation."""
        # Start a workflow
        orchestrator._current_prompt = sample_prompt
        orchestrator.status = WorkflowStatus.RUNNING
        
        # Cancel should succeed
        result = orchestrator.cancel()
        assert result is True
        assert orchestrator.status == WorkflowStatus.CANCELLED
        
        # Cancel again should fail
        result = orchestrator.cancel()
        assert result is False
    
    @pytest.mark.asyncio
    async def test_cancel_idle_workflow(self, orchestrator):
        """Test cancelling when not running."""
        result = orchestrator.cancel()
        assert result is False
    
    def test_check_dependencies(self, orchestrator):
        """Test dependency checking."""
        deps = orchestrator.check_dependencies()
        assert isinstance(deps, dict)
    
    def test_workflow_status_enum(self):
        """Test WorkflowStatus enum values."""
        assert WorkflowStatus.IDLE.value == "idle"
        assert WorkflowStatus.RUNNING.value == "running"
        assert WorkflowStatus.COMPLETED.value == "completed"
        assert WorkflowStatus.FAILED.value == "failed"
        assert WorkflowStatus.CANCELLED.value == "cancelled"
    
    @pytest.mark.asyncio
    async def test_resume_no_checkpoint(self, orchestrator):
        """Test resume with no existing checkpoint."""
        result = orchestrator.resume("/nonexistent/path")
        assert result is False
    
    def test_add_step_start_hook(self, orchestrator):
        """Test adding step start hook."""
        hook_called = []
        
        def hook(step):
            hook_called.append(step)
        
        orchestrator.add_step_start_hook(hook)
        assert len(orchestrator._on_step_start) == 1
    
    def test_add_step_complete_hook(self, orchestrator):
        """Test adding step complete hook."""
        hook_called = []
        
        def hook(step, result):
            hook_called.append((step, result))
        
        orchestrator.add_step_complete_hook(hook)
        assert len(orchestrator._on_step_complete) == 1
    
    def test_add_workflow_complete_hook(self, orchestrator):
        """Test adding workflow complete hook."""
        hook_called = []
        
        def hook(result):
            hook_called.append(result)
        
        orchestrator.add_workflow_complete_hook(hook)
        assert len(orchestrator._on_workflow_complete) == 1
    
    def test_add_workflow_fail_hook(self, orchestrator):
        """Test adding workflow fail hook."""
        hook_called = []
        
        def hook(errors):
            hook_called.append(errors)
        
        orchestrator.add_workflow_fail_hook(hook)
        assert len(orchestrator._on_workflow_fail) == 1
    
    @pytest.mark.asyncio
    async def test_workflow_with_mock_components(
        self, orchestrator, sample_prompt, parsed_prompt
    ):
        """Test complete workflow with mocked components."""
        # Mock all components to avoid actual work
        orchestrator.prompt_parser.parse = MagicMock(return_value=parsed_prompt)
        orchestrator.prompt_parser.validate_parsed_data = MagicMock(return_value=(True, []))
        orchestrator.prompt_parser.fill_defaults = MagicMock(return_value=parsed_prompt)
        
        orchestrator.name_generator.generate_project_name = MagicMock(
            return_value="test_project"
        )
        orchestrator.name_generator.validate_project_name = MagicMock(return_value=True)
        
        # Mock component generator to return a minimal mock
        mock_components = MagicMock()
        mock_components.metadata.aspect_ratio = "16:9"
        mock_components.sequence_plan.total_shots = 3
        mock_components.sequence_plan.sequences = []
        mock_components.world_config.genre = "cyberpunk"
        
        orchestrator.component_generator.generate_all_components = AsyncMock(
            return_value=mock_components
        )
        orchestrator.component_generator.validate_coherence = MagicMock(
            return_value={"is_coherent": True, "issues": [], "total_issues": 0}
        )
        
        # Mock project builder
        mock_structure = MagicMock()
        mock_structure.file_count = 10
        orchestrator.project_builder.create_project_structure = MagicMock(
            return_value=mock_structure
        )
        orchestrator.project_builder.save_all_components = MagicMock(return_value=True)
        orchestrator.project_builder.validate_structure = MagicMock(
            return_value={"valid": True, "errors": []}
        )
        
        # Mock ComfyUI integration
        orchestrator.comfyui.check_availability = AsyncMock(return_value=False)
        
        # Mock pipeline executor
        mock_pipeline_result = MagicMock()
        mock_pipeline_result.success = True
        mock_pipeline_result.video_path = Path("/test/video.mp4")
        mock_pipeline_result.errors = []
        mock_pipeline_result.warnings = []
        orchestrator.pipeline_executor.execute_with_autofix = AsyncMock(
            return_value=mock_pipeline_result
        )
        
        # Mock quality validator
        mock_qa_report = MagicMock()
        mock_qa_report.overall_score = 0.9
        mock_qa_report.passed = True
        orchestrator.quality_validator.validate_final_video = AsyncMock(
            return_value=mock_qa_report
        )
        
        # Run the workflow
        result = await orchestrator.create_project_from_prompt(sample_prompt)
        
        # Verify results
        assert result.success is True
        assert result.project_path is not None
        assert orchestrator.status == WorkflowStatus.COMPLETED
    
    @pytest.mark.asyncio
    async def test_workflow_with_comfyui_unavailable(
        self, orchestrator, sample_prompt, parsed_prompt
    ):
        """Test workflow when ComfyUI is unavailable."""
        # Setup mocks
        orchestrator.prompt_parser.parse = MagicMock(return_value=parsed_prompt)
        orchestrator.prompt_parser.validate_parsed_data = MagicMock(return_value=(True, []))
        orchestrator.prompt_parser.fill_defaults = MagicMock(return_value=parsed_prompt)
        
        orchestrator.name_generator.generate_project_name = MagicMock(
            return_value="test_project"
        )
        orchestrator.name_generator.validate_project_name = MagicMock(return_value=True)
        
        # Mock component generator
        mock_components = MagicMock()
        mock_components.metadata.project_name = "test_project"
        mock_components.metadata.aspect_ratio = "16:9"
        mock_components.sequence_plan.total_shots = 2
        mock_components.sequence_plan.sequences = [
            MagicMock(name="Opening", shots=[MagicMock(shot_id="s1", shot_number=1)]),
            MagicMock(name="Closing", shots=[MagicMock(shot_id="s2", shot_number=2)])
        ]
        orchestrator.component_generator.generate_all_components = AsyncMock(
            return_value=mock_components
        )
        orchestrator.component_generator.validate_coherence = MagicMock(
            return_value={"is_coherent": True, "issues": []}
        )
        
        # Mock project builder
        orchestrator.project_builder.create_project_structure = MagicMock()
        orchestrator.project_builder.save_all_components = MagicMock(return_value=True)
        orchestrator.project_builder.validate_structure = MagicMock(
            return_value={"valid": True}
        )
        
        # Mock ComfyUI as unavailable
        orchestrator.comfyui.check_availability = AsyncMock(return_value=False)
        
        # Mock pipeline and quality validator
        mock_pipeline_result = MagicMock()
        mock_pipeline_result.success = True
        mock_pipeline_result.video_path = Path("/test/video.mp4")
        mock_pipeline_result.errors = []
        mock_pipeline_result.warnings = []
        orchestrator.pipeline_executor.execute_with_autofix = AsyncMock(
            return_value=mock_pipeline_result
        )
        orchestrator.quality_validator.validate_final_video = AsyncMock(
            return_value=MagicMock(overall_score=0.8, passed=True)
        )
        
        # Run the workflow
        result = await orchestrator.create_project_from_prompt(sample_prompt)
        
        # Should succeed with warnings about ComfyUI
        assert result.success is True
        assert len(result.warnings) > 0
        assert any("ComfyUI" in w for w in result.warnings)


class TestCreateProjectFunction:
    """Test cases for the create_project convenience function."""
    
    @pytest.fixture
    def temp_dir(self):
        """Create a temporary directory."""
        temp = tempfile.mkdtemp(prefix="storycore_func_test_")
        yield Path(temp)
        import shutil
        shutil.rmtree(temp, ignore_errors=True)
    
    @pytest.mark.asyncio
    async def test_create_project_function(self, temp_dir):
        """Test the create_project convenience function."""
        # Mock all internal components
        with patch('src.end_to_end.orchestrator.PromptParser') as mock_parser, \
             patch('src.end_to_end.orchestrator.ProjectNameGenerator') as mock_name_gen, \
             patch('src.end_to_end.orchestrator.ComponentGenerator') as mock_comp_gen, \
             patch('src.end_to_end.orchestrator.ProjectStructureBuilder') as mock_builder, \
             patch('src.end_to_end.orchestrator.ComfyUIIntegration') as mock_comfy, \
             patch('src.end_to_end.orchestrator.PipelineExecutor') as mock_pipeline, \
             patch('src.end_to_end.orchestrator.QualityValidator') as mock_qa:
            
            # Setup mocks
            parsed = ParsedPrompt(
                project_title="Test",
                genre="cyberpunk",
                video_type="trailer",
                mood=["dark"],
                setting="city",
                time_period="2048",
                characters=[CharacterInfo(name="Hero", role="main", description="Test")],
                key_elements=["test"],
                visual_style=["neon"],
                aspect_ratio="16:9",
                duration_seconds=60,
                raw_prompt="test"
            )
            
            mock_parser_instance = MagicMock()
            mock_parser_instance.parse = MagicMock(return_value=parsed)
            mock_parser.return_value = mock_parser_instance
            
            mock_name_gen_instance = MagicMock()
            mock_name_gen_instance.generate_project_name = MagicMock(return_value="test_project")
            mock_name_gen_instance.validate_project_name = MagicMock(return_value=True)
            mock_name_gen.return_value = mock_name_gen_instance
            
            mock_comp = MagicMock()
            mock_comp.generate_all_components = AsyncMock(return_value=MagicMock())
            mock_comp.validate_coherence = MagicMock(return_value={"is_coherent": True, "issues": []})
            mock_comp_gen.return_value = mock_comp
            
            mock_builder_instance = MagicMock()
            mock_builder_instance.create_project_structure = MagicMock()
            mock_builder_instance.save_all_components = MagicMock(return_value=True)
            mock_builder_instance.validate_structure = MagicMock(return_value={"valid": True})
            mock_builder.return_value = mock_builder_instance
            
            mock_comfy_instance = MagicMock()
            mock_comfy_instance.check_availability = AsyncMock(return_value=False)
            mock_comfy.return_value = mock_comfy_instance
            
            mock_pipeline_result = MagicMock()
            mock_pipeline_result.success = True
            mock_pipeline_result.video_path = Path("/test/video.mp4")
            mock_pipeline_result.errors = []
            mock_pipeline_result.warnings = []
            mock_pipeline_instance = MagicMock()
            mock_pipeline_instance.execute_with_autofix = AsyncMock(return_value=mock_pipeline_result)
            mock_pipeline.return_value = mock_pipeline_instance
            
            mock_qa_instance = MagicMock()
            mock_qa_instance.validate_final_video = AsyncMock(return_value=MagicMock(overall_score=0.9, passed=True))
            mock_qa.return_value = mock_qa_instance
            
            # Call create_project
            result = await create_project(
                prompt="Create a cyberpunk trailer",
                projects_dir=str(temp_dir)
            )
            
            assert result.success is True


class TestOrchestratorEdgeCases:
    """Test edge cases and error conditions."""
    
    @pytest.fixture
    def orchestrator(self):
        """Create orchestrator with default config."""
        return EndToEndOrchestrator()
    
    @pytest.mark.asyncio
    async def test_workflow_error_handling(self, orchestrator, sample_prompt):
        """Test that workflow errors are handled correctly."""
        # Force an error during parsing
        orchestrator.prompt_parser.parse = MagicMock(side_effect=Exception("Parse error"))
        
        result = await orchestrator.create_project_from_prompt(sample_prompt)
        
        assert result.success is False
        assert len(result.errors) > 0
        assert orchestrator.status == WorkflowStatus.FAILED
    
    @pytest.mark.asyncio
    async def test_workflow_with_failing_components(
        self, orchestrator, sample_prompt, parsed_prompt
    ):
        """Test workflow when components fail."""
        orchestrator.prompt_parser.parse = MagicMock(return_value=parsed_prompt)
        orchestrator.prompt_parser.validate_parsed_data = MagicMock(return_value=(True, []))
        
        # Component generator fails
        orchestrator.component_generator.generate_all_components = AsyncMock(
            side_effect=Exception("Generation failed")
        )
        
        result = await orchestrator.create_project_from_prompt(sample_prompt)
        
        assert result.success is False
        assert "Generation failed" in str(result.errors)
    
    def test_apply_options(self, orchestrator):
        """Test applying options to configuration."""
        orchestrator._apply_options({
            "projects_directory": "/new/path",
            "max_retry_attempts": 5,
            "checkpoint_enabled": False
        })
        
        assert orchestrator.config.projects_directory == "/new/path"
        assert orchestrator.config.max_retry_attempts == 5
        assert orchestrator.config.checkpoint_enabled is False
    
    def test_get_aspect_ratio_size(self, orchestrator):
        """Test aspect ratio size calculation."""
        assert orchestrator._get_aspect_ratio_size("16:9") == (1024, 576)
        assert orchestrator._get_aspect_ratio_size("9:16") == (576, 1024)
        assert orchestrator._get_aspect_ratio_size("1:1") == (768, 768)
        assert orchestrator._get_aspect_ratio_size("4:3") == (1024, 768)
        assert orchestrator._get_aspect_ratio_size("21:9") == (1280, 540)
        # Unknown ratio should return default
        assert orchestrator._get_aspect_ratio_size("invalid") == (1024, 576)


class TestOrchestratorWithRealPrompts:
    """Test with real-world prompts from test files."""
    
    @pytest.fixture
    def orchestrator(self):
        """Create orchestrator for testing."""
        temp_dir = tempfile.mkdtemp(prefix="storycore_real_")
        config = OrchestratorConfig(
            projects_directory=temp_dir,
            checkpoint_enabled=False,  # Disable for faster tests
            parallel_generation=False
        )
        return EndToEndOrchestrator(config=config)
    
    @pytest.mark.asyncio
    async def test_parse_blanche_neige_cyberpunk(self, orchestrator):
        """Test parsing 'Blanche-Neige Cyberpunk 2048' prompt."""
        prompt = "Blanche-Neige Cyberpunk 2048"
        
        parsed = orchestrator.prompt_parser.parse(prompt)
        
        assert parsed.project_title is not None
        assert parsed.genre == "cyberpunk"
        assert len(parsed.characters) > 0
        assert "2048" in parsed.time_period or parsed.time_period.isdigit()
    
    @pytest.mark.asyncio
    async def test_parse_fairy_tale_mashup(self, orchestrator):
        """Test parsing mixed genre prompts."""
        prompt = "Little Red Riding Hood in a post-apocalyptic western"
        
        parsed = orchestrator.prompt_parser.parse(prompt)
        
        assert parsed.project_title is not None
        assert parsed.genre in ["western", "post-apocalyptic"] or parsed.genre in [
            "cyberpunk", "fantasy", "horror", "sci-fi", "western", "thriller"
        ]
    
    @pytest.mark.asyncio
    async def test_parse_complex_prompt(self, orchestrator):
        """Test parsing a detailed prompt."""
        prompt = """Create an epic fantasy trailer with dark atmosphere,
        featuring an ancient castle, magical elements, and epic battles.
        The mood should be mysterious and heroic. Set in medieval times."""
        
        parsed = orchestrator.prompt_parser.parse(prompt)
        
        assert parsed.project_title is not None
        assert parsed.genre in ["fantasy", "drama"]
        assert len(parsed.mood) > 0
        assert "castle" in parsed.setting.lower() or parsed.setting == "castle"


# Pytest configuration
if __name__ == "__main__":
    pytest.main([__file__, "-v"])

