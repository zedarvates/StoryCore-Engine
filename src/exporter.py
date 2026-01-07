"""
Export functionality for StoryCore-Engine projects.
"""

import shutil
from pathlib import Path
from datetime import datetime
import json
from typing import Optional
from qa_engine import QAEngine


class Exporter:
    """Handles project export with timestamped snapshots and QA scoring."""
    
    def __init__(self):
        self.qa_engine = QAEngine()
    
    def export_project(self, project_dir: str, export_base: str = "exports") -> str:
        """Export project to timestamped directory with QA scoring."""
        project_path = Path(project_dir)
        export_base_path = Path(export_base)
        
        # Create timestamped export directory
        timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
        export_dir = export_base_path / f"run-{timestamp}"
        export_dir.mkdir(parents=True, exist_ok=True)
        
        # Run QA scoring
        print("Running QA scoring...")
        qa_report = self.qa_engine.run_qa_scoring(str(project_path))
        
        # Update project status based on QA results
        self._update_project_status(project_path, qa_report)
        
        # Copy project files if they exist
        self._copy_project_files(project_path, export_dir)
        
        # Save QA report
        self._save_qa_report(export_dir, qa_report)
        
        # Print QA summary
        self._print_qa_summary(qa_report)
        
        return str(export_dir)
    
    def _update_project_status(self, project_path: Path, qa_report: dict) -> None:
        """Update project.json status fields based on QA results."""
        project_file = project_path / "project.json"
        if not project_file.exists():
            return
        
        try:
            with open(project_file, 'r') as f:
                project_data = json.load(f)
            
            # Update status fields
            project_data["status"]["qa_passed"] = qa_report["passed"]
            project_data["status"]["last_qa_report_id"] = qa_report["qa_report_id"]
            project_data["status"]["current_phase"] = "qa_completed" if qa_report["passed"] else "qa_failed"
            project_data["updated_at"] = datetime.utcnow().isoformat() + "Z"
            
            # Write back to file
            with open(project_file, 'w') as f:
                json.dump(project_data, f, indent=2)
            
            print("Updated project status based on QA results")
            
        except (json.JSONDecodeError, KeyError) as e:
            print(f"Warning: Could not update project status: {e}")
    
    def _copy_project_files(self, project_path: Path, export_dir: Path) -> None:
        """Copy project.json and storyboard.json to export directory."""
        files_to_copy = ["project.json", "storyboard.json"]
        
        for filename in files_to_copy:
            source_file = project_path / filename
            if source_file.exists():
                shutil.copy2(source_file, export_dir / filename)
                print(f"Copied {filename} to export")
            else:
                print(f"Warning: {filename} not found, skipping")
    
    def _save_qa_report(self, export_dir: Path, qa_report: dict) -> None:
        """Save QA report to export directory."""
        with open(export_dir / "qa_report.json", "w") as f:
            json.dump(qa_report, f, indent=2)
        print("Generated qa_report.json with scoring results")
    
    def _print_qa_summary(self, qa_report: dict) -> None:
        """Print QA scoring summary."""
        print(f"\nQA Scoring Results:")
        print(f"Overall Score: {qa_report['overall_score']:.1f}/5.0")
        print(f"Status: {'PASSED' if qa_report['passed'] else 'FAILED'}")
        
        if qa_report.get("categories"):
            print("\nCategory Scores:")
            for category, score in qa_report["categories"].items():
                status = "✓" if score >= 3.0 else "✗"
                print(f"  {status} {category.replace('_', ' ').title()}: {score:.1f}/5.0")
        
        if qa_report.get("issues"):
            print(f"\nIssues Found: {len(qa_report['issues'])}")
            for issue in qa_report["issues"][:3]:  # Show first 3 issues
                print(f"  - {issue['description']}")
            if len(qa_report["issues"]) > 3:
                print(f"  ... and {len(qa_report['issues']) - 3} more issues")
