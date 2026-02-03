"""
Integration test for memory state collection with actual psutil.

This test verifies that the collect_memory_state() method works correctly
with the real psutil library installed.
"""

import pytest
from src.diagnostic_collector import DiagnosticCollector


class TestMemoryCollectionIntegration:
    """Integration tests for memory state collection with real psutil."""
    
    def test_collect_memory_state_real_psutil(self):
        """Test memory state collection with actual psutil library."""
        collector = DiagnosticCollector()
        
        # Collect memory state using real psutil
        memory_state = collector.collect_memory_state()
        
        # Verify structure
        assert "memory_usage_mb" in memory_state
        assert "memory_percent" in memory_state
        assert "system_memory_total_mb" in memory_state
        assert "system_memory_available_mb" in memory_state
        assert "system_memory_percent" in memory_state
        assert "process_state" in memory_state
        
        # Verify values are reasonable (not zero or error states)
        assert memory_state["memory_usage_mb"] > 0, "Memory usage should be greater than 0"
        assert memory_state["memory_percent"] >= 0, "Memory percent should be non-negative"
        assert memory_state["system_memory_total_mb"] > 0, "System memory total should be greater than 0"
        assert memory_state["system_memory_available_mb"] >= 0, "Available memory should be non-negative"
        assert 0 <= memory_state["system_memory_percent"] <= 100, "System memory percent should be 0-100"
        
        # Verify process state
        process_state = memory_state["process_state"]
        assert "pid" in process_state
        assert "status" in process_state
        assert "num_threads" in process_state
        assert "cpu_percent" in process_state
        
        # Verify process values are reasonable
        assert process_state["pid"] > 0, "PID should be positive"
        assert process_state["status"] in ["running", "sleeping", "disk-sleep"], "Status should be valid"
        assert process_state["num_threads"] > 0, "Thread count should be positive"
        assert process_state["cpu_percent"] >= 0, "CPU percent should be non-negative"
        
        # Verify no error in process state
        assert "error" not in process_state, "Should not have error with psutil installed"
    
    def test_create_report_payload_with_real_memory_state(self):
        """Test that create_report_payload includes real memory state."""
        collector = DiagnosticCollector()
        
        # Create a report payload
        payload = collector.create_report_payload(
            report_type="bug",
            description="Integration test for memory collection",
            reproduction_steps="Run integration test",
            include_logs=False,
            module_name="test-module"
        )
        
        # Verify payload structure
        assert "diagnostics" in payload
        assert "memory_usage_mb" in payload["diagnostics"]
        assert "process_state" in payload["diagnostics"]
        
        # Verify memory values are real (not placeholder zeros)
        assert payload["diagnostics"]["memory_usage_mb"] > 0, "Should have real memory usage"
        
        # Verify process state has real data
        process_state = payload["diagnostics"]["process_state"]
        assert "pid" in process_state
        assert process_state["pid"] > 0, "Should have real PID"
        assert "status" in process_state
        assert "num_threads" in process_state
        assert process_state["num_threads"] > 0, "Should have real thread count"
    
    def test_memory_values_are_properly_formatted(self):
        """Test that memory values are properly rounded and formatted."""
        collector = DiagnosticCollector()
        
        memory_state = collector.collect_memory_state()
        
        # Check that values are rounded to 2 decimal places
        memory_mb = memory_state["memory_usage_mb"]
        assert isinstance(memory_mb, float), "Memory usage should be float"
        # Check that it has at most 2 decimal places
        assert memory_mb == round(memory_mb, 2), "Memory usage should be rounded to 2 decimals"
        
        memory_pct = memory_state["memory_percent"]
        assert isinstance(memory_pct, float), "Memory percent should be float"
        assert memory_pct == round(memory_pct, 2), "Memory percent should be rounded to 2 decimals"
        
        sys_mem_pct = memory_state["system_memory_percent"]
        assert isinstance(sys_mem_pct, float), "System memory percent should be float"
        assert sys_mem_pct == round(sys_mem_pct, 2), "System memory percent should be rounded to 2 decimals"
    
    def test_memory_state_consistency(self):
        """Test that memory state values are internally consistent."""
        collector = DiagnosticCollector()
        
        memory_state = collector.collect_memory_state()
        
        # System memory available should be less than or equal to total
        assert memory_state["system_memory_available_mb"] <= memory_state["system_memory_total_mb"], \
            "Available memory should not exceed total memory"
        
        # Memory percent should be reasonable given the values
        # (This is a rough check - exact calculation depends on system state)
        assert 0 <= memory_state["memory_percent"] <= 100, \
            "Memory percent should be between 0 and 100"
        
        # System memory percent should match the ratio
        expected_used_pct = ((memory_state["system_memory_total_mb"] - 
                             memory_state["system_memory_available_mb"]) / 
                            memory_state["system_memory_total_mb"]) * 100
        # Allow some tolerance due to rounding and timing
        assert abs(memory_state["system_memory_percent"] - expected_used_pct) < 5, \
            "System memory percent should roughly match calculated value"
