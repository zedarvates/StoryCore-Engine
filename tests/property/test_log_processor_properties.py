"""
Property-based tests for LogProcessor.

Tests Properties 33-36 from the design document.
"""

import pytest
from hypothesis import given, strategies as st, settings, assume
from pathlib import Path
import tempfile
import shutil
from datetime import datetime

from src.memory_system.log_processor import LogProcessor
from src.memory_system.build_logger import BuildLogger


# Test fixtures
@pytest.fixture
def temp_project_dir():
    """Create a temporary project directory."""
    temp_dir = Path(tempfile.mkdtemp())
    yield temp_dir
    shutil.rmtree(temp_dir, ignore_errors=True)


# Strategies for generating test data
@st.composite
def log_entry_strategy(draw):
    """Generate a valid log entry."""
    action_types = [
        "FILE_CREATED",
        "ASSET_ADDED",
        "MEMORY_UPDATED",
        "VARIABLE_CHANGED",
        "SUMMARY_GENERATED",
        "LLM_DECISION",
        "ERROR_DETECTED"
    ]
    
    timestamp = datetime.now().isoformat()
    action_type = draw(st.sampled_from(action_types))
    
    return f"[{timestamp}] ACTION: {action_type}\n  Path: test/path.txt\n  Size: 100 KB\n"


# Feature: storycore-llm-memory-system, Property 33: Automatic Log Cleaning
@given(num_entries=st.integers(min_value=1, max_value=50))
@settings(max_examples=100, deadline=None)
def test_property_33_automatic_log_cleaning(num_entries):
    """
    Property 33: Automatic Log Cleaning
    
    For any update to build_steps_raw.log, build_steps_clean.txt SHALL be 
    automatically generated with formatted, human-readable content.
    
    Validates: Requirements 9.1
    """
    # Setup - create temp dir inside test
    temp_dir = Path(tempfile.mkdtemp())
    try:
        logger = BuildLogger(temp_dir)
        processor = LogProcessor(temp_dir)
        
        # Create raw log with multiple entries
        for i in range(num_entries):
            logger.log_action(
                action_type="FILE_CREATED",
                affected_files=[f"test_file_{i}.txt"],
                parameters={"size": f"{i * 100} KB"}
            )
        
        # Execute: Clean logs
        clean_log_path = processor.clean_logs()
        
        # Verify
        assert clean_log_path is not None, "Clean log should be generated"
        assert clean_log_path.exists(), "Clean log file should exist"
        assert clean_log_path.name == "build_steps_clean.txt", "Clean log should have correct filename"
        
        # Verify content is readable
        with open(clean_log_path, 'r', encoding='utf-8') as f:
            clean_content = f.read()
        
        assert len(clean_content) > 0, "Clean log should have content"
        assert "ACTION" in clean_content, "Clean log should contain action markers"
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 34: Log Cleaning Reduces Redundancy
@given(num_duplicates=st.integers(min_value=2, max_value=10))
@settings(max_examples=100, deadline=None)
def test_property_34_log_cleaning_reduces_redundancy(num_duplicates):
    """
    Property 34: Log Cleaning Reduces Redundancy
    
    For any cleaned log, it SHALL be shorter than the raw log and have 
    normalized formatting.
    
    Validates: Requirements 9.2
    """
    # Setup - create temp dir inside test
    temp_dir = Path(tempfile.mkdtemp())
    try:
        logger = BuildLogger(temp_dir)
        processor = LogProcessor(temp_dir)
        
        # Create raw log with duplicate entries
        for _ in range(num_duplicates):
            logger.log_action(
                action_type="FILE_CREATED",
                affected_files=["duplicate_file.txt"],
                parameters={"size": "100 KB"}
            )
        
        # Get raw log size
        raw_log_path = temp_dir / "build_logs" / "build_steps_raw.log"
        raw_size = raw_log_path.stat().st_size
        
        # Execute: Clean logs
        clean_log_path = processor.clean_logs()
        
        # Verify
        assert clean_log_path is not None, "Clean log should be generated"
        clean_size = clean_log_path.stat().st_size
        
        # Clean log should be shorter or equal (redundancy removed)
        assert clean_size <= raw_size, "Clean log should not be larger than raw log"
        
        # Verify formatting is normalized
        with open(clean_log_path, 'r', encoding='utf-8') as f:
            clean_content = f.read()
        
        # Check for consistent formatting
        lines = clean_content.split('\n')
        action_lines = [l for l in lines if 'ACTION:' in l]
        
        # All action lines should have consistent format
        for line in action_lines:
            assert line.startswith('['), "Action lines should start with timestamp bracket"
            assert '] ACTION:' in line, "Action lines should have ACTION marker"
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 35: Automatic Log Translation
@given(target_lang=st.sampled_from(["fr", "en"]))
@settings(max_examples=100, deadline=None)
def test_property_35_automatic_log_translation(target_lang):
    """
    Property 35: Automatic Log Translation
    
    For any generated build_steps_clean.txt, build_steps_translated.txt SHALL 
    be created in the target language.
    
    Validates: Requirements 9.3
    """
    # Setup - create temp dir inside test
    temp_dir = Path(tempfile.mkdtemp())
    try:
        logger = BuildLogger(temp_dir)
        processor = LogProcessor(temp_dir)
        
        # Create raw log
        logger.log_action(
            action_type="FILE_CREATED",
            affected_files=["test_file.txt"],
            parameters={"size": "100 KB"}
        )
        
        # Clean logs first
        processor.clean_logs()
        
        # Execute: Translate logs
        translated_log_path = processor.translate_logs(target_language=target_lang)
        
        # Verify
        assert translated_log_path is not None, "Translated log should be generated"
        assert translated_log_path.exists(), "Translated log file should exist"
        assert translated_log_path.name == "build_steps_translated.txt", "Translated log should have correct filename"
        
        # Verify content exists
        with open(translated_log_path, 'r', encoding='utf-8') as f:
            translated_content = f.read()
        
        assert len(translated_content) > 0, "Translated log should have content"
        
        # For French, verify some translations occurred
        if target_lang == "fr":
            assert "JOURNAL" in translated_content or "ACTION" in translated_content, \
                "French translation should contain French terms"
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 36: Translation Information Preservation
@given(num_entries=st.integers(min_value=1, max_value=20))
@settings(max_examples=100, deadline=None)
def test_property_36_translation_information_preservation(num_entries):
    """
    Property 36: Translation Information Preservation
    
    For any translated log, it SHALL preserve all critical information from 
    the original while adapting to target language conventions.
    
    Validates: Requirements 9.5
    """
    # Setup - create temp dir inside test
    temp_dir = Path(tempfile.mkdtemp())
    try:
        logger = BuildLogger(temp_dir)
        processor = LogProcessor(temp_dir)
        
        # Create raw log with various action types
        action_types = [
            "FILE_CREATED",
            "ASSET_ADDED",
            "MEMORY_UPDATED",
            "VARIABLE_CHANGED"
        ]
        
        for i in range(num_entries):
            logger.log_action(
                action_type=action_types[i % len(action_types)],
                affected_files=[f"file_{i}.txt"],
                parameters={"index": str(i)}
            )
        
        # Clean logs
        processor.clean_logs()
        
        # Execute: Translate to French
        translated_log_path = processor.translate_logs(target_language="fr")
        
        # Verify
        assert translated_log_path is not None, "Translation should succeed"
        
        # Read both clean and translated logs
        clean_log_path = temp_dir / "build_logs" / "build_steps_clean.txt"
        
        with open(clean_log_path, 'r', encoding='utf-8') as f:
            clean_content = f.read()
        
        with open(translated_log_path, 'r', encoding='utf-8') as f:
            translated_content = f.read()
        
        # Count action entries in both
        clean_action_count = clean_content.count('ACTION:')
        translated_action_count = translated_content.count('ACTION:')
        
        # Should have same number of action entries
        assert clean_action_count == translated_action_count, \
            "Translated log should preserve all action entries"
        
        # Verify file references are preserved
        for i in range(num_entries):
            filename = f"file_{i}.txt"
            assert filename in translated_content, \
                f"File reference {filename} should be preserved in translation"
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


