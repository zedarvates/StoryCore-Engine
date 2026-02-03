"""
Property-based tests for MemoryManager.

These tests verify universal properties that should hold across all valid inputs.
Uses hypothesis for property-based testing with minimum 100 iterations per test.
"""

import pytest
import tempfile
import shutil
import json
from pathlib import Path
from datetime import datetime, timedelta
from hypothesis import given, strategies as st, settings
import uuid

from src.memory_system.memory_manager import MemoryManager
from src.memory_system.data_models import (
    ProjectMemory,
    Objective,
    Entity,
    Constraint,
    Decision,
    StyleRule,
    Task,
    CurrentState,
    ProjectConfig,
    MemorySystemConfig,
)
from src.memory_system.directory_manager import DirectoryManager


# Strategy for generating valid project names
project_name_strategy = st.text(
    min_size=1,
    max_size=50,
    alphabet=st.characters(
        blacklist_characters='/\\:*?"<>|\x00',
        blacklist_categories=('Cc', 'Cs')
    )
).filter(lambda x: x.strip())


# Strategy for generating valid descriptions
description_strategy = st.text(min_size=1, max_size=500)


# Strategy for generating valid entity types
entity_type_strategy = st.sampled_from(["character", "module", "component", "concept"])


# Strategy for generating valid constraint types
constraint_type_strategy = st.sampled_from(["technical", "creative", "business"])


# Strategy for generating valid priorities
priority_strategy = st.sampled_from(["low", "medium", "high", "critical"])


# Strategy for generating valid status values
status_strategy = st.sampled_from(["active", "completed", "abandoned"])


# Strategy for generating valid task status values
task_status_strategy = st.sampled_from(["pending", "in_progress", "completed"])


# Strategy for generating valid style categories
style_category_strategy = st.sampled_from(["visual", "narrative", "technical"])


def setup_test_project(temp_path: Path, project_name: str = "test_project"):
    """Helper function to set up a test project with directory structure."""
    dir_manager = DirectoryManager()
    dir_manager.create_structure(temp_path)
    
    config = ProjectConfig(
        schema_version="1.0",
        project_name=project_name,
        project_type="video",
        creation_timestamp=datetime.now().isoformat(),
        objectives=["test"],
        memory_system_enabled=True,
        memory_system_config=MemorySystemConfig(),
    )
    dir_manager.initialize_files(temp_path, config)


