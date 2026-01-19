#!/usr/bin/env python3
"""
Quality Validation Demo Script

This script demonstrates comprehensive quality validation of video and audio content
using the StoryCore quality validation system. It shows how to:
- Validate media files
- Assess quality metrics
- Generate reports
- Handle validation results
"""

import sys
import json
import argparse
from pathlib import Path
from typing import Dict, Any, List
import logging

# Add the src directory to the path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

try:
    from quality_validator import QualityValidator, ValidationMode, QualityStandard
    from report_generator import JSONReportGenerator, HTMLReportGenerator
except ImportError as e:
    print(f"Error: Could not import quality validation modules: {e}")
    print("Please ensure StoryCore is properly installed.")
    sys.exit(1)


class QualityValidationDemo:
    """Demonstration of quality validation functionality."""

    def __init__(self, project_path: Path, debug: bool = False):
        self.project_path = project_path
        self.debug = debug

        # Set up logging
        log_level = logging.DEBUG if debug else logging.INFO
        logging.basicConfig(level=log_level, format='%(levelname)s: %(message)s')
        self.logger = logging.getLogger(__name__)

        # Create reports directory
        self.reports_dir = project_path / "reports"
        self.reports_dir.mkdir(exist_ok=True)

        # Initialize validators and generators
        self.validator = QualityValidator(
            mode=ValidationMode.BATCH,
            quality_standard=QualityStandard.WEB_HD
        )
        self.json_generator = JSONReportGenerator()
        self.html_generator = HTMLReportGenerator()

    def run_demo(self) -> int:
        """Run the complete quality validation demo."""
        print("Quality Validation Demo")
        print("=" * 40)
        print(f"Project: {self.project_path.name}")
        print()

        try:
            # Step 1: Discover media files
            media_files = self._discover_media_files()
            if not media_files:
                print("❌ No media files found for validation")
                return 1

            print(f"Found {len(media_files['videos'])} video(s) and {len(media_files['audios'])} audio(s)")
            print()

            # Step 2: Validate files
            validation_results = self._validate_files(media_files)

            # Step 3: Run quality assessment
            quality_results = self._assess_quality(media_files)

            # Step 4: Generate reports
            self._generate_reports(quality_results)

            # Step 5: Display summary
            self._display_summary(validation_results, quality_results)

            print("\n✅ Demo completed successfully!")
            return 0

        except Exception as e:
            self.logger.error(f"Demo failed: {str(e)}")
            if self.debug:
                import traceback
                traceback.print_exc()
            return 1

    def _discover_media_files(self) -> Dict[str, List[Path]]:
        """Discover video and audio files in the project."""
        video_extensions = {'.mp4', '.avi', '.mov', '.mkv', '.webm'}
        audio_extensions = {'.wav', '.mp3', '.flac', '.aac', '.ogg'}

        videos = []
        audios = []

        for file_path in self.project_path.rglob('*'):
            if file_path.is_file():
                ext = file_path.suffix.lower()
                if ext in video_extensions:
                    videos.append(file_path)
                elif ext in audio_extensions:
                    audios.append(file_path)

        return {'videos': videos, 'audios': audios}

    def _validate_files(self, media_files: Dict[str, List[Path]]) -> Dict[str, Any]:
        """Validate media file formats and readability."""
        results = {'videos': [], 'audios': []}

        print("File Validation:")
        print("-" * 20)

        # Validate videos
        for video_path in media_files['videos']:
            is_valid, error_msg = self.validator.validate_video_file(video_path)
            status = "✓ PASS" if is_valid else "❌ FAIL"
            print(f"{status} {video_path.name}: {'OK' if is_valid else error_msg}")
            results['videos'].append({
                'path': video_path,
                'valid': is_valid,
                'error': error_msg if not is_valid else None
            })

        # Validate audios
        for audio_path in media_files['audios']:
            is_valid, error_msg = self.validator.validate_audio_file(audio_path)
            status = "✓ PASS" if is_valid else "❌ FAIL"
            print(f"{status} {audio_path.name}: {'OK' if is_valid else error_msg}")
            results['audios'].append({
                'path': audio_path,
                'valid': is_valid,
                'error': error_msg if not is_valid else None
            })

        print()
        return results

    def _assess_quality(self, media_files: Dict[str, List[Path]]) -> List[Any]:
        """Run quality assessment on valid media files."""
        quality_scores = []

        print("Quality Assessment:")
        print("-" * 20)

        # For demo purposes, we'll create synthetic quality data
        # In a real scenario, you would load and analyze actual media frames

        # Simulate video quality assessment
        for video_file in media_files['videos']:
            # Create synthetic frames for demonstration
            synthetic_frames = self._create_synthetic_frames()
            assessment = self.validator.assess_quality(synthetic_frames)

            quality_scores.append({
                'type': 'video',
                'file': video_file.name,
                'score': assessment.overall_score,
                'issues': len(assessment.detected_issues),
                'assessment': assessment
            })

            status = "✓ PASS" if assessment.passes_standard else "⚠️  FAIL"
            print(f"{status} {video_file.name}: {assessment.overall_score:.1f}/100 "
                  f"({len(assessment.detected_issues)} issues)")

        # Simulate audio quality assessment
        for audio_file in media_files['audios']:
            # Create synthetic audio for demonstration
            synthetic_audio = self._create_synthetic_audio()
            audio_result = self.validator.analyze_voice_quality(synthetic_audio)

            quality_scores.append({
                'type': 'audio',
                'file': audio_file.name,
                'score': audio_result['quality_score'],
                'issues': len(audio_result['issues']),
                'assessment': audio_result
            })

            passed = audio_result['quality_score'] >= 70.0
            status = "✓ PASS" if passed else "⚠️  FAIL"
            print(f"{status} {audio_file.name}: {audio_result['quality_score']:.1f}/100 "
                  f"({len(audio_result['issues'])} issues)")

        print()
        return quality_scores

    def _create_synthetic_frames(self) -> List[List[List[int]]]:
        """Create synthetic video frames for demonstration."""
        import numpy as np

        # Create a few synthetic frames (very simple colored rectangles)
        frames = []
        for i in range(3):
            # Create a 100x100 RGB frame
            frame = np.zeros((100, 100, 3), dtype=np.uint8)

            # Add some variation to simulate real content
            frame[:, :, 0] = 100 + i * 20  # Blue channel
            frame[:, :, 1] = 150 + i * 10  # Green channel
            frame[:, :, 2] = 200 - i * 15  # Red channel

            frames.append(frame.tolist())

        return frames

    def _create_synthetic_audio(self) -> Dict[str, Any]:
        """Create synthetic audio data for demonstration."""
        import numpy as np

        sample_rate = 22050
        duration = 1.0
        length = int(sample_rate * duration)

        # Create a simple sine wave (representing voice)
        t = np.linspace(0, duration, length, endpoint=False)
        frequency = 220  # A3 note
        audio_data = 0.5 * np.sin(2 * np.pi * frequency * t)

        # Add some noise to make it more realistic
        noise = 0.05 * np.random.normal(0, 1, length)
        audio_data += noise

        return {
            'data': audio_data.astype(np.float32),
            'rate': sample_rate
        }

    def _generate_reports(self, quality_results: List[Dict[str, Any]]) -> None:
        """Generate JSON and HTML reports."""
        print("Report Generation:")
        print("-" * 20)

        # Convert results to QualityScore objects for reporting
        quality_scores = []
        for result in quality_results:
            if result['type'] == 'video':
                # Create a mock QualityScore for video
                from quality_validator import QualityScore, QualityMetric
                score = QualityScore(
                    score=result['score'] / 100.0,  # Convert to 0-1 range
                    confidence=0.8,
                    metric=QualityMetric.VISUAL_QUALITY,
                    standard=self.validator.quality_standard,
                    details={
                        'file': result['file'],
                        'issues_count': result['issues']
                    }
                )
                quality_scores.append(score)

        if quality_scores:
            # Generate JSON report
            json_report = self.json_generator.generate_comprehensive_report(
                quality_scores,
                project_name=f"Quality Demo - {self.project_path.name}"
            )

            json_path = self.reports_dir / "quality_report.json"
            with open(json_path, 'w') as f:
                f.write(json_report)
            print(f"✓ JSON report: {json_path}")

            # Generate HTML report
            html_report = self.html_generator.generate_comprehensive_report(
                quality_scores,
                project_name=f"Quality Demo - {self.project_path.name}"
            )

            html_path = self.reports_dir / "quality_report.html"
            with open(html_path, 'w') as f:
                f.write(html_report)
            print(f"✓ HTML report: {html_path}")
        else:
            print("ℹ️  No quality data to report")

        print()

    def _display_summary(self, validation_results: Dict[str, Any],
                        quality_results: List[Dict[str, Any]]) -> None:
        """Display validation summary."""
        print("Summary:")
        print("-" * 10)

        total_files = len(validation_results['videos']) + len(validation_results['audios'])
        valid_files = sum(1 for v in validation_results['videos'] if v['valid']) + \
                     sum(1 for a in validation_results['audios'] if a['valid'])

        total_scores = [r['score'] for r in quality_results]
        avg_score = sum(total_scores) / len(total_scores) if total_scores else 0

        passed_quality = sum(1 for r in quality_results if r['score'] >= 70.0)
        total_issues = sum(r['issues'] for r in quality_results)

        print(f"Files validated: {valid_files}/{total_files}")
        print(f"Average quality score: {avg_score:.1f}/100")
        print(f"Quality checks passed: {passed_quality}/{len(quality_results)}")
        print(f"Total issues detected: {total_issues}")

        if avg_score >= 70.0 and valid_files == total_files:
            print("\n🎉 All validations passed!")
        else:
            print("\n⚠️  Some validations failed - check reports for details")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Quality Validation Demo")
    parser.add_argument("--debug", action="store_true", help="Enable debug logging")
    parser.add_argument("--project", default=".", help="Project directory path")

    args = parser.parse_args()

    project_path = Path(args.project).resolve()
    if not project_path.exists():
        print(f"Error: Project directory not found: {project_path}")
        return 1

    demo = QualityValidationDemo(project_path, args.debug)
    return demo.run_demo()


if __name__ == "__main__":
    sys.exit(main())