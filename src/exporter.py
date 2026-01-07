"""
Export functionality for StoryCore-Engine projects.
"""

import shutil
from pathlib import Path
from datetime import datetime
import json
from typing import Optional


class Exporter:
    """Handles project export with timestamped snapshots."""
    
    def export_project(self, project_dir: str, export_base: str = "exports") -> str:
        """Export project to timestamped directory."""
        project_path = Path(project_dir)
        export_base_path = Path(export_base)
        
        # Create timestamped export directory
        timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
        export_dir = export_base_path / f"run-{timestamp}"
        export_dir.mkdir(parents=True, exist_ok=True)
        
        # Copy project files if they exist
        self._copy_project_files(project_path, export_dir)
        
        # Generate QA report stub
        self._create_qa_report_stub(export_dir, project_path)
        
        return str(export_dir)
    
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
    
    def _create_qa_report_stub(self, export_dir: Path, project_path: Path) -> None:
        """Generate qa_report.json stub with placeholder data."""
        # Try to read project.json for project_id
        project_id = "unknown_project"
        try:
            with open(project_path / "project.json", 'r') as f:
                project_data = json.load(f)
                project_id = project_data.get("project_id", "unknown_project")
        except (FileNotFoundError, json.JSONDecodeError):
            pass
        
        qa_report = {
            "qa_report_id": f"qa_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            "project_id": project_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "overall_score": 0.0,
            "passed": False,
            "issues": [],
            "categories": {
                "character_continuity": 0.0,
                "palette_consistency": 0.0,
                "lighting_consistency": 0.0,
                "perspective_accuracy": 0.0,
                "audio_sync": 0.0
            },
            "status": "stub_report",
            "note": "This is a placeholder QA report generated during export. Run full QA pipeline to get actual scores."
        }
        
        with open(export_dir / "qa_report.json", "w") as f:
            json.dump(qa_report, f, indent=2)
        
        print("Generated qa_report.json stub")
