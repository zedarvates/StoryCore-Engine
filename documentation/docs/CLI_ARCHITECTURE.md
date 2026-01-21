# CLI Architecture Documentation

This document describes the modular architecture of the StoryCore-Engine CLI.

**Requirements: 10.3, 9.5**

## Table of Contents

1. [Overview](#overview)
2. [Architecture Principles](#architecture-principles)
3. [Component Structure](#component-structure)
4. [Data Flow](#data-flow)
5. [Extension Points](#extension-points)
6. [Best Practices](#best-practices)

## Overview

The StoryCore-Engine CLI uses a modular architecture that separates concerns into distinct, testable components. This design enables:

- **Maintainability:** Each command handler is <300 lines
- **Testability:** Isolated components with clear interfaces
- **Extensibility:** Add new commands without modifying existing code
- **Backward Compatibility:** Existing CLI commands work identically

### Key Components

```
┌─────────────────────────────────────────────────────────────┐
│                     storycore_cli.py                        │
│                    (Entry Point - 50 lines)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      CLI Core                               │
│              (Orchestration & Dispatch)                     │
│  - Argument parsing                                         │
│  - Handler registration                                     │
│  - Command routing                                          │
│  - Error coordination                                       │
└────────┬────────────────────────┬───────────────────────────┘
         │                        │
         ▼                        ▼
┌────────────────────┐   ┌────────────────────────────────────┐
│  Command Registry  │   │      Error Handler                 │
│  - Auto-discovery  │   │  - Error categorization            │
│  - Registration    │   │  - Consistent formatting           │
│  - Validation      │   │  - Logging                         │
└────────┬───────────┘   └────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Command Handlers                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Init   │  │   Grid   │  │ Promote  │  │    QA    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Export  │  │ Validate │  │Dashboard │  │   ...    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└────────┬────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Base Handler                             │
│  - Common functionality                                     │
│  - Project loading                                          │
│  - Error handling                                           │
│  - Output formatting                                        │
└────────┬────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    CLI Utilities                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Project  │  │Validation│  │  Output  │  │  Config  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└────────┬────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Engine Modules                           │
│  - ProjectManager                                           │
│  - GridGenerator                                            │
│  - PromotionEngine                                          │
│  - QAEngine                                                 │
│  - ...                                                      │
└─────────────────────────────────────────────────────────────┘
```

## Architecture Principles

### 1. Single Responsibility

Each component has one clear responsibility:

- **Entry Point:** Initialize and delegate
- **CLI Core:** Orchestrate command execution
- **Registry:** Manage handler registration
- **Handlers:** Execute specific commands
- **Utilities:** Provide shared functionality
- **Engines:** Implement business logic

### 2. Dependency Inversion

High-level modules don't depend on low-level modules. Both depend on abstractions:

```python
# Base handler defines interface
class BaseHandler(ABC):
    @abstractmethod
    def execute(self, args: Namespace) -> int:
        pass

# Concrete handlers implement interface
class GridHandler(BaseHandler):
    def execute(self, args: Namespace) -> int:
        # Implementation
        return 0
```

### 3. Open/Closed Principle

Open for extension, closed for modification:

```python
# Add new command without modifying existing code
class NewCommandHandler(BaseHandler):
    command_name = "newcommand"
    description = "New command description"
    
    def setup_parser(self, parser):
        # Add arguments
        pass
    
    def execute(self, args):
        # Implementation
        return 0
```

### 4. Interface Segregation

Handlers only depend on interfaces they use:

```python
# Handler only uses what it needs
class GridHandler(BaseHandler):
    def execute(self, args):
        # Uses project utilities
        config = self.load_project(args.project)
        
        # Uses grid engine
        from src.engines.grid_generator import GridGenerator
        generator = GridGenerator()
        
        return 0
```

## Component Structure

### Entry Point (`src/storycore_cli.py`)

**Purpose:** Minimal entry point that delegates to CLI core.

**Responsibilities:**
- Import CLI core
- Handle top-level exceptions
- Return exit codes

**Size:** ~50 lines

```python
def main():
    try:
        cli = CLICore()
        return cli.run()
    except CLIError as e:
        print(f"✗ {e}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("\n✗ Operation cancelled", file=sys.stderr)
        return 130
```

### CLI Core (`src/cli/core.py`)

**Purpose:** Central orchestration of CLI functionality.

**Responsibilities:**
- Initialize argument parser
- Register command handlers
- Route commands to handlers
- Coordinate error handling

**Key Methods:**
```python
class CLICore:
    def __init__(self):
        self.parser = self.setup_parser()
        self.registry = CommandRegistry(self.parser)
        self.error_handler = ErrorHandler()
    
    def setup_parser(self) -> ArgumentParser:
        # Configure global arguments
        pass
    
    def register_handlers(self):
        # Discover and register handlers
        pass
    
    def execute_command(self, args: Namespace) -> int:
        # Route to appropriate handler
        pass
    
    def run(self, argv: Optional[List[str]] = None) -> int:
        # Main execution flow
        pass
```

### Command Registry (`src/cli/registry.py`)

**Purpose:** Automatic discovery and registration of handlers.

**Responsibilities:**
- Scan handlers directory
- Validate handler interfaces
- Register with argument parser
- Provide handler lookup

**Key Methods:**
```python
class CommandRegistry:
    def discover_handlers(self) -> List[Type[BaseHandler]]:
        # Find all handler classes
        pass
    
    def register_handler(self, handler_class: Type[BaseHandler]):
        # Register with parser
        pass
    
    def get_handler(self, command: str) -> Optional[BaseHandler]:
        # Retrieve handler instance
        pass
```

### Base Handler (`src/cli/base.py`)

**Purpose:** Abstract base class for all command handlers.

**Responsibilities:**
- Define handler interface
- Provide common utilities
- Standardize execution flow

**Interface:**
```python
class BaseHandler(ABC):
    command_name: str  # Required
    description: str   # Required
    
    @abstractmethod
    def setup_parser(self, parser: ArgumentParser):
        """Configure command-specific arguments."""
        pass
    
    @abstractmethod
    def execute(self, args: Namespace) -> int:
        """Execute command logic. Return 0 for success."""
        pass
    
    # Common utilities
    def load_project(self, path: str) -> Dict[str, Any]:
        """Load project configuration."""
        pass
    
    def validate_project(self, path: str) -> bool:
        """Validate project structure."""
        pass
    
    def print_success(self, message: str):
        """Print success message."""
        pass
    
    def print_error(self, message: str):
        """Print error message."""
        pass
```

### Command Handlers (`src/cli/handlers/*.py`)

**Purpose:** Implement specific CLI commands.

**Responsibilities:**
- Parse command-specific arguments
- Execute command logic
- Handle command-specific errors
- Provide command help

**Structure:**
```python
class GridHandler(BaseHandler):
    command_name = "grid"
    description = "Generate grid and slice into panels"
    
    def setup_parser(self, parser: ArgumentParser):
        parser.add_argument('--project', required=True)
        parser.add_argument('--rows', type=int, default=3)
        parser.add_argument('--cols', type=int, default=3)
    
    def execute(self, args: Namespace) -> int:
        # Validate inputs
        if not self.validate_project(args.project):
            self.print_error("Invalid project")
            return 1
        
        # Execute logic
        try:
            from src.engines.grid_generator import GridGenerator
            generator = GridGenerator()
            result = generator.generate(args.project, args.rows, args.cols)
            self.print_success(f"Grid generated: {result}")
            return 0
        except Exception as e:
            self.print_error(f"Grid generation failed: {e}")
            return 1
```

### CLI Utilities (`src/cli/utils/*.py`)

**Purpose:** Shared functionality used across handlers.

**Modules:**

**Project Utils** (`project.py`):
```python
def load_project_config(path: str) -> Dict[str, Any]:
    """Load and parse project.json."""
    pass

def validate_project_structure(path: str) -> Tuple[bool, List[str]]:
    """Validate project directory structure."""
    pass

def get_project_metadata(path: str) -> Dict[str, Any]:
    """Extract project metadata."""
    pass
```

**Validation Utils** (`validation.py`):
```python
def validate_path_exists(path: str) -> bool:
    """Check if path exists."""
    pass

def validate_positive_int(value: str) -> int:
    """Validate and convert to positive integer."""
    pass

def validate_choice(value: str, choices: List[str]) -> str:
    """Validate value is in allowed choices."""
    pass
```

**Output Utils** (`output.py`):
```python
def print_success(message: str):
    """Print success message with formatting."""
    pass

def print_error(message: str):
    """Print error message with formatting."""
    pass

def format_duration(seconds: float) -> str:
    """Format duration for display."""
    pass
```

### Error Handler (`src/cli/errors.py`)

**Purpose:** Centralized error handling and logging.

**Error Categories:**
```python
class CLIError(Exception):
    """Base CLI error."""
    pass

class UserError(CLIError):
    """User input error (exit code 1)."""
    pass

class SystemError(CLIError):
    """System/engine error (exit code 2)."""
    pass

class ConfigurationError(CLIError):
    """Configuration error (exit code 3)."""
    pass
```

**Error Handler:**
```python
class ErrorHandler:
    def handle_exception(self, exc: Exception, context: str) -> int:
        """Handle exception and return exit code."""
        if isinstance(exc, UserError):
            logger.info(f"User error: {exc}")
            return 1
        elif isinstance(exc, SystemError):
            logger.error(f"System error: {exc}")
            return 2
        elif isinstance(exc, ConfigurationError):
            logger.warning(f"Config error: {exc}")
            return 3
        else:
            logger.exception(f"Unexpected error: {exc}")
            return 1
```

## Data Flow

### Command Execution Flow

```
1. User runs command
   $ storycore grid --project test

2. Entry point receives command
   main() → CLICore()

3. CLI Core parses arguments
   parser.parse_args() → Namespace(command='grid', project='test')

4. Registry finds handler
   registry.get_handler('grid') → GridHandler

5. Handler executes
   handler.execute(args) → 0 (success)

6. Exit code returned
   sys.exit(0)
```

### Error Handling Flow

```
1. Error occurs in handler
   raise UserError("Project not found")

2. Handler catches and formats
   except UserError as e:
       self.print_error(str(e))
       return 1

3. CLI Core receives exit code
   exit_code = handler.execute(args)

4. Entry point returns to shell
   sys.exit(exit_code)
```

## Extension Points

### Adding New Commands

1. **Create handler file:**
   ```bash
   touch src/cli/handlers/mycommand.py
   ```

2. **Implement handler:**
   ```python
   from src.cli.base import BaseHandler
   
   class MyCommandHandler(BaseHandler):
       command_name = "mycommand"
       description = "My command description"
       
       def setup_parser(self, parser):
           parser.add_argument('--option')
       
       def execute(self, args):
           # Implementation
           return 0
   ```

3. **Handler is automatically registered!**

### Adding Utilities

1. **Create utility module:**
   ```bash
   touch src/cli/utils/myutil.py
   ```

2. **Implement functions:**
   ```python
   def my_utility_function(arg: str) -> str:
       """Utility function description."""
       return arg.upper()
   ```

3. **Use in handlers:**
   ```python
   from src.cli.utils.myutil import my_utility_function
   
   class MyHandler(BaseHandler):
       def execute(self, args):
           result = my_utility_function(args.input)
           return 0
   ```

### Adding Error Types

1. **Define error class:**
   ```python
   # In src/cli/errors.py
   class ValidationError(UserError):
       """Validation-specific error."""
       pass
   ```

2. **Use in handlers:**
   ```python
   from src.cli.errors import ValidationError
   
   if not valid:
       raise ValidationError("Validation failed")
   ```

## Best Practices

### Handler Design

✅ **DO:**
- Keep handlers under 300 lines
- Use base handler utilities
- Handle errors gracefully
- Provide helpful error messages
- Include docstrings

❌ **DON'T:**
- Duplicate code across handlers
- Import heavy dependencies at module level
- Modify other handlers
- Use global state

### Testing

✅ **DO:**
- Write unit tests for each handler
- Test error conditions
- Mock external dependencies
- Test argument parsing

❌ **DON'T:**
- Test implementation details
- Skip edge cases
- Use real file system in unit tests

### Documentation

✅ **DO:**
- Document command purpose
- Provide usage examples
- Explain arguments
- Document return codes

❌ **DON'T:**
- Leave handlers undocumented
- Assume obvious behavior
- Skip error documentation

---

For more information:
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Migration instructions
- [CLI_EXTENSIBILITY.md](./CLI_EXTENSIBILITY.md) - Adding new commands
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues
