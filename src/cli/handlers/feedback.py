"""
Feedback command handler for submitting bug reports and feedback.

This handler provides Recovery Mode functionality that allows users to submit
crash reports without launching the full UI. It collects diagnostics and
generates reports that can be submitted via Manual Mode.

Requirements: 8.4 - Recovery Mode accessible via command-line flag
"""

import argparse
import sys
from pathlib import Path
from typing import Optional

from ..base import BaseHandler
from ..help import create_command_help


class FeedbackHandler(BaseHandler):
    """Handler for the feedback command - submit bug reports and feedback."""
    
    command_name = "feedback"
    description = "Submit bug reports and feedback (Recovery Mode)"
    
    def get_help(self):
        """Get enhanced help for feedback command."""
        return (create_command_help(self.command_name, self.description)
                .add_example(
                    "storycore feedback --mode recovery",
                    "Submit a crash report without launching the full UI"
                )
                .add_example(
                    "storycore feedback --mode recovery --crash-report",
                    "Submit a crash report with automatic error context"
                )
                .add_example(
                    "storycore feedback --mode manual --type bug",
                    "Create a manual bug report"
                )
                .add_example(
                    "storycore feedback --retry-pending",
                    "Retry all pending reports from local storage"
                )
                .add_note(
                    "Recovery Mode is designed for crash scenarios where the full UI cannot be launched"
                )
                .add_note(
                    "Reports are submitted via Manual Mode (opens browser with pre-filled GitHub issue)"
                )
                .add_see_also("help"))
    
    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up feedback command arguments."""
        self.setup_help(parser)
        
        parser.add_argument(
            "--mode",
            choices=["recovery", "manual"],
            default="recovery",
            help="Submission mode (default: recovery)"
        )
        
        parser.add_argument(
            "--type",
            choices=["bug", "enhancement", "question"],
            default="bug",
            help="Report type (default: bug)"
        )
        
        parser.add_argument(
            "--crash-report",
            action="store_true",
            help="Include crash report with automatic error context"
        )
        
        parser.add_argument(
            "--retry-pending",
            action="store_true",
            help="Attempt to resend all pending reports from local storage"
        )
        
        parser.add_argument(
            "--description",
            type=str,
            help="Bug description (will prompt if not provided)"
        )
        
        parser.add_argument(
            "--steps",
            type=str,
            help="Reproduction steps (will prompt if not provided)"
        )
        
        parser.add_argument(
            "--module",
            type=str,
            help="Active module name (e.g., grid-generator, promotion-engine)"
        )
        
        parser.add_argument(
            "--screenshot",
            type=str,
            help="Path to screenshot file (PNG, JPG, or GIF, max 5MB)"
        )
        
        parser.add_argument(
            "--include-logs",
            action="store_true",
            default=True,
            help="Include application logs in the report (default: True)"
        )
        
        parser.add_argument(
            "--no-logs",
            action="store_true",
            help="Exclude application logs from the report"
        )
    
    def execute(self, args: argparse.Namespace) -> int:
        """Execute the feedback command."""
        try:
            # Handle retry-pending mode
            if args.retry_pending:
                return self._retry_pending_reports()
            
            # Handle recovery mode
            if args.mode == "recovery":
                return self._feedback_recovery_mode(args)
            
            # Handle manual mode
            elif args.mode == "manual":
                return self._feedback_manual_mode(args)
            
            else:
                self.print_error(f"Unknown mode: {args.mode}")
                return 1
                
        except Exception as e:
            return self.handle_error(e, "feedback submission")
    
    def _feedback_recovery_mode(self, args: argparse.Namespace) -> int:
        """
        Recovery Mode: Minimal UI feedback submission for crash scenarios.
        
        Collects diagnostics without launching the full UI and submits via Manual Mode.
        This is designed to work even when the system is in an unstable state.
        
        Requirements: 8.4
        
        Args:
            args: Parsed command-line arguments
            
        Returns:
            Exit code (0 for success, non-zero for errors)
        """
        self.print_info("Starting Recovery Mode feedback submission...")
        
        try:
            # Import required modules
            from diagnostic_collector import DiagnosticCollector
            from github_template_generator import GitHubTemplateGenerator
            from feedback_storage import FeedbackStorage
            
            # Initialize components
            collector = DiagnosticCollector()
            template_gen = GitHubTemplateGenerator()
            storage = FeedbackStorage()
            
            # Determine if logs should be included
            include_logs = args.include_logs and not args.no_logs
            
            # Get description and steps (prompt if not provided)
            description = args.description
            if not description:
                self.print_info("Please provide a description of the issue:")
                description = input("> ").strip()
                
                if not description or len(description) < 10:
                    self.print_error("Description must be at least 10 characters")
                    return 1
            
            reproduction_steps = args.steps
            if not reproduction_steps:
                self.print_info("Please provide steps to reproduce (or press Enter to skip):")
                reproduction_steps = input("> ").strip()
                if not reproduction_steps:
                    reproduction_steps = "N/A"
            
            # Validate screenshot if provided
            screenshot_path = None
            if args.screenshot:
                is_valid, error_msg = collector.validate_screenshot(args.screenshot)
                if not is_valid:
                    self.print_error(f"Screenshot validation failed: {error_msg}")
                    self.print_warning("Continuing without screenshot...")
                else:
                    screenshot_path = args.screenshot
                    self.print_success(f"Screenshot validated: {args.screenshot}")
            
            # Collect diagnostics
            self.print_info("Collecting system diagnostics...")
            
            # Create report payload
            payload = collector.create_report_payload(
                report_type=args.type,
                description=description,
                reproduction_steps=reproduction_steps,
                include_logs=include_logs,
                screenshot_path=screenshot_path,
                module_name=args.module
            )
            
            self.print_success("Diagnostics collected successfully")
            
            # Generate GitHub issue template
            self.print_info("Generating GitHub issue template...")
            issue_body = template_gen.format_issue_body(payload)
            github_url = template_gen.generate_github_url(payload)
            
            # Save to local storage as backup
            try:
                report_id = storage.save_failed_report(payload)
                self.print_success(f"Report saved to local storage: {report_id}")
            except Exception as e:
                self.print_warning(f"Failed to save report to local storage: {e}")
            
            # Display report summary
            print("\n" + "=" * 60)
            print("FEEDBACK REPORT SUMMARY")
            print("=" * 60)
            print(f"Report Type: {args.type}")
            print(f"Description: {description[:80]}{'...' if len(description) > 80 else ''}")
            print(f"Module: {args.module or 'N/A'}")
            print(f"Logs Included: {'Yes' if include_logs else 'No'}")
            print(f"Screenshot: {'Yes' if screenshot_path else 'No'}")
            print("=" * 60)
            print()
            
            # Manual Mode submission
            self.print_info("Opening GitHub issue creation page in your browser...")
            self.print_info("The issue template has been copied to your clipboard.")
            
            # Copy to clipboard (cross-platform)
            try:
                import pyperclip
                pyperclip.copy(issue_body)
                self.print_success("Template copied to clipboard")
            except ImportError:
                self.print_warning("pyperclip not available - clipboard copy skipped")
                self.print_info("You can manually copy the template from the output below:")
                print("\n" + "-" * 60)
                print(issue_body)
                print("-" * 60 + "\n")
            except Exception as e:
                self.print_warning(f"Failed to copy to clipboard: {e}")
            
            # Open browser
            try:
                import webbrowser
                webbrowser.open(github_url)
                self.print_success("Browser opened with GitHub issue creation page")
            except Exception as e:
                self.print_error(f"Failed to open browser: {e}")
                self.print_info(f"Please manually open this URL:\n{github_url}")
            
            print()
            self.print_success("Recovery Mode feedback submission complete!")
            self.print_info("Please complete the submission in your browser.")
            
            return 0
            
        except ImportError as e:
            self.print_error(f"Failed to import required module: {e}")
            self.print_info("Please ensure all dependencies are installed")
            return 1
        except Exception as e:
            self.print_error(f"Recovery Mode failed: {e}")
            return 1
    
    def _feedback_manual_mode(self, args: argparse.Namespace) -> int:
        """
        Manual Mode: Create a manual feedback report.
        
        Similar to Recovery Mode but with more interactive prompts.
        
        Args:
            args: Parsed command-line arguments
            
        Returns:
            Exit code (0 for success, non-zero for errors)
        """
        # For now, delegate to recovery mode with same logic
        return self._feedback_recovery_mode(args)
    
    def _retry_pending_reports(self) -> int:
        """
        Attempt to resend all pending reports from local storage.
        
        Requirements: 8.2
        
        Returns:
            Exit code (0 for success, non-zero for errors)
        """
        self.print_info("Retrying pending reports...")
        
        try:
            from feedback_storage import FeedbackStorage
            
            storage = FeedbackStorage()
            
            # List pending reports
            pending_reports = storage.list_pending_reports()
            
            if not pending_reports:
                self.print_info("No pending reports found")
                return 0
            
            self.print_info(f"Found {len(pending_reports)} pending report(s)")
            
            # Retry each report
            success_count = 0
            failure_count = 0
            
            for report in pending_reports:
                report_id = report['report_id']
                self.print_info(f"Retrying report: {report_id}")
                
                success, error_msg, result = storage.retry_report(report_id)
                
                if success:
                    success_count += 1
                    issue_url = result.get('issue_url', 'N/A')
                    self.print_success(f"Successfully submitted: {issue_url}")
                else:
                    failure_count += 1
                    self.print_error(f"Failed to retry: {error_msg}")
                    
                    # Check if fallback to manual mode is suggested
                    if result and result.get('fallback_mode') == 'manual':
                        self.print_info("Consider using Manual Mode for this report")
            
            # Summary
            print()
            print("=" * 60)
            print("RETRY SUMMARY")
            print("=" * 60)
            print(f"Total reports: {len(pending_reports)}")
            print(f"Successful: {success_count}")
            print(f"Failed: {failure_count}")
            print("=" * 60)
            
            if failure_count > 0:
                self.print_warning(f"{failure_count} report(s) still pending")
                self.logger.info(f"Returning exit code 1 due to {failure_count} failures")
                return 1
            else:
                self.print_success("All pending reports submitted successfully!")
                self.logger.info("Returning exit code 0 - all reports successful")
                return 0
                
        except ImportError as e:
            self.print_error(f"Failed to import required module: {e}")
            return 1
        except Exception as e:
            self.print_error(f"Failed to retry pending reports: {e}")
            return 1
