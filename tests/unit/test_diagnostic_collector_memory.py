"""
Unit tests for DiagnosticCollector memory state collection.

Tests the collect_memory_state() method which gathers memory usage
and process information using psutil.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from src.diagnostic_collector import DiagnosticCollector


class TestMemoryStateCollection:
    """Test suite for memory state collection functionality."""
    
    def test_collect_memory_state_with_psutil(self):
        """Test memory state collection when psutil is available."""
        collector = DiagnosticCollector()
        
        # Mock psutil - patch where it's imported (inside the method)
        with patch('psutil.Process') as mock_process_class, \
             patch('psutil.virtual_memory') as mock_virtual_memory:
            
            # Mock process
            mock_process = Mock()
            mock_process_class.return_value = mock_process
            
            # Mock memory info
            mock_memory_info = Mock()
            mock_memory_info.rss = 100 * 1024 * 1024  # 100 MB in bytes
            mock_process.memory_info.return_value = mock_memory_info
            mock_process.memory_percent.return_value = 5.5
            
            # Mock process attributes
            mock_process.pid = 12345
            mock_process.status.return_value = "running"
            mock_process.num_threads.return_value = 4
            mock_process.cpu_percent.return_value = 10.5
            mock_process.create_time.return_value = 1234567890.0
            
            # Mock system memory
            mock_system_memory = Mock()
            mock_system_memory.total = 8 * 1024 * 1024 * 1024  # 8 GB
            mock_system_memory.available = 4 * 1024 * 1024 * 1024  # 4 GB
            mock_system_memory.percent = 50.0
            mock_virtual_memory.return_value = mock_system_memory
            
            # Collect memory state
            memory_state = collector.collect_memory_state()
            
            # Verify structure
            assert "memory_usage_mb" in memory_state
            assert "memory_percent" in memory_state
            assert "system_memory_total_mb" in memory_state
            assert "system_memory_available_mb" in memory_state
            assert "system_memory_percent" in memory_state
            assert "process_state" in memory_state
            
            # Verify values
            assert memory_state["memory_usage_mb"] == 100.0
            assert memory_state["memory_percent"] == 5.5
            assert memory_state["system_memory_total_mb"] == 8192.0
            assert memory_state["system_memory_available_mb"] == 4096.0
            assert memory_state["system_memory_percent"] == 50.0
            
            # Verify process state
            process_state = memory_state["process_state"]
            assert process_state["pid"] == 12345
            assert process_state["status"] == "running"
            assert process_state["num_threads"] == 4
            assert process_state["cpu_percent"] == 10.5
            assert "create_time" in process_state
    
    def test_collect_memory_state_without_psutil(self):
        """Test memory state collection when psutil is not available."""
        collector = DiagnosticCollector()
        
        # Mock psutil import to raise ImportError
        with patch('builtins.__import__', side_effect=ImportError("No module named 'psutil'")):
            memory_state = collector.collect_memory_state()
            
            # Should return default values with error message
            assert memory_state["memory_usage_mb"] == 0
            assert memory_state["memory_percent"] == 0.0
            assert memory_state["system_memory_total_mb"] == 0
            assert memory_state["system_memory_available_mb"] == 0
            assert memory_state["system_memory_percent"] == 0.0
            assert "error" in memory_state["process_state"]
            assert "psutil library not available" in memory_state["process_state"]["error"]
    
    def test_collect_memory_state_with_partial_failure(self):
        """Test memory state collection when some psutil calls fail."""
        collector = DiagnosticCollector()
        
        with patch('psutil.Process') as mock_process_class, \
             patch('psutil.virtual_memory') as mock_virtual_memory:
            
            # Mock process
            mock_process = Mock()
            mock_process_class.return_value = mock_process
            
            # Mock memory info (successful)
            mock_memory_info = Mock()
            mock_memory_info.rss = 50 * 1024 * 1024  # 50 MB
            mock_process.memory_info.return_value = mock_memory_info
            
            # Mock memory_percent to fail
            mock_process.memory_percent.side_effect = Exception("Permission denied")
            
            # Mock basic process attributes
            mock_process.pid = 99999
            mock_process.status.return_value = "running"
            mock_process.num_threads.return_value = 2
            
            # Mock cpu_percent to fail
            mock_process.cpu_percent.side_effect = Exception("Not available")
            
            # Mock create_time to fail
            mock_process.create_time.side_effect = Exception("Access denied")
            
            # Mock system memory (successful)
            mock_system_memory = Mock()
            mock_system_memory.total = 4 * 1024 * 1024 * 1024  # 4 GB
            mock_system_memory.available = 2 * 1024 * 1024 * 1024  # 2 GB
            mock_system_memory.percent = 50.0
            mock_virtual_memory.return_value = mock_system_memory
            
            # Collect memory state
            memory_state = collector.collect_memory_state()
            
            # Should still return valid structure with available data
            assert memory_state["memory_usage_mb"] == 50.0
            assert memory_state["memory_percent"] == 0.0  # Failed, default value
            assert memory_state["system_memory_total_mb"] == 4096.0
            assert memory_state["system_memory_available_mb"] == 2048.0
            assert memory_state["system_memory_percent"] == 50.0
            
            # Process state should have basic info
            process_state = memory_state["process_state"]
            assert process_state["pid"] == 99999
            assert process_state["status"] == "running"
            assert process_state["num_threads"] == 2
            assert process_state["cpu_percent"] == 0.0  # Failed, default value
            assert "create_time" not in process_state  # Failed to collect
    
    def test_collect_memory_state_complete_failure(self):
        """Test memory state collection when psutil.Process() fails."""
        collector = DiagnosticCollector()
        
        with patch('psutil.Process', side_effect=Exception("Cannot access process")):
            memory_state = collector.collect_memory_state()
            
            # Should return default values with error message
            assert memory_state["memory_usage_mb"] == 0
            assert memory_state["memory_percent"] == 0.0
            assert "error" in memory_state["process_state"]
            assert "Failed to collect memory state" in memory_state["process_state"]["error"]
    
    def test_collect_memory_state_rounding(self):
        """Test that memory values are properly rounded to 2 decimal places."""
        collector = DiagnosticCollector()
        
        with patch('psutil.Process') as mock_process_class, \
             patch('psutil.virtual_memory') as mock_virtual_memory:
            
            # Mock process
            mock_process = Mock()
            mock_process_class.return_value = mock_process
            
            # Mock memory info with values that need rounding
            mock_memory_info = Mock()
            mock_memory_info.rss = 123456789  # Should round to MB
            mock_process.memory_info.return_value = mock_memory_info
            mock_process.memory_percent.return_value = 5.5555
            
            # Mock process attributes
            mock_process.pid = 1
            mock_process.status.return_value = "running"
            mock_process.num_threads.return_value = 1
            mock_process.cpu_percent.return_value = 0.0
            
            # Mock system memory
            mock_system_memory = Mock()
            mock_system_memory.total = 8589934592  # 8 GB
            mock_system_memory.available = 4294967296  # 4 GB
            mock_system_memory.percent = 50.123456
            mock_virtual_memory.return_value = mock_system_memory
            
            memory_state = collector.collect_memory_state()
            
            # Check rounding
            assert isinstance(memory_state["memory_usage_mb"], float)
            assert memory_state["memory_usage_mb"] == round(123456789 / (1024 * 1024), 2)
            assert memory_state["memory_percent"] == 5.56  # Rounded to 2 decimals
            assert memory_state["system_memory_percent"] == 50.12  # Rounded to 2 decimals
    
    def test_create_report_payload_includes_memory_state(self):
        """Test that create_report_payload includes memory state in diagnostics."""
        collector = DiagnosticCollector()
        
        with patch('psutil.Process') as mock_process_class, \
             patch('psutil.virtual_memory') as mock_virtual_memory:
            
            # Mock process
            mock_process = Mock()
            mock_process_class.return_value = mock_process
            
            # Mock memory info
            mock_memory_info = Mock()
            mock_memory_info.rss = 200 * 1024 * 1024  # 200 MB
            mock_process.memory_info.return_value = mock_memory_info
            mock_process.memory_percent.return_value = 10.0
            
            # Mock process attributes
            mock_process.pid = 54321
            mock_process.status.return_value = "running"
            mock_process.num_threads.return_value = 8
            mock_process.cpu_percent.return_value = 25.5
            mock_process.create_time.return_value = 1234567890.0
            
            # Mock system memory
            mock_system_memory = Mock()
            mock_system_memory.total = 16 * 1024 * 1024 * 1024  # 16 GB
            mock_system_memory.available = 8 * 1024 * 1024 * 1024  # 8 GB
            mock_system_memory.percent = 50.0
            mock_virtual_memory.return_value = mock_system_memory
            
            # Create report payload
            payload = collector.create_report_payload(
                report_type="bug",
                description="Test bug report",
                reproduction_steps="Step 1, Step 2",
                include_logs=False,
                module_name="test-module"
            )
            
            # Verify memory state is included
            assert "diagnostics" in payload
            assert "memory_usage_mb" in payload["diagnostics"]
            assert "process_state" in payload["diagnostics"]
            
            # Verify values
            assert payload["diagnostics"]["memory_usage_mb"] == 200.0
            assert payload["diagnostics"]["process_state"]["pid"] == 54321
            assert payload["diagnostics"]["process_state"]["status"] == "running"
            assert payload["diagnostics"]["process_state"]["num_threads"] == 8
            assert payload["diagnostics"]["process_state"]["cpu_percent"] == 25.5
    
    def test_memory_state_with_linux_specific_attributes(self):
        """Test memory state collection with Linux-specific attributes."""
        collector = DiagnosticCollector()
        
        with patch('psutil.Process') as mock_process_class, \
             patch('psutil.virtual_memory') as mock_virtual_memory:
            
            # Mock process
            mock_process = Mock()
            mock_process_class.return_value = mock_process
            
            # Mock memory info
            mock_memory_info = Mock()
            mock_memory_info.rss = 100 * 1024 * 1024
            mock_process.memory_info.return_value = mock_memory_info
            mock_process.memory_percent.return_value = 5.0
            
            # Mock process attributes
            mock_process.pid = 1000
            mock_process.status.return_value = "running"
            mock_process.num_threads.return_value = 4
            mock_process.cpu_percent.return_value = 0.0
            mock_process.create_time.return_value = 1234567890.0
            
            # Mock Linux-specific num_fds
            mock_process.num_fds.return_value = 42
            
            # Mock system memory
            mock_system_memory = Mock()
            mock_system_memory.total = 8 * 1024 * 1024 * 1024
            mock_system_memory.available = 4 * 1024 * 1024 * 1024
            mock_system_memory.percent = 50.0
            mock_virtual_memory.return_value = mock_system_memory
            
            memory_state = collector.collect_memory_state()
            
            # Verify num_fds is included on Linux
            assert memory_state["process_state"]["num_fds"] == 42
    
    def test_memory_state_without_linux_specific_attributes(self):
        """Test memory state collection without Linux-specific attributes (e.g., Windows)."""
        collector = DiagnosticCollector()
        
        with patch('psutil.Process') as mock_process_class, \
             patch('psutil.virtual_memory') as mock_virtual_memory:
            
            # Mock process
            mock_process = Mock()
            mock_process_class.return_value = mock_process
            
            # Mock memory info
            mock_memory_info = Mock()
            mock_memory_info.rss = 100 * 1024 * 1024
            mock_process.memory_info.return_value = mock_memory_info
            mock_process.memory_percent.return_value = 5.0
            
            # Mock process attributes
            mock_process.pid = 1000
            mock_process.status.return_value = "running"
            mock_process.num_threads.return_value = 4
            mock_process.cpu_percent.return_value = 0.0
            mock_process.create_time.return_value = 1234567890.0
            
            # Mock that num_fds doesn't exist (Windows) - use spec to limit attributes
            mock_process.configure_mock(**{'num_fds.side_effect': AttributeError("num_fds not available")})
            
            # Mock system memory
            mock_system_memory = Mock()
            mock_system_memory.total = 8 * 1024 * 1024 * 1024
            mock_system_memory.available = 4 * 1024 * 1024 * 1024
            mock_system_memory.percent = 50.0
            mock_virtual_memory.return_value = mock_system_memory
            
            memory_state = collector.collect_memory_state()
            
            # Verify num_fds is None on non-Linux systems
            assert memory_state["process_state"]["num_fds"] is None
