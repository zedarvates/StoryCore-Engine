#!/usr/bin/env python3
"""
Generate sample verification reports for the demo package.

This script processes all sample scripts and transcripts to create
example verification reports in JSON and Markdown formats.
"""

import sys
import os
import json
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from fact_checker.fact_checker_command import FactCheckerCommand
from fact_checker.configuration import get_config

def generate_reports():
    """Generate all sample reports."""
    
    # Initialize fact checker with default config
    config = get_config()
    fact_checker = FactCheckerCommand(config)
    
    # Define sample files
    samples = {
        "text": [
            ("climate_science.txt", "climate_science_report"),
            ("historical_claims.txt", "historical_claims_report"),
            ("statistics_claims.txt", "statistics_report"),
        ],
        "video": [
            ("news_interview.txt", "news_interview_report"),
            ("documentary_clean.txt", "documentary_report"),
        ]
    }
    
    # Create output directory
    output_dir = Path(__file__).parent / "sample_reports"
    output_dir.mkdir(exist_ok=True)
    
    print("Generating sample verification reports...")
    print("=" * 60)
    
    # Process text samples
    for filename, report_name in samples["text"]:
        input_path = Path(__file__).parent / "sample_scripts" / filename
        
        if not input_path.exists():
            print(f"⚠️  Skipping {filename} - file not found")
            continue
            
        print(f"\n📄 Processing: {filename}")
        
        with open(input_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        try:
            # Run fact checker in text mode
            result = fact_checker.execute(
                input_data=content,
                mode="text",
                confidence_threshold=70,
                detail_level="detailed"
            )
            
            # Save JSON report
            json_path = output_dir / f"{report_name}.json"
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, default=str)
            print(f"   ✓ Generated: {json_path.name}")
            
            # Save Markdown report
            md_path = output_dir / f"{report_name}.md"
            with open(md_path, 'w', encoding='utf-8') as f:
                f.write(format_markdown_report(result))
            print(f"   ✓ Generated: {md_path.name}")
            
            # Print summary
            if result.get("status") == "success":
                report = result.get("report", {})
                summary = report.get("summary", {})
                print(f"   📊 Claims: {summary.get('total_claims', 0)}")
                print(f"   ⚠️  High Risk: {summary.get('high_risk_count', 0)}")
                print(f"   📈 Avg Confidence: {summary.get('average_confidence', 0):.1f}%")
            
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
    
    # Process video samples
    for filename, report_name in samples["video"]:
        input_path = Path(__file__).parent / "sample_transcripts" / filename
        
        if not input_path.exists():
            print(f"⚠️  Skipping {filename} - file not found")
            continue
            
        print(f"\n🎥 Processing: {filename}")
        
        with open(input_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        try:
            # Run fact checker in video mode
            result = fact_checker.execute(
                input_data=content,
                mode="video",
                confidence_threshold=70,
                detail_level="detailed"
            )
            
            # Save JSON report
            json_path = output_dir / f"{report_name}.json"
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, default=str)
            print(f"   ✓ Generated: {json_path.name}")
            
            # Save Markdown report
            md_path = output_dir / f"{report_name}.md"
            with open(md_path, 'w', encoding='utf-8') as f:
                f.write(format_markdown_report(result))
            print(f"   ✓ Generated: {md_path.name}")
            
            # Print summary
            if result.get("status") == "success":
                report = result.get("report", {})
                print(f"   📊 Coherence: {report.get('coherence_score', 0):.1f}%")
                print(f"   🛡️  Integrity: {report.get('integrity_score', 0):.1f}%")
                print(f"   ⚠️  Risk Level: {report.get('risk_level', 'unknown')}")
                signals = report.get('manipulation_signals', [])
                print(f"   🚨 Manipulation Signals: {len(signals)}")
            
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
    
    print("\n" + "=" * 60)
    print("✅ Report generation complete!")
    print(f"📁 Reports saved to: {output_dir}")

