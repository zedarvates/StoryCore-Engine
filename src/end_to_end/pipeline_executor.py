"""
Pipeline Executor - Execute complete StoryCore pipeline.

This module implements the PipelineExecutor class that orchestrates the execution
of the complete StoryCore pipeline from grid generation through final export.
"""

import asyncio
import json
import subprocess
import sys
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from .data_models import ProjectComponents


class PipelineStep(Enum):
    """Pipeline execution steps."""
    GRID = "grid"
    PROMOTE = "promote"
    REFINE = "refine"
    QA = "qa"
    AUTOFIX = "autofix"
    VIDEO_PLAN = "video_plan"
    EXPORT = "export"


class VideoValidationError(Exception):
    """Exception raised when video validation fails."""
    pass


@dataclass
class StepResult:
    """Result of a single pipeline step execution."""
    step: PipelineStep
    success: bool
    output: str
    error: Optional[str] = None
    duration_seconds: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class PipelineResult:
    """Result of complete pipeline execution."""
    success: bool
    video_path: Optional[Path] = None
    qa_report: Optional[Dict[str, Any]] = None
    step_results: List[StepResult] = field(default_factory=list)
    total_duration_seconds: float = 0.0
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


class PipelineExecutor:
    """
    Execute the complete StoryCore pipeline.
    
    This class orchestrates the execution of all pipeline steps from grid generation
    through final export, with support for QA validation and automatic fixing.
    """
    
    def __init__(self, storycore_cli_path: Optional[str] = None):
        """
        Initialize pipeline executor.
        
        Args:
            storycore_cli_path: Path to storycore CLI (default: auto-detect)
        """
        self.storycore_cli_path = self._find_storycore_cli(storycore_cli_path)
        self.step_results: List[StepResult] = []
        
    def _find_storycore_cli(self, cli_path: Optional[str]) -> Path:
        """
        Find the storycore CLI executable.
        
        Args:
            cli_path: Optional explicit path to CLI
            
        Returns:
            Path to storycore CLI
            
        Raises:
            FileNotFoundError: If CLI cannot be found
        """
        if cli_path:
            path = Path(cli_path)
            if path.exists():
                return path
            raise FileNotFoundError(f"StoryCore CLI not found at: {cli_path}")
        
        # Try common locations
        candidates = [
            Path("storycore.py"),
            Path(__file__).parent.parent.parent / "storycore.py",
            Path.cwd() / "storycore.py",
        ]
        
        for candidate in candidates:
            if candidate.exists():
                return candidate
        
        raise FileNotFoundError(
            "StoryCore CLI not found. Please specify path with storycore_cli_path parameter."
        )
    
    async def execute_step(
        self,
        step: PipelineStep,
        project_path: Path,
        **kwargs
    ) -> StepResult:
        """
        Execute a single pipeline step.
        
        Args:
            step: Pipeline step to execute
            project_path: Path to project directory
            **kwargs: Additional arguments for the step
            
        Returns:
            StepResult with execution details
        """
        start_time = datetime.now()
        
        try:
            # Build command based on step
            cmd = self._build_command(step, project_path, **kwargs)
            
            # Execute command
            result = await self._run_command(cmd)
            
            # Calculate duration
            duration = (datetime.now() - start_time).total_seconds()
            
            # Parse output for metadata
            metadata = self._parse_step_output(step, result.stdout)
            
            return StepResult(
                step=step,
                success=result.returncode == 0,
                output=result.stdout,
                error=result.stderr if result.returncode != 0 else None,
                duration_seconds=duration,
                metadata=metadata
            )
            
        except Exception as e:
            duration = (datetime.now() - start_time).total_seconds()
            return StepResult(
                step=step,
                success=False,
                output="",
                error=str(e),
                duration_seconds=duration
            )
    
    def _build_command(
        self,
        step: PipelineStep,
        project_path: Path,
        **kwargs
    ) -> List[str]:
        """
        Build CLI command for a pipeline step.
        
        Args:
            step: Pipeline step
            project_path: Project directory path
            **kwargs: Additional step arguments
            
        Returns:
            Command as list of strings
        """
        # Base command
        cmd = [sys.executable, str(self.storycore_cli_path), step.value]
        
        # Add project path
        cmd.extend(["--project", str(project_path)])
        
        # Add step-specific arguments
        if step == PipelineStep.GRID:
            grid_spec = kwargs.get("grid", "3x3")
            cmd.extend(["--grid", grid_spec])
            if "cell_size" in kwargs:
                cmd.extend(["--cell-size", str(kwargs["cell_size"])])
                
        elif step == PipelineStep.PROMOTE:
            scale = kwargs.get("scale", 2)
            method = kwargs.get("method", "lanczos")
            cmd.extend(["--scale", str(scale), "--method", method])
            
        elif step == PipelineStep.REFINE:
            mode = kwargs.get("mode", "unsharp")
            strength = kwargs.get("strength", 1.0)
            cmd.extend(["--mode", mode, "--strength", str(strength)])
            
        elif step == PipelineStep.QA:
            threshold = kwargs.get("threshold", 3.0)
            cmd.extend(["--threshold", str(threshold)])
            if kwargs.get("detailed", False):
                cmd.append("--detailed")
                
        elif step == PipelineStep.EXPORT:
            if "output" in kwargs:
                cmd.extend(["--output", str(kwargs["output"])])
            export_format = kwargs.get("format", "zip")
            cmd.extend(["--format", export_format])
        
        return cmd
    
    async def _run_command(self, cmd: List[str]) -> subprocess.CompletedProcess:
        """
        Run a CLI command asynchronously.
        
        Args:
            cmd: Command to execute
            
        Returns:
            CompletedProcess with results
        """
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        return subprocess.CompletedProcess(
            args=cmd,
            returncode=process.returncode,
            stdout=stdout.decode('utf-8', errors='replace'),
            stderr=stderr.decode('utf-8', errors='replace')
        )
    
    def _parse_step_output(self, step: PipelineStep, output: str) -> Dict[str, Any]:
        """
        Parse step output for metadata.
        
        Args:
            step: Pipeline step
            output: Command output
            
        Returns:
            Metadata dictionary
        """
        metadata = {}
        
        # Extract common patterns
        lines = output.split('\n')
        for line in lines:
            # Look for key-value patterns
            if ':' in line:
                parts = line.split(':', 1)
                if len(parts) == 2:
                    key = parts[0].strip().lower().replace(' ', '_')
                    value = parts[1].strip()
                    metadata[key] = value
        
        # Step-specific parsing
        if step == PipelineStep.QA:
            metadata.update(self._parse_qa_output(output))
        elif step == PipelineStep.AUTOFIX:
            metadata.update(self._parse_autofix_output(output))
        
        return metadata
    
    def _parse_qa_output(self, output: str) -> Dict[str, Any]:
        """
        Parse QA step output for detailed results.
        
        Args:
            output: QA command output
            
        Returns:
            QA metadata dictionary
        """
        qa_data = {
            "overall_score": 0.0,
            "passed": False,
            "issues": [],
            "categories": {}
        }
        
        lines = output.split('\n')
        for line in lines:
            # Parse overall score
            if "Overall Score:" in line:
                try:
                    score_str = line.split(':')[1].strip().split('/')[0]
                    qa_data["overall_score"] = float(score_str)
                except (ValueError, IndexError):
                    pass
            
            # Parse status
            if "Status:" in line:
                qa_data["passed"] = "PASSED" in line
            
            # Parse issues
            if line.strip().startswith('-'):
                issue = line.strip()[1:].strip()
                if issue:
                    qa_data["issues"].append(issue)
            
            # Parse category scores
            if "✓" in line or "✗" in line:
                parts = line.split(':')
                if len(parts) == 2:
                    category = parts[0].strip().replace('✓', '').replace('✗', '').strip()
                    try:
                        score_str = parts[1].strip().split('/')[0]
                        qa_data["categories"][category] = float(score_str)
                    except (ValueError, IndexError):
                        pass
        
        return qa_data
    
    def _parse_autofix_output(self, output: str) -> Dict[str, Any]:
        """
        Parse autofix step output for results.
        
        Args:
            output: Autofix command output
            
        Returns:
            Autofix metadata dictionary
        """
        autofix_data = {
            "fixes_applied": 0,
            "improvements": []
        }
        
        lines = output.split('\n')
        for line in lines:
            # Count fixes
            if "fix" in line.lower() and "applied" in line.lower():
                try:
                    # Try to extract number
                    words = line.split()
                    for word in words:
                        if word.isdigit():
                            autofix_data["fixes_applied"] = int(word)
                            break
                except ValueError:
                    pass
            
            # Track improvements
            if "improved" in line.lower() or "enhanced" in line.lower():
                autofix_data["improvements"].append(line.strip())
        
        return autofix_data
    
    async def execute_full_pipeline(
        self,
        project_path: Path,
        progress_callback: Optional[Callable[[PipelineStep, float], None]] = None,
        **step_kwargs
    ) -> PipelineResult:
        """
        Execute the complete pipeline from grid to export.
        
        Args:
            project_path: Path to project directory
            progress_callback: Optional callback for progress updates (step, progress_percent)
            **step_kwargs: Additional arguments for specific steps
            
        Returns:
            PipelineResult with complete execution details
        """
        start_time = datetime.now()
        self.step_results = []
        errors = []
        warnings = []
        
        # Define pipeline steps
        steps = [
            PipelineStep.GRID,
            PipelineStep.PROMOTE,
            PipelineStep.REFINE,
            PipelineStep.QA,
            PipelineStep.VIDEO_PLAN,
            PipelineStep.EXPORT
        ]
        
        total_steps = len(steps)
        
        try:
            for i, step in enumerate(steps):
                # Report progress
                if progress_callback:
                    progress_percent = (i / total_steps) * 100
                    progress_callback(step, progress_percent)
                
                # Get step-specific kwargs
                step_args = step_kwargs.get(step.value, {})
                
                # Execute step
                result = await self.execute_step(step, project_path, **step_args)
                self.step_results.append(result)
                
                # Check for failure
                if not result.success:
                    errors.append(f"{step.value} failed: {result.error}")
                    # Don't continue if critical step fails
                    if step in [PipelineStep.GRID, PipelineStep.PROMOTE]:
                        break
                
                # Check for warnings in output
                if "warning" in result.output.lower():
                    warnings.append(f"{step.value}: {result.output}")
            
            # Report final progress
            if progress_callback:
                progress_callback(PipelineStep.EXPORT, 100.0)
            
            # Calculate total duration
            total_duration = (datetime.now() - start_time).total_seconds()
            
            # Find video path from export step
            video_path = None
            export_result = next(
                (r for r in self.step_results if r.step == PipelineStep.EXPORT),
                None
            )
            
            # Validate final export
            if export_result and export_result.success:
                export_validation = await self.validate_final_export(
                    project_path,
                    export_result
                )
                
                if export_validation["video_found"] and export_validation["video_valid"]:
                    video_path = Path(export_validation["video_path"])
                
                # Add validation errors and warnings
                if export_validation["errors"]:
                    errors.extend(export_validation["errors"])
                if export_validation["warnings"]:
                    warnings.extend(export_validation["warnings"])
            
            # Get QA report
            qa_report = None
            qa_result = next(
                (r for r in self.step_results if r.step == PipelineStep.QA),
                None
            )
            if qa_result and qa_result.success:
                qa_report = qa_result.metadata
            
            # Determine overall success
            success = len(errors) == 0 and all(r.success for r in self.step_results)
            
            return PipelineResult(
                success=success,
                video_path=video_path,
                qa_report=qa_report,
                step_results=self.step_results,
                total_duration_seconds=total_duration,
                errors=errors,
                warnings=warnings
            )
            
        except Exception as e:
            total_duration = (datetime.now() - start_time).total_seconds()
            errors.append(f"Pipeline execution failed: {str(e)}")
            
            return PipelineResult(
                success=False,
                step_results=self.step_results,
                total_duration_seconds=total_duration,
                errors=errors,
                warnings=warnings
            )
    
    async def execute_with_autofix(
        self,
        project_path: Path,
        max_iterations: int = 3,
        qa_threshold: float = 3.0,
        progress_callback: Optional[Callable[[PipelineStep, float], None]] = None
    ) -> PipelineResult:
        """
        Execute pipeline with automatic QA and autofix loop.
        
        This method runs the pipeline and automatically retries with autofix
        if QA validation fails, up to max_iterations times.
        
        Args:
            project_path: Path to project directory
            max_iterations: Maximum number of autofix iterations
            qa_threshold: Minimum acceptable QA score
            progress_callback: Optional callback for progress updates
            
        Returns:
            PipelineResult with complete execution details
        """
        iteration = 0
        last_result = None
        autofix_history = []
        
        while iteration < max_iterations:
            # Execute pipeline up to QA
            result = await self._execute_until_qa(
                project_path,
                qa_threshold,
                progress_callback
            )
            
            last_result = result
            
            # Check QA result
            qa_result = next(
                (r for r in result.step_results if r.step == PipelineStep.QA),
                None
            )
            
            if not qa_result:
                # QA step didn't run, can't continue
                result.errors.append("QA step did not execute")
                break
            
            # Check if QA passed based on threshold
            qa_score = qa_result.metadata.get("overall_score", 0.0)
            qa_passed = qa_result.metadata.get("passed", False)
            
            if qa_passed and qa_score >= qa_threshold:
                # QA passed, continue with rest of pipeline
                final_result = await self._execute_remaining_steps(
                    project_path,
                    result,
                    progress_callback
                )
                
                # Add autofix history to result
                if autofix_history:
                    final_result.metadata = {
                        "autofix_iterations": len(autofix_history),
                        "autofix_history": autofix_history
                    }
                
                return final_result
            
            # QA failed, try autofix
            iteration += 1
            
            if iteration < max_iterations:
                # Execute autofix
                autofix_result = await self.execute_step(
                    PipelineStep.AUTOFIX,
                    project_path
                )
                result.step_results.append(autofix_result)
                
                # Track autofix attempt
                autofix_history.append({
                    "iteration": iteration,
                    "qa_score_before": qa_score,
                    "fixes_applied": autofix_result.metadata.get("fixes_applied", 0),
                    "success": autofix_result.success
                })
                
                if not autofix_result.success:
                    # Autofix failed, can't continue
                    result.errors.append(
                        f"Autofix failed on iteration {iteration}: {autofix_result.error}"
                    )
                    break
                
                # Re-run QA to check if autofix improved quality
                qa_recheck_result = await self.execute_step(
                    PipelineStep.QA,
                    project_path,
                    threshold=qa_threshold
                )
                result.step_results.append(qa_recheck_result)
                
                if qa_recheck_result.success:
                    new_qa_score = qa_recheck_result.metadata.get("overall_score", 0.0)
                    autofix_history[-1]["qa_score_after"] = new_qa_score
                    
                    # Check if quality improved
                    if new_qa_score <= qa_score:
                        result.warnings.append(
                            f"Autofix iteration {iteration} did not improve quality "
                            f"(score: {qa_score:.1f} → {new_qa_score:.1f})"
                        )
            else:
                # Max iterations reached
                result.errors.append(
                    f"QA validation failed after {max_iterations} autofix attempts "
                    f"(final score: {qa_score:.1f}, threshold: {qa_threshold})"
                )
                break
        
        # Max iterations reached or autofix failed
        if last_result:
            if autofix_history:
                last_result.metadata = {
                    "autofix_iterations": len(autofix_history),
                    "autofix_history": autofix_history
                }
            return last_result
        
        # Shouldn't reach here, but return empty result
        return PipelineResult(
            success=False,
            errors=["Pipeline execution failed to start"]
        )
    
    async def _execute_until_qa(
        self,
        project_path: Path,
        qa_threshold: float,
        progress_callback: Optional[Callable[[PipelineStep, float], None]]
    ) -> PipelineResult:
        """Execute pipeline steps up to and including QA."""
        steps = [
            PipelineStep.GRID,
            PipelineStep.PROMOTE,
            PipelineStep.REFINE,
            PipelineStep.QA
        ]
        
        step_kwargs = {
            PipelineStep.QA.value: {"threshold": qa_threshold}
        }
        
        return await self._execute_steps(steps, project_path, progress_callback, step_kwargs)
    
    async def _execute_remaining_steps(
        self,
        project_path: Path,
        previous_result: PipelineResult,
        progress_callback: Optional[Callable[[PipelineStep, float], None]]
    ) -> PipelineResult:
        """Execute remaining pipeline steps after QA passes."""
        steps = [
            PipelineStep.VIDEO_PLAN,
            PipelineStep.EXPORT
        ]
        
        result = await self._execute_steps(steps, project_path, progress_callback)
        
        # Merge with previous results
        result.step_results = previous_result.step_results + result.step_results
        result.total_duration_seconds += previous_result.total_duration_seconds
        result.errors.extend(previous_result.errors)
        result.warnings.extend(previous_result.warnings)
        
        return result
    
    async def _execute_steps(
        self,
        steps: List[PipelineStep],
        project_path: Path,
        progress_callback: Optional[Callable[[PipelineStep, float], None]],
        step_kwargs: Optional[Dict[str, Dict[str, Any]]] = None
    ) -> PipelineResult:
        """Execute a list of pipeline steps."""
        start_time = datetime.now()
        step_results = []
        errors = []
        warnings = []
        
        if step_kwargs is None:
            step_kwargs = {}
        
        total_steps = len(steps)
        
        for i, step in enumerate(steps):
            if progress_callback:
                progress_percent = (i / total_steps) * 100
                progress_callback(step, progress_percent)
            
            # Get step-specific kwargs
            kwargs = step_kwargs.get(step.value, {})
            
            result = await self.execute_step(step, project_path, **kwargs)
            step_results.append(result)
            
            if not result.success:
                errors.append(f"{step.value} failed: {result.error}")
                # Stop on critical failures
                if step in [PipelineStep.GRID, PipelineStep.PROMOTE]:
                    break
        
        total_duration = (datetime.now() - start_time).total_seconds()
        success = len(errors) == 0 and all(r.success for r in step_results)
        
        return PipelineResult(
            success=success,
            step_results=step_results,
            total_duration_seconds=total_duration,
            errors=errors,
            warnings=warnings
        )

    
    def validate_video_file(self, video_path: Path) -> Dict[str, Any]:
        """
        Validate that a video file exists and is readable.
        
        Args:
            video_path: Path to video file
            
        Returns:
            Validation result dictionary
            
        Raises:
            VideoValidationError: If validation fails
        """
        validation_result = {
            "exists": False,
            "readable": False,
            "size_bytes": 0,
            "format": None,
            "playable": False,
            "errors": []
        }
        
        # Check if file exists
        if not video_path.exists():
            validation_result["errors"].append(f"Video file not found: {video_path}")
            raise VideoValidationError(f"Video file not found: {video_path}")
        
        validation_result["exists"] = True
        
        # Check if file is readable
        try:
            with open(video_path, 'rb') as f:
                # Try to read first few bytes
                header = f.read(12)
                if len(header) < 12:
                    validation_result["errors"].append("Video file is too small")
                    raise VideoValidationError("Video file is too small")
            
            validation_result["readable"] = True
        except IOError as e:
            validation_result["errors"].append(f"Cannot read video file: {e}")
            raise VideoValidationError(f"Cannot read video file: {e}")
        
        # Get file size
        validation_result["size_bytes"] = video_path.stat().st_size
        
        # Check minimum size (at least 1KB)
        if validation_result["size_bytes"] < 1024:
            validation_result["errors"].append(
                f"Video file is too small: {validation_result['size_bytes']} bytes"
            )
            raise VideoValidationError("Video file is suspiciously small")
        
        # Detect format from extension
        validation_result["format"] = video_path.suffix.lower()
        
        # Basic format validation
        valid_formats = ['.mp4', '.avi', '.mov', '.mkv', '.webm']
        if validation_result["format"] not in valid_formats:
            validation_result["errors"].append(
                f"Unsupported video format: {validation_result['format']}"
            )
        
        # Try to verify it's a valid video file by checking magic bytes
        try:
            with open(video_path, 'rb') as f:
                magic = f.read(12)
                
                # Check for common video file signatures
                is_valid_video = False
                
                # MP4/MOV (ftyp)
                if b'ftyp' in magic:
                    is_valid_video = True
                # AVI (RIFF...AVI)
                elif magic.startswith(b'RIFF') and b'AVI' in magic:
                    is_valid_video = True
                # WebM/MKV (EBML)
                elif magic.startswith(b'\x1a\x45\xdf\xa3'):
                    is_valid_video = True
                
                if is_valid_video:
                    validation_result["playable"] = True
                else:
                    validation_result["errors"].append(
                        "File does not appear to be a valid video (invalid magic bytes)"
                    )
        except Exception as e:
            validation_result["errors"].append(f"Error checking video format: {e}")
        
        # If we have errors, raise exception
        if validation_result["errors"] and not validation_result["playable"]:
            raise VideoValidationError(
                f"Video validation failed: {'; '.join(validation_result['errors'])}"
            )
        
        return validation_result
    
    def verify_playback(self, video_path: Path) -> Dict[str, Any]:
        """
        Verify that a video file can be played back.
        
        This performs basic checks without requiring external video libraries.
        For full verification, external tools like ffprobe would be needed.
        
        Args:
            video_path: Path to video file
            
        Returns:
            Playback verification result
        """
        verification_result = {
            "can_open": False,
            "has_content": False,
            "estimated_valid": False,
            "warnings": []
        }
        
        try:
            # Basic file opening check
            with open(video_path, 'rb') as f:
                # Read first chunk
                chunk = f.read(1024)
                if len(chunk) > 0:
                    verification_result["can_open"] = True
                    verification_result["has_content"] = True
                
                # Seek to middle and read
                file_size = video_path.stat().st_size
                if file_size > 2048:
                    f.seek(file_size // 2)
                    middle_chunk = f.read(1024)
                    if len(middle_chunk) > 0:
                        verification_result["estimated_valid"] = True
                    else:
                        verification_result["warnings"].append(
                            "File appears to have no content in the middle"
                        )
                else:
                    verification_result["warnings"].append(
                        "File is very small, may not be a complete video"
                    )
        
        except Exception as e:
            verification_result["warnings"].append(f"Error during playback verification: {e}")
        
        return verification_result
    
    async def validate_final_export(
        self,
        project_path: Path,
        export_result: StepResult
    ) -> Dict[str, Any]:
        """
        Validate the final export result.
        
        Args:
            project_path: Path to project directory
            export_result: Result from export step
            
        Returns:
            Validation result dictionary
        """
        validation = {
            "export_successful": export_result.success,
            "video_found": False,
            "video_valid": False,
            "video_playable": False,
            "video_path": None,
            "video_size_mb": 0.0,
            "errors": [],
            "warnings": []
        }
        
        if not export_result.success:
            validation["errors"].append("Export step failed")
            return validation
        
        # Try to find video file
        video_path = None
        
        # Check export metadata for video path
        if "export_location" in export_result.metadata:
            export_dir = Path(export_result.metadata["export_location"])
            if export_dir.exists():
                # Look for video files
                video_files = list(export_dir.glob("*.mp4"))
                video_files.extend(export_dir.glob("*.avi"))
                video_files.extend(export_dir.glob("*.mov"))
                
                if video_files:
                    video_path = video_files[0]
                    validation["video_found"] = True
                    validation["video_path"] = str(video_path)
        
        # Also check project exports directory
        if not video_path:
            exports_dir = project_path / "exports"
            if exports_dir.exists():
                video_files = list(exports_dir.glob("**/*.mp4"))
                if video_files:
                    # Get most recent
                    video_path = max(video_files, key=lambda p: p.stat().st_mtime)
                    validation["video_found"] = True
                    validation["video_path"] = str(video_path)
        
        if not video_path:
            validation["errors"].append("No video file found in export")
            return validation
        
        # Validate video file
        try:
            file_validation = self.validate_video_file(video_path)
            validation["video_valid"] = file_validation["playable"]
            validation["video_size_mb"] = file_validation["size_bytes"] / (1024 * 1024)
            
            if file_validation["errors"]:
                validation["errors"].extend(file_validation["errors"])
        
        except VideoValidationError as e:
            validation["errors"].append(str(e))
            return validation
        
        # Verify playback
        try:
            playback_verification = self.verify_playback(video_path)
            validation["video_playable"] = playback_verification["estimated_valid"]
            
            if playback_verification["warnings"]:
                validation["warnings"].extend(playback_verification["warnings"])
        
        except Exception as e:
            validation["warnings"].append(f"Playback verification failed: {e}")
        
        return validation
