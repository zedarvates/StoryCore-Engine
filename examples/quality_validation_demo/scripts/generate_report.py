#!/usr/bin/env python3
"""
Report Generation Script

Generates quality validation reports from validation results.
Usage: python generate_report.py [--format json|html|both]
"""

import sys
import json
from pathlib import Path
from typing import Dict, Any, List

# Add the src directory to the path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "src"))

try:
    from quality_validator import QualityScore, QualityMetric, QualityStandard
    from report_generator import JSONReportGenerator, HTMLReportGenerator
except ImportError as e:
    print(f"Error: Could not import report generation modules: {e}")
    sys.exit(1)


def generate_reports(format_type: str = "both") -> int:
    """Generate quality validation reports."""
    project_dir = Path(__file__).parent.parent
    reports_dir = project_dir / "reports"
    reports_dir.mkdir(exist_ok=True)

    print("Quality Validation Report Generator")
    print("=" * 40)
    print(f"Project: {project_dir.name}")
    print(f"Output directory: {reports_dir}")
    print()

    # Load or create sample quality data
    quality_scores = create_sample_quality_data()

    if not quality_scores:
        print("❌ No quality data available for reporting")
        return 1

    # Initialize generators
    json_generator = JSONReportGenerator()
    html_generator = HTMLReportGenerator()

    generated_files = []

    try:
        # Generate JSON report
        if format_type in ["json", "both"]:
            print("Generating JSON report...")
            json_report = json_generator.generate_comprehensive_report(
                quality_scores,
                project_name=f"Quality Validation Demo - {project_dir.name}"
            )

            json_path = reports_dir / "quality_report.json"
            with open(json_path, 'w', encoding='utf-8') as f:
                f.write(json_report)

            print(f"✓ JSON report saved: {json_path}")
            generated_files.append(json_path)

        # Generate HTML report
        if format_type in ["html", "both"]:
            print("Generating HTML report...")
            html_report = html_generator.generate_comprehensive_report(
                quality_scores,
                project_name=f"Quality Validation Demo - {project_dir.name}",
                include_visualizations=True
            )

            html_path = reports_dir / "quality_report.html"
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(html_report)

            print(f"✓ HTML report saved: {html_path}")
            generated_files.append(html_path)

        # Display summary
        print("\nReport Summary:")
        print("-" * 15)

        # Parse JSON report for summary
        if format_type in ["json", "both"]:
            report_data = json.loads(json_report)
            metrics = report_data['metrics']

            print(f"Total shots evaluated: {metrics['total_shots']}")
            print(f"Pass rate: {metrics['pass_rate']:.1f}%")
            print(f"Average quality score: {metrics['average_overall_score']:.1f}/100")
            print(f"Total issues: {sum(metrics['issues_breakdown'].values())}")

            issues = metrics['issues_breakdown']
            if issues['critical'] > 0 or issues['high'] > 0:
                print("⚠️  Issues requiring attention:")
                if issues['critical'] > 0:
                    print(f"   Critical: {issues['critical']}")
                if issues['high'] > 0:
                    print(f"   High: {issues['high']}")

        print(f"\nFiles generated: {len(generated_files)}")
        for file_path in generated_files:
            print(f"  - {file_path.name}")

        print("\n✅ Report generation completed!")
        return 0

    except Exception as e:
        print(f"❌ Report generation failed: {str(e)}")
        return 1


def create_sample_quality_data() -> List[QualityScore]:
    """Create sample quality scores for demonstration."""
    scores = []

    # Sample video quality scores
    video_scores = [
        {"file": "sample_video.mp4", "score": 85.2, "issues": 1},
        {"file": "promo_clip.mp4", "score": 92.1, "issues": 0},
        {"file": "interview.mp4", "score": 76.8, "issues": 2},
    ]

    for video in video_scores:
        score = QualityScore(
            score=video["score"] / 100.0,  # Convert to 0-1 range
            confidence=0.85,
            metric=QualityMetric.VISUAL_QUALITY,
            standard=QualityStandard.WEB_HD,
            details={
                "file": video["file"],
                "issues_count": video["issues"],
                "sharpness_score": video["score"] * 0.9,
                "motion_score": video["score"] * 0.95,
                "audio_score": 78.5,
                "continuity_score": video["score"] * 0.85
            }
        )
        # Manually set additional attributes for demo
        score.overall_score = video["score"]
        score.sharpness_score = video["score"] * 0.9
        score.motion_score = video["score"] * 0.95
        score.audio_score = 78.5
        score.continuity_score = video["score"] * 0.85
        score.issues = []
        score.suggestions = []

        scores.append(score)

    # Sample audio quality scores (represented as additional video-like scores)
    audio_scores = [
        {"file": "sample_audio.wav", "score": 82.3, "issues": 1},
        {"file": "narration.mp3", "score": 88.7, "issues": 0},
    ]

    for audio in audio_scores:
        score = QualityScore(
            score=audio["score"] / 100.0,
            confidence=0.80,
            metric=QualityMetric.VISUAL_QUALITY,  # Using same metric for demo
            standard=QualityStandard.WEB_HD,
            details={
                "file": audio["file"],
                "issues_count": audio["issues"],
                "voice_clarity": audio["score"] * 0.95,
                "metallic_issues": audio["issues"],
                "audio_score": audio["score"]
            }
        )
        # Set demo attributes
        score.overall_score = audio["score"]
        score.sharpness_score = 75.0
        score.motion_score = 80.0
        score.audio_score = audio["score"]
        score.continuity_score = 85.0
        score.issues = []
        score.suggestions = []

        scores.append(score)

    return scores


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Generate quality validation reports")
    parser.add_argument(
        "--format",
        choices=["json", "html", "both"],
        default="both",
        help="Report format (default: both)"
    )

    args = parser.parse_args()
    return generate_reports(args.format)


if __name__ == "__main__":
    sys.exit(main())