# Feature: storycore-llm-memory-system, Property 14: Memory Schema Completeness
@settings(max_examples=100, deadline=None)
@given(project_name=project_name_strategy)
def test_property_memory_schema_completeness(project_name):
    """
    Property 14: Memory Schema Completeness
    
    For any memory.json file, it SHALL contain all required sections (objectives,
    entities, constraints, decisions, style_rules, task_backlog, current_state).
    
    Validates: Requirements 5.1
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        setup_test_project(temp_path, project_name)
        memory_manager = MemoryManager(temp_path)
        
        # Execute: Load memory
        memory = memory_manager.load_memory()
        
        # Verify: Memory was loaded
        assert memory is not None, "Memory should be loaded successfully"
        
        # Verify: All required sections exist
        assert hasattr(memory, 'objectives'), "Memory should have objectives"
        assert hasattr(memory, 'entities'), "Memory should have entities"
        assert hasattr(memory, 'constraints'), "Memory should have constraints"
        assert hasattr(memory, 'decisions'), "Memory should have decisions"
        assert hasattr(memory, 'style_rules'), "Memory should have style_rules"
        assert hasattr(memory, 'task_backlog'), "Memory should have task_backlog"
        assert hasattr(memory, 'current_state'), "Memory should have current_state"
        
        # Verify: All sections are lists (except current_state)
        assert isinstance(memory.objectives, list), "Objectives should be a list"
        assert isinstance(memory.entities, list), "Entities should be a list"
        assert isinstance(memory.constraints, list), "Constraints should be a list"
        assert isinstance(memory.decisions, list), "Decisions should be a list"
        assert isinstance(memory.style_rules, list), "Style rules should be a list"
        assert isinstance(memory.task_backlog, list), "Task backlog should be a list"
        assert isinstance(memory.current_state, CurrentState), "Current state should be CurrentState object"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)



# Feature: storycore-llm-memory-system, Property 15: Automatic Memory Updates
@settings(max_examples=100, deadline=None)
@given(
    description=description_strategy,
    entity_name=st.text(min_size=1, max_size=100),
    entity_type=entity_type_strategy
)
def test_property_automatic_memory_updates(description, entity_name, entity_type):
    """
    Property 15: Automatic Memory Updates
    
    For any discussion containing key information (decisions, entities, constraints),
    memory.json SHALL be updated with that information.
    
    Validates: Requirements 5.2
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        setup_test_project(temp_path)
        memory_manager = MemoryManager(temp_path)
        
        # Execute: Add various types of information
        result_obj = memory_manager.add_objective(description)
        assert result_obj is True, "Adding objective should succeed"
        
        result_ent = memory_manager.add_entity(entity_name, entity_type, description)
        assert result_ent is True, "Adding entity should succeed"
        
        result_dec = memory_manager.add_decision(description, "rationale for decision")
        assert result_dec is True, "Adding decision should succeed"
        
        result_con = memory_manager.add_constraint(description, "technical")
        assert result_con is True, "Adding constraint should succeed"
        
        # Verify: Memory was updated
        memory = memory_manager.load_memory()
        assert memory is not None, "Memory should be loaded"
        
        # Verify: All additions are present
        assert len(memory.objectives) > 0, "Objectives should be updated"
        assert len(memory.entities) > 0, "Entities should be updated"
        assert len(memory.decisions) > 0, "Decisions should be updated"
        assert len(memory.constraints) > 0, "Constraints should be updated"
        
        # Verify: Content matches
        assert any(obj.description == description for obj in memory.objectives), \
            "Added objective should be in memory"
        assert any(ent.name == entity_name for ent in memory.entities), \
            "Added entity should be in memory"
        assert any(dec.description == description for dec in memory.decisions), \
            "Added decision should be in memory"
        assert any(con.description == description for con in memory.constraints), \
            "Added constraint should be in memory"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 16: Memory Schema Validation
@settings(max_examples=100, deadline=None)
@given(project_name=project_name_strategy)
def test_property_memory_schema_validation(project_name):
    """
    Property 16: Memory Schema Validation
    
    For any attempted update to memory.json, invalid JSON or schema violations
    SHALL be rejected before writing.
    
    Validates: Requirements 5.3
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        setup_test_project(temp_path, project_name)
        memory_manager = MemoryManager(temp_path)
        
        # Load valid memory
        memory = memory_manager.load_memory()
        assert memory is not None, "Memory should be loaded"
        
        # Execute: Try to save valid memory
        result_valid = memory_manager.save_memory(memory)
        assert result_valid is True, "Saving valid memory should succeed"
        
        # Verify: Schema validation passes
        is_valid, errors = memory_manager.validate_schema()
        assert is_valid is True, f"Schema validation should pass, got errors: {errors}"
        assert len(errors) == 0, "Should have no validation errors"
        
        # Execute: Corrupt the memory file with invalid JSON
        memory_path = temp_path / "assistant" / "memory.json"
        with open(memory_path, 'w', encoding='utf-8') as f:
            f.write("{ invalid json }")
        
        # Verify: Loading corrupted memory fails
        corrupted_memory = memory_manager.load_memory()
        assert corrupted_memory is None, "Loading invalid JSON should fail"
        
        # Verify: Schema validation detects the error
        is_valid, errors = memory_manager.validate_schema()
        assert is_valid is False, "Schema validation should fail for invalid JSON"
        assert len(errors) > 0, "Should have validation errors"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)



# Feature: storycore-llm-memory-system, Property 17: Session Memory Loading
@settings(max_examples=100, deadline=None)
@given(
    num_objectives=st.integers(min_value=1, max_value=10),
    num_entities=st.integers(min_value=1, max_value=10)
)
def test_property_session_memory_loading(num_objectives, num_entities):
    """
    Property 17: Session Memory Loading
    
    For any session start, memory.json SHALL be loaded and made available
    to the LLM assistant.
    
    Validates: Requirements 5.4
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        setup_test_project(temp_path)
        memory_manager = MemoryManager(temp_path)
        
        # Add some data to memory
        for i in range(num_objectives):
            memory_manager.add_objective(f"Objective {i}")
        
        for i in range(num_entities):
            memory_manager.add_entity(f"Entity {i}", "module", f"Description {i}")
        
        # Execute: Simulate session start by loading memory
        memory = memory_manager.load_memory()
        
        # Verify: Memory was loaded
        assert memory is not None, "Memory should be loaded at session start"
        
        # Verify: All data is available
        assert len(memory.objectives) >= num_objectives, \
            f"Should have at least {num_objectives} objectives"
        assert len(memory.entities) >= num_entities, \
            f"Should have at least {num_entities} entities"
        
        # Verify: Memory can be converted to dict for LLM consumption
        memory_dict = memory_manager.get_memory_as_dict()
        assert memory_dict is not None, "Memory should be convertible to dict"
        assert isinstance(memory_dict, dict), "Memory dict should be a dictionary"
        assert "objectives" in memory_dict, "Memory dict should have objectives"
        assert "entities" in memory_dict, "Memory dict should have entities"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 18: Memory Entry Timestamps
