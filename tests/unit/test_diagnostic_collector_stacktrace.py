"""
Unit tests for DiagnosticCollector stacktrace collection.

Tests the collect_stacktrace() method to ensure it properly captures
exception information when available.
"""

import sys
from src.diagnostic_collector import DiagnosticCollector


def test_collect_stacktrace_with_no_exception():
    """Test stacktrace collection when no exception is active."""
    collector = DiagnosticCollector()
    
    # Call without an active exception
    stacktrace = collector.collect_stacktrace()
    
    # Should return None when no exception is active
    assert stacktrace is None


def test_collect_stacktrace_with_active_exception():
    """Test stacktrace collection with an active exception."""
    collector = DiagnosticCollector()
    
    try:
        # Raise a test exception
        raise ValueError("Test error message")
    except ValueError:
        # Collect stacktrace while exception is active
        stacktrace = collector.collect_stacktrace()
        
        # Should return a non-None string
        assert stacktrace is not None
        assert isinstance(stacktrace, str)
        
        # Should contain the exception type
        assert "ValueError" in stacktrace
        
        # Should contain the error message
        assert "Test error message" in stacktrace
        
        # Should contain traceback information
        assert "Traceback" in stacktrace


def test_collect_stacktrace_preserves_line_numbers():
    """Test that stacktrace includes line numbers for debugging."""
    collector = DiagnosticCollector()
    
    try:
        # Raise exception on a specific line
        raise RuntimeError("Line number test")
    except RuntimeError:
        stacktrace = collector.collect_stacktrace()
        
        # Should contain line number information
        assert "line" in stacktrace.lower()
        
        # Should contain file information
        assert ".py" in stacktrace


def test_collect_stacktrace_with_nested_exceptions():
    """Test stacktrace collection with nested exception calls."""
    collector = DiagnosticCollector()
    
    def inner_function():
        raise KeyError("Inner exception")
    
    def outer_function():
        inner_function()
    
    try:
        outer_function()
    except KeyError:
        stacktrace = collector.collect_stacktrace()
        
        # Should capture the full call stack
        assert stacktrace is not None
        assert "KeyError" in stacktrace
        assert "Inner exception" in stacktrace
        
        # Should show both function calls in the stack
        assert "inner_function" in stacktrace
        assert "outer_function" in stacktrace


def test_collect_stacktrace_with_different_exception_types():
    """Test stacktrace collection with various exception types."""
    collector = DiagnosticCollector()
    
    exception_types = [
        (ValueError, "Value error test"),
        (TypeError, "Type error test"),
        (RuntimeError, "Runtime error test"),
        (KeyError, "Key error test"),
        (AttributeError, "Attribute error test"),
    ]
    
    for exc_type, message in exception_types:
        try:
            raise exc_type(message)
        except Exception:
            stacktrace = collector.collect_stacktrace()
            
            # Should capture each exception type correctly
            assert stacktrace is not None
            assert exc_type.__name__ in stacktrace
            assert message in stacktrace


def test_collect_stacktrace_in_report_payload():
    """Test that stacktrace is included in error report payloads."""
    collector = DiagnosticCollector()
    
    try:
        # Simulate an error condition
        raise Exception("Test exception for payload")
    except Exception:
        # Create report payload while exception is active
        payload = collector.create_report_payload(
            report_type="bug",
            description="Error occurred",
            reproduction_steps="Step 1: Trigger error",
            include_logs=False,
            module_name="test-module"
        )
        
        # Verify stacktrace is in diagnostics
        assert "diagnostics" in payload
        assert "stacktrace" in payload["diagnostics"]
        
        # Stacktrace should be captured
        stacktrace = payload["diagnostics"]["stacktrace"]
        assert stacktrace is not None
        assert "Exception" in stacktrace
        assert "Test exception for payload" in stacktrace


def test_collect_stacktrace_without_exception_in_payload():
    """Test that stacktrace is None when no exception is active."""
    collector = DiagnosticCollector()
    
    # Create payload without an active exception
    payload = collector.create_report_payload(
        report_type="enhancement",
        description="Feature request",
        reproduction_steps="N/A",
        include_logs=False,
        module_name="test-module"
    )
    
    # Stacktrace should be None
    assert payload["diagnostics"]["stacktrace"] is None


def test_collect_stacktrace_with_unicode_in_message():
    """Test stacktrace collection with unicode characters in error message."""
    collector = DiagnosticCollector()
    
    try:
        raise ValueError("Error with unicode: 你好 🚀 café")
    except ValueError:
        stacktrace = collector.collect_stacktrace()
        
        # Should handle unicode properly
        assert stacktrace is not None
        assert "ValueError" in stacktrace


def test_collect_stacktrace_format():
    """Test that stacktrace format is suitable for debugging."""
    collector = DiagnosticCollector()
    
    try:
        # Create a multi-line error scenario
        x = [1, 2, 3]
        _ = x[10]  # IndexError
    except IndexError:
        stacktrace = collector.collect_stacktrace()
        
        # Should be formatted as a string
        assert isinstance(stacktrace, str)
        
        # Should contain multiple lines
        assert '\n' in stacktrace
        
        # Should contain the exception type at the end
        assert "IndexError" in stacktrace


if __name__ == "__main__":
    # Run all tests
    test_collect_stacktrace_with_no_exception()
    test_collect_stacktrace_with_active_exception()
    test_collect_stacktrace_preserves_line_numbers()
    test_collect_stacktrace_with_nested_exceptions()
    test_collect_stacktrace_with_different_exception_types()
    test_collect_stacktrace_in_report_payload()
    test_collect_stacktrace_without_exception_in_payload()
    test_collect_stacktrace_with_unicode_in_message()
    test_collect_stacktrace_format()
    print("All stacktrace tests passed!")
