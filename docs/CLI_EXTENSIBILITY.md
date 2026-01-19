# CLI Extensibility Guide

This guide explains how to extend the StoryCore-Engine CLI with custom commands, plugins, and hooks.

## Table of Contents

- [Overview](#overview)
- [Command Aliases](#command-aliases)
- [Execution Hooks](#execution-hooks)
- [Plugin System](#plugin-system)
- [Enhanced Help System](#enhanced-help-system)
- [Shell Completion](#shell-completion)
- [Examples](#examples)

## Overview

The StoryCore-Engine CLI is designed to be extensible through several mechanisms:

1. **Command Aliases**: Create shortcuts for frequently used commands
2. **Execution Hooks**: Run code before/after command execution
3. **Plugin System**: Dynamically load external command handlers
4. **Enhanced Help**: Provide rich documentation with examples
5. **Shell Completion**: Generate completion scripts for bash/zsh/fish

## Command Aliases

Command aliases provide shortcuts for command names. They're defined in the handler class:

```python
from src.cli.base import BaseHandler

class MyHandler(BaseHandler):
    command_name = "my-command"
    description = "My custom command"
    aliases = ["mc", "mycmd"]  # Define aliases here
    
    def setup_parser(self, parser):
        pass
    
    def execute(self, args):
        return 0
```

Users can then invoke the command using any of these forms:
```bash
storycore my-command
storycore mc
storycore mycmd
```

## Execution Hooks

Hooks allow you to run code before and after command execution:

### Pre-Execution Hooks

Run before the command executes:

```python
def pre_hook(args):
    """Called before command execution."""
    print("Preparing to execute command...")
    # Validate arguments, set up resources, etc.

handler.add_pre_hook(pre_hook)
```

### Post-Execution Hooks

Run after the command completes:

```python
def post_hook(args, exit_code):
    """Called after command execution."""
    if exit_code == 0:
        print("Command succeeded!")
    else:
        print(f"Command failed with code {exit_code}")
    # Clean up resources, log results, etc.

handler.add_post_hook(post_hook)
```

### Hook Management

```python
# Add hooks
handler.add_pre_hook(my_pre_hook)
handler.add_post_hook(my_post_hook)

# Remove hooks
handler.remove_pre_hook(my_pre_hook)
handler.remove_post_hook(my_post_hook)

# Execute with hooks
exit_code = handler.execute_with_hooks(args)
```

## Plugin System

The plugin system allows you to create external command handlers that are automatically discovered and loaded.

### Creating a Plugin

1. Create a Python file with a handler class:

```python
# my_plugin.py
from src.cli.base import BaseHandler

class MyPluginHandler(BaseHandler):
    command_name = "myplugin"
    description = "My custom plugin"
    aliases = ["mp"]
    
    def setup_parser(self, parser):
        parser.add_argument("--option", help="Plugin option")
    
    def execute(self, args):
        print(f"Plugin executed with option: {args.option}")
        return 0
```

2. Place the file in `.kiro/cli/plugins/` in your project directory

3. The plugin will be automatically loaded when you run any CLI command

### Plugin Directory Structure

```
my-project/
├── .kiro/
│   └── cli/
│       └── plugins/
│           ├── my_plugin.py
│           ├── another_plugin.py
│           └── __init__.py (optional)
```

### Manual Plugin Loading

You can also load plugins programmatically:

```python
from src.cli.core import CLICore
from my_plugin import MyPluginHandler

cli = CLICore()
cli.setup_parser()
cli.register_handlers()

# Register external plugin
cli.registry.register_external_handler(MyPluginHandler)
```

### Plugin Loader API

```python
from src.cli.plugins import PluginLoader

loader = PluginLoader()

# Load from file
handler_class = loader.load_plugin_from_file("path/to/plugin.py")

# Load from module
handler_class = loader.load_plugin_from_module("my_plugin_module")

# Load all plugins from directory
handlers = loader.load_plugins_from_directory(".kiro/cli/plugins")

# Get loaded plugins
loaded = loader.get_loaded_plugins()
```

## Enhanced Help System

Provide rich documentation with examples and notes:

```python
from src.cli.base import BaseHandler
from src.cli.help import create_command_help

class MyHandler(BaseHandler):
    command_name = "mycommand"
    description = "My command"
    
    def get_help(self):
        """Provide enhanced help."""
        return (create_command_help(self.command_name, self.description)
                .add_example(
                    "storycore mycommand --option value",
                    "Run command with option"
                )
                .add_example(
                    "storycore mycommand --verbose",
                    "Run with verbose output"
                )
                .add_note(
                    "This command requires a valid project directory"
                )
                .add_note(
                    "Use --help for more detailed information"
                )
                .add_see_also("other-command")
                .add_see_also("related-command"))
    
    def setup_parser(self, parser):
        self.setup_help(parser)  # Apply enhanced help
        # Add arguments...
```

### Help Features

- **Examples**: Show practical usage examples
- **Notes**: Provide important information and tips
- **See Also**: Link to related commands
- **Method Chaining**: Build help fluently

## Shell Completion

Generate completion scripts for your shell:

### Bash

```bash
# Generate completion script
storycore completion bash > ~/.storycore-completion.bash

# Add to ~/.bashrc
echo "source ~/.storycore-completion.bash" >> ~/.bashrc

# Reload shell
source ~/.bashrc
```

### Zsh

```bash
# Generate completion script
storycore completion zsh > ~/.zsh/completions/_storycore

# Ensure completions directory is in fpath (add to ~/.zshrc if needed)
fpath=(~/.zsh/completions $fpath)

# Reload shell
source ~/.zshrc
```

### Fish

```bash
# Generate completion script
storycore completion fish > ~/.config/fish/completions/storycore.fish

# Reload shell
source ~/.config/fish/config.fish
```

## Examples

### Example 1: Simple Plugin

```python
from src.cli.base import BaseHandler

class HelloHandler(BaseHandler):
    command_name = "hello"
    description = "Say hello"
    aliases = ["hi"]
    
    def setup_parser(self, parser):
        parser.add_argument("name", help="Name to greet")
    
    def execute(self, args):
        print(f"Hello, {args.name}!")
        return 0
```

### Example 2: Plugin with Hooks

```python
from src.cli.base import BaseHandler

class ProcessHandler(BaseHandler):
    command_name = "process"
    description = "Process data"
    
    def setup_parser(self, parser):
        parser.add_argument("--input", required=True)
        parser.add_argument("--output", required=True)
    
    def execute(self, args):
        # Process data
        return 0

# Add hooks
def validate_input(args):
    if not Path(args.input).exists():
        raise FileNotFoundError(f"Input file not found: {args.input}")

def cleanup(args, exit_code):
    if exit_code != 0:
        # Clean up partial results
        pass

handler = ProcessHandler()
handler.add_pre_hook(validate_input)
handler.add_post_hook(cleanup)
```

### Example 3: Plugin with Enhanced Help

```python
from src.cli.base import BaseHandler
from src.cli.help import create_command_help

class AnalyzeHandler(BaseHandler):
    command_name = "analyze"
    description = "Analyze project data"
    aliases = ["analyse"]
    
    def get_help(self):
        return (create_command_help(self.command_name, self.description)
                .add_example(
                    "storycore analyze --project my-project",
                    "Analyze specific project"
                )
                .add_example(
                    "storycore analyze --format json",
                    "Output results as JSON"
                )
                .add_note(
                    "Analysis may take several minutes for large projects"
                )
                .add_see_also("export")
                .add_see_also("qa"))
    
    def setup_parser(self, parser):
        self.setup_help(parser)
        parser.add_argument("--project", required=True)
        parser.add_argument("--format", choices=["text", "json"])
    
    def execute(self, args):
        # Perform analysis
        return 0
```

## Best Practices

1. **Use Descriptive Names**: Choose clear command names and aliases
2. **Provide Rich Help**: Use the enhanced help system with examples
3. **Handle Errors Gracefully**: Use the error handling utilities
4. **Validate Early**: Use pre-hooks for validation
5. **Clean Up Resources**: Use post-hooks for cleanup
6. **Test Plugins**: Write unit tests for your plugins
7. **Document Behavior**: Add docstrings and help text
8. **Follow Conventions**: Match the style of built-in commands

## API Reference

### BaseHandler

```python
class BaseHandler(ABC):
    command_name: str          # Required: command name
    description: str           # Required: command description
    aliases: List[str] = []    # Optional: command aliases
    
    def setup_parser(self, parser) -> None
    def execute(self, args) -> int
    def get_help(self) -> Optional[CommandHelp]
    def execute_with_hooks(self, args) -> int
    def add_pre_hook(self, hook) -> None
    def add_post_hook(self, hook) -> None
    def remove_pre_hook(self, hook) -> bool
    def remove_post_hook(self, hook) -> bool
```

### CommandRegistry

```python
class CommandRegistry:
    def register_external_handler(self, handler_class) -> bool
    def unregister_handler(self, command_name) -> bool
    def get_handler(self, command) -> Optional[BaseHandler]
    def get_command_info(self, command) -> Optional[Dict]
    def list_commands(self) -> List[str]
```

### PluginLoader

```python
class PluginLoader:
    def load_plugin_from_file(self, plugin_path) -> Optional[Type[BaseHandler]]
    def load_plugin_from_module(self, module_name) -> Optional[Type[BaseHandler]]
    def load_plugins_from_directory(self, plugin_dir) -> List[Type[BaseHandler]]
    def get_loaded_plugins(self) -> List[str]
```

### CommandHelp

```python
class CommandHelp:
    def add_example(self, command, description) -> CommandHelp
    def add_note(self, note) -> CommandHelp
    def add_see_also(self, command) -> CommandHelp
    def format_epilog(self) -> str
    def setup_parser(self, parser) -> None
```

## Troubleshooting

### Plugin Not Loading

- Check file is in `.kiro/cli/plugins/` directory
- Ensure file has `.py` extension
- Verify handler class inherits from `BaseHandler`
- Check handler has `command_name` and `description` attributes

### Alias Conflicts

- Ensure aliases don't conflict with existing commands
- Check for duplicate aliases across plugins
- Use unique, descriptive aliases

### Hook Not Executing

- Verify hook is added before execution
- Check hook signature matches expected format
- Ensure `execute_with_hooks()` is called, not `execute()`

### Help Not Displaying

- Implement `get_help()` method in handler
- Call `self.setup_help(parser)` in `setup_parser()`
- Return a `CommandHelp` instance from `get_help()`

## Further Reading

- [CLI Architecture](./CLI_ARCHITECTURE.md)
- [Handler Development Guide](./HANDLER_DEVELOPMENT.md)
- [Testing Guide](./TESTING_GUIDE.md)
- [Example Plugins](../examples/)