@settings(max_examples=100, deadline=None)
@given(
    description=description_strategy,
    entity_name=st.text(min_size=1, max_size=100)
)
def test_property_memory_entry_timestamps(description, entity_name):
    """
    Property 18: Memory Entry Timestamps
    
    For any entry added to memory.json, it SHALL include a valid ISO 8601 timestamp.
    
    Validates: Requirements 5.5
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        setup_test_project(temp_path)
        memory_manager = MemoryManager(temp_path)
        
        # Execute: Add various entries
        memory_manager.add_objective(description)
        memory_manager.add_entity(entity_name, "module", description)
        memory_manager.add_decision(description, "rationale")
        memory_manager.add_constraint(description, "technical")
        memory_manager.add_style_rule("visual", description)
        memory_manager.add_task(description, "medium", "pending")
        
        # Verify: All entries have timestamps
        memory = memory_manager.load_memory()
        assert memory is not None, "Memory should be loaded"
        
        # Check objectives
        for obj in memory.objectives:
            assert hasattr(obj, 'added'), "Objective should have 'added' timestamp"
            assert obj.added is not None, "Objective timestamp should not be None"
            # Verify it's a valid ISO 8601 timestamp
            try:
                datetime.fromisoformat(obj.added.replace('Z', '+00:00'))
            except ValueError:
                pytest.fail(f"Objective timestamp '{obj.added}' is not valid ISO 8601")
        
        # Check entities
        for ent in memory.entities:
            assert hasattr(ent, 'added'), "Entity should have 'added' timestamp"
            assert ent.added is not None, "Entity timestamp should not be None"
            try:
                datetime.fromisoformat(ent.added.replace('Z', '+00:00'))
            except ValueError:
                pytest.fail(f"Entity timestamp '{ent.added}' is not valid ISO 8601")
        
        # Check decisions
        for dec in memory.decisions:
            assert hasattr(dec, 'timestamp'), "Decision should have 'timestamp'"
            assert dec.timestamp is not None, "Decision timestamp should not be None"
            try:
                datetime.fromisoformat(dec.timestamp.replace('Z', '+00:00'))
            except ValueError:
                pytest.fail(f"Decision timestamp '{dec.timestamp}' is not valid ISO 8601")
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)



# Feature: storycore-llm-memory-system, Property 19: Temporal Conflict Resolution
@settings(max_examples=100, deadline=None)
@given(
    description1=description_strategy,
    description2=description_strategy
)
def test_property_temporal_conflict_resolution(description1, description2):
    """
    Property 19: Temporal Conflict Resolution
    
    For any conflicting information in memory.json, entries with more recent
    timestamps SHALL take precedence.
    
    Validates: Requirements 5.6
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        setup_test_project(temp_path)
        memory_manager = MemoryManager(temp_path)
        
        # Execute: Add an objective
        memory_manager.add_objective(description1, "active")
        
        # Get the objective ID
        memory = memory_manager.load_memory()
        assert len(memory.objectives) > 0, "Should have at least one objective"
        objective_id = memory.objectives[0].id
        original_timestamp = memory.objectives[0].added
        
        # Wait a moment to ensure different timestamp
        import time
        time.sleep(0.1)
        
        # Execute: Update the objective with conflicting information
        new_data = {
            "description": description2,
            "status": "completed"
        }
        result = memory_manager.resolve_temporal_conflict("objectives", objective_id, new_data)
        assert result is True, "Conflict resolution should succeed"
        
        # Verify: The objective was updated
        updated_memory = memory_manager.load_memory()
        updated_objective = next((obj for obj in updated_memory.objectives if obj.id == objective_id), None)
        
        assert updated_objective is not None, "Objective should still exist"
        assert updated_objective.description == description2, \
            "Description should be updated to newer value"
        assert updated_objective.status == "completed", \
            "Status should be updated to newer value"
        
        # Verify: Timestamp was updated to more recent
        updated_timestamp = updated_objective.added
        assert updated_timestamp >= original_timestamp, \
            "Updated timestamp should be more recent than original"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 14: Memory Schema Completeness (Round-Trip)
