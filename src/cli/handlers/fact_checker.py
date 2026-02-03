"""
Fact Checker command handler - Scientific fact-checking and multimedia anti-fake analysis.

This handler provides the CLI interface for the fact-checking system, supporting
text analysis, video transcript analysis, and automatic input type detection.

Requirements: 3.1
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Optional

from ..base import BaseHandler
from ..errors import UserError, SystemError
from ..help import CommandHelp


class FactCheckerHandler(BaseHandler):
    """Handler for the fact_checker command - content verification and analysis."""
    
    command_name = "fact-checker"
    description = "Verify factual claims in text or video transcripts"
    aliases = ["fact_checker", "fact-check", "verify"]
    
    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up fact_checker command arguments."""
        # Input source (mutually exclusive)
        input_group = parser.add_mutually_exclusive_group(required=True)
        input_group.add_argument(
            "input",
            nargs="?",
            help="Input text or file path to analyze"
        )
        input_group.add_argument(
            "--file",
            type=str,
            help="Path to input file (text or transcript)"
        )
        input_group.add_argument(
            "--stdin",
            action="store_true",
            help="Read input from stdin"
        )
        
        # Mode selection
        parser.add_argument(
            "--mode",
            choices=["text", "video", "auto"],
            default="auto",
            help="Analysis mode: text (scientific audit), video (anti-fake), or auto (detect automatically)"
        )
        
        # Optional parameters
        parser.add_argument(
            "--confidence-threshold",
            type=float,
            metavar="THRESHOLD",
            help="Minimum confidence score (0-100, default: 70)"
        )
        
        parser.add_argument(
            "--detail-level",
            choices=["summary", "detailed", "full"],
            default="detailed",
            help="Level of detail in output (default: detailed)"
        )
        
        parser.add_argument(
            "--output-format",
            choices=["json", "markdown", "pdf"],
            default="json",
            help="Output format (default: json)"
        )
        
        parser.add_argument(
            "--no-cache",
            action="store_true",
            help="Disable result caching"
        )
        
        parser.add_argument(
            "--output",
            "-o",
            type=str,
            metavar="FILE",
            help="Write output to file instead of stdout"
        )
        
        parser.add_argument(
            "--quiet",
            "-q",
            action="store_true",
            help="Suppress progress messages, only show results"
        )
        
        parser.add_argument(
            "--verbose",
            "-v",
            action="store_true",
            help="Show detailed progress information"
        )
    
    def get_help(self) -> Optional[CommandHelp]:
        """Get enhanced help for the fact_checker command."""
        help_obj = CommandHelp(
            command="fact_checker",
            description=self.description,
            usage_examples=[
                {
                    "description": "Analyze text content directly",
                    "command": 'storycore fact_checker "Water boils at 100°C at sea level"'
                },
                {
                    "description": "Analyze text from a file",
                    "command": "storycore fact_checker --file script.txt"
                },
                {
                    "description": "Analyze video transcript with auto-detection",
                    "command": "storycore fact_checker --file transcript.txt --mode auto"
                },
                {
                    "description": "Force video mode analysis",
                    "command": "storycore fact_checker --file transcript.txt --mode video"
                },
                {
                    "description": "Read from stdin and output markdown",
                    "command": "cat script.txt | storycore fact_checker --stdin --output-format markdown"
                },
                {
                    "description": "Set custom confidence threshold",
                    "command": "storycore fact_checker --file claims.txt --confidence-threshold 80"
                },
                {
                    "description": "Get summary output only",
                    "command": "storycore fact_checker --file script.txt --detail-level summary"
                },
                {
                    "description": "Save results to file",
                    "command": "storycore fact_checker --file script.txt -o report.json"
                }
            ],
            notes=[
                "The fact checker supports two analysis modes:",
                "  • text: Scientific Audit Agent for factual claim verification",
                "  • video: Anti-Fake Video Agent for transcript manipulation detection",
                "  • auto: Automatically detects input type (default)",
                "",
                "Auto-detection looks for timestamp patterns and transcript keywords.",
                "",
                "Confidence threshold (0-100) determines risk level assignment:",
                "  • 0-30: Critical risk",
                "  • 30-50: High risk",
                "  • 50-70: Medium risk",
                "  • 70-100: Low risk",
                "",
                "Output formats:",
                "  • json: Structured data (default, best for programmatic use)",
                "  • markdown: Human-readable formatted text",
                "  • pdf: Printable report (requires additional dependencies)",
                "",
                "Results are cached by default for faster repeated analysis.",
                "Use --no-cache to force fresh analysis."
            ]
        )
        return help_obj
    
    def execute(self, args: argparse.Namespace) -> int:
        """Execute the fact_checker command."""
        try:
            # Import fact checker command interface
            try:
                import sys
                from pathlib import Path
                
                # Add src directory to path if not already there
                src_path = Path(__file__).parent.parent.parent / "src"
                if str(src_path) not in sys.path:
                    sys.path.insert(0, str(src_path))
                
                from fact_checker.fact_checker_command import FactCheckerCommand
                from fact_checker.configuration import Configuration
            except ImportError as e:
                raise SystemError(
                    f"Fact checker module not available: {e}",
                    "Ensure fact_checker module is installed"
                )
            
            # Step 1: Load input content
            if not args.quiet:
                self._print_progress("Loading input...")
            
            content = self._load_input(args)
            
            if args.verbose:
                word_count = len(content.split())
                self._print_progress(f"Loaded {word_count} words")
            
            # Step 2: Validate parameters
            if args.confidence_threshold is not None:
                if not 0 <= args.confidence_threshold <= 100:
                    raise UserError(
                        f"Invalid confidence threshold: {args.confidence_threshold}",
                        "Threshold must be between 0 and 100"
                    )
            
            # Step 3: Initialize fact checker
            if not args.quiet:
                self._print_progress("Initializing fact checker...")
            
            config = Configuration()
            if args.confidence_threshold is not None:
                config.confidence_threshold = args.confidence_threshold
            
            command = FactCheckerCommand(config)
            
            # Step 4: Execute fact checking
            if not args.quiet:
                mode_text = args.mode if args.mode != "auto" else "auto-detect"
                self._print_progress(f"Analyzing content (mode: {mode_text})...")
            
            result = command.execute(
                input_data=content,
                mode=args.mode,
                confidence_threshold=args.confidence_threshold,
                detail_level=args.detail_level,
                output_format=args.output_format,
                cache=not args.no_cache
            )
            
            # Step 5: Handle results
            if result["status"] == "error":
                self.print_error(f"Analysis failed: {result['error']['message']}")
                return 1
            
            # Display summary if not quiet
            if not args.quiet:
                self._display_summary(result, args.verbose)
            
            # Step 6: Output results
            output_content = self._format_output(result, args.output_format)
            
            if args.output:
                # Write to file
                output_path = Path(args.output)
                output_path.parent.mkdir(parents=True, exist_ok=True)
                
                if args.output_format == "pdf":
                    # Write binary for PDF
                    with open(output_path, 'wb') as f:
                        f.write(output_content)
                else:
                    # Write text for JSON/Markdown
                    with open(output_path, 'w', encoding='utf-8') as f:
                        f.write(output_content)
                
                if not args.quiet:
                    self.print_success(f"Results saved to: {output_path}")
            else:
                # Write to stdout
                if isinstance(output_content, bytes):
                    sys.stdout.buffer.write(output_content)
                else:
                    print(output_content)
            
            # Return success
            if not args.quiet:
                self.print_success("Analysis complete")
            
            return 0
            
        except Exception as e:
            return self.handle_error(e, "Fact checking")
    
    def _load_input(self, args: argparse.Namespace) -> str:
        """
        Load input content from various sources.
        
        Args:
            args: Parsed command-line arguments
            
        Returns:
            Input content as string
            
        Raises:
            UserError: If input cannot be loaded
        """
        if args.stdin:
            # Read from stdin
            try:
                content = sys.stdin.read()
                if not content or not content.strip():
                    raise UserError(
                        "No input received from stdin",
                        "Pipe content to the command or use --file option"
                    )
                return content
            except Exception as e:
                raise UserError(f"Failed to read from stdin: {e}")
        
        elif args.file:
            # Read from file
            file_path = Path(args.file)
            
            if not file_path.exists():
                raise UserError(
                    f"Input file not found: {file_path}",
                    "Check the file path and try again"
                )
            
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                if not content or not content.strip():
                    raise UserError(
                        f"Input file is empty: {file_path}",
                        "Provide a file with content to analyze"
                    )
                
                return content
            except UnicodeDecodeError:
                raise UserError(
                    f"Cannot read file (encoding issue): {file_path}",
                    "Ensure the file is UTF-8 encoded text"
                )
            except Exception as e:
                raise UserError(f"Failed to read file: {e}")
        
        elif args.input:
            # Direct text input
            content = args.input
            
            if not content or not content.strip():
                raise UserError(
                    "Input text is empty",
                    "Provide text content to analyze"
                )
            
            return content
        
        else:
            raise UserError(
                "No input provided",
                "Provide input via argument, --file, or --stdin"
            )
    
    def _display_summary(self, result: dict, verbose: bool) -> None:
        """
        Display analysis summary.
        
        Args:
            result: Analysis result dictionary
            verbose: Whether to show verbose output
        """
        print("\n" + "="*60)
        print("FACT CHECKING SUMMARY")
        print("="*60)
        
        # Mode and agent
        print(f"Mode: {result['mode']}")
        print(f"Agent: {result['agent']}")
        print(f"Processing Time: {result['processing_time_ms']}ms")
        
        if result.get('cached'):
            print("Source: Cached result")
        
        # Summary statistics
        report = result.get('report', {})
        summary_stats = report.get('summary_statistics', {})
        
        if summary_stats:
            print("\n" + "-"*60)
            print("STATISTICS")
            print("-"*60)
            
            if 'total_claims' in summary_stats:
                print(f"Total Claims: {summary_stats['total_claims']}")
            
            if 'high_risk_count' in summary_stats:
                high_risk = summary_stats['high_risk_count']
                if high_risk > 0:
                    print(f"⚠️  High Risk Claims: {high_risk}")
                else:
                    print(f"✓ High Risk Claims: {high_risk}")
            
            if 'average_confidence' in summary_stats:
                avg_conf = summary_stats['average_confidence']
                print(f"Average Confidence: {avg_conf:.1f}%")
            
            if 'coherence_score' in summary_stats:
                coherence = summary_stats['coherence_score']
                print(f"Coherence Score: {coherence:.1f}%")
            
            if 'integrity_score' in summary_stats:
                integrity = summary_stats['integrity_score']
                print(f"Integrity Score: {integrity:.1f}%")
        
        # Human summary
        if result.get('summary'):
            print("\n" + "-"*60)
            print("SUMMARY")
            print("-"*60)
            print(result['summary'])
        
        # Verbose details
        if verbose:
            claims = report.get('claims', [])
            signals = report.get('manipulation_signals', [])
            
            if claims:
                print("\n" + "-"*60)
                print(f"CLAIMS ({len(claims)})")
                print("-"*60)
                for i, claim in enumerate(claims[:5], 1):  # Show first 5
                    risk = claim.get('risk_level', 'unknown')
                    conf = claim.get('confidence', 0)
                    text = claim.get('text', '')[:80]  # Truncate
                    print(f"{i}. [{risk.upper()}] {text}... (confidence: {conf:.1f}%)")
                
                if len(claims) > 5:
                    print(f"... and {len(claims) - 5} more claims")
            
            if signals:
                print("\n" + "-"*60)
                print(f"MANIPULATION SIGNALS ({len(signals)})")
                print("-"*60)
                for i, signal in enumerate(signals[:5], 1):  # Show first 5
                    sig_type = signal.get('type', 'unknown')
                    severity = signal.get('severity', 'unknown')
                    desc = signal.get('description', '')[:80]  # Truncate
                    print(f"{i}. [{severity.upper()}] {sig_type}: {desc}...")
                
                if len(signals) > 5:
                    print(f"... and {len(signals) - 5} more signals")
        
        print("="*60 + "\n")
    
    def _format_output(self, result: dict, output_format: str) -> str:
        """
        Format output according to requested format.
        
        Args:
            result: Analysis result dictionary
            output_format: Requested format (json, markdown, pdf)
            
        Returns:
            Formatted output as string or bytes
        """
        if output_format == "json":
            # Pretty-print JSON
            return json.dumps(result, indent=2, ensure_ascii=False)
        
        elif output_format == "markdown":
            # Return markdown from report
            report = result.get('report', {})
            if isinstance(report, str):
                return report
            else:
                # If report is dict, convert to markdown
                return self._dict_to_markdown(result)
        
        elif output_format == "pdf":
            # Return PDF bytes from report
            report = result.get('report', {})
            if isinstance(report, bytes):
                return report
            else:
                raise SystemError(
                    "PDF generation failed",
                    "Report is not in PDF format"
                )
        
        else:
            raise ValueError(f"Unsupported output format: {output_format}")
    
    def _dict_to_markdown(self, result: dict) -> str:
        """
        Convert result dictionary to markdown format.
        
        Args:
            result: Result dictionary
            
        Returns:
            Markdown formatted string
        """
        lines = []
        
        # Title
        lines.append("# Fact Checking Report")
        lines.append("")
        
        # Metadata
        lines.append("## Metadata")
        lines.append(f"- **Mode**: {result.get('mode', 'unknown')}")
        lines.append(f"- **Agent**: {result.get('agent', 'unknown')}")
        lines.append(f"- **Processing Time**: {result.get('processing_time_ms', 0)}ms")
        lines.append(f"- **Status**: {result.get('status', 'unknown')}")
        lines.append("")
        
        # Summary
        if result.get('summary'):
            lines.append("## Summary")
            lines.append(result['summary'])
            lines.append("")
        
        # Report details
        report = result.get('report', {})
        
        # Statistics
        summary_stats = report.get('summary_statistics', {})
        if summary_stats:
            lines.append("## Statistics")
            for key, value in summary_stats.items():
                key_formatted = key.replace('_', ' ').title()
                lines.append(f"- **{key_formatted}**: {value}")
            lines.append("")
        
        # Claims
        claims = report.get('claims', [])
        if claims:
            lines.append(f"## Claims ({len(claims)})")
            for i, claim in enumerate(claims, 1):
                lines.append(f"### Claim {i}")
                lines.append(f"**Text**: {claim.get('text', 'N/A')}")
                lines.append(f"**Domain**: {claim.get('domain', 'N/A')}")
                lines.append(f"**Confidence**: {claim.get('confidence', 0):.1f}%")
                lines.append(f"**Risk Level**: {claim.get('risk_level', 'unknown')}")
                lines.append("")
        
        # Manipulation signals
        signals = report.get('manipulation_signals', [])
        if signals:
            lines.append(f"## Manipulation Signals ({len(signals)})")
            for i, signal in enumerate(signals, 1):
                lines.append(f"### Signal {i}")
                lines.append(f"**Type**: {signal.get('type', 'N/A')}")
                lines.append(f"**Severity**: {signal.get('severity', 'N/A')}")
                lines.append(f"**Description**: {signal.get('description', 'N/A')}")
                lines.append("")
        
        return "\n".join(lines)
    
    def _print_progress(self, message: str) -> None:
        """Print progress message with consistent formatting."""
        print(f"→ {message}")
