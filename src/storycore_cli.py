#!/usr/bin/env python3
"""
StoryCore-Engine CLI - MVP Bootstrap
Main CLI entry point with init, validate, and export commands.
"""

import argparse
import datetime
import json
import sys
from pathlib import Path


def handle_comfyui_service(args):
    """Handle ComfyUI service management commands."""
    from comfyui_image_engine import ComfyUIImageEngine
    
    if not args.comfyui_command:
        print("Error: ComfyUI service command required")
        print("Available commands: start, stop, status, restart")
        sys.exit(1)
    
    try:
        engine = ComfyUIImageEngine(comfyui_url=args.comfyui_url)
        
        if args.comfyui_command == "start":
            print(f"Starting ComfyUI service at {args.comfyui_url}")
            success = engine.start_comfyui_service()
            if success:
                print("[SUCCESS] ComfyUI service started successfully")
                
                # Show service status
                status = engine.get_service_status()
                print(f"   Service State: {status['service_state']}")
                print(f"   Server URL: {status['server_url']}")
                print(f"   Port: {status['port']}")
            else:
                print("[ERROR] Failed to start ComfyUI service")
                sys.exit(1)
                
        elif args.comfyui_command == "stop":
            print(f"Stopping ComfyUI service at {args.comfyui_url}")
            success = engine.stop_comfyui_service()
            if success:
                print("[SUCCESS] ComfyUI service stopped successfully")
            else:
                print("[ERROR] Failed to stop ComfyUI service")
                sys.exit(1)
                
        elif args.comfyui_command == "status":
            print(f"Checking ComfyUI service status at {args.comfyui_url}")
            status = engine.get_service_status()
            
            print(f"\nComfyUI Service Status:")
            print(f"   Running: {'[YES]' if status['service_running'] else '[NO]'}")
            print(f"   State: {status['service_state']}")
            print(f"   Server URL: {status['server_url']}")
            print(f"   Port: {status['port']}")
            print(f"   Mock Mode: {'[YES]' if status['mock_mode'] else '[NO]'}")
            print(f"   Service Available: {'[YES]' if status['service_available'] else '[NO]'}")
            
            if status.get('last_health_check'):
                print(f"   Last Health Check: {status['last_health_check']}")
            if status.get('uptime_seconds'):
                print(f"   Uptime: {status['uptime_seconds']:.1f} seconds")
            if status.get('error_message'):
                print(f"   Error: {status['error_message']}")
                
        elif args.comfyui_command == "restart":
            print(f"Restarting ComfyUI service at {args.comfyui_url}")
            
            # Stop first
            print("Stopping service...")
            stop_success = engine.stop_comfyui_service()
            
            if stop_success:
                # Wait a moment
                import time
                time.sleep(2)
                
                # Start again
                print("Starting service...")
                start_success = engine.start_comfyui_service()
                
                if start_success:
                    print("[SUCCESS] ComfyUI service restarted successfully")
                    
                    # Show service status
                    status = engine.get_service_status()
                    print(f"   Service State: {status['service_state']}")
                    print(f"   Server URL: {status['server_url']}")
                    print(f"   Port: {status['port']}")
                else:
                    print("[ERROR] Failed to restart ComfyUI service (start failed)")
                    sys.exit(1)
            else:
                print("[ERROR] Failed to restart ComfyUI service (stop failed)")
                sys.exit(1)
        
    except Exception as e:
        print(f"[ERROR] ComfyUI service management error: {e}")
        sys.exit(1)


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="StoryCore-Engine CLI - MVP Bootstrap",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  storycore init my-project          # Initialize new project
  storycore validate                 # Validate current directory
  storycore validate --project path # Validate specific project
  storycore grid                     # Generate 3x3 grid in current directory
  storycore grid --project path     # Generate grid in specific project
  storycore promote                  # Upscale panels in current directory
  storycore promote --project path  # Upscale panels in specific project
  storycore refine                   # Refine panels in current directory
  storycore refine --project path   # Refine panels in specific project
  storycore compare                  # Compare promoted/refined in current directory
  storycore compare --project path  # Compare promoted/refined in specific project
  storycore qa                       # Run QA scoring on current directory
  storycore qa --project path       # Run QA scoring on specific project
  storycore export                   # Export current directory with QA
  storycore export --project path   # Export specific project with QA
  storycore dashboard                # Generate dashboard in current directory
  storycore dashboard --project path # Generate dashboard in specific project
  storycore narrative                # Process narrative and augment prompts
  storycore narrative --project path # Process narrative in specific project
  storycore video-plan               # Generate video production plan
  storycore video-plan --project path # Generate video plan in specific project
  storycore script                   # Process script text into structured JSON
  storycore script --project path   # Process script in specific project
  storycore script --input file.txt # Process script from file
  storycore script --text "script"  # Process script from command line
  storycore scene-breakdown          # Process script into detailed scene breakdown
  storycore scene-breakdown --project path # Process breakdown in specific project
  storycore shot-planning            # Generate professional shot lists with cinematic grammar
  storycore shot-planning --project path # Process shot planning in specific project
  storycore storyboard               # Generate visual storyboard compositions with puppet placement
  storycore storyboard --project path # Process storyboard in specific project
  storycore puppet-layer             # Generate puppet rigs and layer files (L0-L8) for AI generation
  storycore puppet-layer --project path # Process puppet layer in specific project
  storycore generate-images          # Generate final keyframe images using ComfyUI AI backend
  storycore generate-images --project path # Generate images in specific project
  storycore generate-images --mock-mode # Force demonstration mode (no ComfyUI required)
  storycore generate-images --real-mode --comfyui-url http://localhost:8188 # Use real ComfyUI
  storycore generate-video           # Generate video sequences from keyframes
  storycore generate-video --project path # Generate video in specific project
  storycore generate-video --shot shot_001 # Generate specific shot
  storycore generate-video --config config.json # Use custom configuration
  storycore comfyui start            # Start ComfyUI service
  storycore comfyui stop             # Stop ComfyUI service
  storycore comfyui status           # Check ComfyUI service status
  storycore comfyui restart          # Restart ComfyUI service
        """
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Init command
    init_parser = subparsers.add_parser("init", help="Initialize a new StoryCore-Engine project")
    init_parser.add_argument("project_name", nargs="?", help="Name of the project to create (optional - launches wizard if omitted)")
    init_parser.add_argument("--path", default=".", help="Base path for project creation (default: current directory)")
    init_parser.add_argument("--interactive", action="store_true", help="Force interactive wizard mode")
    
    # Validate command
    validate_parser = subparsers.add_parser("validate", help="Validate project JSON files")
    validate_parser.add_argument("--project", default=".", help="Project directory to validate (default: current directory)")
    
    # Export command
    export_parser = subparsers.add_parser("export", help="Export project to timestamped snapshot")
    export_parser.add_argument("--project", default=".", help="Project directory to export (default: current directory)")
    export_parser.add_argument("--output", default="exports", help="Export base directory (default: exports)")
    
    # QA command
    qa_parser = subparsers.add_parser("qa", help="Run QA scoring on project")
    qa_parser.add_argument("--project", default=".", help="Project directory to score (default: current directory)")
    
    # Grid command
    grid_parser = subparsers.add_parser("grid", help="Generate grid and slice into panels")
    grid_parser.add_argument("--project", default=".", help="Project directory (default: current directory)")
    grid_parser.add_argument("--grid", default="3x3", help="Grid dimensions: 3x3, 1x2, or 1x4 (default: 3x3)")
    grid_parser.add_argument("--out", default=None, help="Output grid filename (default: grid_<spec>.ppm)")
    grid_parser.add_argument("--cell-size", type=int, default=256, help="Size of each grid cell in pixels (default: 256)")
    
    # Promote command
    promote_parser = subparsers.add_parser("promote", help="Upscale panels to promoted directory")
    promote_parser.add_argument("--project", default=".", help="Project directory (default: current directory)")
    promote_parser.add_argument("--scale", type=int, default=2, help="Scale factor for upscaling (default: 2)")
    promote_parser.add_argument("--method", default="lanczos", choices=["lanczos", "bicubic"], help="Resampling method (default: lanczos)")
    
    # Refine command
    refine_parser = subparsers.add_parser("refine", help="Apply enhancement filters to panels")
    refine_parser.add_argument("--project", default=".", help="Project directory (default: current directory)")
    refine_parser.add_argument("--input", default="promoted", choices=["promoted", "panels"], help="Input source (default: promoted)")
    refine_parser.add_argument("--mode", default="unsharp", choices=["unsharp", "sharpen"], help="Enhancement mode (default: unsharp)")
    refine_parser.add_argument("--strength", type=float, default=1.0, help="Filter strength (default: 1.0)")
    refine_parser.add_argument("--metrics", action="store_true", help="Compute and display sharpness metrics")
    
    # Compare command
    compare_parser = subparsers.add_parser("compare", help="Create visual comparisons between promoted and refined panels")
    compare_parser.add_argument("--project", default=".", help="Project directory (default: current directory)")
    compare_parser.add_argument("--panel", default="1", help="Panel number or 'all' (default: 1)")
    compare_parser.add_argument("--mode", default="side-by-side", choices=["side-by-side", "grid"], help="Comparison layout (default: side-by-side)")
    compare_parser.add_argument("--out", default="assets/images/compare", help="Output directory (default: assets/images/compare)")
    
    # Dashboard command
    dashboard_parser = subparsers.add_parser("dashboard", help="Generate interactive HTML dashboard")
    dashboard_parser.add_argument("--project", default=".", help="Project directory (default: current directory)")
    
    # Narrative command
    narrative_parser = subparsers.add_parser("narrative", help="Process narrative and augment prompts")
    narrative_parser.add_argument("--project", default=".", help="Project directory (default: current directory)")
    
    # Video Plan command
    video_plan_parser = subparsers.add_parser("video-plan", help="Generate video production plan")
    video_plan_parser.add_argument("--project", default=".", help="Project directory (default: current directory)")
    
    # Script command
    script_parser = subparsers.add_parser("script", help="Process script text into structured cinematic JSON")
    script_parser.add_argument("--project", default=".", help="Project directory (default: current directory)")
    script_parser.add_argument("--input", help="Input script file path (if not provided, will prompt for text)")
    script_parser.add_argument("--text", help="Script text directly as argument")
    
    # Scene Breakdown command
    scene_breakdown_parser = subparsers.add_parser("scene-breakdown", help="Process script into detailed cinematic scene breakdown")
    scene_breakdown_parser.add_argument("--project", default=".", help="Project directory (default: current directory)")
    
    # Shot Planning command
    shot_planning_parser = subparsers.add_parser("shot-planning", help="Generate professional shot lists with cinematic grammar")
    shot_planning_parser.add_argument("--project", default=".", help="Project directory (default: current directory)")
    
    # Storyboard command
    storyboard_parser = subparsers.add_parser("storyboard", help="Generate visual storyboard compositions with puppet placement and guides")
    storyboard_parser.add_argument("--project", default=".", help="Project directory (default: current directory)")
    
    # Puppet Layer command
    puppet_layer_parser = subparsers.add_parser("puppet-layer", help="Generate puppet rigs and layer files (L0-L8) for AI generation")
    puppet_layer_parser.add_argument("--project", default=".", help="Project directory (default: current directory)")
    
    # ComfyUI Image Generation command
    image_gen_parser = subparsers.add_parser("generate-images", help="Generate final keyframe images using ComfyUI AI backend")
    image_gen_parser.add_argument("--project", default=".", help="Project directory (default: current directory)")
    image_gen_parser.add_argument("--comfyui-url", default="http://127.0.0.1:8188", help="ComfyUI server URL (default: http://127.0.0.1:8188)")
    image_gen_parser.add_argument("--mock-mode", action="store_true", help="Force mock mode for demonstration (default: auto-detect)")
    image_gen_parser.add_argument("--real-mode", action="store_true", help="Force real ComfyUI mode (requires running ComfyUI server)")
    
    # Video Generation command
    video_gen_parser = subparsers.add_parser("generate-video", help="Generate video sequences from keyframes with camera movement")
    video_gen_parser.add_argument("--project", default=".", help="Project directory (default: current directory)")
    video_gen_parser.add_argument("--shot", help="Generate specific shot (default: all shots)")
    video_gen_parser.add_argument("--config", help="Path to video configuration file")
    video_gen_parser.add_argument("--preset", choices=["fast", "balanced", "quality", "ultra"], help="Use configuration preset")
    video_gen_parser.add_argument("--frame-rate", type=int, choices=[24, 25, 30, 60], help="Override frame rate")
    video_gen_parser.add_argument("--resolution", help="Override resolution (e.g., 1920x1080)")
    video_gen_parser.add_argument("--mock-mode", action="store_true", help="Force mock mode for demonstration")
    
    # World Generation command
    world_gen_parser = subparsers.add_parser("world-generate", help="Generate world with geography, culture, and visual identity")
    world_gen_parser.add_argument("--project", default=".", help="Project directory (default: current directory)")
    world_gen_parser.add_argument("--genre", help="Genre for world generation (fantasy, sci-fi, historical, modern)")
    world_gen_parser.add_argument("--world-type", help="Specific world type override (e.g., cyberpunk, medieval-fantasy)")

    # Audio Generation command
    audio_gen_parser = subparsers.add_parser("generate-audio", help="Generate complete soundscape with dialogue, SFX, ambience, and music")
    audio_gen_parser.add_argument("--project", default=".", help="Project directory (default: current directory)")
    audio_gen_parser.add_argument("--quality", choices=["draft", "standard", "professional", "broadcast"],
                                 default="standard", help="Audio quality level (default: standard)")
    audio_gen_parser.add_argument("--export-stems", action="store_true", help="Export individual track stems")
    audio_gen_parser.add_argument("--mock-mode", action="store_true", help="Force mock mode for demonstration")
    
    # ComfyUI Service Management commands
    comfyui_parser = subparsers.add_parser("comfyui", help="ComfyUI service management")
    comfyui_subparsers = comfyui_parser.add_subparsers(dest="comfyui_command", help="ComfyUI service commands")
    
    # ComfyUI start command
    comfyui_start_parser = comfyui_subparsers.add_parser("start", help="Start ComfyUI service")
    comfyui_start_parser.add_argument("--comfyui-url", default="http://127.0.0.1:8188", help="ComfyUI server URL (default: http://127.0.0.1:8188)")
    
    # ComfyUI stop command
    comfyui_stop_parser = comfyui_subparsers.add_parser("stop", help="Stop ComfyUI service")
    comfyui_stop_parser.add_argument("--comfyui-url", default="http://127.0.0.1:8188", help="ComfyUI server URL (default: http://127.0.0.1:8188)")
    
    # ComfyUI status command
    comfyui_status_parser = comfyui_subparsers.add_parser("status", help="Check ComfyUI service status")
    comfyui_status_parser.add_argument("--comfyui-url", default="http://127.0.0.1:8188", help="ComfyUI server URL (default: http://127.0.0.1:8188)")
    
    # ComfyUI restart command
    comfyui_restart_parser = comfyui_subparsers.add_parser("restart", help="Restart ComfyUI service")
    comfyui_restart_parser.add_argument("--comfyui-url", default="http://127.0.0.1:8188", help="ComfyUI server URL (default: http://127.0.0.1:8188)")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    try:
        if args.command == "init":
            handle_init(args)
        elif args.command == "validate":
            handle_validate(args)
        elif args.command == "export":
            handle_export(args)
        elif args.command == "qa":
            handle_qa(args)
        elif args.command == "grid":
            handle_grid(args)
        elif args.command == "promote":
            handle_promote(args)
        elif args.command == "refine":
            handle_refine(args)
        elif args.command == "compare":
            handle_compare(args)
        elif args.command == "dashboard":
            handle_dashboard(args)
        elif args.command == "narrative":
            handle_narrative(args)
        elif args.command == "video-plan":
            handle_video_plan(args)
        elif args.command == "script":
            handle_script(args)
        elif args.command == "scene-breakdown":
            handle_scene_breakdown(args)
        elif args.command == "shot-planning":
            handle_shot_planning(args)
        elif args.command == "storyboard":
            handle_storyboard(args)
        elif args.command == "puppet-layer":
            handle_puppet_layer(args)
        elif args.command == "generate-images":
            handle_generate_images(args)
        elif args.command == "generate-video":
            handle_generate_video(args)
        elif args.command == "world-generate":
            handle_world_generate(args)
        elif args.command == "generate-audio":
            handle_generate_audio(args)
        elif args.command == "comfyui":
            handle_comfyui_service(args)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


def handle_init(args):
    """Handle init command."""
    
    # Check if we should use interactive wizard
    use_wizard = args.interactive or args.project_name is None
    
    if use_wizard:
        # Use interactive wizard
        from wizard.wizard_orchestrator import run_interactive_wizard
        from wizard.config_builder import build_project_configuration
        from wizard.file_writer import create_project_files
        
        print("🎬 StoryCore-Engine Interactive Project Setup")
        print("=" * 50)
        
        # Run wizard
        wizard_state = run_interactive_wizard(args.path)
        
        if wizard_state is None:
            print("Project creation cancelled.")
            return
        
        # Build configuration
        config = build_project_configuration(wizard_state)
        
        # Create project files
        success = create_project_files(config, args.path)
        
        if success:
            project_path = Path(args.path) / config.project_name
            print(f"\n🎉 Project '{config.project_name}' created successfully!")
            print(f"📁 Location: {project_path.absolute()}")
            print(f"📋 Files created:")
            print(f"   ✓ project.json (main configuration)")
            print(f"   ✓ README.md (project documentation)")
            print(f"   ✓ Directory structure (assets, exports, etc.)")
            print(f"\n🚀 Next steps:")
            print(f"   cd {config.project_name}")
            print(f"   storycore grid")
            print(f"   storycore promote")
            print(f"   storycore qa")
            print(f"   storycore export")
        else:
            print("❌ Failed to create project files.")
            sys.exit(1)
    
    else:
        # Use legacy mode
        from project_manager import ProjectManager
        
        pm = ProjectManager()
        pm.init_project(args.project_name, args.path)
        
        project_path = Path(args.path) / args.project_name
        print(f"✓ Project '{args.project_name}' initialized successfully")
        print(f"  Location: {project_path.absolute()}")
        print(f"  Files created:")
        print(f"    - project.json")
        print(f"    - storyboard.json")
        print(f"    - assets/images/")
        print(f"    - assets/audio/")


def handle_validate(args):
    """Handle validate command."""
    from validator import Validator, ValidationError
    
    validator = Validator()
    project_path = Path(args.project)
    
    print(f"Validating project in: {project_path.absolute()}")
    
    try:
        results = validator.validate_project_directory(str(project_path))
        
        all_passed = True
        for filename, result in results.items():
            if result is True:
                print(f"✓ {filename}: PASSED")
            else:
                print(f"✗ {filename}: {result}")
                all_passed = False
        
        if all_passed:
            print("\n✓ All validations passed!")
        else:
            print("\n✗ Some validations failed")
            sys.exit(1)
            
    except Exception as e:
        print(f"✗ Validation error: {e}")
        sys.exit(1)


def handle_export(args):
    """Handle export command."""
    from exporter import Exporter
    
    exporter = Exporter()
    project_path = Path(args.project)
    
    if not project_path.exists():
        print(f"✗ Project directory not found: {project_path}")
        sys.exit(1)
    
    print(f"Exporting project from: {project_path.absolute()}")
    
    try:
        export_dir = exporter.export_project(str(project_path), args.output)
        print(f"✓ Project exported successfully")
        print(f"  Export location: {Path(export_dir).absolute()}")
        print(f"  Files exported:")
        
        # List exported files
        export_path = Path(export_dir)
        for file in export_path.iterdir():
            if file.is_file():
                print(f"    - {file.name}")
                
    except Exception as e:
        print(f"✗ Export error: {e}")
        sys.exit(1)


def handle_qa(args):
    """Handle QA command."""
    from qa_engine import QAEngine
    
    qa_engine = QAEngine()
    project_path = Path(args.project)
    
    if not project_path.exists():
        print(f"✗ Project directory not found: {project_path}")
        sys.exit(1)
    
    print(f"Running QA scoring on: {project_path.absolute()}")
    
    try:
        qa_report = qa_engine.run_qa_scoring(str(project_path))
        
        # Print results
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
            for issue in qa_report["issues"]:
                print(f"  - {issue['description']}")
                print(f"    Fix: {issue['suggested_fix']}")
        
        if not qa_report["passed"]:
            sys.exit(1)
            
    except Exception as e:
        print(f"✗ QA scoring error: {e}")
        sys.exit(1)


def handle_grid(args):
    """Handle grid command."""
    from grid_generator import GridGenerator
    
    generator = GridGenerator()
    project_path = Path(args.project)
    
    if not project_path.exists():
        print(f"✗ Project directory not found: {project_path}")
        sys.exit(1)
    
    # Validate grid specification
    if args.grid not in ["3x3", "1x2", "1x4"]:
        print(f"✗ Unsupported grid specification: {args.grid}")
        print("  Supported: 3x3, 1x2, 1x4")
        sys.exit(1)
    
    print(f"Generating {args.grid} grid for project: {project_path.absolute()}")
    print(f"Cell size: {args.cell_size}px")
    
    # Show cell dimensions for non-square grids
    if args.grid in ["1x2", "1x4"]:
        cell_width = round(args.cell_size * 16 / 9)
        print(f"Cell dimensions: {cell_width}x{args.cell_size}px (16:9 aspect)")
    
    try:
        grid_path = generator.generate_grid(
            str(project_path), 
            args.grid,
            args.out, 
            args.cell_size
        )
        
        # Calculate number of panels
        cols, rows = map(int, args.grid.split('x'))
        total_panels = cols * rows
        
        print(f"✓ Grid generated successfully")
        print(f"  Grid: {grid_path}")
        print(f"  Panels: assets/images/panels/panel_01.ppm ... panel_{total_panels:02d}.ppm")
        print(f"  Updated project.json asset manifest")
        
    except Exception as e:
        print(f"✗ Grid generation error: {e}")
        sys.exit(1)


def handle_promote(args):
    """Handle promote command."""
    from promotion_engine import promote_panels, update_project_manifest
    
    project_path = Path(args.project)
    
    if not project_path.exists():
        print(f"✗ Project directory not found: {project_path}")
        sys.exit(1)
    
    print(f"Promoting panels in project: {project_path.absolute()}")
    print(f"Scale factor: {args.scale}x")
    print(f"Method: {args.method}")
    
    try:
        result = promote_panels(project_path, args.scale, args.method)
        
        print(f"✓ Promoted {result['metadata']['total_panels']} panels successfully")
        
        # Show resolution changes
        for i, (original, promoted) in enumerate(result['resolutions'], 1):
            print(f"  Panel {i:02d}: {original[0]}x{original[1]} → {promoted[0]}x{promoted[1]}")
        
        print(f"  Output directory: {result['output_dir']}")
        
        # Update project manifest
        update_project_manifest(project_path, result['metadata'])
        print(f"  Updated project.json asset manifest")
        print(f"  Project status: promoted")
        
    except Exception as e:
        print(f"✗ Promotion error: {e}")
        sys.exit(1)


def handle_refine(args):
    """Handle refine command."""
    from refinement_engine import refine_images, update_project_manifest_refined
    
    project_path = Path(args.project)
    
    if not project_path.exists():
        print(f"✗ Project directory not found: {project_path}")
        sys.exit(1)
    
    print(f"Refining images in project: {project_path.absolute()}")
    print(f"Input source: {args.input}")
    print(f"Mode: {args.mode}")
    print(f"Strength: {args.strength}")
    if args.metrics:
        print("Computing sharpness metrics...")
    
    try:
        result = refine_images(project_path, args.input, args.mode, args.strength, args.metrics)
        
        print(f"✓ Refined {result['metadata']['total_panels']} panels successfully")
        print(f"  Input source: {result['input_source']}")
        
        # Show resolution info
        for i, resolution in enumerate(result['resolutions'], 1):
            print(f"  Panel {i:02d}: {resolution[0]}x{resolution[1]} (enhanced)")
        
        print(f"  Output directory: {result['output_dir']}")
        
        # Update project manifest
        update_project_manifest_refined(project_path, result['metadata'])
        print(f"  Updated project.json asset manifest")
        print(f"  Project status: refined")
        
        # Display metrics summary if computed
        if args.metrics and result['panel_metrics']:
            print(f"\n📊 Sharpness Metrics Summary:")
            improvements = [m["improvement_percent"] for m in result['panel_metrics']]
            print(f"  Min improvement: {min(improvements):+.1f}%")
            print(f"  Mean improvement: {sum(improvements)/len(improvements):+.1f}%")
            print(f"  Max improvement: {max(improvements):+.1f}%")
            
            # Show per-panel details
            print(f"\n  Per-panel details:")
            for metric in result['panel_metrics']:
                print(f"    {metric['panel']}: {metric['sharpness_before']:.1f} → {metric['sharpness_after']:.1f} ({metric['improvement_percent']:+.1f}%)")
        
    except Exception as e:
        print(f"✗ Refinement error: {e}")
        sys.exit(1)


def handle_compare(args):
    """Handle compare command."""
    from comparison_engine import create_comparison_images, update_project_manifest_comparison
    
    project_path = Path(args.project)
    
    if not project_path.exists():
        print(f"✗ Project directory not found: {project_path}")
        sys.exit(1)
    
    print(f"Creating comparisons for project: {project_path.absolute()}")
    print(f"Panel(s): {args.panel}")
    print(f"Mode: {args.mode}")
    print(f"Output directory: {args.out}")
    
    try:
        result = create_comparison_images(project_path, args.panel, args.mode, args.out)
        
        print(f"✓ Created {len(result['comparison_assets'])} comparison(s) successfully")
        
        # Show created files
        for asset in result['comparison_assets']:
            print(f"  {asset['path']}")
        
        print(f"  Output directory: {result['output_dir']}")
        
        # Update project manifest
        update_project_manifest_comparison(project_path, result)
        print(f"  Updated project.json asset manifest")
        
    except Exception as e:
        print(f"✗ Comparison error: {e}")
        sys.exit(1)


def handle_video_plan(args):
    """Handle video-plan command."""
    from video_plan_engine import VideoPlanEngine
    
    project_path = Path(args.project)
    
    if not project_path.exists():
        print(f"✗ Project directory not found: {project_path}")
        sys.exit(1)
    
    print(f"Generating video plan for project: {project_path.absolute()}")
    
    try:
        engine = VideoPlanEngine()
        result = engine.generate_video_plan(project_path)
        
        print(f"✓ Video plan generated successfully")
        print(f"  Total shots: {result['total_shots']}")
        print(f"  Total duration: {result['total_duration']:.1f} seconds")
        
        # Show camera movement summary
        if result['camera_movements']:
            print(f"  Camera movements:")
            for movement, count in result['camera_movements'].items():
                print(f"    {movement}: {count} shot(s)")
        
        print(f"  Video plan saved: video_plan.json")
        print(f"  Updated project.json manifest")
        
    except Exception as e:
        print(f"✗ Video plan generation error: {e}")
        sys.exit(1)


def handle_narrative(args):
    """Handle narrative command."""
    from narrative_engine import NarrativeEngine
    
    project_path = Path(args.project)
    
    if not project_path.exists():
        print(f"✗ Project directory not found: {project_path}")
        sys.exit(1)
    
    print(f"Processing narrative for project: {project_path.absolute()}")
    
    try:
        engine = NarrativeEngine()
        result = engine.process_storyboard(project_path)
        
        print(f"✓ Narrative processing completed")
        print(f"  Shots processed: {result['shots_processed']}")
        
        # Show global style
        if result['global_style']:
            print(f"  Global style extracted:")
            for category, value in result['global_style'].items():
                print(f"    {category.title()}: {value}")
        
        # Show consistency issues
        if result['consistency_issues']:
            print(f"  Consistency issues found: {len(result['consistency_issues'])}")
            for issue in result['consistency_issues'][:3]:  # Show first 3
                print(f"    - {issue['description']}")
            if len(result['consistency_issues']) > 3:
                print(f"    ... and {len(result['consistency_issues']) - 3} more issues")
        else:
            print(f"  No consistency issues found")
        
        print(f"  Updated storyboard.json with augmented prompts")
        print(f"  Updated project.json with global style metadata")
        
    except Exception as e:
        print(f"✗ Narrative processing error: {e}")
        sys.exit(1)


def handle_dashboard(args):
    """Handle dashboard command."""
    from exporter import generate_dashboard
    
    project_path = Path(args.project)
    
    if not project_path.exists():
        print(f"✗ Project directory not found: {project_path}")
        sys.exit(1)
    
    print(f"Generating dashboard for project: {project_path.absolute()}")
    
    try:
        dashboard_path = generate_dashboard(project_path)
        print(f"✓ Dashboard generated successfully")
        print(f"  Location: {dashboard_path}")
        print(f"  Open in browser: file://{dashboard_path.absolute()}")
        
    except Exception as e:
        print(f"✗ Dashboard generation error: {e}")
        sys.exit(1)


def handle_shot_planning(args):
    """Handle shot-planning command."""
    from shot_engine import ShotEngine
    
    project_path = Path(args.project)
    
    if not project_path.exists():
        print(f"✗ Project directory not found: {project_path}")
        sys.exit(1)
    
    print(f"Processing shot planning for project: {project_path.absolute()}")
    
    try:
        engine = ShotEngine()
        result = engine.process_shot_planning(project_path)
        
        print(f"✓ Shot planning processing completed")
        print(f"  Planning ID: {result['shot_planning_id']}")
        print(f"  Total shots: {result['processing_metadata']['total_shots']}")
        print(f"  Average shot duration: {result['processing_metadata']['average_shot_duration']:.1f} seconds")
        print(f"  Shot variety score: {result['processing_metadata']['shot_variety_score']:.1f}/5.0")
        print(f"  Camera complexity: {result['processing_metadata']['camera_complexity_score']:.1f}/5.0")
        
        # Show cinematic grammar analysis
        if result['cinematic_grammar']:
            grammar = result['cinematic_grammar']
            print(f"\n  Cinematic grammar analysis:")
            print(f"    Style: {grammar['cinematic_style']}")
            print(f"    Coverage complete: {grammar['coverage_completeness']['coverage_complete']}")
            print(f"    Visual rhythm: {grammar['visual_rhythm']['rhythm']} ({grammar['visual_rhythm']['tempo']} tempo)")
        
        # Show shot type distribution
        if result['cinematic_grammar']['shot_type_distribution']:
            print(f"\n  Shot type distribution:")
            for shot_type, percentage in result['cinematic_grammar']['shot_type_distribution'].items():
                print(f"    {shot_type}: {percentage:.1f}%")
        
        # Show camera specifications
        if result['camera_specifications']:
            specs = result['camera_specifications']
            print(f"\n  Camera requirements:")
            print(f"    Movement complexity: {specs['movement_requirements']['complexity_level']}")
            print(f"    Primary lens: {specs['lens_requirements']['primary_lens']}")
            print(f"    Equipment needed: {', '.join(specs['movement_requirements']['equipment_needed'])}")
        
        print(f"\n  Shot planning saved: shot_planning.json")
        print(f"  Updated project.json with shot planning results")
        
    except Exception as e:
        print(f"✗ Shot planning processing error: {e}")
        sys.exit(1)


def handle_scene_breakdown(args):
    """Handle scene-breakdown command."""
    from scene_breakdown_engine import SceneBreakdownEngine
    
    project_path = Path(args.project)
    
    if not project_path.exists():
        print(f"✗ Project directory not found: {project_path}")
        sys.exit(1)
    
    print(f"Processing scene breakdown for project: {project_path.absolute()}")
    
    try:
        engine = SceneBreakdownEngine()
        result = engine.process_scene_breakdown(project_path)
        
        print(f"✓ Scene breakdown processing completed")
        print(f"  Breakdown ID: {result['scene_breakdown_id']}")
        print(f"  Total scenes processed: {result['processing_metadata']['total_scenes_processed']}")
        print(f"  Average complexity: {result['processing_metadata']['average_scene_complexity']:.1f}/5.0")
        print(f"  Lighting consistency: {result['processing_metadata']['lighting_consistency_score']:.1f}/5.0")
        print(f"  Color harmony: {result['processing_metadata']['color_harmony_score']:.1f}/5.0")
        
        # Show detailed scene information
        if result['detailed_scenes']:
            print(f"\n  Detailed scene breakdown:")
            for scene in result['detailed_scenes']:
                print(f"    {scene['scene_id']}: {scene['title']}")
                print(f"      Purpose: {scene['scene_purpose']['primary']} ({scene['scene_purpose']['cinematic_function']})")
                print(f"      Environment: {scene['environment']['type']} at {scene['environment']['time_of_day']}")
                print(f"      Lighting: {scene['lighting']['primary_light']['type']} ({scene['lighting']['primary_light']['direction']})")
                print(f"      Characters: {len(scene['characters'])} present")
                print(f"      Key beats: {len(scene['key_beats'])}")
        
        # Show global cinematic rules
        if result['global_cinematic_rules']:
            print(f"\n  Global cinematic rules established:")
            rules = result['global_cinematic_rules']
            print(f"    Visual consistency: {rules['visual_consistency']['style_anchor']}")
            print(f"    Color harmony: {rules['visual_consistency']['color_harmony']}")
            print(f"    Lighting logic: {rules['visual_consistency']['lighting_logic']}")
        
        print(f"\n  Scene breakdown saved: scene_breakdown.json")
        print(f"  Updated project.json with breakdown processing results")
        
    except Exception as e:
        print(f"✗ Scene breakdown processing error: {e}")
        sys.exit(1)


def handle_script(args):
    """Handle script command."""
    from script_engine import ScriptEngine

    project_path = Path(args.project)

    if not project_path.exists():
        print(f"✗ Project directory not found: {project_path}")
        sys.exit(1)

    print(f"Processing script for project: {project_path.absolute()}")

    # Get script text from various sources
    script_text = None

    if args.text:
        script_text = args.text
        print("Using script text from command line argument")
    elif args.input:
        input_path = Path(args.input)
        if not input_path.exists():
            print(f"✗ Input file not found: {input_path}")
            sys.exit(1)
        with open(input_path, 'r', encoding='utf-8') as f:
            script_text = f.read()
        print(f"Loaded script from: {input_path}")
    else:
        # Interactive input
        print("Enter your script text (press Ctrl+D or Ctrl+Z when finished):")
        lines = []
        try:
            while True:
                line = input()
                lines.append(line)
        except EOFError:
            script_text = '\n'.join(lines)

        if not script_text.strip():
            print("✗ No script text provided")
            sys.exit(1)

    try:
        engine = ScriptEngine()
        result = engine.process_script(script_text, project_path)

        print(f"✓ Script processing completed")
        print(f"  Script ID: {result['script_id']}")
        print(f"  Total scenes: {result['processing_metadata']['total_scenes']}")
        print(f"  Total characters: {result['processing_metadata']['total_characters']}")
        print(f"  Estimated duration: {result['processing_metadata']['estimated_duration_seconds']} seconds")
        print(f"  Complexity score: {result['processing_metadata']['complexity_score']:.1f}/5.0")

        # Show extracted scenes
        if result['narrative_structure']['scenes']:
            print(f"\n  Extracted scenes:")
            for scene in result['narrative_structure']['scenes']:
                print(f"    {scene['scene_id']}: {scene['title']}")
                print(f"      Location: {scene['location']}, Time: {scene['time_of_day']}")
                print(f"      Tone: {scene['emotional_tone']}")

        # Show extracted characters
        if result['narrative_structure']['characters']:
            print(f"\n  Extracted characters:")
            for character in result['narrative_structure']['characters']:
                print(f"    {character['character_id']}: {character['name']}")
                print(f"      Type: {character['character_type']}")

        print(f"\n  Script metadata saved: script_metadata.json")
        print(f"  Updated project.json with script processing results")

    except Exception as e:
        print(f"✗ Script processing error: {e}")
        sys.exit(1)


def handle_world_generate(args):
    """Handle world-generate command."""
    try:
        # Lazy import to avoid loading large data structures at startup
        from world_generation_engine import WorldGenerationEngine
    except ImportError as e:
        print(f"✗ Failed to import WorldGenerationEngine: {e}")
        print("  Make sure world_generation_engine.py is in the src directory")
        sys.exit(1)

    project_path = Path(args.project)

    if not project_path.exists():
        print(f"✗ Project directory not found: {project_path}")
        sys.exit(1)

    print(f"Generating world for project: {project_path.absolute()}")

    try:
        # Load project data to get seed and genre
        project_file = project_path / "project.json"
        if not project_file.exists():
            print(f"✗ project.json not found in {project_path}")
            sys.exit(1)

        with open(project_file, 'r') as f:
            project_data = json.load(f)

        # Get seed and genre from project
        project_seed = project_data.get('config', {}).get('global_seed')
        if not project_seed:
            print("✗ No global_seed found in project.json")
            sys.exit(1)

        # Determine genre - use from args or extract from project
        genre = args.genre
        if not genre:
            # Try to extract from project config or use default
            genre = project_data.get('config', {}).get('genre', 'fantasy')

        print(f"  Using seed: {project_seed}")
        print(f"  Genre: {genre}")
        if args.world_type:
            print(f"  World type override: {args.world_type}")

        # Initialize world generation engine
        print("  Initializing world generation engine...")
        engine = WorldGenerationEngine()
        print("  Engine initialized successfully")

        # Generate world
        print("  Generating world data...")
        world_data = engine.generate_world(
            project_seed=project_seed,
            genre=genre,
            world_type=args.world_type
        )
        print("  World data generated successfully")

        # Save world data
        world_file = engine.save_world(world_data, project_path)

        # Update project.json with world reference
        project_data['world_id'] = world_data['world_id']
        project_data['coherence_anchors']['world_id'] = world_data['world_id']
        project_data['updated_at'] = datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z"

        with open(project_file, 'w') as f:
            json.dump(project_data, f, indent=2)

        print(f"✓ World generation completed")
        print(f"  World ID: {world_data['world_id']}")
        print(f"  World Name: {world_data['name']}")
        print(f"  Type: {world_data['type']}")
        print(f"  Genre: {world_data['genre']}")

        # Show key world details
        geo = world_data['geography']
        print(f"\n  Geography:")
        print(f"    Scale: {geo['scale']}")
        print(f"    Locations: {', '.join(geo['locations'][:3])}")
        print(f"    Terrain: {', '.join(geo['terrain'])}")
        print(f"    Climate: {geo['climate']}")

        culture = world_data['culture']
        print(f"\n  Culture:")
        print(f"    Societies: {', '.join(culture['societies'])}")
        print(f"    Technology: {culture['technology_level']}")
        print(f"    Structure: {culture['social_structure']}")

        atmosphere = world_data['atmosphere']
        print(f"\n  Atmosphere:")
        print(f"    Mood: {atmosphere['mood']}")
        print(f"    Time Period: {atmosphere['time_period']}")
        print(f"    Sensory Details: {', '.join(atmosphere['sensory_details'][:3])}")

        visual = world_data['visual_identity']
        print(f"\n  Visual Identity:")
        print(f"    Architecture: {visual['architectural_style']}")
        print(f"    Lighting: {visual['lighting_characteristics']}")
        print(f"    Primary Colors: {', '.join(visual['color_palette']['primary'])}")

        print(f"\n  Files updated:")
        print(f"    - world.json (created)")
        print(f"    - project.json (updated with world reference)")

        print(f"\n💡 Next steps:")
        print(f"   • Run 'storycore character-generate' to create characters")
        print(f"   • Run 'storycore story-generate' to create story")
        print(f"   • Run 'storycore grid' to begin visual generation")

    except Exception as e:
        print(f"✗ World generation error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


def handle_storyboard(args):
    """Handle storyboard command."""
    from storyboard_engine import StoryboardEngine
    
    project_path = Path(args.project)
    
    if not project_path.exists():
        print(f"✗ Project directory not found: {project_path}")
        sys.exit(1)
    
    print(f"Processing storyboard generation for project: {project_path.absolute()}")
    
    try:
        engine = StoryboardEngine()
        result = engine.process_storyboard_generation(project_path)
        
        print(f"✓ Storyboard generation completed")
        print(f"  Storyboard ID: {result['storyboard_id']}")
        print(f"  Total frames: {result['processing_metadata']['total_frames']}")
        print(f"  Composition complexity: {result['processing_metadata']['composition_complexity']:.1f}/5.0")
        print(f"  Puppet count: {result['processing_metadata']['puppet_count']}")
        print(f"  Visual consistency: {result['processing_metadata']['visual_consistency_score']:.1f}/5.0")
        
        # Show visual composition analysis
        if result['visual_composition_rules']:
            rules = result['visual_composition_rules']
            print(f"\n  Visual composition analysis:")
            print(f"    Primary system: {rules['primary_composition_system']}")
            print(f"    Consistency score: {rules['composition_consistency_score']:.1f}")
            print(f"    Visual rhythm: {rules['visual_rhythm']['rhythm_type']}")
        
        # Show puppet placement analysis
        if result['puppet_placement_system']:
            puppet_system = result['puppet_placement_system']
            print(f"\n  Puppet placement analysis:")
            print(f"    Total placements: {puppet_system['total_character_placements']}")
            print(f"    Unique characters: {puppet_system['unique_characters']}")
            if puppet_system['depth_layer_usage']:
                print(f"    Depth distribution: {puppet_system['depth_layer_usage']}")
        
        # Show layer system analysis
        if result['layer_placeholders']:
            layer_system = result['layer_placeholders']
            print(f"\n  Layer system analysis:")
            print(f"    Layer system: {layer_system['layer_system']}")
            print(f"    Most used layers: {', '.join(layer_system['most_used_layers'][:3])}")
            print(f"    Generation priority: {', '.join(layer_system['generation_priority_order'][:3])}")
        
        # Show camera and lighting analysis
        if result['camera_guide_system']:
            camera_system = result['camera_guide_system']
            print(f"\n  Camera system analysis:")
            print(f"    Total guides: {camera_system['total_guide_elements']}")
            if camera_system['camera_movement_analysis']:
                movement = camera_system['camera_movement_analysis']
                print(f"    Static ratio: {movement['static_ratio']:.1%}")
                print(f"    Dynamic ratio: {movement['dynamic_ratio']:.1%}")
        
        if result['lighting_guide_system']:
            lighting_system = result['lighting_guide_system']
            print(f"\n  Lighting system analysis:")
            print(f"    Total elements: {lighting_system['total_lighting_elements']}")
            print(f"    Consistency score: {lighting_system['lighting_consistency_score']:.1f}")
            print(f"    Primary setup: {lighting_system['primary_lighting_setup']}")
        
        print(f"\n  Storyboard visual saved: storyboard_visual.json")
        print(f"  Updated project.json with storyboard results")
        
    except Exception as e:
        print(f"✗ Storyboard generation error: {e}")
        sys.exit(1)


def handle_puppet_layer(args):
    """Handle puppet-layer command."""
    from puppet_layer_engine import PuppetLayerEngine
    
    project_path = Path(args.project)
    
    if not project_path.exists():
        print(f"✗ Project directory not found: {project_path}")
        sys.exit(1)
    
    print(f"Processing puppet & layer generation for project: {project_path.absolute()}")
    
    try:
        engine = PuppetLayerEngine()
        result = engine.process_puppet_layer_generation(project_path)
        
        print(f"✓ Puppet & layer generation completed")
        print(f"  Puppet Layer ID: {result['puppet_layer_id']}")
        print(f"  Total puppet rigs: {result['processing_metadata']['total_puppet_rigs']}")
        print(f"  Total layer files: {result['processing_metadata']['total_layer_files']}")
        print(f"  Unique characters: {result['processing_metadata']['unique_characters']}")
        print(f"  Layer complexity: {result['processing_metadata']['layer_complexity_score']:.1f}/5.0")
        print(f"  Puppet consistency: {result['processing_metadata']['puppet_consistency_score']:.1f}/5.0")
        
        # Show puppet rig analysis
        if result['pose_metadata']:
            pose_meta = result['pose_metadata']
            print(f"\n  Puppet rig analysis:")
            print(f"    Total characters: {pose_meta['total_characters']}")
            print(f"    Total poses: {pose_meta['total_poses']}")
            if pose_meta['global_pose_analysis']:
                global_analysis = pose_meta['global_pose_analysis']
                print(f"    Most common pose: {global_analysis['most_common_pose']}")
                print(f"    Pose variety: {global_analysis['pose_variety_score']:.1f}/5.0")
        
        # Show layer system analysis
        if result['generation_control_structure']:
            control = result['generation_control_structure']
            print(f"\n  Layer system analysis:")
            print(f"    Total frames: {control['total_frames']}")
            print(f"    Generation order: {len(control['generation_order'])} sequences")
            if control['optimization_hints']:
                hints = control['optimization_hints']
                print(f"    Batch opportunities: {len(hints['batch_processing'])}")
                print(f"    Cache opportunities: {len(hints['cache_reuse'])}")
                print(f"    Parallel opportunities: {len(hints['parallel_execution'])}")
        
        # Show camera metadata analysis
        if result['camera_metadata']:
            camera_meta = result['camera_metadata']
            print(f"\n  Camera system analysis:")
            print(f"    Total camera frames: {camera_meta['total_camera_frames']}")
            if camera_meta['camera_analysis']:
                analysis = camera_meta['camera_analysis']
                print(f"    Movement complexity: {analysis['movement_complexity']:.1f}/5.0")
                print(f"    Shot variety: {analysis['shot_variety']:.1f}/5.0")
        
        # Show lighting metadata analysis
        if result['lighting_metadata']:
            lighting_meta = result['lighting_metadata']
            print(f"\n  Lighting system analysis:")
            print(f"    Total lighting frames: {lighting_meta['total_lighting_frames']}")
            if lighting_meta['lighting_analysis']:
                analysis = lighting_meta['lighting_analysis']
                print(f"    Consistency score: {analysis['consistency_score']:.1f}/5.0")
                print(f"    Primary setup: {analysis['primary_setup']}")
        
        # Show audio markers analysis
        if result['audio_markers']:
            audio_meta = result['audio_markers']
            print(f"\n  Audio synchronization analysis:")
            print(f"    Total markers: {audio_meta['total_markers']}")
            print(f"    Total duration: {audio_meta['total_duration']:.1f} seconds")
            if audio_meta['synchronization_analysis']:
                sync_analysis = audio_meta['synchronization_analysis']
                print(f"    Sync complexity: {sync_analysis['sync_complexity']:.1f}/5.0")
                print(f"    Dialogue density: {sync_analysis['dialogue_density']:.1%}")
                print(f"    Audio variety: {sync_analysis['audio_variety']:.1f}/5.0")
        
        print(f"\n  Puppet & layer metadata saved: puppet_layer_metadata.json")
        print(f"  Updated project.json with puppet layer results")
        
    except Exception as e:
        print(f"✗ Puppet & layer generation error: {e}")
        sys.exit(1)


def handle_generate_images(args):
    """Handle generate-images command."""
    from comfyui_image_engine import ComfyUIImageEngine
    
    project_path = Path(args.project)
    
    if not project_path.exists():
        print(f"✗ Project directory not found: {project_path}")
        sys.exit(1)
    
    # Determine mode
    if args.mock_mode:
        print("Mock mode enabled - generating demonstration results")
    elif args.real_mode:
        print("Real mode enabled - connecting to ComfyUI backend")
    
    print(f"Generating keyframe images for project: {project_path.absolute()}")
    if not args.mock_mode:
        print(f"ComfyUI URL: {args.comfyui_url}")
    
    try:
        engine = ComfyUIImageEngine(comfyui_url=args.comfyui_url)
        
        # Set mock mode based on arguments
        if args.mock_mode:
            engine.mock_mode = True
        elif args.real_mode:
            engine.mock_mode = False
        # Otherwise, let the engine auto-detect
        
        result = engine.process_image_generation(project_path)
        
        print(f"✓ Image generation completed")
        print(f"  Generation ID: {result['image_generation_id']}")
        print(f"  Mode: {'Mock (Demo)' if result['comfyui_mode'] == 'mock' else 'Real (ComfyUI)'}")
        print(f"  Total frames generated: {result['processing_metadata']['total_frames_generated']}")
        print(f"  Total images generated: {result['processing_metadata']['total_images_generated']}")
        print(f"  Average generation time: {result['processing_metadata']['average_generation_time']:.1f}s per frame")
        print(f"  Success rate: {result['processing_metadata']['success_rate']:.1%}")
        print(f"  Quality score: {result['processing_metadata']['quality_score']:.1f}/5.0")
        
        # Show workflow analysis
        if result['workflow_metadata']:
            workflow_meta = result['workflow_metadata']
            print(f"\n  Workflow analysis:")
            print(f"    Total workflows executed: {workflow_meta['total_workflows_executed']}")
            print(f"    Most used workflow: {workflow_meta['most_used_workflow_type']}")
            print(f"    Average complexity: {workflow_meta['average_workflow_complexity']:.1f}/5.0")
            
            # Show ControlNet usage
            controlnet_usage = workflow_meta['controlnet_usage_stats']
            if any(controlnet_usage.values()):
                print(f"    ControlNet usage:")
                for control_type, count in controlnet_usage.items():
                    if count > 0:
                        print(f"      {control_type}: {count} times")
            
            # Show IP-Adapter usage
            ip_adapter_usage = workflow_meta['ip_adapter_usage_stats']
            if any(ip_adapter_usage.values()):
                print(f"    IP-Adapter usage:")
                for adapter_type, count in ip_adapter_usage.items():
                    if count > 0:
                        print(f"      {adapter_type}: {count} times")
        
        # Show quality analysis
        if result['quality_analysis']:
            quality_analysis = result['quality_analysis']
            print(f"\n  Quality analysis:")
            print(f"    Overall quality: {quality_analysis['overall_quality_score']:.1f}/5.0")
            print(f"    Quality consistency: {quality_analysis['quality_consistency']:.1%}")
            print(f"    Success rate: {quality_analysis['average_success_rate']:.1%}")
            
            # Show quality distribution
            quality_dist = quality_analysis['quality_distribution']
            print(f"    Quality distribution:")
            print(f"      Excellent (4.5+): {quality_dist['excellent']} images")
            print(f"      Good (3.5-4.5): {quality_dist['good']} images")
            print(f"      Acceptable (2.5-3.5): {quality_dist['acceptable']} images")
            print(f"      Poor (<2.5): {quality_dist['poor']} images")
            
            # Show recommendations
            if quality_analysis['recommendations']:
                print(f"    Recommendations:")
                for rec in quality_analysis['recommendations']:
                    print(f"      • {rec}")
        
        # Show frame generation details
        if result.get('generation_results'):
            print(f"\n  Frame generation details:")
            for i, frame_result in enumerate(result['generation_results'][:3], 1):  # Show first 3 frames
                frame_meta = frame_result['generation_metadata']
                print(f"    Frame {frame_result['frame_id']}:")
                print(f"      Layers: {frame_meta['total_layers_generated']}, Puppets: {frame_meta['total_puppets_generated']}")
                print(f"      Generation time: {frame_meta['generation_time_seconds']:.1f}s")
                print(f"      Quality: {frame_meta['quality_metrics']['overall_quality']:.1f}/5.0")
            
            if len(result['generation_results']) > 3:
                remaining = len(result['generation_results']) - 3
                print(f"    ... and {remaining} more frames")
        
        print(f"\n  Image generation metadata saved: image_generation_metadata.json")
        print(f"  Updated project.json with image generation results")
        
        if result['comfyui_mode'] == 'mock':
            print(f"\n  💡 This was a demonstration run. To generate real images:")
            print(f"     1. Install and start ComfyUI server")
            print(f"     2. Run: storycore generate-images --real-mode --comfyui-url http://localhost:8188")
        
    except Exception as e:
        print(f"✗ Image generation error: {e}")
        sys.exit(1)


def handle_generate_video(args):
    """Handle generate-video command with enhanced performance monitoring and error handling."""
    import json
    from video_engine import VideoEngine, VideoConfig
    from video_config import VideoConfigManager
    from video_performance_monitor import VideoPerformanceMonitor, OptimizationStrategy
    from video_error_handling import VideoErrorHandler, ErrorHandlingContext
    
    project_path = Path(args.project)
    
    if not project_path.exists():
        print(f"✗ Project directory not found: {project_path}")
        sys.exit(1)
    
    print(f"[VIDEO] StoryCore-Engine Video Generation")
    print(f"Project: {project_path.absolute()}")
    if args.shot:
        print(f"Target shot: {args.shot}")
    if args.preset:
        print(f"Preset: {args.preset}")
    if args.mock_mode:
        print(f"Mode: Mock (demonstration)")
    print("=" * 50)
    
    # Initialize error handling
    error_handler = VideoErrorHandler()
    
    try:
        with ErrorHandlingContext(error_handler, "video_generation", 
                                {"project_path": str(project_path), "shot": args.shot}, 
                                raise_on_failure=True) as error_ctx:
            
            # Initialize configuration manager
            config_manager = VideoConfigManager()
            
            # Load configuration from file if specified
            if args.config:
                config_path = Path(args.config)
                if not config_path.exists():
                    print(f"✗ Configuration file not found: {config_path}")
                    sys.exit(1)
                
                success = config_manager.load_config(str(config_path))
                if not success:
                    print(f"✗ Failed to load configuration from: {config_path}")
                    sys.exit(1)
                print(f"[+] Configuration loaded from: {config_path}")
            
            # Apply preset if specified
            elif args.preset:
                success = config_manager.apply_preset(args.preset)
                if not success:
                    print(f"✗ Failed to apply preset: {args.preset}")
                    sys.exit(1)
                print(f"[+] Applied configuration preset: {args.preset}")
            else:
                print(f"[+] Using default balanced configuration")
            
            # Apply command-line overrides
            if args.frame_rate:
                config_manager.config.output.frame_rate = args.frame_rate
                print(f"  Frame rate override: {args.frame_rate} fps")
            
            if args.resolution:
                try:
                    width, height = map(int, args.resolution.split('x'))
                    config_manager.config.output.resolution = (width, height)
                    print(f"  Resolution override: {width}x{height}")
                except ValueError:
                    print(f"✗ Invalid resolution format: {args.resolution} (expected: WIDTHxHEIGHT)")
                    sys.exit(1)
            
            # Validate configuration
            is_valid, issues = config_manager.validate_config()
            if not is_valid:
                print(f"✗ Configuration validation failed:")
                for issue in issues:
                    print(f"    - {issue}")
                sys.exit(1)
            print(f"[+] Configuration validated successfully")
            
            # Convert to VideoConfig for engine
            video_config = VideoConfig(
                frame_rate=config_manager.config.output.frame_rate,
                resolution=config_manager.config.output.resolution,
                quality=config_manager.config.interpolation.quality.value,
                enable_motion_blur=config_manager.config.camera.enable_motion_blur,
                enable_depth_awareness=config_manager.config.interpolation.depth_awareness,
                enable_character_preservation=config_manager.config.interpolation.character_preservation,
                output_format=config_manager.config.output.format,
                parallel_processing=config_manager.config.performance.parallel_processing,
                gpu_acceleration=(config_manager.config.performance.processing_mode.value != "cpu_only")
            )
            
            # Initialize Video Engine with performance monitoring
            engine = VideoEngine(video_config)
            
            # Load project
            success = engine.load_project(str(project_path))
            if not success:
                print(f"✗ Failed to load project")
                sys.exit(1)
            
            print(f"[+] Project loaded: {len(engine.shots)} shots found")
            
            # Show configuration summary
            print(f"\nConfiguration Summary:")
            print(f"  Frame rate: {video_config.frame_rate} fps")
            print(f"  Resolution: {video_config.resolution[0]}x{video_config.resolution[1]}")
            print(f"  Quality: {video_config.quality}")
            print(f"  Motion blur: {'enabled' if video_config.enable_motion_blur else 'disabled'}")
            print(f"  Parallel processing: {'enabled' if video_config.parallel_processing else 'disabled'}")
            print(f"  GPU acceleration: {'enabled' if video_config.gpu_acceleration else 'disabled'}")
            
            # Generate video sequences
            print(f"\nStarting video generation...")
            
            if args.shot:
                # Generate specific shot
                print(f"  Generating video for shot: {args.shot}")
                result = engine.generate_video_sequence(args.shot)
                results = [result]
            else:
                # Generate all shots
                print(f"  Generating video for all shots...")
                results = engine.generate_all_sequences()
            
            # Display results
            successful_shots = [r for r in results if r.success]
            failed_shots = [r for r in results if not r.success]
            
            print(f"\n[+] Video generation completed")
            print(f"  Successful shots: {len(successful_shots)}/{len(results)}")
            
            if successful_shots:
                total_frames = sum(r.frame_count for r in successful_shots)
                total_duration = sum(r.duration for r in successful_shots)
                avg_processing_time = sum(r.processing_time for r in successful_shots) / len(successful_shots)
                
                print(f"  Total frames generated: {total_frames}")
                print(f"  Total video duration: {total_duration:.1f} seconds")
                print(f"  Average processing time: {avg_processing_time:.2f}s per shot")
                
                # Calculate performance metrics
                if total_duration > 0:
                    fps_performance = total_frames / sum(r.processing_time for r in successful_shots)
                    print(f"  Processing speed: {fps_performance:.1f} FPS")
                
                # Show quality metrics
                if successful_shots[0].quality_metrics:
                    avg_quality = sum(r.quality_metrics.get('overall_score', 0) for r in successful_shots) / len(successful_shots)
                    print(f"  Average quality score: {avg_quality:.2f}/1.0")
                
                # Show individual shot results
                print(f"\n  Shot details:")
                for result in successful_shots:
                    print(f"    {result.shot_id}: {result.frame_count} frames, {result.duration:.1f}s")
                    if result.quality_metrics:
                        quality = result.quality_metrics.get('overall_score', 0)
                        motion = result.quality_metrics.get('motion_smoothness', 0)
                        coherence = result.quality_metrics.get('temporal_coherence', 0)
                        print(f"      Quality: {quality:.2f}, Motion: {motion:.2f}, Coherence: {coherence:.2f}")
                    print(f"      Processing: {result.processing_time:.2f}s ({result.frame_count/result.processing_time:.1f} FPS)")
            
            if failed_shots:
                print(f"\n[!] Failed shots:")
                for result in failed_shots:
                    print(f"    {result.shot_id}: {result.error_message}")
            
            # Generate timeline metadata
            timeline_data = engine.get_timeline_metadata()
            print(f"\n  Timeline metadata:")
            print(f"    Total duration: {timeline_data['total_duration']:.1f} seconds")
            print(f"    Frame rate: {timeline_data['frame_rate']} fps")
            print(f"    Total frames: {timeline_data['total_frames']}")
            
            # Save timeline metadata for audio synchronization
            timeline_path = project_path / "video_timeline_metadata.json"
            with open(timeline_path, 'w') as f:
                json.dump(timeline_data, f, indent=2)
            print(f"    Timeline metadata saved: {timeline_path.name}")
            
            # Show performance report if available
            if hasattr(engine, 'performance_monitor') and engine.performance_monitor:
                perf_report = engine.get_performance_report()
                if 'overall_statistics' in perf_report:
                    stats = perf_report['overall_statistics']
                    print(f"\n  Performance Summary:")
                    print(f"    Operations tracked: {stats['total_operations']}")
                    print(f"    Success rate: {stats['success_rate']:.1f}%")
                    print(f"    Average FPS: {stats['average_fps']:.1f}")
                    print(f"    Memory usage: {stats['average_memory_usage_mb']:.0f} MB")
            
            # Show error handling statistics
            error_stats = error_handler.get_error_statistics()
            if error_stats['total_errors'] > 0:
                print(f"\n  Error Handling Summary:")
                print(f"    Total errors handled: {error_stats['total_errors']}")
                print(f"    Recovery success rate: {error_stats['recovery_success_rate']:.1f}%")
                print(f"    Error categories: {', '.join(error_stats['errors_by_category'].keys())}")
            
            # Export performance data if requested
            if not args.mock_mode and hasattr(engine, 'performance_monitor'):
                perf_export_path = project_path / "video_performance_report.json"
                engine.export_performance_data(str(perf_export_path))
                print(f"    Performance report saved: {perf_export_path.name}")
            
            # Clean up resources
            engine.cleanup_resources()
            
            if args.mock_mode or len(successful_shots) == 0:
                print(f"\n  [INFO] Video generation completed. Sequences are ready for:")
                print(f"     • Audio Engine synchronization")
                print(f"     • Final assembly and export")
                print(f"     • Quality validation and review")
            else:
                print(f"\n  [SUCCESS] Video generation successful! Ready for next pipeline stage.")
            
            # Exit with appropriate code
            if len(failed_shots) > 0:
                print(f"\n  [WARNING] Some shots failed - check error messages above")
                sys.exit(1)
        
    except Exception as e:
        print(f"[!] Video generation error: {e}")
        
        # Show error handling statistics
        error_stats = error_handler.get_error_statistics()
        if error_stats['total_errors'] > 0:
            print(f"\n  Error Recovery Attempted:")
            print(f"    Total errors: {error_stats['total_errors']}")
            print(f"    Recovery rate: {error_stats['recovery_success_rate']:.1f}%")
        
        sys.exit(1)


def handle_generate_audio(args):
    """Handle generate-audio command."""
    import json
    from pathlib import Path
    from src.audio_engine import AudioEngine, AudioQuality
    
    try:
        project_path = Path(args.project).resolve()
        
        print(f"🎵 StoryCore-Engine Audio Generation")
        print(f"Project: {project_path}")
        print(f"Quality: {args.quality}")
        print(f"Export stems: {args.export_stems}")
        print(f"Mock mode: {args.mock_mode}")
        print("=" * 50)
        
        # Validate project structure
        if not (project_path / "project.json").exists():
            print(f"✗ No project.json found in {project_path}")
            print(f"  Run 'storycore init' first to create a project")
            sys.exit(1)
        
        # Load project metadata
        with open(project_path / "project.json", 'r') as f:
            project_data = json.load(f)
        
        print(f"✓ Project loaded: {project_data.get('project_name', 'Unknown')}")
        
        # Check for required input files
        required_files = [
            "video_timeline_metadata.json",  # From video generation
            "scene_breakdown.json",          # From scene breakdown
            "character_data.json"            # From character analysis
        ]
        
        missing_files = []
        for req_file in required_files:
            if not (project_path / req_file).exists():
                missing_files.append(req_file)
        
        if missing_files:
            print(f"⚠️  Missing required files: {', '.join(missing_files)}")
            print(f"   Creating mock data for demonstration...")
            
            # Create mock timeline metadata if missing
            if "video_timeline_metadata.json" not in [f.name for f in project_path.glob("*.json")]:
                mock_timeline = {
                    "total_duration": 30.0,
                    "total_frames": 720,
                    "audio_sync_points": [
                        {"timestamp": 0.0, "type": "start", "description": "Scene start"},
                        {"timestamp": 10.0, "type": "scene_change", "description": "Scene transition"},
                        {"timestamp": 20.0, "type": "climax", "description": "Dramatic moment"},
                        {"timestamp": 30.0, "type": "end", "description": "Scene end"}
                    ]
                }
                with open(project_path / "video_timeline_metadata.json", 'w') as f:
                    json.dump(mock_timeline, f, indent=2)
            
            # Create mock scene data if missing
            if "scene_breakdown.json" not in [f.name for f in project_path.glob("*.json")]:
                mock_scenes = {
                    "scenes": [
                        {
                            "scene_id": "scene_1",
                            "environment": {"type": "outdoor", "time_of_day": "day", "weather": "clear"},
                            "mood": "peaceful",
                            "tension": 0.3,
                            "dialogue": [
                                {"character_id": "hero", "text": "What a beautiful day for an adventure!", "emotion": "happy"},
                                {"character_id": "companion", "text": "Indeed, but I sense danger ahead.", "emotion": "concerned"}
                            ],
                            "actions": [
                                {"type": "walk", "description": "Characters walking through forest"}
                            ]
                        },
                        {
                            "scene_id": "scene_2",
                            "environment": {"type": "cave", "time_of_day": "day", "weather": "clear"},
                            "mood": "tense",
                            "tension": 0.8,
                            "dialogue": [
                                {"character_id": "hero", "text": "This cave gives me the creeps.", "emotion": "nervous"},
                                {"character_id": "companion", "text": "Stay close. Something's not right.", "emotion": "alert"}
                            ],
                            "actions": [
                                {"type": "walk", "description": "Cautiously entering cave"},
                                {"type": "magic", "description": "Casting light spell"}
                            ]
                        }
                    ]
                }
                with open(project_path / "scene_breakdown.json", 'w') as f:
                    json.dump(mock_scenes, f, indent=2)
            
            # Create mock character data if missing
            if "character_data.json" not in [f.name for f in project_path.glob("*.json")]:
                mock_characters = {
                    "characters": [
                        {"character_id": "hero", "name": "Alex", "age": "adult", "gender": "male"},
                        {"character_id": "companion", "name": "Sam", "age": "adult", "gender": "female"}
                    ]
                }
                with open(project_path / "character_data.json", 'w') as f:
                    json.dump(mock_characters, f, indent=2)
        
        # Load input data
        with open(project_path / "video_timeline_metadata.json", 'r') as f:
            timeline_metadata = json.load(f)
        
        with open(project_path / "scene_breakdown.json", 'r') as f:
            scene_data = json.load(f)
        
        with open(project_path / "character_data.json", 'r') as f:
            character_data = json.load(f)
        
        print(f"✓ Timeline metadata loaded: {timeline_metadata.get('total_duration', 0)} seconds")
        print(f"✓ Scene data loaded: {len(scene_data.get('scenes', []))} scenes")
        print(f"✓ Character data loaded: {len(character_data.get('characters', []))} characters")
        
        # Initialize Audio Engine
        quality_map = {
            "draft": AudioQuality.DRAFT,
            "standard": AudioQuality.STANDARD,
            "professional": AudioQuality.PROFESSIONAL,
            "broadcast": AudioQuality.BROADCAST
        }
        
        quality_level = quality_map[args.quality]
        engine = AudioEngine(quality=quality_level, mock_mode=args.mock_mode or True)  # Force mock mode for now
        
        print(f"\n🎼 Generating audio project...")
        
        # Generate audio project
        audio_project = engine.generate_audio_project(timeline_metadata, scene_data, character_data)
        
        print(f"✓ Audio project generated:")
        print(f"  • Project ID: {audio_project.project_id}")
        print(f"  • Duration: {audio_project.total_duration} seconds")
        print(f"  • Sample rate: {audio_project.sample_rate} Hz")
        print(f"  • Bit depth: {audio_project.bit_depth} bit")
        print(f"  • Tracks: {len(audio_project.tracks)}")
        print(f"  • Total clips: {sum(len(track.clips) for track in audio_project.tracks)}")
        print(f"  • Reverb zones: {len(audio_project.reverb_zones)}")
        print(f"  • Sync markers: {len(audio_project.sync_markers)}")
        
        # Show track breakdown
        print(f"\n🎵 Track breakdown:")
        for track in audio_project.tracks:
            print(f"  • {track.track_id}: {len(track.clips)} clips, volume {track.volume:.1f}")
        
        # Export audio project
        print(f"\n📁 Exporting audio project...")
        export_path = project_path / "audio_output"
        manifest = engine.export_audio_project(audio_project, export_path, export_stems=args.export_stems)
        
        print(f"✓ Audio project exported to: {export_path}")
        print(f"  • Files generated: {len(manifest['files'])}")
        print(f"  • Export manifest: audio_export_manifest.json")
        
        # Save export manifest
        manifest_path = project_path / "audio_export_manifest.json"
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2, default=str)
        
        # Show quality metrics
        if "statistics" in manifest["metadata"]:
            stats = manifest["metadata"]["statistics"]
            quality_metrics = stats.get("quality_metrics", {})
            
            print(f"\n📊 Quality metrics:")
            print(f"  • Dialogue coverage: {quality_metrics.get('dialogue_coverage', 0):.1%}")
            print(f"  • SFX density: {quality_metrics.get('sfx_density', 0):.1f} events/second")
            print(f"  • Ambience consistency: {quality_metrics.get('ambience_consistency', 0):.1%}")
            print(f"  • Music continuity: {quality_metrics.get('music_continuity', 0):.1%}")
        
        # Update project status
        project_data["generation_status"]["audio"] = "done"
        project_data["capabilities"]["audio_engine"] = True
        
        with open(project_path / "project.json", 'w') as f:
            json.dump(project_data, f, indent=2)
        
        print(f"\n✅ Audio generation complete!")
        
        if args.mock_mode or engine.mock_mode:
            print(f"\n💡 This was a demonstration run. Audio project is ready for:")
            print(f"   • Real audio generation with professional tools")
            print(f"   • Assembly & Export Engine integration")
            print(f"   • Final mixing and mastering")
            print(f"   • Quality validation and review")
        
    except Exception as e:
        print(f"✗ Audio generation error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