@settings(max_examples=100, deadline=None)
@given(
    num_objectives=st.integers(min_value=1, max_value=5),
    num_entities=st.integers(min_value=1, max_value=5)
)
def test_property_memory_round_trip_integrity(num_objectives, num_entities):
    """
    Property 14 (Round-Trip): Memory Schema Completeness
    
    For any memory data saved and then loaded, all sections SHALL be preserved
    with complete data integrity.
    
    Validates: Requirements 5.1
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        setup_test_project(temp_path)
        memory_manager = MemoryManager(temp_path)
        
        # Execute: Add various data
        objective_descriptions = []
        for i in range(num_objectives):
            desc = f"Objective {i}"
            objective_descriptions.append(desc)
            memory_manager.add_objective(desc)
        
        entity_names = []
        for i in range(num_entities):
            name = f"Entity {i}"
            entity_names.append(name)
            memory_manager.add_entity(name, "module", f"Description {i}")
        
        # Load memory
        memory_before = memory_manager.load_memory()
        assert memory_before is not None, "Memory should be loaded"
        
        # Save memory
        result = memory_manager.save_memory(memory_before)
        assert result is True, "Saving memory should succeed"
        
        # Load memory again
        memory_after = memory_manager.load_memory()
        assert memory_after is not None, "Memory should be loaded after save"
        
        # Verify: All sections are preserved
        assert len(memory_after.objectives) == len(memory_before.objectives), \
            "Objectives count should be preserved"
        assert len(memory_after.entities) == len(memory_before.entities), \
            "Entities count should be preserved"
        
        # Verify: Content is preserved
        for desc in objective_descriptions:
            assert any(obj.description == desc for obj in memory_after.objectives), \
                f"Objective '{desc}' should be preserved"
        
        for name in entity_names:
            assert any(ent.name == name for ent in memory_after.entities), \
                f"Entity '{name}' should be preserved"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)



# Feature: storycore-llm-memory-system, Property 16: Memory Schema Validation (Multiple Updates)
@settings(max_examples=100, deadline=None)
@given(
    num_updates=st.integers(min_value=1, max_value=10)
)
def test_property_memory_schema_validation_multiple_updates(num_updates):
    """
    Property 16 (Multiple Updates): Memory Schema Validation
    
    For any sequence of updates to memory.json, each update SHALL be validated
    before writing, ensuring continuous schema compliance.
    
    Validates: Requirements 5.3
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        setup_test_project(temp_path)
        memory_manager = MemoryManager(temp_path)
        
        # Execute: Perform multiple updates
        for i in range(num_updates):
            # Add different types of data
            if i % 3 == 0:
                result = memory_manager.add_objective(f"Objective {i}")
            elif i % 3 == 1:
                result = memory_manager.add_entity(f"Entity {i}", "module", f"Description {i}")
            else:
                result = memory_manager.add_decision(f"Decision {i}", f"Rationale {i}")
            
            assert result is True, f"Update {i} should succeed"
            
            # Verify: Schema is still valid after each update
            is_valid, errors = memory_manager.validate_schema()
            assert is_valid is True, f"Schema should be valid after update {i}, got errors: {errors}"
            assert len(errors) == 0, f"Should have no validation errors after update {i}"
        
        # Verify: All updates were persisted
        memory = memory_manager.load_memory()
        assert memory is not None, "Memory should be loaded"
        
        # Count how many of each type we should have
        expected_objectives = (num_updates + 2) // 3  # +2 for rounding up
        expected_entities = (num_updates + 1) // 3
        expected_decisions = num_updates // 3
        
        assert len(memory.objectives) >= expected_objectives, \
            f"Should have at least {expected_objectives} objectives"
        assert len(memory.entities) >= expected_entities, \
            f"Should have at least {expected_entities} entities"
        assert len(memory.decisions) >= expected_decisions, \
            f"Should have at least {expected_decisions} decisions"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 18: Memory Entry Timestamps (Chronological Order)
