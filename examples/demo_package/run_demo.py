#!/usr/bin/env python3
"""
Interactive Demo for Scientific Fact-Checking & Multimedia Anti-Fake System

This demo showcases all major capabilities of the fact-checking system:
1. Text fact-checking (Scientific Audit Agent)
2. Video transcript analysis (Anti-Fake Video Agent)
3. Batch processing
4. Caching and performance
5. Pipeline integration

Run with: python examples/demo_package/run_demo.py
"""

import sys
import os
import time
from pathlib import Path
from typing import Optional

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from fact_checker.fact_checker_command import FactCheckerCommand
from fact_checker.configuration import get_config
from fact_checker.batch_processing import BatchProcessor

# ANSI color codes for terminal output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def print_header(text):
    """Print a formatted header."""
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'=' * 70}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text.center(70)}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'=' * 70}{Colors.ENDC}\n")

def print_section(text):
    """Print a formatted section header."""
    print(f"\n{Colors.CYAN}{Colors.BOLD}{text}{Colors.ENDC}")
    print(f"{Colors.CYAN}{'-' * len(text)}{Colors.ENDC}")

def print_success(text):
    """Print success message."""
    print(f"{Colors.GREEN}✓ {text}{Colors.ENDC}")

def print_warning(text):
    """Print warning message."""
    print(f"{Colors.YELLOW}⚠ {text}{Colors.ENDC}")

def print_error(text):
    """Print error message."""
    print(f"{Colors.RED}✗ {text}{Colors.ENDC}")

def print_info(text):
    """Print info message."""
    print(f"{Colors.BLUE}ℹ {text}{Colors.ENDC}")

def wait_for_user():
    """Wait for user to press Enter."""
    input(f"\n{Colors.BOLD}Press Enter to continue...{Colors.ENDC}")

