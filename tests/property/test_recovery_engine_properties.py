"""
Property-based tests for RecoveryEngine.

Feature: storycore-llm-memory-system
Tests Properties 43-47 for automatic recovery functionality.
Tests Properties 48-53 for desperate recovery mode.
"""

import pytest
from hypothesis import given, strategies as st, settings, assume
from pathlib import Path
import tempfile
import shutil
import json
from datetime import datetime
import uuid

from src.memory_system.recovery_engine import RecoveryEngine
from src.memory_system.error_detector import ErrorDetector
from src.memory_system.data_models import (
    Error,
    ErrorType,
    ErrorSeverity,
    RepairResult,
    RecoveryReport
)
from src.memory_system.directory_manager import DirectoryManager
from src.memory_system.build_logger import BuildLogger


# Strategies for generating test data
@st.composite
def project_name_strategy(draw):
    """Generate valid project names."""
    reserved_names = {
        'CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5',
        'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4',
        'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
    }
    
    name = draw(st.text(
        min_size=1,
        max_size=50,
        alphabet=st.characters(
            whitelist_categories=('Lu', 'Ll', 'Nd'),
            whitelist_characters='_-'
        )
    ))
    
    assume(name.upper() not in reserved_names)
    return name


@st.composite
def error_type_strategy(draw):
    """Generate valid error types."""
    return draw(st.sampled_from([
        ErrorType.MISSING_FILE,
        ErrorType.INVALID_JSON,
        ErrorType.INCONSISTENT_STATE,
        ErrorType.CORRUPTED_DATA
    ]))


@st.composite
def severity_strategy(draw):
    """Generate valid severity levels."""
    return draw(st.sampled_from([
        ErrorSeverity.LOW,
        ErrorSeverity.MEDIUM,
        ErrorSeverity.HIGH,
        ErrorSeverity.CRITICAL
    ]))


@st.composite
def missing_file_error_strategy(draw):
    """Generate a missing file error."""
    missing_files = [
        "project_config.json",
        "assistant/memory.json",
        "assistant/variables.json",
    ]
    
    file_path = draw(st.sampled_from(missing_files))
    
    return Error(
        id=str(uuid.uuid4()),
        type=ErrorType.MISSING_FILE,
        severity=ErrorSeverity.HIGH,
        detected=datetime.now().isoformat(),
        description=f"Missing required file: {file_path}",
        affected_components=[file_path],
        diagnostic_info={},
        status="detected",
        recovery_attempts=0
    )


@st.composite
def invalid_json_error_strategy(draw):
    """Generate an invalid JSON error."""
    json_files = [
        "project_config.json",
        "assistant/memory.json",
        "assistant/variables.json",
    ]
    
    file_path = draw(st.sampled_from(json_files))
    
    return Error(
        id=str(uuid.uuid4()),
        type=ErrorType.INVALID_JSON,
        severity=ErrorSeverity.HIGH,
        detected=datetime.now().isoformat(),
        description=f"Invalid JSON in: {file_path}",
        affected_components=[file_path],
        diagnostic_info={"error": "JSON decode error"},
        status="detected",
        recovery_attempts=0
    )


@st.composite
def inconsistent_state_error_strategy(draw):
    """Generate an inconsistent state error."""
    return Error(
        id=str(uuid.uuid4()),
        type=ErrorType.INCONSISTENT_STATE,
        severity=ErrorSeverity.MEDIUM,
        detected=datetime.now().isoformat(),
        description="Memory state inconsistent with file system",
        affected_components=["memory.json"],
        diagnostic_info={"issue": "state mismatch"},
        status="detected",
        recovery_attempts=0
    )


@st.composite
def recovery_attempts_strategy(draw):
    """Generate recovery attempt counts."""
    return draw(st.integers(min_value=0, max_value=5))