@settings(max_examples=100, deadline=None)
@given(
    num_entries=st.integers(min_value=2, max_value=10)
)
def test_property_memory_entry_timestamps_chronological(num_entries):
    """
    Property 18 (Chronological): Memory Entry Timestamps
    
    For any sequence of entries added to memory.json, their timestamps SHALL
    be in chronological order (later entries have later timestamps).
    
    Validates: Requirements 5.5
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        setup_test_project(temp_path)
        memory_manager = MemoryManager(temp_path)
        
        # Execute: Add entries with small delays
        import time
        for i in range(num_entries):
            memory_manager.add_objective(f"Objective {i}")
            time.sleep(0.01)  # Small delay to ensure different timestamps
        
        # Verify: Timestamps are chronological
        memory = memory_manager.load_memory()
        assert memory is not None, "Memory should be loaded"
        assert len(memory.objectives) >= num_entries, \
            f"Should have at least {num_entries} objectives"
        
        # Get the objectives we just added (last num_entries)
        recent_objectives = memory.objectives[-num_entries:]
        
        # Verify: Each timestamp is >= previous timestamp
        for i in range(1, len(recent_objectives)):
            prev_timestamp = datetime.fromisoformat(recent_objectives[i-1].added.replace('Z', '+00:00'))
            curr_timestamp = datetime.fromisoformat(recent_objectives[i].added.replace('Z', '+00:00'))
            
            assert curr_timestamp >= prev_timestamp, \
                f"Timestamp {i} should be >= timestamp {i-1}"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 15: Automatic Memory Updates (All Entry Types)
@settings(max_examples=100, deadline=None)
@given(
    description=description_strategy,
    priority=priority_strategy,
    category=style_category_strategy
)
def test_property_automatic_memory_updates_all_types(description, priority, category):
    """
    Property 15 (All Types): Automatic Memory Updates
    
    For any type of entry (objective, entity, decision, constraint, style_rule, task),
    memory.json SHALL be updated correctly with proper structure.
    
    Validates: Requirements 5.2
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        setup_test_project(temp_path)
        memory_manager = MemoryManager(temp_path)
        
        # Execute: Add all types of entries
        result_obj = memory_manager.add_objective(description, "active")
        result_ent = memory_manager.add_entity("TestEntity", "module", description)
        result_dec = memory_manager.add_decision(description, "rationale")
        result_con = memory_manager.add_constraint(description, "technical")
        result_rule = memory_manager.add_style_rule(category, description)
        result_task = memory_manager.add_task(description, priority, "pending")
        
        # Verify: All additions succeeded
        assert result_obj is True, "Adding objective should succeed"
        assert result_ent is True, "Adding entity should succeed"
        assert result_dec is True, "Adding decision should succeed"
        assert result_con is True, "Adding constraint should succeed"
        assert result_rule is True, "Adding style rule should succeed"
        assert result_task is True, "Adding task should succeed"
        
        # Verify: All entries are in memory
        memory = memory_manager.load_memory()
        assert memory is not None, "Memory should be loaded"
        
        # Verify: Each entry has proper structure
        assert len(memory.objectives) > 0, "Should have objectives"
        latest_obj = memory.objectives[-1]
        assert hasattr(latest_obj, 'id'), "Objective should have ID"
        assert hasattr(latest_obj, 'description'), "Objective should have description"
        assert hasattr(latest_obj, 'status'), "Objective should have status"
        assert hasattr(latest_obj, 'added'), "Objective should have timestamp"
        
        assert len(memory.entities) > 0, "Should have entities"
        latest_ent = memory.entities[-1]
        assert hasattr(latest_ent, 'id'), "Entity should have ID"
        assert hasattr(latest_ent, 'name'), "Entity should have name"
        assert hasattr(latest_ent, 'type'), "Entity should have type"
        assert hasattr(latest_ent, 'description'), "Entity should have description"
        assert hasattr(latest_ent, 'added'), "Entity should have timestamp"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 17: Session Memory Loading (State Updates)
