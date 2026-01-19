"""
Command registry for automatic discovery and registration of CLI handlers.
Uses plugin-style architecture with lazy loading for optimal startup performance.
"""

import argparse
import importlib
import logging
import pkgutil
from pathlib import Path
from typing import Any, Dict, List, Optional, Type

from .base import BaseHandler
from .errors import SystemError


class CommandRegistry:
    """Registry for automatic command handler discovery and registration with lazy loading."""
    
    def __init__(self, parser: argparse.ArgumentParser, lazy_load: bool = True):
        self.parser = parser
        self.subparsers = parser.add_subparsers(dest="command", help="Available commands")
        self.handlers: Dict[str, BaseHandler] = {}
        self.handler_classes: Dict[str, Type[BaseHandler]] = {}
        self.handler_modules: Dict[str, str] = {}  # command -> module path mapping
        self.aliases: Dict[str, str] = {}  # alias -> command mapping
        self.lazy_load = lazy_load
        self.logger = logging.getLogger("cli.registry")
    
    def discover_handlers(self) -> List[Type[BaseHandler]]:
        """
        Discover all command handler classes in the handlers package.
        
        In lazy loading mode, only discovers module names without importing.
        In eager mode, imports all modules and returns handler classes.
        
        Returns:
            List of handler classes (empty in lazy mode)
        """
        handler_classes = []
        
        try:
            # Import handlers package
            handlers_package = importlib.import_module("cli.handlers")
            handlers_path = Path(handlers_package.__file__).parent
            
            # Scan for handler modules
            for module_info in pkgutil.iter_modules([str(handlers_path)]):
                if module_info.name.startswith('_'):
                    continue  # Skip private modules
                
                module_name = f"cli.handlers.{module_info.name}"
                
                if self.lazy_load:
                    # In lazy mode, just store the module path
                    # We'll extract the command name from the module name
                    # (e.g., "init" from "init.py", "grid" from "grid.py")
                    command_name = module_info.name.replace('_', '-')
                    self.handler_modules[command_name] = module_name
                    self.logger.debug(f"Discovered handler module: {command_name} -> {module_name}")
                else:
                    # In eager mode, import and extract handler classes
                    try:
                        module = importlib.import_module(module_name)
                        
                        # Look for handler classes
                        for attr_name in dir(module):
                            attr = getattr(module, attr_name)
                            
                            # Check if it's a handler class
                            if (isinstance(attr, type) and 
                                issubclass(attr, BaseHandler) and 
                                attr != BaseHandler and
                                hasattr(attr, 'command_name')):
                                
                                handler_classes.append(attr)
                                self.logger.debug(f"Discovered handler: {attr.command_name}")
                    
                    except Exception as e:
                        self.logger.warning(f"Failed to load handler module {module_info.name}: {e}")
                        continue
        
        except ImportError as e:
            self.logger.warning(f"Handlers package not found: {e}")
        
        return handler_classes
    
    def _load_handler_class(self, command_name: str) -> Optional[Type[BaseHandler]]:
        """
        Lazy load a handler class from its module.
        
        Args:
            command_name: Name of the command
            
        Returns:
            Handler class or None if not found
        """
        if command_name not in self.handler_modules:
            return None
        
        module_name = self.handler_modules[command_name]
        
        try:
            # Import the module
            module = importlib.import_module(module_name)
            
            # Look for handler class
            for attr_name in dir(module):
                attr = getattr(module, attr_name)
                
                # Check if it's a handler class
                if (isinstance(attr, type) and 
                    issubclass(attr, BaseHandler) and 
                    attr != BaseHandler and
                    hasattr(attr, 'command_name') and
                    attr.command_name == command_name):
                    
                    self.logger.debug(f"Lazy loaded handler: {command_name}")
                    return attr
            
            self.logger.warning(f"No handler class found in module {module_name}")
            return None
            
        except Exception as e:
            self.logger.error(f"Failed to lazy load handler {command_name}: {e}")
            return None
    
    def register_handler(self, handler_class: Type[BaseHandler]) -> None:
        """Register a single command handler."""
        try:
            # Validate handler class
            if not hasattr(handler_class, 'command_name'):
                raise SystemError(f"Handler {handler_class.__name__} missing command_name attribute")
            
            if not hasattr(handler_class, 'description'):
                raise SystemError(f"Handler {handler_class.__name__} missing description attribute")
            
            command_name = handler_class.command_name
            
            # Check for duplicates
            if command_name in self.handler_classes:
                self.logger.warning(f"Duplicate handler for command '{command_name}', skipping")
                return
            
            # Create subparser for this command
            subparser = self.subparsers.add_parser(
                command_name,
                help=handler_class.description,
                aliases=getattr(handler_class, 'aliases', [])
            )
            
            # Register aliases
            if hasattr(handler_class, 'aliases'):
                for alias in handler_class.aliases:
                    self.aliases[alias] = command_name
                    self.logger.debug(f"Registered alias: {alias} -> {command_name}")
            
            # Store handler class (don't instantiate yet in lazy mode)
            self.handler_classes[command_name] = handler_class
            
            # In eager mode, create handler instance and set up parser
            if not self.lazy_load:
                handler = handler_class()
                handler.setup_parser(subparser)
                self.handlers[command_name] = handler
            else:
                # In lazy mode, just set up a minimal parser
                # The full parser will be set up when the handler is first accessed
                handler = handler_class()
                handler.setup_parser(subparser)
                # Don't store the instance yet - it will be created on demand
            
            self.logger.debug(f"Registered handler: {command_name}")
            
        except Exception as e:
            self.logger.error(f"Failed to register handler {handler_class.__name__}: {e}")
            raise SystemError(f"Handler registration failed: {e}")
    
    def register_all_handlers(self) -> None:
        """Discover and register all available handlers."""
        if self.lazy_load:
            # In lazy mode, discover module names and set up full parsers
            self.discover_handlers()

            # Register full parsers for each command (lazy loading the handler classes)
            for command_name in self.handler_modules.keys():
                handler_class = self._load_handler_class(command_name)
                if handler_class:
                    try:
                        self.register_handler(handler_class)
                    except Exception as e:
                        self.logger.error(f"Failed to register {command_name}: {e}")
                        # Fallback to minimal parser
                        self.subparsers.add_parser(
                            command_name,
                            help=f"{command_name} command"
                        )

            self.logger.info(f"Registered {len(self.handler_modules)} command handlers (lazy mode)")
        else:
            # In eager mode, load all handlers immediately
            handler_classes = self.discover_handlers()

            for handler_class in handler_classes:
                try:
                    self.register_handler(handler_class)
                except Exception as e:
                    self.logger.error(f"Failed to register {handler_class.__name__}: {e}")
                    continue

            self.logger.info(f"Registered {len(self.handlers)} command handlers (eager mode)")
    
    def get_handler(self, command: str) -> Optional[BaseHandler]:
        """
        Get handler instance for a command.
        
        In lazy loading mode, this will load the handler on first access.
        Resolves aliases to actual command names.
        
        Args:
            command: Command name or alias
            
        Returns:
            Handler instance or None if not found
        """
        # Resolve alias to actual command name
        if command in self.aliases:
            command = self.aliases[command]
        
        # Check if handler is already loaded
        if command in self.handlers:
            return self.handlers[command]
        
        # In lazy mode, try to load the handler
        if self.lazy_load and command in self.handler_modules:
            handler_class = self._load_handler_class(command)
            
            if handler_class:
                try:
                    # Create handler instance
                    handler = handler_class()
                    
                    # Store for future use
                    self.handlers[command] = handler
                    self.handler_classes[command] = handler_class
                    
                    return handler
                    
                except Exception as e:
                    self.logger.error(f"Failed to instantiate handler {command}: {e}")
                    return None
        
        # Check if handler class is registered but not instantiated
        if command in self.handler_classes:
            try:
                handler = self.handler_classes[command]()
                self.handlers[command] = handler
                return handler
            except Exception as e:
                self.logger.error(f"Failed to instantiate handler {command}: {e}")
                return None
        
        return None
    
    def list_commands(self) -> List[str]:
        """Get list of all registered command names."""
        return list(self.handlers.keys())
    
    def validate_handlers(self) -> bool:
        """Validate all registered handlers against interface contracts."""
        all_valid = True
        
        for command_name, handler in self.handlers.items():
            try:
                # Check required attributes
                if not hasattr(handler, 'command_name'):
                    self.logger.error(f"Handler {command_name} missing command_name")
                    all_valid = False
                
                if not hasattr(handler, 'description'):
                    self.logger.error(f"Handler {command_name} missing description")
                    all_valid = False
                
                # Check required methods
                if not hasattr(handler, 'setup_parser'):
                    self.logger.error(f"Handler {command_name} missing setup_parser method")
                    all_valid = False
                
                if not hasattr(handler, 'execute'):
                    self.logger.error(f"Handler {command_name} missing execute method")
                    all_valid = False
                
            except Exception as e:
                self.logger.error(f"Validation error for handler {command_name}: {e}")
                all_valid = False
        
        return all_valid
    
    def register_external_handler(self, handler_class: Type[BaseHandler]) -> bool:
        """
        Register an external handler class dynamically (plugin support).
        
        Args:
            handler_class: Handler class to register
            
        Returns:
            True if registration successful, False otherwise
        """
        try:
            self.register_handler(handler_class)
            self.logger.info(f"Registered external handler: {handler_class.command_name}")
            return True
        except Exception as e:
            self.logger.error(f"Failed to register external handler: {e}")
            return False
    
    def unregister_handler(self, command_name: str) -> bool:
        """
        Unregister a command handler.
        
        Args:
            command_name: Name of command to unregister
            
        Returns:
            True if unregistration successful, False otherwise
        """
        try:
            # Remove from all registries
            if command_name in self.handlers:
                del self.handlers[command_name]
            
            if command_name in self.handler_classes:
                del self.handler_classes[command_name]
            
            if command_name in self.handler_modules:
                del self.handler_modules[command_name]
            
            # Remove aliases pointing to this command
            aliases_to_remove = [alias for alias, cmd in self.aliases.items() if cmd == command_name]
            for alias in aliases_to_remove:
                del self.aliases[alias]
            
            self.logger.info(f"Unregistered handler: {command_name}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to unregister handler {command_name}: {e}")
            return False
    
    def get_command_info(self, command: str) -> Optional[Dict[str, Any]]:
        """
        Get information about a registered command.
        
        Args:
            command: Command name or alias
            
        Returns:
            Dictionary with command information or None if not found
        """
        # Resolve alias
        actual_command = self.aliases.get(command, command)
        
        if actual_command not in self.handler_classes and actual_command not in self.handler_modules:
            return None
        
        info = {
            "command": actual_command,
            "aliases": [alias for alias, cmd in self.aliases.items() if cmd == actual_command],
            "loaded": actual_command in self.handlers
        }
        
        # Add handler class info if available
        if actual_command in self.handler_classes:
            handler_class = self.handler_classes[actual_command]
            info["description"] = handler_class.description
            info["class"] = handler_class.__name__
        
        return info