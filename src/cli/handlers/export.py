"""
Export command handler - Export projects with assets and reports.
"""

import argparse
from pathlib import Path

from ..base import BaseHandler
from ..errors import UserError, SystemError


class ExportHandler(BaseHandler):
    """Handler for the export command - project export and packaging."""
    
    command_name = "export"
    description = "Export project with assets and reports"
    
    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up export command arguments."""
        parser.add_argument(
            "--project",
            default=".",
            help="Project directory (default: current directory)"
        )
        
        parser.add_argument(
            "--output", "-o",
            help="Output directory for export (optional)"
        )
        
        parser.add_argument(
            "--format",
            default="zip",
            choices=["zip", "tar", "directory"],
            help="Export format (default: zip)"
        )
        
        parser.add_argument(
            "--include-source",
            action="store_true",
            help="Include source files in export"
        )
    
    def execute(self, args: argparse.Namespace) -> int:
        """Execute the export command."""
        try:
            # Import exporter
            try:
                from exporter import Exporter
            except ImportError as e:
                raise SystemError(
                    f"Exporter not available: {e}",
                    "Ensure exporter module is installed"
                )
            
            # Validate project path
            project_path = Path(args.project)
            if not project_path.exists():
                raise UserError(
                    f"Project directory not found: {project_path}",
                    "Check the project path or create a new project with 'storycore init'"
                )
            
            # Display export info
            print(f"Exporting project from: {project_path.absolute()}")
            if args.output:
                print(f"Output directory: {args.output}")
            print(f"Format: {args.format}")
            if args.include_source:
                print("Including source files")
            
            # Export project
            exporter = Exporter()
            export_dir = exporter.export_project(str(project_path), args.output)
            
            # Display success message
            self.print_success("Project exported successfully")
            print(f"  Export location: {Path(export_dir).absolute()}")
            
            # List exported files
            export_path = Path(export_dir)
            if export_path.exists():
                print(f"  Files exported:")
                file_count = 0
                for file in export_path.iterdir():
                    if file.is_file():
                        print(f"    - {file.name}")
                        file_count += 1
                
                if file_count == 0:
                    self.print_warning("No files found in export directory")
            
            return 0
            
        except Exception as e:
            return self.handle_error(e, "project export")
