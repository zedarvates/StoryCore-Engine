"""
QA command handler - Quality assurance scoring and validation.
"""

import argparse
from pathlib import Path

from ..base import BaseHandler
from ..errors import UserError, SystemError


class QAHandler(BaseHandler):
    """Handler for the qa command - quality assurance scoring."""
    
    command_name = "qa"
    description = "Run quality assurance scoring on project"
    
    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up qa command arguments."""
        parser.add_argument(
            "--project",
            default=".",
            help="Project directory (default: current directory)"
        )
        
        parser.add_argument(
            "--threshold",
            type=float,
            default=3.0,
            help="Minimum acceptable quality score (default: 3.0)"
        )
        
        parser.add_argument(
            "--detailed",
            action="store_true",
            help="Show detailed per-panel analysis"
        )
    
    def execute(self, args: argparse.Namespace) -> int:
        """Execute the qa command."""
        try:
            # Import QA engine
            try:
                from qa_engine import QAEngine
            except ImportError as e:
                raise SystemError(
                    f"QAEngine not available: {e}",
                    "Ensure qa_engine module is installed"
                )
            
            # Validate project path
            project_path = Path(args.project)
            if not project_path.exists():
                raise UserError(
                    f"Project directory not found: {project_path}",
                    "Check the project path or create a new project with 'storycore init'"
                )
            
            # Validate threshold
            if args.threshold < 0 or args.threshold > 5:
                raise UserError(
                    f"Invalid threshold: {args.threshold}",
                    "Threshold must be between 0 and 5"
                )
            
            # Display QA info
            print(f"Running QA scoring on: {project_path.absolute()}")
            if args.threshold != 3.0:
                print(f"Quality threshold: {args.threshold}/5.0")
            
            # Run QA scoring with integrated quality validation
            qa_engine = QAEngine()
            qa_report = qa_engine.run_qa_scoring(
                str(project_path),
                enable_advanced_validation=True,
                enable_audio_mixing=True
            )
            
            # Display results
            print(f"\nQA Scoring Results:")
            print(f"Overall Score: {qa_report['overall_score']:.1f}/5.0")
            
            # Check if passed based on threshold
            passed = qa_report['overall_score'] >= args.threshold
            status_text = "PASSED" if passed else "FAILED"
            status_icon = "✓" if passed else "✗"
            print(f"Status: {status_icon} {status_text}")
            
            # Display category scores
            if qa_report.get("categories"):
                print("\nCategory Scores:")
                for category, score in qa_report["categories"].items():
                    status = "✓" if score >= args.threshold else "✗"
                    category_name = category.replace('_', ' ').title()
                    print(f"  {status} {category_name}: {score:.1f}/5.0")
            
            # Display issues if any
            if qa_report.get("issues"):
                print(f"\nIssues Found: {len(qa_report['issues'])}")
                for issue in qa_report["issues"]:
                    print(f"  - {issue['description']}")
                    if issue.get('suggested_fix'):
                        print(f"    Fix: {issue['suggested_fix']}")
            
            # Display detailed analysis if requested
            if args.detailed and qa_report.get("panel_scores"):
                print(f"\nPer-Panel Analysis:")
                for panel_id, panel_score in qa_report["panel_scores"].items():
                    status = "✓" if panel_score >= args.threshold else "✗"
                    print(f"  {status} {panel_id}: {panel_score:.1f}/5.0")
            
            # Return appropriate exit code
            if not passed:
                self.print_error(f"QA scoring failed (score {qa_report['overall_score']:.1f} < threshold {args.threshold})")
                return 1
            
            self.print_success("QA scoring passed")
            return 0
            
        except Exception as e:
            return self.handle_error(e, "QA scoring")
