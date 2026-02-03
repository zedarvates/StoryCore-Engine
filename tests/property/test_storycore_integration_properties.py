"""
Property-based tests for StoryCore integration.

These tests validate the correctness properties for memory system integration
with the StoryCore pipeline.

Feature: storycore-llm-memory-system
"""

import unittest
import tempfile
import shutil
import json
from pathlib import Path
from datetime import datetime
from hypothesis import given, strategies as st, settings, assume

from src.cli.memory_integration import (
    is_memory_system_enabled,
    log_pipeline_action,
    log_grid_generation,
    log_panel_promotion,
    log_qa_scoring,
    log_project_export,
    index_generated_assets
)


# Custom strategies for test data generation
@st.composite
def project_config_strategy(draw, memory_enabled=None):
    """Generate valid project configurations."""
    if memory_enabled is None:
        memory_enabled = draw(st.booleans())
    
    return {
        "schema_version": "1.0",
        "project_name": draw(st.text(min_size=1, max_size=50, alphabet=st.characters(
            blacklist_characters='/<>:"|?*\\'
        ))),
        "project_type": draw(st.sampled_from(["video", "script", "creative", "technical"])),
        "creation_timestamp": datetime.now().isoformat(),
        "objectives": draw(st.lists(st.text(min_size=1, max_size=100), max_size=5)),
        "memory_system_enabled": memory_enabled,
        "memory_system_config": {
            "auto_summarize": True,
            "summarization_threshold_kb": 50,
            "auto_translate": True,
            "target_languages": ["en", "fr"],
            "error_detection_enabled": True,
            "auto_recovery_enabled": True,
            "max_recovery_attempts": 3
        }
    }


@st.composite
def pipeline_action_strategy(draw):
    """Generate valid pipeline action parameters."""
    action_types = [
        "GRID_GENERATED",
        "PANELS_PROMOTED",
        "QA_SCORING_COMPLETED",
        "PROJECT_EXPORTED",
        "ASSET_GENERATED",
        "CUSTOM_ACTION"
    ]
    
    # Use ASCII-safe characters to avoid encoding issues
    return {
        "action_type": draw(st.sampled_from(action_types)),
        "affected_files": draw(st.lists(
            st.text(min_size=1, max_size=50, alphabet=st.characters(
                min_codepoint=32, max_codepoint=126,  # ASCII printable
                blacklist_characters='<>:"|?*\r\n'
            )),
            min_size=0,
            max_size=5
        )),
        "parameters": draw(st.dictionaries(
            keys=st.text(min_size=1, max_size=20, alphabet=st.characters(
                min_codepoint=97, max_codepoint=122  # lowercase letters only
            )),
            values=st.one_of(
                st.text(min_size=0, max_size=30, alphabet=st.characters(
                    min_codepoint=32, max_codepoint=126  # ASCII printable
                )),
                st.integers(min_value=-10000, max_value=10000),
                st.floats(min_value=-1e10, max_value=1e10, allow_nan=False, allow_infinity=False),
                st.booleans()
            ),
            max_size=5
        ))
    }


@st.composite
def asset_paths_strategy(draw, asset_type=None):
    """Generate lists of asset paths."""
    if asset_type is None:
        asset_type = draw(st.sampled_from(["image", "audio", "video", "document"]))
    
    extensions = {
        "image": [".png", ".jpg", ".jpeg", ".gif"],
        "audio": [".mp3", ".wav", ".ogg"],
        "video": [".mp4", ".avi", ".mov"],
        "document": [".pdf", ".txt", ".md"]
    }
    
    count = draw(st.integers(min_value=1, max_value=10))
    paths = []
    
    for i in range(count):
        filename = f"generated_{i}{draw(st.sampled_from(extensions[asset_type]))}"
        paths.append(filename)
    
    return paths, asset_type


