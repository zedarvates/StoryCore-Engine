"""
Plugin system for loading external command handlers.
Supports dynamic registration of handlers from external modules.
"""

import importlib
import importlib.util
import logging
import sys
from pathlib import Path
from typing import List, Optional, Type

from .base import BaseHandler
from .errors import SystemError


class PluginLoader:
    """Loader for external CLI plugins."""
    
    def __init__(self):
        self.logger = logging.getLogger("cli.plugins")
        self.loaded_plugins: List[str] = []
    
    def load_plugin_from_file(self, plugin_path: str) -> Optional[Type[BaseHandler]]:
        """
        Load a plugin handler from a Python file.
        
        Args:
            plugin_path: Path to Python file containing handler class
            
        Returns:
            Handler class or None if not found
        """
        try:
            plugin_file = Path(plugin_path)
            
            if not plugin_file.exists():
                self.logger.error(f"Plugin file not found: {plugin_path}")
                return None
            
            if not plugin_file.suffix == '.py':
                self.logger.error(f"Plugin file must be a Python file: {plugin_path}")
                return None
            
            # Load module from file
            module_name = f"cli.plugins.{plugin_file.stem}"
            spec = importlib.util.spec_from_file_location(module_name, plugin_file)
            
            if not spec or not spec.loader:
                self.logger.error(f"Failed to load plugin spec: {plugin_path}")
                return None
            
            module = importlib.util.module_from_spec(spec)
            sys.modules[module_name] = module
            spec.loader.exec_module(module)
            
            # Find handler class in module
            for attr_name in dir(module):
                attr = getattr(module, attr_name)
                
                if (isinstance(attr, type) and 
                    issubclass(attr, BaseHandler) and 
                    attr != BaseHandler and
                    hasattr(attr, 'command_name')):
                    
                    self.loaded_plugins.append(plugin_path)
                    self.logger.info(f"Loaded plugin: {attr.command_name} from {plugin_path}")
                    return attr
            
            self.logger.warning(f"No handler class found in plugin: {plugin_path}")
            return None
            
        except Exception as e:
            self.logger.error(f"Failed to load plugin from {plugin_path}: {e}")
            return None
    
    def load_plugin_from_module(self, module_name: str) -> Optional[Type[BaseHandler]]:
        """
        Load a plugin handler from an installed Python module.
        
        Args:
            module_name: Name of Python module containing handler class
            
        Returns:
            Handler class or None if not found
        """
        try:
            module = importlib.import_module(module_name)
            
            # Find handler class in module
            for attr_name in dir(module):
                attr = getattr(module, attr_name)
                
                if (isinstance(attr, type) and 
                    issubclass(attr, BaseHandler) and 
                    attr != BaseHandler and
                    hasattr(attr, 'command_name')):
                    
                    self.loaded_plugins.append(module_name)
                    self.logger.info(f"Loaded plugin: {attr.command_name} from {module_name}")
                    return attr
            
            self.logger.warning(f"No handler class found in module: {module_name}")
            return None
            
        except ImportError as e:
            self.logger.error(f"Failed to import plugin module {module_name}: {e}")
            return None
        except Exception as e:
            self.logger.error(f"Failed to load plugin from {module_name}: {e}")
            return None
    
    def load_plugins_from_directory(self, plugin_dir: str) -> List[Type[BaseHandler]]:
        """
        Load all plugin handlers from a directory.
        
        Args:
            plugin_dir: Path to directory containing plugin files
            
        Returns:
            List of handler classes found
        """
        handlers = []
        plugin_path = Path(plugin_dir)
        
        if not plugin_path.exists() or not plugin_path.is_dir():
            self.logger.warning(f"Plugin directory not found: {plugin_dir}")
            return handlers
        
        # Scan for Python files
        for plugin_file in plugin_path.glob("*.py"):
            if plugin_file.name.startswith('_'):
                continue  # Skip private files
            
            handler_class = self.load_plugin_from_file(str(plugin_file))
            if handler_class:
                handlers.append(handler_class)
        
        self.logger.info(f"Loaded {len(handlers)} plugins from {plugin_dir}")
        return handlers
    
    def get_loaded_plugins(self) -> List[str]:
        """Get list of loaded plugin paths/modules."""
        return self.loaded_plugins.copy()
