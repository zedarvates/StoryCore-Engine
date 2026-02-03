"""
Example: Error Handling Integration with ComfyUI Components

This example demonstrates how to integrate the error handling system
with ConnectionManager, ModelManager, and GenerationEngine.
"""

import asyncio
from pathlib import Path
from src.end_to_end import (
    ErrorCategory,
    CategorizedError,
    ErrorCategorizer,
    RetryManager,
    ErrorLogger,
    with_error_handling
)


# Example 1: Error Categorization and Logging
def example_error_categorization():
    """Demonstrate error categorization and logging"""
    print("=" * 60)
    print("Example 1: Error Categorization and Logging")
    print("=" * 60)
    
    # Create error logger
    error_logger = ErrorLogger(
        log_dir=Path(".storycore/logs"),
        max_log_size_mb=10,
        max_log_files=5
    )
    
    # Simulate different types of errors
    errors = [
        (ConnectionError("Connection refused"), {"url": "localhost:8000"}),
        (FileNotFoundError("Model not found: FLUX Dev"), {"model_name": "FLUX Dev"}),
        (ValueError("Node not found in workflow"), {"workflow_name": "flux_basic", "missing_node": "FluxSampler"}),
        (RuntimeError("CORS policy blocked request"), {}),
        (ValueError("Invalid port number: -1"), {}),
        (RuntimeError("Generation failed"), {"shot_id": "shot_001"}),
    ]
    
    for error, context in errors:
        # Categorize error
        categorized = ErrorCategorizer.categorize_error(error, context)
        
        # Log error
        error_logger.log_error(categorized)
        
        # Display to user
        print(f"\n{categorized}")
        print("-" * 60)
    
    # Get recent errors
    print("\nRecent Errors:")
    recent = error_logger.get_recent_errors(count=3)
    for i, error in enumerate(recent, 1):
        print(f"{i}. [{error['category']}] {error['message']}")


# Example 2: Retry with Exponential Backoff
def example_retry_manager():
    """Demonstrate retry functionality"""
    print("\n" + "=" * 60)
    print("Example 2: Retry with Exponential Backoff")
    print("=" * 60)
    
    retry_mgr = RetryManager(max_retries=3, base_delay=0.5)
    
    # Simulate a function that fails twice then succeeds
    attempt_count = 0
    
    def unreliable_operation():
        nonlocal attempt_count
        attempt_count += 1
        print(f"Attempt {attempt_count}...")
        
        if attempt_count < 3:
            raise ConnectionError("Connection timeout")
        
        return "Success!"
    
    try:
        result = retry_mgr.with_retry(
            unreliable_operation,
            "connect_operation"
        )
        print(f"Result: {result}")
        print(f"Total attempts: {attempt_count}")
    except Exception as e:
        print(f"Failed after {retry_mgr.get_retry_count('connect_operation')} attempts")
        print(f"Error: {e}")


# Example 3: Using the Decorator
def example_decorator():
    """Demonstrate with_error_handling decorator"""
    print("\n" + "=" * 60)
    print("Example 3: Using with_error_handling Decorator")
    print("=" * 60)
    
    error_logger = ErrorLogger(log_dir=Path(".storycore/logs"))
    retry_mgr = RetryManager(max_retries=2, base_delay=0.1)
    
    call_count = 0
    
    @with_error_handling(error_logger=error_logger, retry_manager=retry_mgr)
    def download_model(model_name: str):
        nonlocal call_count
        call_count += 1
        print(f"Downloading {model_name} (attempt {call_count})...")
        
        if call_count < 2:
            raise ConnectionError("Download failed")
        
        return f"{model_name} downloaded successfully"
    
    try:
        result = download_model("FLUX Dev")
        print(f"Result: {result}")
    except Exception as e:
        print(f"Download failed: {e}")


# Example 4: Integration with Connection Manager
class MockConnectionManager:
    """Mock ConnectionManager with error handling"""
    
    def __init__(self):
        self.error_logger = ErrorLogger(log_dir=Path(".storycore/logs"))
        self.retry_mgr = RetryManager(max_retries=3, base_delay=1.0)
    
    def connect(self, url: str):
        """Connect to ComfyUI with error handling"""
        try:
            result = self.retry_mgr.with_retry(
                self._attempt_connection,
                f"connect_{url}",
                url
            )
            return result
        except Exception as e:
            # Categorize and log error
            categorized = ErrorCategorizer.categorize_error(
                e,
                context={"url": url}
            )
            self.error_logger.log_error(categorized)
            
            # Display recovery guidance
            print(f"\nConnection failed!")
            print(f"Recovery steps:\n{categorized.recovery_action}")
            
            raise
    
    def _attempt_connection(self, url: str):
        """Simulate connection attempt"""
        # In real implementation, this would attempt actual connection
        print(f"Attempting to connect to {url}...")
        raise ConnectionError("Connection refused")


def example_connection_manager_integration():
    """Demonstrate integration with ConnectionManager"""
    print("\n" + "=" * 60)
    print("Example 4: ConnectionManager Integration")
    print("=" * 60)
    
    manager = MockConnectionManager()
    
    try:
        manager.connect("localhost:8000")
    except Exception as e:
        print(f"\nFinal error: {e}")


# Example 5: Error Recovery Workflow
def example_error_recovery_workflow():
    """Demonstrate complete error recovery workflow"""
    print("\n" + "=" * 60)
    print("Example 5: Complete Error Recovery Workflow")
    print("=" * 60)
    
    error_logger = ErrorLogger(log_dir=Path(".storycore/logs"))
    retry_mgr = RetryManager(max_retries=3, base_delay=0.5)
    
    def generate_image(shot_id: str):
        """Simulate image generation with various errors"""
        import random
        
        # Randomly fail with different error types
        error_type = random.choice([
            "connection",
            "model",
            "workflow",
            "success"
        ])
        
        if error_type == "connection":
            raise ConnectionError("ComfyUI not responding")
        elif error_type == "model":
            raise FileNotFoundError("Model not found: FLUX Dev")
        elif error_type == "workflow":
            raise ValueError("Node not found: FluxSampler")
        else:
            return f"Generated image for {shot_id}"
    
    # Try to generate multiple shots
    shots = ["shot_001", "shot_002", "shot_003"]
    
    for shot_id in shots:
        print(f"\nGenerating {shot_id}...")
        
        try:
            result = retry_mgr.with_retry(
                generate_image,
                f"generate_{shot_id}",
                shot_id
            )
            print(f"✓ {result}")
            
        except Exception as e:
            # Categorize error
            categorized = ErrorCategorizer.categorize_error(
                e,
                context={"shot_id": shot_id}
            )
            
            # Log error
            error_logger.log_error(categorized)
            
            # Display error and recovery guidance
            print(f"✗ Failed: {categorized.message}")
            print(f"  Recovery: {categorized.recovery_action.split(chr(10))[0]}")


def main():
    """Run all examples"""
    print("\n" + "=" * 60)
    print("ComfyUI Error Handling Integration Examples")
    print("=" * 60)
    
    # Run examples
    example_error_categorization()
    example_retry_manager()
    example_decorator()
    example_connection_manager_integration()
    example_error_recovery_workflow()
    
    print("\n" + "=" * 60)
    print("Examples Complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
