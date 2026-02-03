"""
Output Manager for ComfyUI Integration Tests

This module provides functionality for organizing test outputs, generating reports,
and managing file organization for ComfyUI integration test results.

Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
"""

import json
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional


class OutputManager:
    """Manages test output organization and report generation."""
    
    def __init__(self, output_dir: Path):
        """
        Initialize output manager.
        
        Args:
            output_dir: Base directory for test outputs
        
        Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.current_run_dir: Optional[Path] = None
    
    def create_timestamped_directory(self) -> Path:
        """
        Create a timestamped subdirectory for organizing outputs.
        
        Returns:
            Path to the created timestamped directory
        
        Requirements: 9.1
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        timestamped_dir = self.output_dir / timestamp
        timestamped_dir.mkdir(parents=True, exist_ok=True)
        self.current_run_dir = timestamped_dir
        return timestamped_dir
    
    def generate_filename(self, test_name: str, extension: str, 
                         timestamp: Optional[str] = None) -> str:
        """
        Generate descriptive filename with test name and timestamp.
        
        Args:
            test_name: Name of the test (e.g., 'flux_turbo_image_generation')
            extension: File extension without dot (e.g., 'png', 'mp4')
            timestamp: Optional timestamp string, generates new one if not provided
        
        Returns:
            Filename in format: {test_name}_{timestamp}.{extension}
        
        Requirements: 9.2
        """
        if timestamp is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"{test_name}_{timestamp}.{extension}"
    
    def save_output(self, source_path: Path, test_name: str, 
                   test_type: str, output_type: str = "output") -> Path:
        """
        Copy output file to organized directory structure.
        
        Args:
            source_path: Path to the source file to save
            test_name: Name of the test
            test_type: Type of test ('image', 'video', 'pipeline')
            output_type: Type of output ('output', 'intermediate', 'debug')
        
        Returns:
            Path to the saved file
        
        Requirements: 9.1, 9.2, 9.4
        """
        if self.current_run_dir is None:
            self.create_timestamped_directory()
        
        # Create type-specific subdirectory
        type_dir = self.current_run_dir / test_type
        type_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate filename with timestamp
        extension = source_path.suffix.lstrip('.')
        timestamp = self.current_run_dir.name  # Use run directory timestamp
        filename = self.generate_filename(test_name, extension, timestamp)
        
        # Copy file to destination
        dest_path = type_dir / filename
        shutil.copy2(source_path, dest_path)
        
        return dest_path
    
    def generate_report(self, test_results: List[Dict[str, Any]], 
                       config: Dict[str, Any]) -> Path:
        """
        Generate JSON test report with metadata, parameters, and results.
        
        Args:
            test_results: List of test result dictionaries
            config: Test configuration dictionary
        
        Returns:
            Path to the generated report file
        
        Requirements: 9.3
        """
        if self.current_run_dir is None:
            self.create_timestamped_directory()
        
        # Calculate summary statistics
        total_tests = len(test_results)
        passed = sum(1 for r in test_results if r.get('success', False))
        failed = total_tests - passed
        total_duration = sum(r.get('duration', 0) for r in test_results)
        
        # Build report structure
        report = {
            "test_run_id": self.current_run_dir.name,
            "timestamp": datetime.now().isoformat(),
            "config": config,
            "tests": test_results,
            "summary": {
                "total_tests": total_tests,
                "passed": passed,
                "failed": failed,
                "total_duration": total_duration
            }
        }
        
        # Save report
        report_path = self.current_run_dir / "test_report.json"
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        return report_path
    
    def organize_by_type(self, files: Dict[str, Path], 
                        test_types: Dict[str, str]) -> Dict[str, Path]:
        """
        Organize multiple test outputs by test type.
        
        Args:
            files: Dictionary mapping test names to file paths
            test_types: Dictionary mapping test names to test types
        
        Returns:
            Dictionary mapping test names to organized file paths
        
        Requirements: 9.4
        """
        organized_files = {}
        
        for test_name, file_path in files.items():
            test_type = test_types.get(test_name, 'unknown')
            
            if file_path.exists():
                organized_path = self.save_output(
                    file_path, 
                    test_name, 
                    test_type
                )
                organized_files[test_name] = organized_path
        
        return organized_files
    
    def log_output_path(self, file_path: Path, description: str = "") -> None:
        """
        Log the full path to an output file.
        
        Args:
            file_path: Path to the output file
            description: Optional description of the file
        
        Requirements: 9.5
        """
        abs_path = file_path.absolute()
        if description:
            print(f"[OUTPUT] {description}: {abs_path}")
        else:
            print(f"[OUTPUT] {abs_path}")
    
    def get_current_run_dir(self) -> Optional[Path]:
        """
        Get the current run directory.
        
        Returns:
            Path to current run directory or None if not created yet
        """
        return self.current_run_dir
    
    def cleanup_old_runs(self, keep_last_n: int = 10) -> None:
        """
        Clean up old test run directories, keeping only the most recent ones.
        
        Args:
            keep_last_n: Number of recent runs to keep
        """
        # Get all timestamped directories
        run_dirs = sorted(
            [d for d in self.output_dir.iterdir() if d.is_dir()],
            key=lambda d: d.name,
            reverse=True
        )
        
        # Remove old directories
        for old_dir in run_dirs[keep_last_n:]:
            shutil.rmtree(old_dir)
            print(f"[CLEANUP] Removed old run directory: {old_dir}")