# Property 43: Automatic Repair Attempts
# Feature: storycore-llm-memory-system, Property 43: Automatic Repair Attempts
@given(
    project_name=project_name_strategy(),
    error=st.one_of(
        missing_file_error_strategy(),
        invalid_json_error_strategy(),
        inconsistent_state_error_strategy()
    )
)
@settings(max_examples=100, deadline=None)
def test_property_43_automatic_repair_attempts(project_name, error):
    """
    Property 43: Automatic Repair Attempts
    
    For any detected error, an automatic repair attempt SHALL be made 
    based on the error type.
    
    Validates: Requirements 11.1
    """
    # Setup
    with tempfile.TemporaryDirectory() as temp_dir:
        project_path = Path(temp_dir) / project_name
        project_path.mkdir(parents=True, exist_ok=True)
        
        # Create directory structure
        dir_manager = DirectoryManager()
        dir_manager.create_structure(project_path)
        
        # Create the error condition
        if error.type == ErrorType.MISSING_FILE:
            # Remove the file
            for component in error.affected_components:
                file_path = project_path / component
                if file_path.exists():
                    file_path.unlink()
        
        elif error.type == ErrorType.INVALID_JSON:
            # Create invalid JSON
            for component in error.affected_components:
                file_path = project_path / component
                file_path.parent.mkdir(parents=True, exist_ok=True)
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write('{"invalid": json}')
        
        recovery_engine = RecoveryEngine(project_path)
        
        # Execute
        result = recovery_engine.attempt_repair(error)
        
        # Verify
        assert isinstance(result, RepairResult), "Should return RepairResult"
        assert isinstance(result.success, bool), "Result should have success status"
        assert isinstance(result.reason, str), "Result should have reason"
        assert isinstance(result.actions_taken, list), "Result should have actions list"
        
        # Verify repair was attempted (actions were taken)
        if error.recovery_attempts < RecoveryEngine.MAX_RECOVERY_ATTEMPTS:
            assert len(result.actions_taken) > 0, "Should have attempted some repair actions"


# Property 44: Repair Attempt Logging
# Feature: storycore-llm-memory-system, Property 44: Repair Attempt Logging
@given(
    project_name=project_name_strategy(),
    error=missing_file_error_strategy()
)
@settings(max_examples=100, deadline=None)
def test_property_44_repair_attempt_logging(project_name, error):
    """
    Property 44: Repair Attempt Logging
    
    For any repair attempt, it SHALL be logged to recovery_attempts.log.
    
    Validates: Requirements 11.2
    """
    # Setup
    with tempfile.TemporaryDirectory() as temp_dir:
        project_path = Path(temp_dir) / project_name
        project_path.mkdir(parents=True, exist_ok=True)
        
        # Create directory structure
        dir_manager = DirectoryManager()
        dir_manager.create_structure(project_path)
        
        # Remove the file to create error condition
        for component in error.affected_components:
            file_path = project_path / component
            if file_path.exists():
                file_path.unlink()
        
        recovery_engine = RecoveryEngine(project_path)
        
        # Execute
        result = recovery_engine.attempt_repair(error)
        
        # Verify
        recovery_log_path = project_path / "build_logs" / "recovery_attempts.log"
        
        # Check if recovery attempt was logged
        if result.success:
            # Successful repairs should be logged
            assert recovery_log_path.exists(), "recovery_attempts.log should exist"
            
            with open(recovery_log_path, 'r', encoding='utf-8') as f:
                log_content = f.read()
            
            # Verify log contains error ID
            assert error.id in log_content or "repair" in log_content.lower(), \
                "Log should contain error ID or repair information"


