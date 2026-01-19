"""
Script command handler - Process scripts and extract narrative structure.
"""

import argparse
from pathlib import Path

from ..base import BaseHandler
from ..errors import UserError, SystemError


class ScriptHandler(BaseHandler):
    """Handler for the script command - script processing."""
    
    command_name = "script"
    description = "Process script and extract narrative structure"
    
    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up script command arguments."""
        parser.add_argument(
            "--project",
            default=".",
            help="Project directory (default: current directory)"
        )
        
        parser.add_argument(
            "--text",
            help="Script text directly from command line"
        )
        
        parser.add_argument(
            "--input",
            help="Path to script file to process"
        )
        
        parser.add_argument(
            "--format",
            choices=["plain", "fountain", "final-draft"],
            default="plain",
            help="Script format (default: plain)"
        )
        
        parser.add_argument(
            "--extract-characters",
            action="store_true",
            help="Extract character information from script"
        )
        
        parser.add_argument(
            "--extract-scenes",
            action="store_true",
            help="Extract scene breakdown from script"
        )
    
    def execute(self, args: argparse.Namespace) -> int:
        """Execute the script command."""
        try:
            # Import script engine
            try:
                from script_engine import ScriptEngine
            except ImportError as e:
                raise SystemError(
                    f"ScriptEngine not available: {e}",
                    "Ensure script_engine module is installed"
                )
            
            # Validate project path
            project_path = Path(args.project)
            if not project_path.exists():
                raise UserError(
                    f"Project directory not found: {project_path}",
                    "Check the project path or create a new project with 'storycore init'"
                )
            
            # Get script text from various sources
            script_text = self._get_script_text(args)
            
            if not script_text or not script_text.strip():
                raise UserError(
                    "No script text provided",
                    "Provide script via --text, --input, or interactive input"
                )
            
            print(f"Processing script for project: {project_path.absolute()}")
            print(f"Script format: {args.format}")
            
            # Process script
            engine = ScriptEngine()
            result = engine.process_script(script_text, project_path)
            
            # Display results
            self.print_success("Script processing completed")
            print(f"  Script ID: {result['script_id']}")
            print(f"  Total scenes: {result['processing_metadata']['total_scenes']}")
            print(f"  Total characters: {result['processing_metadata']['total_characters']}")
            print(f"  Estimated duration: {result['processing_metadata']['estimated_duration_seconds']} seconds")
            print(f"  Complexity score: {result['processing_metadata']['complexity_score']:.1f}/5.0")
            
            # Show extracted scenes
            if result.get('narrative_structure', {}).get('scenes'):
                print(f"\n  Extracted scenes:")
                for scene in result['narrative_structure']['scenes'][:5]:
                    print(f"    {scene['scene_id']}: {scene['title']}")
                    print(f"      Location: {scene['location']}")
                    print(f"      Characters: {len(scene.get('characters', []))}")
                
                if len(result['narrative_structure']['scenes']) > 5:
                    remaining = len(result['narrative_structure']['scenes']) - 5
                    print(f"    ... and {remaining} more scenes")
            
            # Show extracted characters
            if result.get('characters'):
                print(f"\n  Extracted characters:")
                for char in result['characters'][:5]:
                    print(f"    - {char['name']} ({char.get('role', 'unknown')})")
                
                if len(result['characters']) > 5:
                    remaining = len(result['characters']) - 5
                    print(f"    ... and {remaining} more characters")
            
            print(f"\n  Script saved: script.json")
            print(f"  Updated project.json with script metadata")
            
            return 0
            
        except Exception as e:
            return self.handle_error(e, "script processing")
    
    def _get_script_text(self, args: argparse.Namespace) -> str:
        """Get script text from various sources."""
        # From command line argument
        if args.text:
            print("Using script text from command line argument")
            return args.text
        
        # From input file
        if args.input:
            input_path = Path(args.input)
            if not input_path.exists():
                raise UserError(
                    f"Input file not found: {input_path}",
                    "Check the file path"
                )
            
            try:
                with open(input_path, 'r', encoding='utf-8') as f:
                    script_text = f.read()
                print(f"Loaded script from: {input_path}")
                return script_text
            except Exception as e:
                raise SystemError(f"Failed to read input file: {e}")
        
        # Interactive input
        print("Enter your script text (press Ctrl+D or Ctrl+Z when finished):")
        lines = []
        try:
            while True:
                line = input()
                lines.append(line)
        except EOFError:
            return '\n'.join(lines)
