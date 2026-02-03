"""
Demonstration of Fact Checker Command Interface

This script demonstrates the unified command interface for the fact-checking system,
showing various usage patterns and features.
"""

from src.fact_checker import FactCheckerCommand
import json


def print_section(title: str):
    """Print a section header."""
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70 + "\n")


def demo_text_mode():
    """Demonstrate text mode analysis."""
    print_section("Demo 1: Text Mode Analysis")
    
    command = FactCheckerCommand()
    
    text_content = """
    Water boils at 100 degrees Celsius at sea level.
    The Earth is approximately 4.5 billion years old.
    Humans have 46 chromosomes in each cell.
    """
    
    print("Input Content:")
    print(text_content)
    print("\nExecuting with mode='text'...")
    
    result = command.execute(text_content, mode="text")
    
    print(f"\nStatus: {result['status']}")
    print(f"Mode: {result['mode']}")
    print(f"Agent: {result['agent']}")
    print(f"Processing Time: {result['processing_time_ms']}ms")
    print(f"\nSummary:\n{result['summary']}")


def demo_video_mode():
    """Demonstrate video mode analysis."""
    print_section("Demo 2: Video Mode Analysis")
    
    command = FactCheckerCommand()
    
    video_content = """
    [00:00:10] Welcome to this educational video about science.
    [00:00:20] Today we'll discuss some amazing facts about water.
    [00:00:30] Water is absolutely the most incredible substance on Earth!
    [00:00:40] It's shocking how many people don't know this.
    [00:00:50] Everyone agrees that water is essential for life.
    """
    
    print("Input Content:")
    print(video_content)
    print("\nExecuting with mode='video'...")
    
    result = command.execute(video_content, mode="video")
    
    print(f"\nStatus: {result['status']}")
    print(f"Mode: {result['mode']}")
    print(f"Agent: {result['agent']}")
    print(f"Processing Time: {result['processing_time_ms']}ms")
    print(f"\nSummary:\n{result['summary']}")


def demo_auto_detection():
    """Demonstrate automatic input type detection."""
    print_section("Demo 3: Auto-Detection Mode")
    
    command = FactCheckerCommand()
    
    # Test 1: Regular text (should detect as text)
    text_input = "The speed of light is 299,792,458 meters per second."
    
    print("Test 1 - Regular Text:")
    print(f"Input: {text_input}")
    
    result1 = command.execute(text_input, mode="auto")
    print(f"Detected Mode: {result1['mode']}")
    print(f"Agent Used: {result1['agent']}")
    
    # Test 2: Transcript with timestamps (should detect as video)
    video_input = """
    [00:00:05] This is a video transcript.
    [00:00:15] It contains multiple timestamps.
    [00:00:25] The system should detect this as video content.
    """
    
    print("\nTest 2 - Video Transcript:")
    print(f"Input: {video_input[:50]}...")
    
    result2 = command.execute(video_input, mode="auto")
    print(f"Detected Mode: {result2['mode']}")
    print(f"Agent Used: {result2['agent']}")


def demo_custom_parameters():
    """Demonstrate custom parameter usage."""
    print_section("Demo 4: Custom Parameters")
    
    command = FactCheckerCommand()
    
    content = "The human body contains approximately 37 trillion cells."
    
    print("Testing different parameter combinations:\n")
    
    # Test 1: Custom confidence threshold
    print("1. Custom Confidence Threshold (80.0):")
    result1 = command.execute(
        content,
        mode="text",
        confidence_threshold=80.0
    )
    print(f"   Status: {result1['status']}")
    
    # Test 2: Summary detail level
    print("\n2. Summary Detail Level:")
    result2 = command.execute(
        content,
        mode="text",
        detail_level="summary"
    )
    print(f"   Status: {result2['status']}")
    print(f"   Claims in report: {len(result2['report']['claims'])}")
    
    # Test 3: Markdown output format
    print("\n3. Markdown Output Format:")
    result3 = command.execute(
        content,
        mode="text",
        output_format="markdown"
    )
    print(f"   Status: {result3['status']}")
    print(f"   Report type: {type(result3['report']).__name__}")
    print(f"   Report preview: {result3['report'][:100]}...")


def demo_error_handling():
    """Demonstrate error handling."""
    print_section("Demo 5: Error Handling")
    
    command = FactCheckerCommand()
    
    # Test 1: Empty input
    print("Test 1 - Empty Input:")
    result1 = command.execute("", mode="text")
    print(f"Status: {result1['status']}")
    if result1['status'] == 'error':
        print(f"Error: {result1['error']['message']}")
    
    # Test 2: Invalid confidence threshold
    print("\nTest 2 - Invalid Confidence Threshold:")
    result2 = command.execute(
        "Test content",
        mode="text",
        confidence_threshold=150.0
    )
    print(f"Status: {result2['status']}")
    if result2['status'] == 'error':
        print(f"Error: {result2['error']['message']}")
    
    # Test 3: Invalid mode
    print("\nTest 3 - Invalid Mode:")
    result3 = command.execute("Test content", mode="invalid")
    print(f"Status: {result3['status']}")
    if result3['status'] == 'error':
        print(f"Error: {result3['error']['message']}")


def demo_statistics():
    """Demonstrate statistics retrieval."""
    print_section("Demo 6: Command Statistics")
    
    command = FactCheckerCommand()
    
    stats = command.get_statistics()
    
    print("Command Statistics:")
    print(json.dumps(stats, indent=2))


def main():
    """Run all demonstrations."""
    print("\n" + "=" * 70)
    print("  FACT CHECKER COMMAND INTERFACE DEMONSTRATION")
    print("=" * 70)
    
    try:
        demo_text_mode()
        demo_video_mode()
        demo_auto_detection()
        demo_custom_parameters()
        demo_error_handling()
        demo_statistics()
        
        print("\n" + "=" * 70)
        print("  All demonstrations completed successfully!")
        print("=" * 70 + "\n")
        
    except Exception as e:
        print(f"\nError during demonstration: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