def demo_text_analysis(fact_checker: FactCheckerCommand):
    """Demonstrate text fact-checking capabilities."""
    print_header("DEMO 1: Scientific Fact-Checking (Text Analysis)")
    
    print_info("This demo analyzes a climate science documentary script.")
    print_info("The system will:")
    print("  • Extract factual claims from the text")
    print("  • Classify claims by domain (physics, statistics, etc.)")
    print("  • Evaluate scientific validity")
    print("  • Assign confidence scores and risk levels")
    print("  • Provide evidence-based recommendations")
    
    wait_for_user()
    
    # Load sample script
    script_path = Path(__file__).parent / "sample_scripts" / "climate_science.txt"
    
    if not script_path.exists():
        print_error(f"Sample script not found: {script_path}")
        return
    
    with open(script_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    print_section("Input Preview")
    print(content[:500] + "...\n")
    print_info(f"Total length: {len(content)} characters, ~{len(content.split())} words")
    
    wait_for_user()
    
    print_section("Running Analysis...")
    start_time = time.time()
    
    try:
        result = fact_checker.execute(
            input_data=content,
            mode="text",
            confidence_threshold=70,
            detail_level="detailed"
        )
        
        elapsed = time.time() - start_time
        
        if result.get("status") == "success":
            print_success(f"Analysis completed in {elapsed:.2f} seconds")
            
            report = result.get("report", {})
            summary = report.get("summary", {})
            
            print_section("Results Summary")
            print(f"  Total Claims Extracted: {Colors.BOLD}{summary.get('total_claims', 0)}{Colors.ENDC}")
            print(f"  High Risk Claims: {Colors.BOLD}{summary.get('high_risk_count', 0)}{Colors.ENDC}")
            print(f"  Average Confidence: {Colors.BOLD}{summary.get('average_confidence', 0):.1f}%{Colors.ENDC}")
            print(f"  Domains Analyzed: {Colors.BOLD}{', '.join(summary.get('domains_analyzed', []))}{Colors.ENDC}")
            
            # Show sample claims
            claims = report.get("claims", [])
            if claims:
                print_section("Sample Claims (showing first 3)")
                for i, claim in enumerate(claims[:3], 1):
                    confidence = claim.get('confidence', 0)
                    risk = claim.get('risk_level', 'unknown')
                    
                    # Color code by risk level
                    if risk == 'low':
                        risk_color = Colors.GREEN
                    elif risk == 'medium':
                        risk_color = Colors.YELLOW
                    else:
                        risk_color = Colors.RED
                    
                    print(f"\n  {Colors.BOLD}Claim {i}:{Colors.ENDC}")
                    print(f"    Text: {claim.get('text', 'N/A')[:100]}...")
                    print(f"    Domain: {claim.get('domain', 'N/A')}")
                    print(f"    Confidence: {confidence:.1f}%")
                    print(f"    Risk Level: {risk_color}{risk}{Colors.ENDC}")
            
            # Show human summary
            print_section("Human-Readable Summary")
            print(result.get("summary", "No summary available"))
            
        else:
            print_error(f"Analysis failed: {result.get('error', 'Unknown error')}")
    
    except Exception as e:
        print_error(f"Error during analysis: {str(e)}")

def demo_video_analysis(fact_checker: FactCheckerCommand):
    """Demonstrate video transcript analysis capabilities."""
    print_header("DEMO 2: Anti-Fake Video Analysis (Transcript Analysis)")
    
    print_info("This demo analyzes a news interview transcript for manipulation signals.")
    print_info("The system will:")
    print("  • Detect logical inconsistencies")
    print("  • Identify emotional manipulation patterns")
    print("  • Analyze narrative bias")
    print("  • Calculate coherence and integrity scores")
    print("  • Identify problematic segments with timestamps")
    
    wait_for_user()
    
    # Load sample transcript
    transcript_path = Path(__file__).parent / "sample_transcripts" / "news_interview.txt"
    
    if not transcript_path.exists():
        print_error(f"Sample transcript not found: {transcript_path}")
        return
    
    with open(transcript_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    print_section("Input Preview")
    print(content[:500] + "...\n")
    print_info(f"Total length: {len(content)} characters, ~{len(content.split())} words")
    
    wait_for_user()
    
    print_section("Running Analysis...")
    start_time = time.time()
    
    try:
        result = fact_checker.execute(
            input_data=content,
            mode="video",
            confidence_threshold=70,
            detail_level="detailed"
        )
        
        elapsed = time.time() - start_time
        
        if result.get("status") == "success":
            print_success(f"Analysis completed in {elapsed:.2f} seconds")
            
            report = result.get("report", {})
            
            print_section("Results Summary")
            coherence = report.get('coherence_score', 0)
            integrity = report.get('integrity_score', 0)
            risk = report.get('risk_level', 'unknown')
            
            # Color code scores
            coherence_color = Colors.GREEN if coherence >= 70 else Colors.YELLOW if coherence >= 50 else Colors.RED
            integrity_color = Colors.GREEN if integrity >= 70 else Colors.YELLOW if integrity >= 50 else Colors.RED
            
            print(f"  Coherence Score: {coherence_color}{coherence:.1f}%{Colors.ENDC}")
            print(f"  Integrity Score: {integrity_color}{integrity:.1f}%{Colors.ENDC}")
            print(f"  Risk Level: {Colors.BOLD}{risk}{Colors.ENDC}")
            
            # Show manipulation signals
            signals = report.get("manipulation_signals", [])
            if signals:
                print_section(f"Manipulation Signals Detected ({len(signals)} total)")
                for i, signal in enumerate(signals[:5], 1):  # Show first 5
                    print(f"\n  {Colors.BOLD}Signal {i}: {signal.get('type', 'Unknown')}{Colors.ENDC}")
                    print(f"    Severity: {signal.get('severity', 'N/A')}")
                    print(f"    Timestamp: {signal.get('timestamp_start', 'N/A')} - {signal.get('timestamp_end', 'N/A')}")
                    print(f"    Description: {signal.get('description', 'N/A')[:100]}...")
            
            # Show problematic segments
            segments = report.get("problematic_segments", [])
            if segments:
                print_section(f"Problematic Segments ({len(segments)} identified)")
                for i, segment in enumerate(segments[:5], 1):  # Show first 5
                    print(f"  {i}. [{segment.get('timestamp', 'N/A')}] {segment.get('issue', 'N/A')}")
            
            # Show human summary
            print_section("Human-Readable Summary")
            print(result.get("summary", "No summary available"))
            
        else:
            print_error(f"Analysis failed: {result.get('error', 'Unknown error')}")
    
    except Exception as e:
        print_error(f"Error during analysis: {str(e)}")

def demo_batch_processing(fact_checker: FactCheckerCommand):
    """Demonstrate batch processing capabilities."""
    print_header("DEMO 3: Batch Processing")
    
    print_info("This demo processes multiple documents in parallel.")
    print_info("Features demonstrated:")
    print("  • Parallel processing with configurable concurrency")
    print("  • Progress tracking")
    print("  • Aggregate statistics")
    
    wait_for_user()
    
    # Prepare batch items
    sample_dir = Path(__file__).parent / "sample_scripts"
    items = []
    
    for script_file in sample_dir.glob("*.txt"):
        with open(script_file, 'r', encoding='utf-8') as f:
            items.append({
                "id": script_file.stem,
                "content": f.read()
            })
    
    if not items:
        print_warning("No sample scripts found for batch processing")
        return
    
    print_section(f"Processing {len(items)} documents")
    for item in items:
        print(f"  • {item['id']}")
    
    wait_for_user()
    
    print_section("Running Batch Analysis...")
    start_time = time.time()
    
    try:
        # Create batch processor
        batch_processor = BatchProcessor(max_workers=3)
        
        # Define process function
        def process_item(content: str) -> Dict[str, Any]:
            return fact_checker.execute(
                input_data=content,
                mode="text",
                confidence_threshold=70
            )
        
        # Process batch
        result = batch_processor.process_batch(items, process_item)
        
        elapsed = time.time() - start_time
        
        print_success(f"Batch processing completed in {elapsed:.2f} seconds")
        
        # Show aggregate statistics
        print_section("Aggregate Statistics")
        total_claims = 0
        total_high_risk = 0
        avg_confidence_sum = 0
        success_count = 0
        
        for batch_item in result.items:
            if batch_item.status == "completed" and batch_item.result:
                item_result = batch_item.result
                if item_result.get("status") == "success":
                    success_count += 1
                    report = item_result.get("report", {})
                    summary = report.get("summary", {})
                    total_claims += summary.get("total_claims", 0)
                    total_high_risk += summary.get("high_risk_count", 0)
                    avg_confidence_sum += summary.get("average_confidence", 0)
        
        print(f"  Documents Processed: {Colors.BOLD}{success_count}/{len(items)}{Colors.ENDC}")
        print(f"  Total Claims: {Colors.BOLD}{total_claims}{Colors.ENDC}")
        print(f"  Total High Risk: {Colors.BOLD}{total_high_risk}{Colors.ENDC}")
        if success_count > 0:
            print(f"  Overall Avg Confidence: {Colors.BOLD}{avg_confidence_sum/success_count:.1f}%{Colors.ENDC}")
        print(f"  Processing Speed: {Colors.BOLD}{elapsed/len(items):.2f}s per document{Colors.ENDC}")
        
    except Exception as e:
        print_error(f"Error during batch processing: {str(e)}")

def demo_caching(fact_checker: FactCheckerCommand):
    """Demonstrate caching capabilities."""
    print_header("DEMO 4: Caching and Performance")
    
    print_info("This demo shows how caching improves performance for repeated content.")
    print_info("The same content will be analyzed twice:")
    print("  • First run: Full analysis (no cache)")
    print("  • Second run: Cached result (< 1 second)")
    
    wait_for_user()
    
    # Use a short sample for quick demo
    sample_text = """
    The Earth orbits the Sun at an average distance of 93 million miles, 
    completing one orbit in approximately 365.25 days. This orbital period 
    defines our calendar year. The Moon orbits Earth at an average distance 
    of 238,855 miles, completing one orbit in about 27.3 days.
    """
    
    print_section("Sample Text")
    print(sample_text)
    
    wait_for_user()
    
    # First run (no cache)
    print_section("First Run (No Cache)")
    start_time = time.time()
    
    try:
        result1 = fact_checker.execute(
            input_data=sample_text,
            mode="text",
            confidence_threshold=70
        )
        
        elapsed1 = time.time() - start_time
        cached1 = result1.get("cached", False)
        
        print_success(f"Completed in {elapsed1:.3f} seconds")
        print_info(f"Cached: {cached1}")
        
        if result1.get("status") == "success":
            report = result1.get("report", {})
            summary = report.get("summary", {})
            print_info(f"Claims found: {summary.get('total_claims', 0)}")
        
        # Second run (should be cached)
        print_section("Second Run (Should Use Cache)")
        start_time = time.time()
        
        result2 = fact_checker.execute(
            input_data=sample_text,
            mode="text",
            confidence_threshold=70
        )
        
        elapsed2 = time.time() - start_time
        cached2 = result2.get("cached", False)
        
        print_success(f"Completed in {elapsed2:.3f} seconds")
        print_info(f"Cached: {cached2}")
        
        # Show performance improvement
        if cached2:
            speedup = elapsed1 / elapsed2 if elapsed2 > 0 else float('inf')
            print_section("Performance Improvement")
            print(f"  First run: {elapsed1:.3f}s")
            print(f"  Second run: {elapsed2:.3f}s")
            print(f"  {Colors.GREEN}{Colors.BOLD}Speedup: {speedup:.1f}x faster{Colors.ENDC}")
        else:
            print_warning("Cache was not used (caching may be disabled)")
        
    except Exception as e:
        print_error(f"Error during caching demo: {str(e)}")

def demo_pipeline_integration():
    """Demonstrate pipeline integration concepts."""
    print_header("DEMO 5: StoryCore Pipeline Integration")
    
    print_info("This demo explains how the fact-checker integrates with StoryCore-Engine.")
    print_info("Integration features:")
    print("  • Automatic verification at pipeline stages")
    print("  • Non-blocking asynchronous execution")
    print("  • High-risk warning events")
    print("  • Data Contract v1 storage")
    
    wait_for_user()
    
    print_section("Pipeline Hook Points")
    print(f"""
  {Colors.BOLD}1. before_generate{Colors.ENDC}
     Verify script content before generating visuals
     Use case: Catch factual errors early in the pipeline
     
  {Colors.BOLD}2. after_generate{Colors.ENDC}
     Verify generated content and metadata
     Use case: Quality assurance after generation
     
  {Colors.BOLD}3. on_publish{Colors.ENDC}
     Final verification before publishing
     Use case: Mandatory check with blocking option
    """)
    
    wait_for_user()
    
    print_section("Configuration Example")
    print("""
  {
    "fact_checker": {
      "enabled": true,
      "hooks": {
        "before_generate": {
          "enabled": true,
          "mode": "text",
          "blocking": false,
          "on_high_risk": "warn"
        },
        "on_publish": {
          "enabled": true,
          "mode": "auto",
          "blocking": true,
          "require_approval": true
        }
      }
    }
  }
    """)
    
    wait_for_user()
    
    print_section("Integration Benefits")
    print(f"""
  {Colors.GREEN}✓{Colors.ENDC} Seamless integration with existing workflows
  {Colors.GREEN}✓{Colors.ENDC} No manual intervention required
  {Colors.GREEN}✓{Colors.ENDC} Automatic quality assurance
  {Colors.GREEN}✓{Colors.ENDC} Audit trail in Data Contract v1
  {Colors.GREEN}✓{Colors.ENDC} Configurable blocking/warning behavior
    """)

def main():
    """Run the interactive demo."""
    print_header("Scientific Fact-Checking & Multimedia Anti-Fake System")
    print_header("Interactive Demo")
    
    print(f"""
{Colors.BOLD}Welcome to the Fact-Checking System Demo!{Colors.ENDC}

This interactive demonstration will showcase the key capabilities of the
Scientific Fact-Checking & Multimedia Anti-Fake System for StoryCore-Engine.

The demo includes:
  1. Text Fact-Checking (Scientific Audit Agent)
  2. Video Transcript Analysis (Anti-Fake Video Agent)
  3. Batch Processing
  4. Caching and Performance
  5. Pipeline Integration

Each demo section will explain the feature, show it in action, and display
the results. You can proceed at your own pace.
    """)
    
    wait_for_user()
    
    # Initialize fact checker
    print_section("Initializing Fact-Checking System...")
    try:
        config = get_config()
        fact_checker = FactCheckerCommand(config)
        print_success("System initialized successfully")
    except Exception as e:
        print_error(f"Failed to initialize system: {str(e)}")
        return
    
    # Run demos
    try:
        demo_text_analysis(fact_checker)
        wait_for_user()
        
        demo_video_analysis(fact_checker)
        wait_for_user()
        
        demo_batch_processing(fact_checker)
        wait_for_user()
        
        demo_caching(fact_checker)
        wait_for_user()
        
        demo_pipeline_integration()
        
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}Demo interrupted by user{Colors.ENDC}")
        return
    except Exception as e:
        print_error(f"Unexpected error: {str(e)}")
        return
    
    # Conclusion
    print_header("Demo Complete!")
    print(f"""
{Colors.GREEN}{Colors.BOLD}Thank you for exploring the Fact-Checking System!{Colors.ENDC}

{Colors.BOLD}Next Steps:{Colors.ENDC}
  • Review the generated sample reports in: examples/demo_package/sample_reports/
  • Read the documentation: src/fact_checker/README.md
  • Check the integration guide: src/fact_checker/PIPELINE_INTEGRATION_GUIDE.md
  • Try the CLI: python -m fact_checker.cli --help

{Colors.BOLD}For More Information:{Colors.ENDC}
  • Design Document: .kiro/specs/fact-checking-system/design.md
  • Requirements: .kiro/specs/fact-checking-system/requirements.md
  • Implementation Status: src/fact_checker/IMPLEMENTATION_STATUS.md

{Colors.CYAN}Questions or feedback? Check the documentation or contact the development team.{Colors.ENDC}
    """)

if __name__ == "__main__":
    main()
