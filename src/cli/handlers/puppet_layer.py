"""
Puppet Layer command handler - Generate puppet layers for character animation.
"""

import argparse
from pathlib import Path

from ..base import BaseHandler
from ..errors import UserError, SystemError


class PuppetLayerHandler(BaseHandler):
    """Handler for the puppet-layer command - puppet layer generation."""
    
    command_name = "puppet-layer"
    description = "Generate puppet layers for character animation"
    
    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up puppet-layer command arguments."""
        parser.add_argument(
            "--project",
            default=".",
            help="Project directory (default: current directory)"
        )
        
        parser.add_argument(
            "--character",
            help="Character ID to generate puppet layers for"
        )
        
        parser.add_argument(
            "--all",
            action="store_true",
            help="Generate puppet layers for all characters"
        )
        
        parser.add_argument(
            "--layers",
            nargs="+",
            choices=["body", "head", "arms", "legs", "accessories"],
            help="Specific layers to generate (default: all)"
        )
    
    def execute(self, args: argparse.Namespace) -> int:
        """Execute the puppet-layer command."""
        try:
            # Import puppet layer engine
            try:
                from puppet_layer_engine import PuppetLayerEngine
            except ImportError as e:
                raise SystemError(
                    f"PuppetLayerEngine not available: {e}",
                    "Ensure puppet_layer_engine module is installed"
                )
            
            # Validate project path
            project_path = Path(args.project)
            if not project_path.exists():
                raise UserError(
                    f"Project directory not found: {project_path}",
                    "Check the project path or create a new project with 'storycore init'"
                )
            
            # Validate character specification
            if not args.character and not args.all:
                raise UserError(
                    "Must specify --character or --all",
                    "Provide a character ID or use --all for all characters"
                )
            
            print(f"Generating puppet layers for project: {project_path.absolute()}")
            
            # Generate puppet layers
            engine = PuppetLayerEngine()
            
            if args.all:
                result = engine.generate_all_puppet_layers(project_path, layers=args.layers)
                characters_processed = result['characters_processed']
            else:
                result = engine.generate_puppet_layers(
                    project_path,
                    args.character,
                    layers=args.layers
                )
                characters_processed = 1
            
            # Display results
            self.print_success("Puppet layers generated successfully")
            print(f"  Characters processed: {characters_processed}")
            print(f"  Total layers generated: {result['total_layers']}")
            
            # Show layer breakdown
            if result.get('layer_breakdown'):
                print(f"\n  Layer breakdown:")
                for layer_type, count in result['layer_breakdown'].items():
                    print(f"    {layer_type}: {count} layer(s)")
            
            print(f"\n  Puppet layers saved to: assets/puppet_layers/")
            print(f"  Updated project.json with puppet layer metadata")
            
            return 0
            
        except Exception as e:
            return self.handle_error(e, "puppet layer generation")