def format_markdown_report(result):
    """Format verification result as Markdown."""
    
    if result.get("status") != "success":
        return f"# Verification Failed\n\nError: {result.get('error', 'Unknown error')}\n"
    
    mode = result.get("mode", "unknown")
    agent = result.get("agent", "unknown")
    report = result.get("report", {})
    summary_text = result.get("summary", "No summary available")
    
    md = f"# Fact-Checking Report\n\n"
    md += f"**Mode**: {mode}\n"
    md += f"**Agent**: {agent}\n"
    md += f"**Processing Time**: {result.get('processing_time_ms', 0):.0f}ms\n"
    md += f"**Cached**: {result.get('cached', False)}\n\n"
    
    md += "---\n\n"
    
    if mode == "text":
        # Text analysis report
        summary = report.get("summary", {})
        md += f"## Summary Statistics\n\n"
        md += f"- **Total Claims**: {summary.get('total_claims', 0)}\n"
        md += f"- **High Risk Claims**: {summary.get('high_risk_count', 0)}\n"
        md += f"- **Average Confidence**: {summary.get('average_confidence', 0):.1f}%\n"
        md += f"- **Domains Analyzed**: {', '.join(summary.get('domains_analyzed', []))}\n\n"
        
        claims = report.get("claims", [])
        if claims:
            md += "## Detailed Claims Analysis\n\n"
            for i, claim in enumerate(claims, 1):
                md += f"### Claim {i}\n\n"
                md += f"**Text**: {claim.get('text', 'N/A')}\n\n"
                md += f"- **Domain**: {claim.get('domain', 'N/A')}\n"
                md += f"- **Confidence**: {claim.get('confidence', 0):.1f}%\n"
                md += f"- **Risk Level**: {claim.get('risk_level', 'N/A')}\n\n"
                
                evidence = claim.get('evidence', [])
                if evidence:
                    md += "**Evidence**:\n"
                    for ev in evidence[:3]:  # Show top 3
                        md += f"- {ev.get('source', 'Unknown')} (Relevance: {ev.get('relevance', 0):.0f}%)\n"
                    md += "\n"
                
                if claim.get('recommendation'):
                    md += f"**Recommendation**: {claim['recommendation']}\n\n"
    
    elif mode == "video":
        # Video analysis report
        md += f"## Analysis Results\n\n"
        md += f"- **Coherence Score**: {report.get('coherence_score', 0):.1f}%\n"
        md += f"- **Integrity Score**: {report.get('integrity_score', 0):.1f}%\n"
        md += f"- **Risk Level**: {report.get('risk_level', 'N/A')}\n\n"
        
        signals = report.get("manipulation_signals", [])
        if signals:
            md += f"## Manipulation Signals ({len(signals)} detected)\n\n"
            for i, signal in enumerate(signals, 1):
                md += f"### Signal {i}: {signal.get('type', 'Unknown')}\n\n"
                md += f"- **Severity**: {signal.get('severity', 'N/A')}\n"
                md += f"- **Timestamp**: {signal.get('timestamp_start', 'N/A')} - {signal.get('timestamp_end', 'N/A')}\n"
                md += f"- **Description**: {signal.get('description', 'N/A')}\n\n"
        
        segments = report.get("problematic_segments", [])
        if segments:
            md += f"## Problematic Segments ({len(segments)} identified)\n\n"
            for i, segment in enumerate(segments, 1):
                md += f"{i}. **{segment.get('timestamp', 'N/A')}**: {segment.get('issue', 'N/A')}\n"
            md += "\n"
    
    md += "---\n\n"
    md += "## Human Summary\n\n"
    md += summary_text + "\n\n"
    
    md += "---\n\n"
    md += "*This report was generated by the StoryCore-Engine Scientific Fact-Checking & Multimedia Anti-Fake System.*\n"
    md += "*Automated verification has limitations. Human review is recommended for critical content.*\n"
    
    return md

if __name__ == "__main__":
    generate_reports()