@settings(max_examples=100, deadline=None)
@given(
    phase=st.text(min_size=1, max_size=50),
    progress=st.integers(min_value=0, max_value=100)
)
def test_property_session_memory_loading_with_state(phase, progress):
    """
    Property 17 (State): Session Memory Loading
    
    For any session with state updates, memory.json SHALL preserve and load
    the current_state section correctly.
    
    Validates: Requirements 5.4
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        setup_test_project(temp_path)
        memory_manager = MemoryManager(temp_path)
        
        # Execute: Update state
        result = memory_manager.update_state(
            phase=phase,
            progress_percentage=progress,
            active_tasks=["task1", "task2"],
            blockers=["blocker1"]
        )
        assert result is True, "Updating state should succeed"
        
        # Execute: Load memory (simulate session start)
        memory = memory_manager.load_memory()
        
        # Verify: State was loaded correctly
        assert memory is not None, "Memory should be loaded"
        assert memory.current_state is not None, "Current state should exist"
        assert memory.current_state.phase == phase, "Phase should match"
        assert memory.current_state.progress_percentage == progress, "Progress should match"
        assert "task1" in memory.current_state.active_tasks, "Active tasks should be preserved"
        assert "task2" in memory.current_state.active_tasks, "Active tasks should be preserved"
        assert "blocker1" in memory.current_state.blockers, "Blockers should be preserved"
        assert memory.current_state.last_activity is not None, "Last activity should be set"
        
        # Verify: Last activity timestamp is valid
        try:
            datetime.fromisoformat(memory.current_state.last_activity.replace('Z', '+00:00'))
        except ValueError:
            pytest.fail("Last activity timestamp should be valid ISO 8601")
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 19: Temporal Conflict Resolution (Multiple Conflicts)
@settings(max_examples=100, deadline=None)
@given(
    num_updates=st.integers(min_value=2, max_value=5)
)
def test_property_temporal_conflict_resolution_multiple(num_updates):
    """
    Property 19 (Multiple): Temporal Conflict Resolution
    
    For any sequence of conflicting updates to the same entry, the most recent
    update SHALL always take precedence.
    
    Validates: Requirements 5.6
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        setup_test_project(temp_path)
        memory_manager = MemoryManager(temp_path)
        
        # Execute: Add an initial objective
        memory_manager.add_objective("Initial objective", "active")
        
        # Get the objective ID
        memory = memory_manager.load_memory()
        objective_id = memory.objectives[0].id
        
        # Execute: Perform multiple conflicting updates
        import time
        descriptions = []
        for i in range(num_updates):
            desc = f"Updated objective {i}"
            descriptions.append(desc)
            
            new_data = {
                "description": desc,
                "status": "active" if i % 2 == 0 else "completed"
            }
            
            result = memory_manager.resolve_temporal_conflict("objectives", objective_id, new_data)
            assert result is True, f"Conflict resolution {i} should succeed"
            
            time.sleep(0.01)  # Small delay to ensure different timestamps
        
        # Verify: The final update is what's in memory
        final_memory = memory_manager.load_memory()
        updated_objective = next((obj for obj in final_memory.objectives if obj.id == objective_id), None)
        
        assert updated_objective is not None, "Objective should still exist"
        assert updated_objective.description == descriptions[-1], \
            "Description should match the most recent update"
        
        # Verify: Status matches the most recent update
        expected_status = "active" if (num_updates - 1) % 2 == 0 else "completed"
        assert updated_objective.status == expected_status, \
            "Status should match the most recent update"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)
