"""
Example plugin for StoryCore-Engine CLI.

This demonstrates how to create a custom command handler that can be
dynamically loaded into the CLI system.

To use this plugin:
1. Copy this file to .kiro/cli/plugins/ in your project
2. Run storycore commands - the plugin will be automatically loaded
3. Use: storycore example --message "Hello World"
"""

import argparse
from src.cli.base import BaseHandler
from src.cli.help import create_command_help


class ExamplePluginHandler(BaseHandler):
    """Example plugin handler demonstrating extensibility."""
    
    command_name = "example"
    description = "Example plugin command"
    aliases = ["ex", "demo"]
    
    def get_help(self):
        """Provide enhanced help for this command."""
        return (create_command_help(self.command_name, self.description)
                .add_example(
                    "storycore example --message 'Hello'",
                    "Display a custom message"
                )
                .add_example(
                    "storycore ex --message 'Test' --repeat 3",
                    "Display message multiple times using alias"
                )
                .add_note(
                    "This is an example plugin demonstrating CLI extensibility"
                )
                .add_note(
                    "You can create your own plugins by following this pattern"
                )
                .add_see_also("help")
                .add_see_also("completion"))
    
    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up command arguments."""
        self.setup_help(parser)
        
        parser.add_argument(
            "--message", "-m",
            default="Hello from example plugin!",
            help="Message to display"
        )
        
        parser.add_argument(
            "--repeat", "-r",
            type=int,
            default=1,
            help="Number of times to repeat the message"
        )
        
        parser.add_argument(
            "--uppercase", "-u",
            action="store_true",
            help="Convert message to uppercase"
        )
    
    def execute(self, args: argparse.Namespace) -> int:
        """Execute the example command."""
        try:
            # Get message
            message = args.message
            
            # Apply transformations
            if args.uppercase:
                message = message.upper()
            
            # Display message
            for i in range(args.repeat):
                if args.repeat > 1:
                    print(f"[{i+1}/{args.repeat}] {message}")
                else:
                    print(message)
            
            self.print_success("Example plugin executed successfully!")
            
            return 0
            
        except Exception as e:
            return self.handle_error(e, "example plugin execution")


# Optional: Add execution hooks
def pre_execution_hook(args):
    """Hook that runs before command execution."""
    print("🔧 Pre-execution hook: Preparing to run example command...")


def post_execution_hook(args, exit_code):
    """Hook that runs after command execution."""
    if exit_code == 0:
        print("✅ Post-execution hook: Command completed successfully!")
    else:
        print(f"❌ Post-execution hook: Command failed with exit code {exit_code}")


# Optional: Register hooks when plugin is loaded
# This would be done by the plugin loader if it supports hook registration
if __name__ == "__main__":
    # Test the plugin standalone
    import sys
    from src.cli.core import CLICore
    
    # Create CLI and register plugin
    cli = CLICore(lazy_load=False)
    cli.setup_parser()
    cli.register_handlers()
    cli.registry.register_external_handler(ExamplePluginHandler)
    
    # Get handler and add hooks
    handler = cli.registry.get_handler("example")
    if handler:
        handler.add_pre_hook(pre_execution_hook)
        handler.add_post_hook(post_execution_hook)
    
    # Run CLI
    sys.exit(cli.run())