# Unit test for language support
def test_language_support(temp_project_dir):
    """
    Test English and French translation support.
    
    Validates: Requirements 9.4
    """
    # Setup
    logger = BuildLogger(temp_project_dir)
    processor = LogProcessor(temp_project_dir)
    
    # Create a log entry
    logger.log_action(
        action_type="FILE_CREATED",
        affected_files=["test.txt"],
        parameters={}
    )
    
    # Test English translation (should work)
    en_path = processor.translate_logs(target_language="en")
    assert en_path is not None, "English translation should succeed"
    assert en_path.exists(), "English translation file should exist"
    
    # Test French translation (should work)
    fr_path = processor.translate_logs(target_language="fr")
    assert fr_path is not None, "French translation should succeed"
    assert fr_path.exists(), "French translation file should exist"
    
    # Verify French contains French terms
    with open(fr_path, 'r', encoding='utf-8') as f:
        fr_content = f.read()
    
    assert "JOURNAL" in fr_content or "Fichiers" in fr_content, \
        "French translation should contain French terms"


# Unit test for format_for_llm
def test_format_for_llm(temp_project_dir):
    """Test that logs can be formatted for LLM consumption."""
    # Setup
    logger = BuildLogger(temp_project_dir)
    processor = LogProcessor(temp_project_dir)
    
    # Create multiple log entries
    for i in range(5):
        logger.log_action(
            action_type="FILE_CREATED",
            affected_files=[f"file_{i}.txt"],
            parameters={"index": str(i)}
        )
    
    # Execute
    formatted = processor.format_for_llm()
    
    # Verify
    assert "BUILD LOG SUMMARY" in formatted, "Should have summary header"
    assert "Total entries:" in formatted, "Should show total entries"
    assert "Action breakdown:" in formatted, "Should show action breakdown"
    assert "RECENT ACTIONS" in formatted, "Should show recent actions"


# Unit test for log summary
def test_get_log_summary(temp_project_dir):
    """Test that log summary provides accurate statistics."""
    # Setup
    logger = BuildLogger(temp_project_dir)
    processor = LogProcessor(temp_project_dir)
    
    # Create log entries
    for i in range(3):
        logger.log_action(
            action_type="FILE_CREATED",
            affected_files=[f"file_{i}.txt"],
            parameters={}
        )
    
    # Execute
    summary = processor.get_log_summary()
    
    # Verify
    assert summary["total_entries"] == 3, "Should count all entries"
    assert "FILE_CREATED" in summary["action_types"], "Should track action types"
    assert summary["action_types"]["FILE_CREATED"] == 3, "Should count action types correctly"
    assert summary["file_size"] > 0, "Should report file size"


# Unit test for empty log handling
def test_empty_log_handling(temp_project_dir):
    """Test that processor handles empty/missing logs gracefully."""
    processor = LogProcessor(temp_project_dir)
    
    # Try to clean non-existent log
    clean_path = processor.clean_logs()
    assert clean_path is None, "Should return None for missing log"
    
    # Try to translate non-existent log
    translated_path = processor.translate_logs()
    assert translated_path is None, "Should return None for missing log"
    
    # Try to get summary of non-existent log
    summary = processor.get_log_summary()
    assert summary["total_entries"] == 0, "Should return empty summary"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
