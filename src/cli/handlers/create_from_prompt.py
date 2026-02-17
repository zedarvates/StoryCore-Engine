"""
Create-from-prompt command handler - Create complete video projects from natural language prompts.

This handler integrates the EndToEndOrchestrator to provide a seamless
end-to-end experience from user prompt to final video export.
"""

import argparse
import asyncio
from pathlib import Path

from ..base import BaseHandler
from ..errors import UserError, SystemError


class CreateFromPromptHandler(BaseHandler):
    """
    Handler for the create-from-prompt command.
    
    Creates a complete video project from a natural language prompt,
    handling everything from parsing to final export.
    
    Usage:
        storycore create-from-prompt "Create a cyberpunk trailer"
        storycore create-from-prompt "Blanche-Neige Cyberpunk 2048" --output my_project
        storycore create-from-prompt --interactive
    """
    
    command_name = "create-from-prompt"
    description = "Create a complete video project from a natural language prompt"
    aliases = ["create", "auto-create", "e2e"]
    
    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up create-from-prompt command arguments."""
        # Positional argument for prompt
        parser.add_argument(
            "prompt",
            nargs="*",
            help="Natural language prompt describing the project"
        )
        
        # Output options
        parser.add_argument(
            "--output", "-o",
            help="Output directory for the project (default: projects/ folder)"
        )
        
        parser.add_argument(
            "--projects-dir",
            default="projects",
            help="Base directory for projects (default: projects)"
        )
        
        # Interactive mode
        parser.add_argument(
            "--interactive", "-i",
            action="store_true",
            help="Enter interactive mode with guided prompt input"
        )
        
        # Quality options
        parser.add_argument(
            "--quality", "-q",
            choices=["preview", "standard", "high", "ultra"],
            default="preview",
            help="Quality tier for generation (default: preview)"
        )
        
        parser.add_argument(
            "--aspect-ratio", "-a",
            choices=["16:9", "9:16", "1:1", "4:3", "21:9"],
            help="Aspect ratio for the video (default: auto-detect from prompt)"
        )
        
        parser.add_argument(
            "--duration",
            type=int,
            help="Duration in seconds (default: auto-detect from video type)"
        )
        
        # ComfyUI options
        parser.add_argument(
            "--comfyui-url",
            default="http://localhost:8188",
            help="ComfyUI backend URL (default: http://localhost:8188)"
        )
        
        parser.add_argument(
            "--no-comfyui",
            action="store_true",
            help="Skip image generation (create project structure only)"
        )
        
        # Retry options
        parser.add_argument(
            "--max-retries",
            type=int,
            default=3,
            help="Maximum retry attempts for failed steps (default: 3)"
        )
        
        # Checkpoint/resume options
        parser.add_argument(
            "--no-checkpoint",
            action="store_true",
            help="Disable checkpoint creation (faster but no resume support)"
        )
        
        parser.add_argument(
            "--resume",
            metavar="PROJECT_PATH",
            help="Resume an interrupted workflow from a checkpoint"
        )
        
        # Progress options
        parser.add_argument(
            "--quiet", "-s",
            action="store_true",
            help="Minimal output (success/failure only)"
        )
        
        parser.add_argument(
            "--verbose", "-v",
            action="store_true",
            help="Verbose output with detailed progress"
        )
        
        # Testing options
        parser.add_argument(
            "--mock",
            action="store_true",
            help="Use mock mode (skip actual generation, for testing)"
        )
        
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Parse and validate prompt without creating project"
        )
    
    def get_help(self):
        """Get enhanced help for this command."""
        from ..help import CommandHelp
        
        return CommandHelp(
            name=self.command_name,
            description=self.description,
            examples=[
                {
                    "command": 'storycore create-from-prompt "Cyberpunk trailer with neon lights"',
                    "description": "Create a basic cyberpunk trailer project"
                },
                {
                    "command": 'storycore create-from-prompt "Blanche-Neige Cyberpunk 2048" -o my_project -q high',
                    "description": "Create high-quality project with custom output"
                },
                {
                    "command": "storycore create-from-prompt --interactive",
                    "description": "Enter guided interactive mode"
                },
                {
                    "command": "storycore create-from-prompt --resume ./projects/my_project",
                    "description": "Resume an interrupted workflow"
                },
            ],
            notes=[
                "The prompt can be in any language, but works best in English or French",
                "For best results, include genre, mood, and key elements in your prompt",
                "Example: 'Create a horror trailer with dark atmosphere and mysterious characters'",
                "Check dependencies first with: storycore doctor"
            ]
        )
    
    def execute(self, args: argparse.Namespace) -> int:
        """Execute the create-from-prompt command."""
        try:
            # Handle resume mode
            if args.resume:
                return self._execute_resume(args)
            
            # Get prompt
            prompt = self._get_prompt(args)
            
            if not prompt:
                raise UserError(
                    "No prompt provided",
                    "Provide a prompt as argument or use --interactive mode"
                )
            
            # Handle dry run
            if args.dry_run:
                return self._execute_dry_run(args, prompt)
            
            # Validate dependencies
            if not args.mock:
                deps_ok = self._check_dependencies(args)
                if not deps_ok:
                    return 1
            
            # Execute full workflow
            return asyncio.run(self._execute_workflow(args, prompt))
            
        except KeyboardInterrupt:
            print("\n[WARN] Operation cancelled by user")
            return 130
        except Exception as e:
            return self.handle_error(e, "project creation")
    
    def _get_prompt(self, args: argparse.Namespace) -> str:
        """Get prompt from args or interactive input."""
        if args.prompt:
            return " ".join(args.prompt)
        
        if args.interactive:
            return self._interactive_prompt()
        
        return ""
    
    def _interactive_prompt(self) -> str:
        """Collect prompt via interactive mode."""
        print("\n[START] StoryCore - Interactive Project Creation")
        print("=" * 50)
        
        # Collect information
        title = input("Project title/description: ").strip()
        
        if not title:
            raise UserError("Project title cannot be empty")
        
        print("\nOptional details (press Enter to skip):")
        genre = input("  Genre (cyberpunk, fantasy, horror, etc.): ").strip()
        mood = input("  Mood (dark, epic, mysterious, etc.): ").strip()
        setting = input("  Setting (city, forest, space, etc.): ").strip()
        video_type = input("  Video type (trailer, teaser, short_film): ").strip()
        
        # Build prompt
        prompt_parts = [title]
        if genre:
            prompt_parts.append(genre)
        if mood:
            prompt_parts.append(mood)
        if setting:
            prompt_parts.append(setting)
        if video_type:
            prompt_parts.append(video_type)
        
        return " ".join(prompt_parts)
    
    def _execute_dry_run(self, args: argparse.Namespace, prompt: str) -> int:
        """Execute dry run - parse and validate prompt only."""
        print("\n🔍 Dry Run - Parsing and validating prompt")
        print("-" * 50)
        
        # Import parser
        from end_to_end import PromptParser
        
        parser = PromptParser()
        parsed = parser.parse(prompt)
        
        # Validate
        is_valid, errors = parser.validate_parsed_data(parsed)
        
        # Display results
        print(f"\nPrompt: {prompt[:100]}{'...' if len(prompt) > 100 else ''}")
        print(f"\nParsed Data:")
        print(f"  Title: {parsed.project_title}")
        print(f"  Genre: {parsed.genre}")
        print(f"  Video Type: {parsed.video_type}")
        print(f"  Mood: {', '.join(parsed.mood)}")
        print(f"  Setting: {parsed.setting}")
        print(f"  Time Period: {parsed.time_period}")
        print(f"  Aspect Ratio: {parsed.aspect_ratio}")
        print(f"  Duration: {parsed.duration_seconds}s")
        print(f"  Characters: {len(parsed.characters)}")
        
        for char in parsed.characters[:3]:
            print(f"    - {char.name} ({char.role})")
        
        if len(parsed.characters) > 3:
            print(f"    ... and {len(parsed.characters) - 3} more")
        
        print(f"\nConfidence Scores:")
        for field, score in parsed.confidence_scores.items():
            bar = "█" * int(score * 10) + "░" * (10 - int(score * 10))
            print(f"  {field:20s} [{bar}] {score:.1%}")
        
        print(f"\nValidation:")
        if is_valid:
            print("  [SUCCESS] All required fields are valid")
        else:
            print("  [ERROR] Validation issues found:")
            for error in errors:
                print(f"    - {error}")
        
        # Check for missing fields
        if not args.quiet:
            filled = parser.fill_defaults(parsed)
            missing = []
            if filled.project_title != parsed.project_title:
                missing.append("title")
            if filled.aspect_ratio != parsed.aspect_ratio:
                missing.append("aspect_ratio")
            if filled.duration_seconds != parsed.duration_seconds:
                missing.append("duration")
            
            if missing:
                print(f"\n  Will use defaults for: {', '.join(missing)}")
        
        return 0 if is_valid else 1
    
    def _check_dependencies(self, args: argparse.Namespace) -> bool:
        """Check that required dependencies are available."""
        from end_to_end import EndToEndOrchestrator
        
        orchestrator = EndToEndOrchestrator()
        deps = orchestrator.check_dependencies()
        
        # Display dependency status
        print("\n[Dependency Check]")
        print("-" * 50)
        
        # Handler for verify_all_dependencies result (Requirement Enhancement)
        if hasattr(deps, 'checks'):
            for check in deps.checks:
                status_symbol = "+" if check.status.value == "available" else "!"
                if not args.quiet or check.status.value != "available":
                    print(f"  {status_symbol} {check.name}: {check.message}")
            return deps.can_proceed
            
        # Fallback for old dictionary format
        all_ok = True
        for dep_name, status in deps.items():
            if status.get("available", False):
                if not args.quiet:
                    print(f"  [OK] {dep_name}")
            else:
                print(f"  [X] {dep_name}: {status.get('error', 'not available')}")
                all_ok = False
        if not all_ok:
            print("\n[WARN] Some dependencies are missing.")
            print("   The workflow may still proceed with reduced functionality.")
            print("   Use --mock to test without actual dependencies.")
        return all_ok
    
    async def _execute_workflow(self, args: argparse.Namespace, prompt: str) -> int:
        """Execute the full workflow."""
        from src.end_to_end import EndToEndOrchestrator, OrchestratorConfig
        from src.end_to_end.data_models import ProgressReport
        
        # Build configuration
        config = OrchestratorConfig(
            projects_directory=args.projects_dir,
            comfyui_backend_url=args.comfyui_url,
            storycore_cli_path="storycore.py",
            default_quality_tier=args.quality,
            max_retry_attempts=args.max_retries,
            checkpoint_enabled=not args.no_checkpoint
        )
        
        # Create progress callback
        def progress_callback(report: ProgressReport):
            if args.quiet:
                return
            
            if args.verbose:
                # Verbose output with details
                print(f"\n  [{report.progress_percent:5.1f}%] {report.current_step}")
                print(f"    Elapsed: {report.elapsed_time}")
                if report.estimated_remaining.total_seconds() > 0:
                    print(f"    Remaining: ~{report.estimated_remaining}")
            else:
                # Simple progress
                status = "#" * int(report.progress_percent / 10) + "-" * (10 - int(report.progress_percent / 10))
                print(f"\r  Progress: [{status}] {report.progress_percent:5.1f}% ", end="", flush=True)
        
        # Initialize orchestrator
        orchestrator = EndToEndOrchestrator(
            config=config,
            progress_callback=progress_callback
        )
        
        # Clear progress line
        print()
        
        # Check for existing checkpoint
        project_path = Path(args.output) if args.output else None
        
        print("\n[START] Starting End-to-End Project Creation")
        print("=" * 50)
        print(f"Prompt: {prompt[:100]}{'...' if len(prompt) > 100 else ''}")
        print(f"Quality: {args.quality}")
        print(f"ComfyUI: {args.comfyui_url if not args.no_comfyui else 'SKIPPED'}")
        print("-" * 50)
        
        # Execute workflow
        result = await orchestrator.create_project_from_prompt(
            prompt=prompt,
            options={
                "projects_directory": args.output or args.projects_dir,
                "comfyui_backend_url": args.comfyui_url,
                "checkpoint_enabled": not args.no_checkpoint,
                "mock": args.mock,
                "no_comfyui": args.no_comfyui
            }
        )
        
        # Display results
        print("\n" + "=" * 50)
        
        if result.success:
            print("[SUCCESS] Project created successfully!")
            print(f"\n[PATH] Project: {result.project_path}")
            print(f"[TIME] Duration: {result.duration}")
            
            if result.video_path:
                print(f"[VIDEO] Video: {result.video_path}")
            
            if result.qa_report:
                score = result.qa_report.overall_score
                status = "+" if result.qa_report.passed else "!"
                print(f"[QA] Quality Score: {status} {score:.1%}")
            
            if result.warnings:
                print(f"\n[WARN] Warnings ({len(result.warnings)}):")
                for warning in result.warnings[:5]:
                    print(f"    - {warning}")
                if len(result.warnings) > 5:
                    print(f"    ... and {len(result.warnings) - 5} more")
            
            return 0
        else:
            print("[ERROR] Project creation failed")
            print(f"\n[TIME] Duration: {result.duration}")
            
            if result.errors:
                print(f"\n[ERROR] Errors ({len(result.errors)}):")
                for error in result.errors[:5]:
                    print(f"    - {error}")
                if len(result.errors) > 5:
                    print(f"    ... and {len(result.errors) - 5} more")
            
            # Suggest recovery
            print("\n[INFO] To resume from checkpoint, run:")
            print(f"   storycore create-from-prompt --resume {result.project_path}")
            
            return 1
    
    def _execute_resume(self, args: argparse.Namespace) -> int:
        """Resume an interrupted workflow."""
        from src.end_to_end import EndToEndOrchestrator
        
        project_path = Path(args.resume)
        
        if not project_path.exists():
            raise UserError(
                f"Project path not found: {project_path}",
                "Check the project path and try again"
            )
        
        print(f"\n[INFO] Resuming workflow from: {project_path}")
        print("-" * 50)
        
        # Initialize orchestrator
        orchestrator = EndToEndOrchestrator()
        
        # Attempt resume
        if orchestrator.resume(str(project_path)):
            print("[SUCCESS] Checkpoint loaded successfully")
            print(f"  Starting from step: {orchestrator.get_workflow_state().current_step.value}")
            
            # In a full implementation, this would continue the workflow
            print("\n[WARN] Resume functionality requires complete workflow execution")
            print("   The checkpoint data has been loaded for reference.")
            
            return 0
        else:
            raise UserError(
                "Failed to resume workflow",
                "The checkpoint may be corrupted or incomplete"
            )

