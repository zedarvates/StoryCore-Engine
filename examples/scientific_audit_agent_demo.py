"""
Scientific Audit Agent Demo

This script demonstrates the capabilities of the Scientific Audit Agent
for text-based fact verification.
"""

from src.fact_checker import ScientificAuditAgent, Configuration

def demo_basic_analysis():
    """Demonstrates basic text analysis"""
    print("=" * 70)
    print("DEMO 1: Basic Text Analysis")
    print("=" * 70)
    
    agent = ScientificAuditAgent()
    
    text = """
    The speed of light in vacuum is approximately 299,792 kilometers per second.
    This fundamental constant was first accurately measured by Albert Michelson in 1879.
    DNA contains four nucleotide bases: adenine, thymine, guanine, and cytosine.
    The human genome contains approximately 3 billion base pairs.
    """
    
    print(f"\nInput text:\n{text}\n")
    
    report = agent.analyze(text)
    
    print(f"Analysis Results:")
    print(f"  Total claims analyzed: {report.summary_statistics['total_claims']}")
    print(f"  Average confidence: {report.summary_statistics['average_confidence']:.1f}%")
    print(f"  High-risk claims: {report.summary_statistics['high_risk_count']}")
    print(f"  Domains: {', '.join(report.summary_statistics.get('domains_analyzed', []))}")
    
    print(f"\nHuman Summary:")
    print(f"  {report.human_summary}")
    
    print(f"\nDetailed Claims:")
    for i, result in enumerate(report.claims, 1):
        print(f"\n  Claim {i}: {result.claim.text}")
        print(f"    Domain: {result.claim.domain}")
        print(f"    Confidence: {result.confidence:.1f}%")
        print(f"    Risk Level: {result.risk_level.upper()}")
        print(f"    Reasoning: {result.reasoning[:100]}...")


def demo_custom_configuration():
    """Demonstrates custom configuration"""
    print("\n" + "=" * 70)
    print("DEMO 2: Custom Configuration")
    print("=" * 70)
    
    # Create custom configuration with stricter thresholds
    config = Configuration(
        confidence_threshold=80.0,  # Higher threshold
        risk_level_mappings={
            "critical": (0, 40),
            "high": (40, 60),
            "medium": (60, 80),
            "low": (80, 100)
        }
    )
    
    agent = ScientificAuditAgent(config)
    
    text = "The Earth is approximately 4.5 billion years old."
    
    print(f"\nInput text: {text}")
    print(f"Configuration: confidence_threshold={config.confidence_threshold}")
    
    report = agent.analyze(text)
    
    print(f"\nResults with custom configuration:")
    if report.claims:
        result = report.claims[0]
        print(f"  Confidence: {result.confidence:.1f}%")
        print(f"  Risk Level: {result.risk_level.upper()}")
        print(f"  Recommendation: {result.recommendation}")


def demo_batch_processing():
    """Demonstrates batch processing of multiple texts"""
    print("\n" + "=" * 70)
    print("DEMO 3: Batch Processing")
    print("=" * 70)
    
    agent = ScientificAuditAgent()
    
    texts = [
        "Water freezes at 0 degrees Celsius at standard atmospheric pressure.",
        "The mitochondria is the powerhouse of the cell.",
        "The Declaration of Independence was signed in 1776.",
        "Approximately 71% of Earth's surface is covered by water."
    ]
    
    print(f"\nProcessing {len(texts)} texts in batch...\n")
    
    reports = agent.analyze_batch(texts)
    
    for i, (text, report) in enumerate(zip(texts, reports), 1):
        print(f"Text {i}: {text[:60]}...")
        print(f"  Claims: {report.summary_statistics['total_claims']}")
        print(f"  Avg Confidence: {report.summary_statistics['average_confidence']:.1f}%")
        print(f"  Risk: {report.summary_statistics['high_risk_count']} high-risk")
        print()


def demo_report_export():
    """Demonstrates report export in different formats"""
    print("=" * 70)
    print("DEMO 4: Report Export")
    print("=" * 70)
    
    from src.fact_checker import export_report_json, export_report_markdown
    
    agent = ScientificAuditAgent()
    
    text = "The human brain contains approximately 86 billion neurons."
    
    print(f"\nInput text: {text}\n")
    
    report = agent.analyze(text)
    
    # Export as JSON
    json_output = export_report_json(report)
    print("JSON Export (first 200 chars):")
    print(json_output[:200] + "...\n")
    
    # Export as Markdown
    markdown_output = export_report_markdown(report)
    print("Markdown Export (first 300 chars):")
    print(markdown_output[:300] + "...\n")


def demo_agent_statistics():
    """Demonstrates agent statistics and capabilities"""
    print("=" * 70)
    print("DEMO 5: Agent Statistics")
    print("=" * 70)
    
    agent = ScientificAuditAgent()
    
    stats = agent.get_statistics()
    
    print("\nAgent Information:")
    print(f"  Type: {stats['agent_type']}")
    print(f"  Version: {stats['version']}")
    print(f"  Confidence Threshold: {stats['confidence_threshold']}")
    print(f"  Max Concurrent Verifications: {stats['max_concurrent_verifications']}")
    print(f"  Timeout: {stats['timeout_seconds']}s")
    print(f"  Cache Enabled: {stats['cache_enabled']}")
    print(f"  Supported Domains: {', '.join(stats['supported_domains'])}")


def main():
    """Run all demos"""
    print("\n")
    print("╔" + "=" * 68 + "╗")
    print("║" + " " * 15 + "SCIENTIFIC AUDIT AGENT DEMO" + " " * 26 + "║")
    print("╚" + "=" * 68 + "╝")
    print()
    
    demo_basic_analysis()
    demo_custom_configuration()
    demo_batch_processing()
    demo_report_export()
    demo_agent_statistics()
    
    print("\n" + "=" * 70)
    print("All demos completed successfully!")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    main()
