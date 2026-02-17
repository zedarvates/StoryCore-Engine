"""
Validate command handler - Validate project structure, configuration, and quality.
"""

import argparse
import json
from pathlib import Path
from typing import Dict, Any, List

from ..base import BaseHandler
from ..errors import UserError, SystemError


class ValidateHandler(BaseHandler):
    """Handler for the validate command - project and quality validation."""

    command_name = "validate"
    description = "Validate project structure, configuration, and quality"

    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up validate command arguments."""
        parser.add_argument(
            "--project",
            default=".",
            help="Project directory to validate (default: current directory)"
        )

        parser.add_argument(
            "--scope",
            nargs="+",
            choices=["structure", "config", "quality", "visual", "audio"],
            default=["structure", "config"],
            help="Validation scope (default: structure, config). Multiple scopes can be specified."
        )

        parser.add_argument(
            "--quality-threshold",
            type=float,
            default=70.0,
            help="Quality score threshold for pass/fail (default: 70.0)"
        )

        parser.add_argument(
            "--format",
            choices=["human", "json"],
            default="human",
            help="Output format (default: human)"
        )

        parser.add_argument(
            "--strict",
            action="store_true",
            help="Enable strict validation mode"
        )

        parser.add_argument(
            "--fix",
            action="store_true",
            help="Attempt to fix validation issues automatically"
        )
    
    def execute(self, args: argparse.Namespace) -> int:
        """Execute the validate command."""
        try:
            # Validate project path
            project_path = Path(args.project)
            if not project_path.exists():
                raise UserError(
                    f"Project directory not found: {project_path}",
                    "Check the project path or create a new project with 'storycore init'"
                )

            # Determine validation scopes
            scopes = args.scope if isinstance(args.scope, list) else [args.scope]
            quality_scopes = [s for s in scopes if s in ["quality", "visual", "audio"]]
            structure_scopes = [s for s in scopes if s in ["structure", "config"]]

            # Initialize results
            validation_results = {
                "project": str(project_path.absolute()),
                "scopes": scopes,
                "structure_validation": {},
                "quality_validation": {},
                "overall_passed": True,
                "exit_code": 0
            }

            # Run structure/config validation if requested
            if structure_scopes:
                try:
                    from validator import Validator, ValidationError
                    validator = Validator()
                    results = validator.validate_project_directory(str(project_path))

                    # Process results
                    all_passed = True
                    failed_validations = []

                    for filename, result in results.items():
                        if result is True:
                            validation_results["structure_validation"][filename] = {"status": "passed"}
                        else:
                            validation_results["structure_validation"][filename] = {"status": "failed", "error": str(result)}
                            all_passed = False
                            failed_validations.append((filename, result))

                    if not all_passed:
                        validation_results["overall_passed"] = False
                        validation_results["exit_code"] = 1

                except ImportError as e:
                    raise SystemError(
                        f"Validator not available: {e}",
                        "Ensure validator module is installed"
                    )

            # Run quality validation if requested
            if quality_scopes:
                quality_result = self._run_quality_validation(project_path, quality_scopes, args.quality_threshold)
                validation_results["quality_validation"] = quality_result["results"]

                if not quality_result["passed"]:
                    validation_results["overall_passed"] = False
                    validation_results["exit_code"] = 1

            # Output results
            if args.format == "json":
                print(json.dumps(validation_results, indent=2))
            else:
                self._print_human_results(validation_results, args)

            # Attempt fixes if requested and there are failures
            if args.fix and not validation_results["overall_passed"]:
                if structure_scopes:
                    print("\nAttempting to fix structure validation issues...")
                    # Reuse existing fix logic for structure issues
                    failed_validations = [
                        (filename, details.get("error", "Unknown error"))
                        for filename, details in validation_results["structure_validation"].items()
                        if details.get("status") == "failed"
                    ]
                    if failed_validations:
                        fixed_count = self._attempt_fixes(project_path, failed_validations)
                        if fixed_count > 0:
                            print(f"[SUCCESS] Fixed {fixed_count} structure issue(s)")
                            print("Run validation again to verify fixes")

                if quality_scopes:
                    print("\nAttempting to fix quality validation issues...")
                    # Quality fixes would be more complex, placeholder for now
                    print("Quality fixes not yet implemented")

            return validation_results["exit_code"]

        except Exception as e:
            return self.handle_error(e, "validation")
    
    def _run_quality_validation(self, project_path: Path, scopes: List[str], threshold: float) -> Dict[str, Any]:
        """Run quality validation for the specified scopes."""
        try:
            from quality_validator import QualityValidator, ValidationMode
        except ImportError as e:
            return {
                "passed": False,
                "results": {"error": f"QualityValidator not available: {e}"}
            }

        results = {}
        overall_passed = True

        # Determine validation mode based on scopes
        mode = ValidationMode.BATCH if "quality" in scopes else ValidationMode.REAL_TIME
        validator = QualityValidator(mode)

        # Validate visual quality if requested
        if "visual" in scopes or "quality" in scopes:
            visual_results = self._validate_visual_quality(project_path, validator)
            results["visual"] = visual_results
            if not visual_results.get("passed", True):
                overall_passed = False

        # Validate audio quality if requested
        if "audio" in scopes or "quality" in scopes:
            audio_results = self._validate_audio_quality(project_path, validator)
            results["audio"] = audio_results
            if not audio_results.get("passed", True):
                overall_passed = False

        return {
            "passed": overall_passed,
            "results": results
        }

    def _validate_visual_quality(self, project_path: Path, validator: 'QualityValidator') -> Dict[str, Any]:
        """Validate visual quality of video files in the project."""
        # Look for video files in the project
        video_files = (list(project_path.glob("**/*.mp4")) +
                      list(project_path.glob("**/*.avi")) +
                      list(project_path.glob("**/*.mov")) +
                      list(project_path.glob("**/*.mkv")) +
                      list(project_path.glob("**/*.webm")))

        if not video_files:
            return {"status": "no_videos", "message": "No video files found for visual validation"}

        total_files = len(video_files)
        valid_files = 0
        invalid_files = []
        errors = []

        for video_file in video_files:
            try:
                is_valid, error_msg = validator.validate_video_file(video_file)
                if is_valid:
                    valid_files += 1
                else:
                    invalid_files.append(str(video_file))
                    errors.append(f"{video_file}: {error_msg}")
            except Exception as e:
                invalid_files.append(str(video_file))
                errors.append(f"{video_file}: Unexpected error - {str(e)}")

        passed = len(invalid_files) == 0

        result = {
            "passed": passed,
            "videos_checked": total_files,
            "valid_videos": valid_files,
            "invalid_videos": len(invalid_files),
            "message": f"Visual validation completed: {valid_files}/{total_files} videos valid"
        }

        if not passed:
            result["errors"] = errors
            result["message"] += f". Errors: {len(errors)} files had issues."

        return result

    def _validate_audio_quality(self, project_path: Path, validator: 'QualityValidator') -> Dict[str, Any]:
        """Validate audio quality of audio files in the project."""
        # Look for audio files in the project
        audio_files = (list(project_path.glob("**/*.wav")) +
                      list(project_path.glob("**/*.mp3")) +
                      list(project_path.glob("**/*.flac")) +
                      list(project_path.glob("**/*.aac")) +
                      list(project_path.glob("**/*.ogg")))

        if not audio_files:
            return {"status": "no_audio", "message": "No audio files found for audio validation"}

        total_files = len(audio_files)
        valid_files = 0
        invalid_files = []
        errors = []

        for audio_file in audio_files:
            try:
                is_valid, error_msg = validator.validate_audio_file(audio_file)
                if is_valid:
                    valid_files += 1
                else:
                    invalid_files.append(str(audio_file))
                    errors.append(f"{audio_file}: {error_msg}")
            except Exception as e:
                invalid_files.append(str(audio_file))
                errors.append(f"{audio_file}: Unexpected error - {str(e)}")

        passed = len(invalid_files) == 0

        result = {
            "passed": passed,
            "audio_files_checked": total_files,
            "valid_audio_files": valid_files,
            "invalid_audio_files": len(invalid_files),
            "message": f"Audio validation completed: {valid_files}/{total_files} files valid"
        }

        if not passed:
            result["errors"] = errors
            result["message"] += f". Errors: {len(errors)} files had issues."

        return result

    def _print_human_results(self, results: Dict[str, Any], args: argparse.Namespace) -> None:
        """Print human-readable validation results."""
        print(f"Validating project in: {results['project']}")
        print(f"Validation scopes: {', '.join(results['scopes'])}")
        print()

        # Print structure validation results
        if results.get("structure_validation"):
            print("Structure/Config Validation:")
            for filename, result in results["structure_validation"].items():
                if result["status"] == "passed":
                    print(f"[PASS] {filename}: PASSED")
                else:
                    print(f"[FAIL] {filename}: {result.get('error', 'FAILED')}")
            print()

        # Print quality validation results
        if results.get("quality_validation"):
            print("Quality Validation:")
            quality_results = results["quality_validation"]

            # Visual quality
            if "visual" in quality_results:
                visual = quality_results["visual"]
                if visual.get("passed", True):
                    print(f"[PASS] Visual quality: PASSED ({visual.get('message', '')})")
                else:
                    print(f"[FAIL] Visual quality: FAILED ({visual.get('message', '')})")

            # Audio quality
            if "audio" in quality_results:
                audio = quality_results["audio"]
                if audio.get("passed", True):
                    print(f"[PASS] Audio quality: PASSED ({audio.get('message', '')})")
                else:
                    print(f"[FAIL] Audio quality: FAILED ({audio.get('message', '')})")
            print()

        # Print overall result
        if results["overall_passed"]:
            print("SUCCESS: All validations passed!")
        else:
            print("FAILURE: Some validations failed")

    def _attempt_fixes(self, project_path: Path, failed_validations: list) -> int:
        """Attempt to automatically fix validation issues."""
        fixed_count = 0

        for filename, error_message in failed_validations:
            try:
                # Attempt common fixes
                if "not found" in error_message.lower():
                    # Try to create missing file or directory
                    target_path = project_path / filename
                    if not target_path.exists():
                        if filename.endswith('/'):
                            target_path.mkdir(parents=True, exist_ok=True)
                            print(f"  Created directory: {filename}")
                            fixed_count += 1
                        else:
                            # Create empty file with basic structure
                            target_path.parent.mkdir(parents=True, exist_ok=True)
                            target_path.touch()
                            print(f"  Created file: {filename}")
                            fixed_count += 1

            except Exception as e:
                self.logger.warning(f"Failed to fix {filename}: {e}")

        return fixed_count