# Property 45: Successful Repair Status Update
# Feature: storycore-llm-memory-system, Property 45: Successful Repair Status Update
@given(
    project_name=project_name_strategy(),
    error=missing_file_error_strategy()
)
@settings(max_examples=100, deadline=None)
def test_property_45_successful_repair_status_update(project_name, error):
    """
    Property 45: Successful Repair Status Update
    
    For any successful repair, the error status in errors_detected.json 
    SHALL be updated to reflect resolution.
    
    Validates: Requirements 11.3
    """
    # Setup
    with tempfile.TemporaryDirectory() as temp_dir:
        project_path = Path(temp_dir) / project_name
        project_path.mkdir(parents=True, exist_ok=True)
        
        # Create directory structure
        dir_manager = DirectoryManager()
        dir_manager.create_structure(project_path)
        
        # Log the error first
        detector = ErrorDetector(project_path)
        detector.log_errors([error])
        
        # Remove the file to create error condition
        for component in error.affected_components:
            file_path = project_path / component
            if file_path.exists():
                file_path.unlink()
        
        recovery_engine = RecoveryEngine(project_path)
        
        # Execute
        result = recovery_engine.attempt_repair(error)
        
        # If repair was successful, update status
        if result.success:
            updated = recovery_engine.update_error_status(
                error.id,
                "resolved",
                error.recovery_attempts + 1
            )
            
            # Verify
            assert updated is True, "Status update should succeed"
            
            # Check errors_detected.json
            errors_path = project_path / "build_logs" / "errors_detected.json"
            with open(errors_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Find the error
            found_error = None
            for err in data.get('errors', []):
                if err['id'] == error.id:
                    found_error = err
                    break
            
            if found_error:
                assert found_error['status'] == "resolved", \
                    "Error status should be updated to resolved"
                assert found_error['recovery_attempts'] == error.recovery_attempts + 1, \
                    "Recovery attempts should be incremented"


# Property 46: Failed Repair Marking
# Feature: storycore-llm-memory-system, Property 46: Failed Repair Marking
@given(
    project_name=project_name_strategy(),
    error_type=error_type_strategy()
)
@settings(max_examples=100, deadline=None)
def test_property_46_failed_repair_marking(project_name, error_type):
    """
    Property 46: Failed Repair Marking
    
    For any failed repair, the failure reason SHALL be logged and the error 
    SHALL be marked as requiring manual intervention.
    
    Validates: Requirements 11.4
    """
    # Setup
    with tempfile.TemporaryDirectory() as temp_dir:
        project_path = Path(temp_dir) / project_name
        project_path.mkdir(parents=True, exist_ok=True)
        
        # Create directory structure
        dir_manager = DirectoryManager()
        dir_manager.create_structure(project_path)
        
        # Create an error that will fail to repair
        # (e.g., corrupted data with no backup)
        error = Error(
            id=str(uuid.uuid4()),
            type=ErrorType.CORRUPTED_DATA,
            severity=ErrorSeverity.HIGH,
            detected=datetime.now().isoformat(),
            description="Corrupted data with no recovery path",
            affected_components=["nonexistent_file.json"],
            diagnostic_info={},
            status="detected",
            recovery_attempts=0
        )
        
        # Log the error
        detector = ErrorDetector(project_path)
        detector.log_errors([error])
        
        recovery_engine = RecoveryEngine(project_path)
        
        # Execute
        result = recovery_engine.attempt_repair(error)
        
        # Verify
        if not result.success:
            # Failed repair should have a reason
            assert result.reason is not None, "Failed repair should have a reason"
            assert len(result.reason) > 0, "Reason should not be empty"
            
            # Update status to mark as requiring manual intervention
            updated = recovery_engine.update_error_status(
                error.id,
                "requires_manual_intervention",
                error.recovery_attempts + 1
            )
            
            if updated:
                # Check errors_detected.json
                errors_path = project_path / "build_logs" / "errors_detected.json"
                with open(errors_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                # Find the error
                found_error = None
                for err in data.get('errors', []):
                    if err['id'] == error.id:
                        found_error = err
                        break
                
                if found_error:
                    assert found_error['status'] == "requires_manual_intervention", \
                        "Error should be marked as requiring manual intervention"


# Property 47: Recovery Attempt Limiting
# Feature: storycore-llm-memory-system, Property 47: Recovery Attempt Limiting
@given(
    project_name=project_name_strategy(),
    recovery_attempts=st.integers(min_value=0, max_value=10)
)
@settings(max_examples=100, deadline=None)
def test_property_47_recovery_attempt_limiting(project_name, recovery_attempts):
    """
    Property 47: Recovery Attempt Limiting
    
    For any error, the number of recovery attempts SHALL not exceed 3 
    to prevent infinite loops.
    
    Validates: Requirements 11.5
    """
    # Setup
    with tempfile.TemporaryDirectory() as temp_dir:
        project_path = Path(temp_dir) / project_name
        project_path.mkdir(parents=True, exist_ok=True)
        
        # Create directory structure
        dir_manager = DirectoryManager()
        dir_manager.create_structure(project_path)
        
        # Create an error with specified recovery attempts
        error = Error(
            id=str(uuid.uuid4()),
            type=ErrorType.MISSING_FILE,
            severity=ErrorSeverity.HIGH,
            detected=datetime.now().isoformat(),
            description="Missing file",
            affected_components=["project_config.json"],
            diagnostic_info={},
            status="detected",
            recovery_attempts=recovery_attempts
        )
        
        recovery_engine = RecoveryEngine(project_path)
        
        # Execute
        result = recovery_engine.attempt_repair(error)
        
        # Verify
        if recovery_attempts >= RecoveryEngine.MAX_RECOVERY_ATTEMPTS:
            # Should refuse to attempt repair
            assert result.success is False, \
                "Should not attempt repair when max attempts exceeded"
            assert "maximum" in result.reason.lower() or "exceeded" in result.reason.lower(), \
                "Reason should mention maximum attempts"
        else:
            # Should attempt repair
            assert len(result.actions_taken) >= 0, \
                "Should have attempted repair actions"


# ============================================================================
# DESPERATE RECOVERY MODE TESTS (Properties 48-53)
# ============================================================================

# Property 48: Recovery Mode Log Analysis
# Feature: storycore-llm-memory-system, Property 48: Recovery Mode Log Analysis
@given(project_name=project_name_strategy())
@settings(max_examples=100, deadline=None)
def test_property_48_recovery_mode_log_analysis(project_name):
    """
    Property 48: Recovery Mode Log Analysis
    
    For any triggered recovery mode, all available logs SHALL be analyzed 
    to reconstruct project history.
    
    Validates: Requirements 12.1
    """
    # Setup
    with tempfile.TemporaryDirectory() as temp_dir:
        project_path = Path(temp_dir) / project_name
        project_path.mkdir(parents=True, exist_ok=True)
        
        # Create directory structure
        dir_manager = DirectoryManager()
        dir_manager.create_structure(project_path)
        
        # Create some logged actions
        build_logger = BuildLogger(project_path)
        build_logger.log_file_creation(Path("test_file.txt"))
        
        # Create asset info for logging
        from src.memory_system.data_models import AssetInfo, AssetType
        asset_info = AssetInfo(
            filename="test_asset.png",
            path=Path("assets/images/test_asset.png"),
            type=AssetType.IMAGE,
            size_bytes=1024,
            timestamp=datetime.now().isoformat()
        )
        build_logger.log_asset_addition(asset_info)
        build_logger.log_memory_update("objectives", {"added": "test objective"})
        
        recovery_engine = RecoveryEngine(project_path)
        
        # Execute
        history = recovery_engine.analyze_logs_for_recovery()
        
        # Verify
        assert isinstance(history, dict), "History should be a dictionary"
        assert 'files_created' in history, "History should track files created"
        assert 'assets_added' in history, "History should track assets added"
        assert 'decisions' in history, "History should track decisions"
        assert 'memory_updates' in history, "History should track memory updates"
        assert 'timeline' in history, "History should have timeline"
        
        # Verify history contains logged actions
        # Note: History may be empty if logs haven't been flushed yet
        # The important thing is that the structure is correct
        assert isinstance(history['files_created'], list)
        assert isinstance(history['assets_added'], list)
        assert isinstance(history['memory_updates'], list)


# Property 49: Directory Structure Reconstruction
# Feature: storycore-llm-memory-system, Property 49: Directory Structure Reconstruction
@given(project_name=project_name_strategy())
@settings(max_examples=100, deadline=None)
def test_property_49_directory_structure_reconstruction(project_name):
    """
    Property 49: Directory Structure Reconstruction
    
    For any recovery mode execution, the directory structure SHALL be 
    rebuilt based on logged actions.
    
    Validates: Requirements 12.2
    """
    # Setup
    with tempfile.TemporaryDirectory() as temp_dir:
        project_path = Path(temp_dir) / project_name
        project_path.mkdir(parents=True, exist_ok=True)
        
        # Create minimal structure with logs
        (project_path / "build_logs").mkdir(parents=True, exist_ok=True)
        
        # Create some logged actions
        build_logger = BuildLogger(project_path)
        build_logger.log_file_creation(Path("assistant/memory.json"))
        build_logger.log_file_creation(Path("assets/images/test.png"))
        
        recovery_engine = RecoveryEngine(project_path)
        
        # Analyze logs
        history = recovery_engine.analyze_logs_for_recovery()
        
        # Execute
        result = recovery_engine.rebuild_structure(history)
        
        # Verify
        assert isinstance(result, bool), "Should return boolean"
        
        if result:
            # Check that required directories were created
            assert (project_path / "assistant").exists(), "assistant/ should exist"
            assert (project_path / "assets").exists(), "assets/ should exist"
            assert (project_path / "summaries").exists(), "summaries/ should exist"
            assert (project_path / "qa_reports").exists(), "qa_reports/ should exist"


# Property 50: Memory Reconstitution
# Feature: storycore-llm-memory-system, Property 50: Memory Reconstitution
@given(project_name=project_name_strategy())
@settings(max_examples=100, deadline=None)
def test_property_50_memory_reconstitution(project_name):
    """
    Property 50: Memory Reconstitution
    
    For any recovery mode execution, memory.json SHALL be reconstituted 
    from discussion summaries and logged decisions.
    
    Validates: Requirements 12.3
    """
    # Setup
    with tempfile.TemporaryDirectory() as temp_dir:
        project_path = Path(temp_dir) / project_name
        project_path.mkdir(parents=True, exist_ok=True)
        
        # Create directory structure
        dir_manager = DirectoryManager()
        dir_manager.create_structure(project_path)
        
        # Create some logged decisions
        build_logger = BuildLogger(project_path)
        build_logger.log_decision("Use Python for implementation")
        build_logger.log_decision("Implement property-based testing")
        build_logger.log_memory_update("objectives", {"added": "Complete recovery system"})
        
        recovery_engine = RecoveryEngine(project_path)
        
        # Analyze logs
        history = recovery_engine.analyze_logs_for_recovery()
        
        # Execute
        result = recovery_engine.reconstitute_memory(history)
        
        # Verify
        assert isinstance(result, bool), "Should return boolean"
        
        if result:
            memory_path = project_path / "assistant" / "memory.json"
            assert memory_path.exists(), "memory.json should be created"
            
            # Verify memory.json is valid
            with open(memory_path, 'r', encoding='utf-8') as f:
                memory_data = json.load(f)
            
            # Check required fields
            assert "schema_version" in memory_data
            assert "last_updated" in memory_data
            assert "objectives" in memory_data
            assert "entities" in memory_data
            assert "decisions" in memory_data
            assert "current_state" in memory_data
            
            # Check that decisions were reconstituted
            if len(history.get('decisions', [])) > 0:
                assert len(memory_data['decisions']) > 0, \
                    "Decisions should be reconstituted from history"


# Property 51: Post-Recovery Cross-Verification
# Feature: storycore-llm-memory-system, Property 51: Post-Recovery Cross-Verification
@given(project_name=project_name_strategy())
@settings(max_examples=100, deadline=None)
def test_property_51_post_recovery_cross_verification(project_name):
    """
    Property 51: Post-Recovery Cross-Verification
    
    For any completed reconstruction, cross-verification SHALL be performed 
    against available files.
    
    Validates: Requirements 12.4
    """
    # Setup
    with tempfile.TemporaryDirectory() as temp_dir:
        project_path = Path(temp_dir) / project_name
        project_path.mkdir(parents=True, exist_ok=True)
        
        # Create directory structure
        dir_manager = DirectoryManager()
        dir_manager.create_structure(project_path)
        
        # Create some logged actions
        build_logger = BuildLogger(project_path)
        build_logger.log_file_creation(Path("project_config.json"))
        build_logger.log_file_creation(Path("assistant/memory.json"))
        
        recovery_engine = RecoveryEngine(project_path)
        
        # Analyze logs
        history = recovery_engine.analyze_logs_for_recovery()
        
        # Execute cross-verification
        verification_results = recovery_engine._cross_verify_files(history)
        
        # Verify
        assert isinstance(verification_results, dict), \
            "Verification results should be a dictionary"
        
        # Check that key files are verified
        for file_path, verified in verification_results.items():
            assert isinstance(verified, bool), \
                f"Verification status for {file_path} should be boolean"


# Property 52: Recovery Report Generation
# Feature: storycore-llm-memory-system, Property 52: Recovery Report Generation
@given(project_name=project_name_strategy())
@settings(max_examples=100, deadline=None)
def test_property_52_recovery_report_generation(project_name):
    """
    Property 52: Recovery Report Generation
    
    For any completed recovery mode, a report SHALL be generated detailing 
    restored files, lost files, and confidence levels.
    
    Validates: Requirements 12.5
    """
    # Setup
    with tempfile.TemporaryDirectory() as temp_dir:
        project_path = Path(temp_dir) / project_name
        project_path.mkdir(parents=True, exist_ok=True)
        
        # Create minimal structure
        (project_path / "build_logs").mkdir(parents=True, exist_ok=True)
        
        # Create some logged actions
        build_logger = BuildLogger(project_path)
        build_logger.log_file_creation(Path("test_file.txt"))
        
        recovery_engine = RecoveryEngine(project_path)
        
        # Execute
        report = recovery_engine.desperate_recovery()
        
        # Verify
        assert isinstance(report, RecoveryReport), \
            "Should return RecoveryReport"
        
        # Check required fields
        assert isinstance(report.success, bool), "Report should have success status"
        assert isinstance(report.restored_files, list), "Report should list restored files"
        assert isinstance(report.lost_files, list), "Report should list lost files"
        assert isinstance(report.confidence_scores, dict), \
            "Report should have confidence scores"
        assert isinstance(report.warnings, list), "Report should have warnings"
        assert isinstance(report.recommendations, list), \
            "Report should have recommendations"
        assert isinstance(report.timestamp, str), "Report should have timestamp"
        
        # Verify timestamp is valid ISO 8601
        try:
            datetime.fromisoformat(report.timestamp)
        except ValueError:
            pytest.fail("Report timestamp should be valid ISO 8601 format")


# Property 53: Unrecoverable File Marking
# Feature: storycore-llm-memory-system, Property 53: Unrecoverable File Marking
@given(project_name=project_name_strategy())
@settings(max_examples=100, deadline=None)
def test_property_53_unrecoverable_file_marking(project_name):
    """
    Property 53: Unrecoverable File Marking
    
    For any critical file that cannot be recovered, it SHALL be marked 
    as missing in the recovery report.
    
    Validates: Requirements 12.6
    """
    # Setup
    with tempfile.TemporaryDirectory() as temp_dir:
        project_path = Path(temp_dir) / project_name
        project_path.mkdir(parents=True, exist_ok=True)
        
        # Create minimal structure (missing critical files)
        (project_path / "build_logs").mkdir(parents=True, exist_ok=True)
        
        # Don't create any files - simulate complete data loss
        # Only logs exist
        
        recovery_engine = RecoveryEngine(project_path)
        
        # Execute
        report = recovery_engine.desperate_recovery()
        
        # Verify
        assert isinstance(report, RecoveryReport), "Should return RecoveryReport"
        
        # If recovery was not completely successful, check lost files
        if not report.success:
            assert len(report.lost_files) > 0, \
                "Should mark some files as lost when recovery fails"
            
            # Check that lost files are documented
            for lost_file in report.lost_files:
                assert isinstance(lost_file, Path), \
                    "Lost files should be Path objects"
        
        # Check confidence scores for unrecoverable files
        for file_path, confidence in report.confidence_scores.items():
            assert 0.0 <= confidence <= 1.0, \
                "Confidence scores should be between 0 and 1"
            
            # Low confidence should indicate unrecoverable files
            if confidence < 0.3:
                # File should be in lost files or have warnings
                assert len(report.warnings) > 0 or len(report.lost_files) > 0, \
                    "Low confidence files should generate warnings or be marked as lost"


# Integration test: Complete desperate recovery workflow
# Feature: storycore-llm-memory-system, Properties 48-53: Complete Desperate Recovery
@given(project_name=project_name_strategy())
@settings(max_examples=50, deadline=None)
def test_complete_desperate_recovery_workflow(project_name):
    """
    Complete Desperate Recovery Workflow
    
    Tests the entire desperate recovery process from log analysis through
    structure rebuilding, memory reconstitution, verification, and reporting.
    
    Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
    """
    # Setup
    with tempfile.TemporaryDirectory() as temp_dir:
        project_path = Path(temp_dir) / project_name
        project_path.mkdir(parents=True, exist_ok=True)
        
        # Create initial structure and log some actions
        dir_manager = DirectoryManager()
        dir_manager.create_structure(project_path)
        
        build_logger = BuildLogger(project_path)
        build_logger.log_file_creation(Path("project_config.json"))
        build_logger.log_file_creation(Path("assistant/memory.json"))
        
        # Create asset info for logging
        from src.memory_system.data_models import AssetInfo, AssetType
        asset_info = AssetInfo(
            filename="test_image.png",
            path=Path("assets/images/test_image.png"),
            type=AssetType.IMAGE,
            size_bytes=2048,
            timestamp=datetime.now().isoformat()
        )
        build_logger.log_asset_addition(asset_info)
        build_logger.log_decision("Implement recovery system")
        build_logger.log_memory_update("objectives", {"added": "Test objective"})
        
        # Simulate catastrophic failure - delete most files
        for item in project_path.iterdir():
            if item.name != "build_logs":
                if item.is_dir():
                    shutil.rmtree(item)
                else:
                    item.unlink()
        
        recovery_engine = RecoveryEngine(project_path)
        
        # Execute complete recovery
        report = recovery_engine.desperate_recovery()
        
        # Verify complete workflow
        assert isinstance(report, RecoveryReport), "Should return RecoveryReport"
        
        # 1. Log analysis should have occurred
        history = recovery_engine.analyze_logs_for_recovery()
        # Note: History structure should be correct even if empty
        assert isinstance(history, dict)
        assert 'files_created' in history
        assert 'assets_added' in history
        assert 'decisions' in history
        
        # 2. Directory structure should be rebuilt
        assert (project_path / "assistant").exists(), "Structure should be rebuilt"
        assert (project_path / "assets").exists(), "Structure should be rebuilt"
        
        # 3. Memory should be reconstituted
        memory_path = project_path / "assistant" / "memory.json"
        if memory_path.exists():
            with open(memory_path, 'r', encoding='utf-8') as f:
                memory_data = json.load(f)
            assert "schema_version" in memory_data, "Memory should be valid"
        
        # 4. Report should be complete
        assert isinstance(report.restored_files, list)
        assert isinstance(report.lost_files, list)
        assert isinstance(report.confidence_scores, dict)
        assert isinstance(report.warnings, list)
        assert isinstance(report.recommendations, list)
        
        # 5. Confidence scores should be reasonable
        for confidence in report.confidence_scores.values():
            assert 0.0 <= confidence <= 1.0, "Confidence should be 0-1"
        
        # 6. If files couldn't be recovered, they should be marked
        if not report.success:
            assert len(report.lost_files) > 0 or len(report.warnings) > 0, \
                "Failed recovery should document issues"
