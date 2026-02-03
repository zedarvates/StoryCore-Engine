"""
Unit tests for DiagnosticCollector log collection functionality.

Tests the collect_logs method including:
- Reading from various log file locations
- Limiting to max_lines
- Applying anonymization
- Handling missing or inaccessible log files
"""

import pytest
import tempfile
import os
from pathlib import Path
from src.diagnostic_collector import DiagnosticCollector


class TestDiagnosticCollectorLogs:
    """Test suite for log collection functionality."""
    
    def test_collect_logs_returns_empty_when_no_logs_found(self):
        """Test that empty list is returned when no log files exist."""
        collector = DiagnosticCollector()
        
        # Call with no log files present (default behavior)
        logs = collector.collect_logs(max_lines=500)
        
        # Should return empty list when no logs are found
        assert isinstance(logs, list)
        assert len(logs) == 0
    
    def test_collect_logs_from_existing_file(self):
        """Test that logs are collected from an existing log file."""
        collector = DiagnosticCollector()
        
        # Create a temporary directory structure
        with tempfile.TemporaryDirectory() as tmpdir:
            log_dir = Path(tmpdir) / "logs"
            log_dir.mkdir()
            log_file = log_dir / "storycore.log"
            
            # Write some test log lines
            with open(log_file, 'w') as f:
                for i in range(10):
                    f.write(f"Log line {i}: Test message\n")
            
            # Temporarily change the working directory to test relative paths
            original_cwd = os.getcwd()
            try:
                os.chdir(tmpdir)
                
                logs = collector.collect_logs(max_lines=500)
                
                # Should have collected the logs
                assert len(logs) == 10
                assert "Log line 0: Test message" in logs[0]
                assert "Log line 9: Test message" in logs[-1]
            finally:
                os.chdir(original_cwd)
    
    def test_collect_logs_respects_max_lines(self):
        """Test that only the last max_lines are returned."""
        collector = DiagnosticCollector()
        
        # Create a temporary directory structure
        with tempfile.TemporaryDirectory() as tmpdir:
            log_dir = Path(tmpdir) / "logs"
            log_dir.mkdir()
            log_file = log_dir / "storycore.log"
            
            # Write many log lines
            with open(log_file, 'w') as f:
                for i in range(1000):
                    f.write(f"Log line {i}\n")
            
            # Temporarily change the working directory
            original_cwd = os.getcwd()
            try:
                os.chdir(tmpdir)
                
                logs = collector.collect_logs(max_lines=100)
                
                # Should get at most 100 lines (the last 100)
                assert len(logs) == 100
                # Should start with line 900 (1000 - 100)
                assert "Log line 900" in logs[0]
                assert "Log line 999" in logs[-1]
            finally:
                os.chdir(original_cwd)
    
    def test_collect_logs_applies_anonymization(self):
        """Test that log anonymization is applied to collected logs."""
        collector = DiagnosticCollector()
        
        # Create a temporary directory structure
        with tempfile.TemporaryDirectory() as tmpdir:
            log_dir = Path(tmpdir) / "logs"
            log_dir.mkdir()
            log_file = log_dir / "storycore.log"
            
            # Write logs with sensitive data
            with open(log_file, 'w') as f:
                f.write("ERROR: /home/john/storycore/src/module.py:42 - Failed\n")
                f.write("INFO: User email: user@example.com\n")
                f.write("DEBUG: API key: sk-1234567890abcdef\n")
            
            # Temporarily change the working directory
            original_cwd = os.getcwd()
            try:
                os.chdir(tmpdir)
                
                logs = collector.collect_logs(max_lines=500)
                
                # Verify anonymization was applied
                assert len(logs) == 3
                
                # Check that sensitive data patterns are not present
                log_text = ' '.join(logs)
                assert 'user@example.com' not in log_text  # Email should be redacted
                assert 'sk-1234567890abcdef' not in log_text  # API key should be redacted
                assert '[EMAIL_REDACTED]' in log_text
                assert '[TOKEN_REDACTED]' in log_text
            finally:
                os.chdir(original_cwd)
    
    def test_collect_logs_filters_empty_lines(self):
        """Test that empty lines are filtered out."""
        collector = DiagnosticCollector()
        
        # Create a temporary directory structure
        with tempfile.TemporaryDirectory() as tmpdir:
            log_dir = Path(tmpdir) / "logs"
            log_dir.mkdir()
            log_file = log_dir / "storycore.log"
            
            # Write logs with empty lines
            with open(log_file, 'w') as f:
                f.write("Log line 1\n")
                f.write("\n")
                f.write("   \n")
                f.write("Log line 2\n")
                f.write("\n")
            
            # Temporarily change the working directory
            original_cwd = os.getcwd()
            try:
                os.chdir(tmpdir)
                
                logs = collector.collect_logs(max_lines=500)
                
                # Should only get non-empty lines
                assert len(logs) == 2
                assert all(line.strip() for line in logs)
            finally:
                os.chdir(original_cwd)
    
    def test_collect_logs_handles_unicode_errors(self):
        """Test that unicode decoding errors are handled gracefully."""
        collector = DiagnosticCollector()
        
        # Create a temporary directory structure
        with tempfile.TemporaryDirectory() as tmpdir:
            log_dir = Path(tmpdir) / "logs"
            log_dir.mkdir()
            log_file = log_dir / "storycore.log"
            
            # Write some valid UTF-8 text
            with open(log_file, 'w', encoding='utf-8') as f:
                f.write("Valid log line 1\n")
                f.write("Valid log line 2\n")
            
            # Temporarily change the working directory
            original_cwd = os.getcwd()
            try:
                os.chdir(tmpdir)
                
                # Should handle encoding errors gracefully (errors='ignore')
                logs = collector.collect_logs(max_lines=500)
                
                # Should get the valid lines
                assert len(logs) == 2
            finally:
                os.chdir(original_cwd)
    
    def test_collect_logs_searches_multiple_locations(self):
        """Test that the collector searches multiple log file locations."""
        collector = DiagnosticCollector()
        
        # Create a temporary directory structure with logs in a secondary location
        with tempfile.TemporaryDirectory() as tmpdir:
            log_dir = Path(tmpdir) / "logs"
            log_dir.mkdir()
            log_file = log_dir / "production.log"  # Secondary location
            
            # Write some test log lines
            with open(log_file, 'w') as f:
                f.write("Production log line 1\n")
                f.write("Production log line 2\n")
            
            # Temporarily change the working directory
            original_cwd = os.getcwd()
            try:
                os.chdir(tmpdir)
                
                logs = collector.collect_logs(max_lines=500)
                
                # Should have found logs in the secondary location
                assert len(logs) == 2
                assert "Production log line" in logs[0]
            finally:
                os.chdir(original_cwd)


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
