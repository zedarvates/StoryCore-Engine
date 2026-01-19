"""
Dashboard command handler - Generate interactive project dashboard.
"""

import argparse
from pathlib import Path

from ..base import BaseHandler
from ..errors import UserError, SystemError


class DashboardHandler(BaseHandler):
    """Handler for the dashboard command - dashboard generation."""
    
    command_name = "dashboard"
    description = "Generate interactive project dashboard"
    
    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up dashboard command arguments."""
        parser.add_argument(
            "--project",
            default=".",
            help="Project directory (default: current directory)"
        )
        
        parser.add_argument(
            "--output",
            help="Output path for dashboard HTML file (optional)"
        )
        
        parser.add_argument(
            "--open",
            action="store_true",
            help="Open dashboard in browser after generation"
        )
        
        parser.add_argument(
            "--template",
            choices=["default", "minimal", "detailed"],
            default="default",
            help="Dashboard template to use (default: default)"
        )
    
    def execute(self, args: argparse.Namespace) -> int:
        """Execute the dashboard command."""
        try:
            # Import exporter
            try:
                from exporter import generate_dashboard
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
            
            print(f"Generating dashboard for project: {project_path.absolute()}")
            
            if args.template != "default":
                print(f"Using template: {args.template}")
            
            # Generate dashboard
            dashboard_path = generate_dashboard(project_path)
            
            # Display success message
            self.print_success("Dashboard generated successfully")
            print(f"  Location: {dashboard_path}")
            print(f"  Open in browser: file://{Path(dashboard_path).absolute()}")
            
            # Open in browser if requested
            if args.open:
                self._open_in_browser(dashboard_path)
            
            return 0
            
        except Exception as e:
            return self.handle_error(e, "dashboard generation")
    
    def _open_in_browser(self, dashboard_path: str) -> None:
        """Open dashboard in default web browser."""
        import webbrowser
        
        try:
            dashboard_url = f"file://{Path(dashboard_path).absolute()}"
            webbrowser.open(dashboard_url)
            print(f"  Opened dashboard in browser")
        except Exception as e:
            self.logger.warning(f"Failed to open browser: {e}")
            print(f"  ⚠️  Could not open browser automatically")
