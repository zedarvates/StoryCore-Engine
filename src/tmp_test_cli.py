import sys
from pathlib import Path
import importlib

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

print(f"Python Path: {sys.path[:3]}")

try:
    # Try src.cli.handlers
    handlers_package = importlib.import_module("src.cli.handlers")
    print(f"Success: imported {handlers_package.__name__}")
    print(f"Path: {handlers_package.__file__}")
    
    import pkgutil
    handlers_path = Path(handlers_package.__file__).parent
    modules = [m.name for m in pkgutil.iter_modules([str(handlers_path)])]
    print(f"Modules found: {len(modules)}")
    print(f"First few: {modules[:5]}")
    
except Exception as e:
    print(f"Failed to import src.cli.handlers: {e}")

try:
    from src.cli.core import CLICore
    cli = CLICore(lazy_load=True)
    cli.setup_parser()
    cli.register_handlers()
    print(f"Registry commands: {cli.registry.list_commands()[:10]}")
    print(f"Total commands: {len(cli.registry.list_commands())}")
except Exception as e:
    print(f"Failed to initialize CLI Core: {e}")
    import traceback
    traceback.print_exc()
