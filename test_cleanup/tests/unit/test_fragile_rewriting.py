"""
Unit tests for fragile test rewriting.
"""

import pytest
from pathlib import Path
from test_cleanup.cleanup.fragile_rewriting import (
    NonDeterministicPattern,
    detect_sleep_calls,
    detect_random_calls,
    detect_external_calls,
    detect_global_state,
    detect_all_non_deterministic_patterns,
    suggest_sleep_replacement,
    suggest_random_replacement,
    suggest_external_call_replacement,
    suggest_global_state_replacement,
    generate_rewrite_suggestions,
    analyze_test_for_rewriting,
    create_rewrite_log_entry,
    generate_rewrite_report
)
from test_cleanup.models import CleanupLog, TestMetrics
from datetime import datetime


class TestDetectSleepCalls:
    """Tests for detect_sleep_calls function."""
    
    def test_detect_time_sleep(self):
        """Test detecting time.sleep calls."""
        source = """
import time

def test_something():
    time.sleep(1)
    assert True
"""
        patterns = detect_sleep_calls(source)
        assert len(patterns) == 1
        assert patterns[0].pattern_type == "sleep"
        assert "time.sleep" in patterns[0].code_snippet
    
    def test_detect_asyncio_sleep(self):
        """Test detecting asyncio.sleep calls."""
        source = """
import asyncio

async def test_async():
    await asyncio.sleep(0.5)
"""
        patterns = detect_sleep_calls(source)
        assert len(patterns) == 1
        assert patterns[0].pattern_type == "sleep"
    
    def test_no_sleep_calls(self):
        """Test when no sleep calls are present."""
        source = """
def test_something():
    assert 1 + 1 == 2
"""
        patterns = detect_sleep_calls(source)
        assert len(patterns) == 0


class TestDetectRandomCalls:
    """Tests for detect_random_calls function."""
    
    def test_detect_random_module(self):
        """Test detecting random module usage."""
        source = """
import random

def test_random():
    value = random.randint(1, 10)
    assert value > 0
"""
        patterns = detect_random_calls(source)
        assert len(patterns) == 1
        assert patterns[0].pattern_type == "random"
    
    def test_detect_datetime_now(self):
        """Test detecting datetime.now calls."""
        source = """
from datetime import datetime

def test_time():
    now = datetime.now()
"""
        patterns = detect_random_calls(source)
        assert len(patterns) == 1
        assert patterns[0].pattern_type == "random"
    
    def test_detect_uuid(self):
        """Test detecting UUID generation."""
        source = """
import uuid

def test_uuid():
    id = uuid.uuid4()
"""
        patterns = detect_random_calls(source)
        assert len(patterns) == 1
        assert patterns[0].pattern_type == "random"
    
    def test_no_random_calls(self):
        """Test when no random calls are present."""
        source = """
def test_deterministic():
    assert 2 + 2 == 4
"""
        patterns = detect_random_calls(source)
        assert len(patterns) == 0


class TestDetectExternalCalls:
    """Tests for detect_external_calls function."""
    
    def test_detect_requests_library(self):
        """Test detecting requests library usage."""
        source = """
import requests

def test_api():
    response = requests.get('http://example.com')
"""
        patterns = detect_external_calls(source)
        assert len(patterns) >= 1
        assert any(p.pattern_type == "external_call" for p in patterns)
    
    def test_ignore_mocked_calls(self):
        """Test that mocked calls are ignored."""
        source = """
def test_api(mocker):
    mocker.patch('requests.get')
    response = requests.get('http://example.com')
"""
        patterns = detect_external_calls(source)
        # The patch line should be ignored
        assert len(patterns) <= 1
    
    def test_no_external_calls(self):
        """Test when no external calls are present."""
        source = """
def test_local():
    result = local_function()
    assert result
"""
        patterns = detect_external_calls(source)
        assert len(patterns) == 0


class TestDetectGlobalState:
    """Tests for detect_global_state function."""
    
    def test_detect_global_keyword(self):
        """Test detecting global keyword usage."""
        source = """
counter = 0

def test_global():
    global counter
    counter += 1
"""
        patterns = detect_global_state(source)
        assert len(patterns) == 1
        assert patterns[0].pattern_type == "global_state"
    
    def test_detect_os_environ(self):
        """Test detecting os.environ usage."""
        source = """
import os

def test_env():
    value = os.environ['MY_VAR']
"""
        patterns = detect_global_state(source)
        assert len(patterns) == 1
        assert patterns[0].pattern_type == "global_state"
    
    def test_no_global_state(self):
        """Test when no global state is present."""
        source = """
def test_isolated():
    local_var = 42
    assert local_var == 42
"""
        patterns = detect_global_state(source)
        assert len(patterns) == 0


class TestDetectAllNonDeterministicPatterns:
    """Tests for detect_all_non_deterministic_patterns function."""
    
    def test_detect_multiple_pattern_types(self):
        """Test detecting multiple types of patterns."""
        source = """
import time
import random

def test_mixed():
    time.sleep(1)
    value = random.randint(1, 10)
    assert value > 0
"""
        patterns = detect_all_non_deterministic_patterns(source)
        
        assert 'sleep' in patterns
        assert 'random' in patterns
        assert len(patterns['sleep']) == 1
        assert len(patterns['random']) == 1
    
    def test_detect_no_patterns(self):
        """Test when no patterns are present."""
        source = """
def test_clean():
    assert 1 + 1 == 2
"""
        patterns = detect_all_non_deterministic_patterns(source)
        
        assert all(len(p) == 0 for p in patterns.values())


class TestSuggestionFunctions:
    """Tests for suggestion generation functions."""
    
    def test_suggest_sleep_replacement(self):
        """Test sleep replacement suggestion."""
        pattern = NonDeterministicPattern("sleep", 5, "time.sleep(1)")
        suggestion = suggest_sleep_replacement(pattern)
        
        assert "mock" in suggestion.lower() or "fixture" in suggestion.lower()
    
    def test_suggest_random_replacement(self):
        """Test random replacement suggestion."""
        pattern = NonDeterministicPattern("random", 5, "random.randint(1, 10)")
        suggestion = suggest_random_replacement(pattern)
        
        assert "seed" in suggestion.lower() or "mock" in suggestion.lower()
    
    def test_suggest_external_call_replacement(self):
        """Test external call replacement suggestion."""
        pattern = NonDeterministicPattern("external_call", 5, "requests.get(url)")
        suggestion = suggest_external_call_replacement(pattern)
        
        assert "mock" in suggestion.lower()
    
    def test_suggest_global_state_replacement(self):
        """Test global state replacement suggestion."""
        pattern = NonDeterministicPattern("global_state", 5, "global counter")
        suggestion = suggest_global_state_replacement(pattern)
        
        assert "fixture" in suggestion.lower() or "monkeypatch" in suggestion.lower()


class TestGenerateRewriteSuggestions:
    """Tests for generate_rewrite_suggestions function."""
    
    def test_generate_suggestions_for_patterns(self):
        """Test generating suggestions for detected patterns."""
        patterns = {
            'sleep': [NonDeterministicPattern("sleep", 5, "time.sleep(1)")],
            'random': [NonDeterministicPattern("random", 10, "random.randint(1, 10)")],
            'external_call': [],
            'global_state': []
        }
        
        suggestions = generate_rewrite_suggestions(patterns)
        
        assert 'sleep' in suggestions
        assert 'random' in suggestions
        assert len(suggestions['sleep']) == 1
        assert len(suggestions['random']) == 1
        assert 'line_number' in suggestions['sleep'][0]
        assert 'suggestion' in suggestions['sleep'][0]


class TestAnalyzeTestForRewriting:
    """Tests for analyze_test_for_rewriting function."""
    
    def test_analyze_test_with_issues(self, tmp_path):
        """Test analyzing a test file with non-deterministic patterns."""
        test_file = tmp_path / "test_fragile.py"
        test_file.write_text("""
import time

def test_something():
    time.sleep(1)
    assert True
""")
        
        needs_rewriting, analysis = analyze_test_for_rewriting(test_file)
        
        assert needs_rewriting is True
        assert 'patterns' in analysis
        assert 'suggestions' in analysis
        assert analysis['total_issues'] > 0
    
    def test_analyze_clean_test(self, tmp_path):
        """Test analyzing a test file without issues."""
        test_file = tmp_path / "test_clean.py"
        test_file.write_text("""
def test_something():
    assert 1 + 1 == 2
""")
        
        needs_rewriting, analysis = analyze_test_for_rewriting(test_file)
        
        assert needs_rewriting is False
        assert analysis['total_issues'] == 0
    
    def test_analyze_nonexistent_file(self, tmp_path):
        """Test analyzing a non-existent file."""
        test_file = tmp_path / "nonexistent.py"
        
        needs_rewriting, analysis = analyze_test_for_rewriting(test_file)
        
        assert needs_rewriting is False
        assert 'error' in analysis


class TestCreateRewriteLogEntry:
    """Tests for create_rewrite_log_entry function."""
    
    def test_create_log_entry(self):
        """Test creating a rewrite log entry."""
        patterns = {
            'sleep': [NonDeterministicPattern("sleep", 5, "time.sleep(1)")],
            'random': [NonDeterministicPattern("random", 10, "random.randint(1, 10)")]
        }
        
        cleanup_log = CleanupLog()
        
        action = create_rewrite_log_entry("test_fragile.py", patterns, cleanup_log)
        
        assert action.action_type == "rewrite"
        assert action.test_name == "test_fragile.py"
        assert "sleep" in action.reason
        assert "random" in action.reason
        assert len(cleanup_log.actions) == 1
        assert cleanup_log.total_rewritten == 1


class TestGenerateRewriteReport:
    """Tests for generate_rewrite_report function."""
    
    def test_generate_report_for_fragile_test(self, tmp_path):
        """Test generating a rewrite report."""
        test_file = tmp_path / "test_fragile.py"
        test_file.write_text("""
import time

def test_something():
    time.sleep(1)
    assert True
""")
        
        output_path = tmp_path / "report.json"
        
        success = generate_rewrite_report(test_file, output_path)
        
        assert success is True
        assert output_path.exists()
        
        # Verify report content
        import json
        with open(output_path) as f:
            report = json.load(f)
        
        assert report['needs_rewriting'] is True
        assert report['total_issues'] > 0
        assert 'patterns' in report
        assert 'suggestions' in report