class TestStoryCoreIntegrationProperties(unittest.TestCase):
    """Property-based tests for StoryCore integration."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.test_dir = tempfile.mkdtemp()
        self.project_path = Path(self.test_dir)
    
    def tearDown(self):
        """Clean up test fixtures."""
        shutil.rmtree(self.test_dir, ignore_errors=True)
    
    def _create_project_structure(self, config: dict):
        """Create project structure with given config."""
        # Create directories
        (self.project_path / "build_logs").mkdir(parents=True, exist_ok=True)
        (self.project_path / "assets" / "images").mkdir(parents=True, exist_ok=True)
        (self.project_path / "assets" / "audio").mkdir(parents=True, exist_ok=True)
        (self.project_path / "assets" / "video").mkdir(parents=True, exist_ok=True)
        (self.project_path / "assets" / "documents").mkdir(parents=True, exist_ok=True)
        
        # Write config
        config_path = self.project_path / "project_config.json"
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2)
    
    def _get_log_content(self) -> str:
        """Get content of build log."""
        log_file = self.project_path / "build_logs" / "build_steps_raw.log"
        if log_file.exists():
            with open(log_file, 'r', encoding='utf-8') as f:
                return f.read()
        return ""
    
    # Feature: storycore-llm-memory-system, Property 67: StoryCore Pipeline Action Logging
    @settings(max_examples=100, deadline=None)
    @given(
        config=project_config_strategy(memory_enabled=True),
        action=pipeline_action_strategy()
    )
    def test_property_67_pipeline_action_logging(self, config, action):
        """
        Property 67: StoryCore Pipeline Action Logging
        
        For any StoryCore pipeline command execution, actions SHALL be logged
        to build_steps_raw.log.
        
        Validates: Requirements 16.2
        """
        # Setup
        self._create_project_structure(config)
        
        # Execute: Log a pipeline action
        result = log_pipeline_action(
            project_path=self.project_path,
            action_type=action["action_type"],
            affected_files=action["affected_files"],
            parameters=action["parameters"],
            triggered_by="test_pipeline"
        )
        
        # Verify: Action was logged successfully
        self.assertTrue(result, "Pipeline action should be logged when memory system is enabled")
        
        # Verify: Log file exists
        log_file = self.project_path / "build_logs" / "build_steps_raw.log"
        self.assertTrue(log_file.exists(), "Build log file should exist after logging")
        
        # Verify: Log contains action type
        log_content = self._get_log_content()
        self.assertIn(action["action_type"], log_content,
                     f"Log should contain action type {action['action_type']}")
        
        # Verify: Log contains timestamp
        self.assertIn("[", log_content, "Log should contain timestamp markers")
        self.assertIn("]", log_content, "Log should contain timestamp markers")
        
        # Verify: Log contains affected files if any
        for file_path in action["affected_files"]:
            if file_path and file_path.strip():  # Skip empty or whitespace-only strings
                self.assertIn(file_path, log_content,
                            f"Log should contain affected file {file_path}")
    
    # Feature: storycore-llm-memory-system, Property 68: Generated Asset Auto-Indexing
    @settings(max_examples=100, deadline=None)
    @given(
        config=project_config_strategy(memory_enabled=True),
        asset_data=asset_paths_strategy()
    )
    def test_property_68_generated_asset_auto_indexing(self, config, asset_data):
        """
        Property 68: Generated Asset Auto-Indexing
        
        For any asset generated by StoryCore, it SHALL be automatically indexed
        by the memory system.
        
        Validates: Requirements 16.3
        """
        asset_paths, asset_type = asset_data
        
        # Setup
        self._create_project_structure(config)
        
        # Create the assets in the appropriate directory
        type_dirs = {
            "image": "images",
            "audio": "audio",
            "video": "video",
            "document": "documents"
        }
        
        asset_dir = self.project_path / "assets" / type_dirs[asset_type]
        created_paths = []
        
        for asset_path in asset_paths:
            full_path = asset_dir / asset_path
            full_path.write_text(f"fake {asset_type} data")
            created_paths.append(str(full_path))
        
        # Execute: Index the generated assets
        result = index_generated_assets(
            project_path=self.project_path,
            asset_paths=created_paths,
            asset_type=asset_type,
            generation_context={"workflow": "test_workflow"}
        )
        
        # Verify: Indexing succeeded
        self.assertTrue(result, f"Asset indexing should succeed for {asset_type} assets")
        
        # Verify: Index file was created/updated
        index_file = self.project_path / "assets" / "attachments_index.txt"
        self.assertTrue(index_file.exists(), "Asset index file should exist after indexing")
        
        # Verify: Index contains asset entries
        with open(index_file, 'r', encoding='utf-8') as f:
            index_content = f.read()
        
        # At least one asset should be in the index
        asset_found = False
        for asset_path in asset_paths:
            if asset_path in index_content:
                asset_found = True
                break
        
        self.assertTrue(asset_found, "At least one asset should be in the index")
        
        # Verify: Summary file was created/updated
        summary_file = self.project_path / "assets" / "assets_summary.txt"
        self.assertTrue(summary_file.exists(), "Asset summary file should exist after indexing")
        
        # Verify: Indexing action was logged
        log_content = self._get_log_content()
        self.assertIn("ASSETS_INDEXED", log_content,
                     "Asset indexing action should be logged")
        self.assertIn(asset_type, log_content,
                     f"Log should contain asset type {asset_type}")
    
    # Feature: storycore-llm-memory-system, Property 69: Non-Interference with StoryCore
    @settings(max_examples=100, deadline=None)
    @given(
        config=project_config_strategy(),
        action=pipeline_action_strategy()
    )
    def test_property_69_non_interference_with_storycore(self, config, action):
        """
        Property 69: Non-Interference with StoryCore
        
        For any StoryCore operation, the memory system SHALL not alter the
        operation's results or behavior.
        
        Validates: Requirements 16.4
        """
        # Setup
        self._create_project_structure(config)
        
        # Execute: Log a pipeline action (should not raise exceptions)
        try:
            result = log_pipeline_action(
                project_path=self.project_path,
                action_type=action["action_type"],
                affected_files=action["affected_files"],
                parameters=action["parameters"],
                triggered_by="test_pipeline"
            )
            
            # Verify: Function returns without exception
            # Result can be True or False depending on memory system state
            self.assertIsInstance(result, bool,
                                "Logging should return boolean without raising exceptions")
        
        except Exception as e:
            self.fail(f"Memory system logging should not raise exceptions: {e}")
        
        # Verify: If memory system is disabled, logging returns False but doesn't fail
        if not config.get("memory_system_enabled", False):
            result = log_pipeline_action(
                project_path=self.project_path,
                action_type=action["action_type"],
                affected_files=action["affected_files"],
                parameters=action["parameters"]
            )
            self.assertFalse(result,
                           "Logging should return False when memory system is disabled")
        
        # Verify: If memory system is enabled, logging succeeds
        if config.get("memory_system_enabled", False):
            result = log_pipeline_action(
                project_path=self.project_path,
                action_type=action["action_type"],
                affected_files=action["affected_files"],
                parameters=action["parameters"]
            )
            self.assertTrue(result,
                          "Logging should succeed when memory system is enabled")
    
    # Feature: storycore-llm-memory-system, Property 70: Memory System Configurability
    @settings(max_examples=100, deadline=None)
    @given(
        config=project_config_strategy()
    )
    def test_property_70_memory_system_configurability(self, config):
        """
        Property 70: Memory System Configurability
        
        For any project, the memory system SHALL be optional and configurable
        via project_config.json.
        
        Validates: Requirements 16.5
        """
        # Setup
        self._create_project_structure(config)
        
        # Execute: Check if memory system is enabled
        is_enabled = is_memory_system_enabled(self.project_path)
        
        # Verify: Detection matches configuration
        expected_enabled = config.get("memory_system_enabled", False)
        self.assertEqual(is_enabled, expected_enabled,
                        f"Memory system detection should match config: {expected_enabled}")
        
        # Verify: Configuration is readable
        config_path = self.project_path / "project_config.json"
        self.assertTrue(config_path.exists(), "Project config should exist")
        
        with open(config_path, 'r', encoding='utf-8') as f:
            loaded_config = json.load(f)
        
        self.assertIn("memory_system_enabled", loaded_config,
                     "Config should contain memory_system_enabled field")
        self.assertIsInstance(loaded_config["memory_system_enabled"], bool,
                            "memory_system_enabled should be a boolean")
        
        # Verify: Memory system respects configuration
        action_result = log_pipeline_action(
            project_path=self.project_path,
            action_type="TEST_ACTION",
            affected_files=["test.txt"],
            parameters={"test": "value"}
        )
        
        if expected_enabled:
            # When enabled, logging should succeed
            self.assertTrue(action_result,
                          "Logging should succeed when memory system is enabled")
        else:
            # When disabled, logging should return False
            self.assertFalse(action_result,
                           "Logging should return False when memory system is disabled")
    
    # Additional property test: Multiple pipeline actions are logged sequentially
    @settings(max_examples=50, deadline=None)
    @given(
        config=project_config_strategy(memory_enabled=True),
        actions=st.lists(pipeline_action_strategy(), min_size=2, max_size=5)
    )
    def test_sequential_pipeline_logging(self, config, actions):
        """
        Test that multiple pipeline actions are logged in sequence.
        
        This validates that the logging system maintains order and doesn't
        lose or corrupt entries when multiple actions occur.
        """
        # Setup
        self._create_project_structure(config)
        
        # Execute: Log multiple actions
        results = []
        for action in actions:
            result = log_pipeline_action(
                project_path=self.project_path,
                action_type=action["action_type"],
                affected_files=action["affected_files"],
                parameters=action["parameters"]
            )
            results.append(result)
        
        # Verify: All actions were logged
        self.assertTrue(all(results), "All actions should be logged successfully")
        
        # Verify: Log contains all action types
        log_content = self._get_log_content()
        
        # Count occurrences of each action type
        for action in actions:
            # Each action should appear at least once
            self.assertIn(action["action_type"], log_content,
                         f"Log should contain action type {action['action_type']}")
        
        # Verify: Log has at least as many entries as actions
        # Count the number of ACTION: entries in the log
        action_count = log_content.count("ACTION:")
        self.assertGreaterEqual(action_count, len(actions),
                               f"Log should have at least {len(actions)} action entries")
    
    # Additional property test: Asset indexing with empty list
    @settings(max_examples=50, deadline=None)
    @given(
        config=project_config_strategy(memory_enabled=True),
        asset_type=st.sampled_from(["image", "audio", "video", "document"])
    )
    def test_asset_indexing_empty_list(self, config, asset_type):
        """
        Test that asset indexing handles empty lists gracefully.
        
        This validates that the system doesn't create spurious entries
        or fail when given an empty asset list.
        """
        # Setup
        self._create_project_structure(config)
        
        # Execute: Try to index empty list
        result = index_generated_assets(
            project_path=self.project_path,
            asset_paths=[],
            asset_type=asset_type
        )
        
        # Verify: Returns False for empty list
        self.assertFalse(result, "Indexing empty list should return False")
        
        # Verify: No spurious log entries
        log_content = self._get_log_content()
        self.assertNotIn("ASSETS_INDEXED", log_content,
                        "Empty asset list should not create log entry")
    
    # Additional property test: Logging with missing build_logs directory
    @settings(max_examples=50, deadline=None)
    @given(
        config=project_config_strategy(memory_enabled=True),
        action=pipeline_action_strategy()
    )
    def test_logging_creates_missing_directory(self, config, action):
        """
        Test that logging creates build_logs directory if missing.
        
        This validates that the system is resilient to missing directories
        and can recover automatically.
        """
        # Use a fresh temp directory for this test to ensure build_logs doesn't exist
        test_dir = tempfile.mkdtemp()
        test_project_path = Path(test_dir)
        
        try:
            # Setup: Create config but not build_logs directory
            (test_project_path / "assets").mkdir(parents=True, exist_ok=True)
            
            config_path = test_project_path / "project_config.json"
            with open(config_path, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2)
            
            # Verify build_logs doesn't exist
            build_logs_dir = test_project_path / "build_logs"
            self.assertFalse(build_logs_dir.exists(),
                            "build_logs should not exist initially")
            
            # Execute: Log an action
            result = log_pipeline_action(
                project_path=test_project_path,
                action_type=action["action_type"],
                affected_files=action["affected_files"],
                parameters=action["parameters"]
            )
            
            # Verify: Logging succeeded
            self.assertTrue(result, "Logging should succeed even with missing directory")
            
            # Verify: Directory was created
            self.assertTrue(build_logs_dir.exists(),
                           "build_logs directory should be created automatically")
            
            # Verify: Log file was created
            log_file = build_logs_dir / "build_steps_raw.log"
            self.assertTrue(log_file.exists(), "Log file should be created")
        
        finally:
            # Clean up
            shutil.rmtree(test_dir, ignore_errors=True)


if __name__ == '__main__':
    unittest.main()
